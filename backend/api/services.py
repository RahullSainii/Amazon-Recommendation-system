import hashlib
import uuid
from datetime import datetime, timedelta, timezone

from database import db
from ml_model import rec_system
from redis_client import cache_get_json, cache_set_json, increment_counter, redis_client

from .utils import get_or_create_doc, hydrate_cart_items, now_iso, sanitize_string


DEFAULT_EXPERIMENT_KEY = "recommendation_strategy_v1"
DEFAULT_EXPERIMENT_VARIANTS = ("hybrid", "popularity")


def initialize_user_state(user_id):
    db.insert_one(
        "preferences",
        {"user_id": user_id, "categories": [], "price_range": "any", "updated_at": now_iso()},
    )
    db.insert_one("carts", {"user_id": user_id, "items": [], "updated_at": now_iso()})
    db.insert_one("wishlists", {"user_id": user_id, "product_ids": [], "updated_at": now_iso()})


def build_cart_response(user_id):
    cart = get_or_create_doc("carts", user_id, {"items": [], "updated_at": now_iso()})
    hydrated, subtotal = hydrate_cart_items(cart.get("items", []))
    return {
        "items": hydrated,
        "subtotal": round(subtotal, 2),
        "count": sum(item.get("quantity", 1) for item in cart.get("items", [])),
    }


def log_interaction(user_id, product_id, action_type):
    timestamp = now_iso()
    db.insert_one(
        "interactions",
        {
            "user_id": user_id,
            "product_id": product_id,
            "action_type": sanitize_string(action_type, 30),
            "timestamp": timestamp,
        },
    )
    _increment_event_counters(sanitize_string(action_type, 30), timestamp)


def create_order(user_id, address, payment_method):
    cart = get_or_create_doc("carts", user_id, {"items": [], "updated_at": now_iso()})
    hydrated, subtotal = hydrate_cart_items(cart.get("items", []))
    if not hydrated:
        return None

    order = {
        "order_id": str(uuid.uuid4()),
        "user_id": user_id,
        "items": hydrated,
        "subtotal": round(subtotal, 2),
        "address": sanitize_string(address, 1000),
        "payment_method": sanitize_string(payment_method, 50),
        "status": "confirmed",
        "created_at": now_iso(),
    }
    db.insert_one("orders", order)
    db.update_one("carts", {"user_id": user_id}, {"$set": {"items": [], "updated_at": now_iso()}})

    for item in hydrated:
        log_interaction(user_id, item.get("product_id"), "purchase")

    return order


def _stable_bucket(value):
    digest = hashlib.sha256(str(value).encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def get_or_assign_experiment(user_id, experiment_key=DEFAULT_EXPERIMENT_KEY):
    existing = db.find_one("user_experiment_assignments", {"user_id": user_id, "experiment_key": experiment_key})
    if existing:
        return existing

    bucket = _stable_bucket(f"{experiment_key}:{user_id}") % 100
    variant = DEFAULT_EXPERIMENT_VARIANTS[0] if bucket < 50 else DEFAULT_EXPERIMENT_VARIANTS[1]
    assignment = {
        "assignment_id": str(uuid.uuid4()),
        "user_id": user_id,
        "experiment_key": experiment_key,
        "variant_key": variant,
        "assigned_at": now_iso(),
    }
    db.insert_one("user_experiment_assignments", assignment)
    return assignment


def get_popularity_recommendations(num_recs=8):
    if rec_system.df is None or rec_system.popularity_scores is None:
        return []
    top_indices = rec_system.popularity_scores.argsort()[::-1][:num_recs]
    results = rec_system.df.iloc[top_indices].copy()
    results["rec_strategy"] = "popularity_baseline"
    results["rec_score"] = rec_system.popularity_scores[top_indices]
    return results.to_dict("records")


def build_recommendation_explanation(rec, user_id=None, preferred_categories=None):
    strategy = rec.get("rec_strategy", "unknown")
    category = (rec.get("category") or "General").split("|")[0].strip()
    if strategy == "hybrid_cf_popularity":
        reason_type = "because_you_viewed"
        reason_text = f"Recommended from your browsing and shopping signals in {category}."
    elif strategy == "content_based_history":
        reason_type = "because_you_viewed"
        reason_text = f"Similar to items you explored in {category}."
    else:
        reason_type = "trending_now"
        reason_text = f"Trending right now among shoppers browsing {category}."

    if preferred_categories and any(cat in (rec.get("category") or "").lower() for cat in preferred_categories):
        reason_type = "popular_in_category"
        reason_text = f"Matches your saved preference for {category}."

    return {
        "reason_type": reason_type,
        "reason_text": reason_text,
        "strategy": strategy,
        "score": round(float(rec.get("rec_score", 0) or 0), 4),
    }


def get_cached_recommendations(user_id, variant, limit):
    return cache_get_json(f"recs:user:{user_id}:variant:{variant}:limit:{limit}")


def cache_recommendations(user_id, variant, limit, recs, ttl_seconds=600):
    return cache_set_json(f"recs:user:{user_id}:variant:{variant}:limit:{limit}", recs, ttl_seconds)


def get_cached_similar_products(product_id, limit):
    return cache_get_json(f"similar:{product_id}:limit:{limit}")


def cache_similar_products(product_id, limit, products, ttl_seconds=3600):
    return cache_set_json(f"similar:{product_id}:limit:{limit}", products, ttl_seconds)


def _increment_event_counters(event_type, timestamp=None, amount=1):
    event_type = sanitize_string(event_type, 30).lower()
    day = (timestamp or now_iso())[:10]
    increment_counter(f"metrics:{event_type}:{day}", amount)


def track_recommendation_impressions(experiment_key, variant, recommendations):
    today = datetime.now(timezone.utc).date().isoformat()
    increment_counter(f"metrics:impressions:{today}", len(recommendations))
    increment_counter(f"exp:{experiment_key}:{variant}:impression", len(recommendations))


def track_experiment_event(experiment_key, variant, event_type, amount=1):
    increment_counter(f"exp:{experiment_key}:{variant}:{sanitize_string(event_type, 30).lower()}", amount)


def get_analytics_summary(days=7):
    today = datetime.now(timezone.utc).date()
    event_types = ("impressions", "view", "click", "add_to_cart", "purchase")
    timeline = []
    totals = {event: 0 for event in event_types}

    for offset in range(days - 1, -1, -1):
        day = (today - timedelta(days=offset)).isoformat()
        day_metrics = {"day": day}
        for event in event_types:
            value = 0
            if redis_client is not None:
                raw = redis_client.get(f"metrics:{event}:{day}")
                value = int(raw or 0)
            day_metrics[event] = value
            totals[event] += value
        timeline.append(day_metrics)

    ctr = round((totals["click"] / totals["impressions"]) * 100, 2) if totals["impressions"] else 0.0
    conversion_rate = round((totals["purchase"] / totals["click"]) * 100, 2) if totals["click"] else 0.0

    return {
        "window_days": days,
        "totals": totals,
        "ctr": ctr,
        "conversion_rate": conversion_rate,
        "timeline": timeline,
    }


def get_experiment_summary(experiment_key=DEFAULT_EXPERIMENT_KEY):
    summary = {"experiment_key": experiment_key, "variants": []}
    for variant in DEFAULT_EXPERIMENT_VARIANTS:
        impressions = int(redis_client.get(f"exp:{experiment_key}:{variant}:impression") or 0) if redis_client else 0
        clicks = int(redis_client.get(f"exp:{experiment_key}:{variant}:click") or 0) if redis_client else 0
        purchases = int(redis_client.get(f"exp:{experiment_key}:{variant}:purchase") or 0) if redis_client else 0
        ctr = round((clicks / impressions) * 100, 2) if impressions else 0.0
        conversion_rate = round((purchases / clicks) * 100, 2) if clicks else 0.0
        summary["variants"].append(
            {
                "variant_key": variant,
                "impressions": impressions,
                "clicks": clicks,
                "purchases": purchases,
                "ctr": ctr,
                "conversion_rate": conversion_rate,
            }
        )
    return summary
