from flask import jsonify, request

from auth import token_required
from database import db
from ml_model import rec_system

from . import api_bp
from .services import (
    DEFAULT_EXPERIMENT_KEY,
    build_recommendation_explanation,
    cache_recommendations,
    get_analytics_summary,
    get_cached_recommendations,
    get_experiment_summary,
    get_or_assign_experiment,
    get_popularity_recommendations,
    log_interaction,
    track_experiment_event,
    track_recommendation_impressions,
)
from .utils import get_or_create_doc, now_iso, sanitize_string
from .validators import bounded_int_arg, error_response, json_body


@api_bp.route("/preferences", methods=["GET"])
@token_required
def get_preferences():
    prefs = get_or_create_doc(
        "preferences",
        request.user_id,
        {"categories": [], "price_range": "any", "updated_at": now_iso()},
    )
    return jsonify(prefs), 200


@api_bp.route("/preferences", methods=["PUT"])
@token_required
def update_preferences():
    data = json_body()
    payload = {
        "categories": data.get("categories", []) if isinstance(data.get("categories", []), list) else [],
        "price_range": str(data.get("price_range") or "any"),
        "updated_at": now_iso(),
    }
    db.update_one("preferences", {"user_id": request.user_id}, {"$set": payload})
    prefs = get_or_create_doc("preferences", request.user_id, payload)
    return jsonify(prefs), 200


@api_bp.route("/recommendations", methods=["GET"])
@token_required
def get_recommendations():
    limit = bounded_int_arg("limit", 8, 1, 50)
    assignment = get_or_assign_experiment(request.user_id)
    variant = assignment.get("variant_key", "hybrid")
    cached = get_cached_recommendations(request.user_id, variant, limit)
    if cached:
        track_recommendation_impressions(DEFAULT_EXPERIMENT_KEY, variant, cached)
        return jsonify(cached), 200

    if variant == "popularity":
        recs = get_popularity_recommendations(limit * 3)
    else:
        recs = rec_system.get_user_recommendations(request.user_id, limit * 3)

    prefs = db.find_one("preferences", {"user_id": request.user_id}) or {}
    preferred_categories = [str(cat).lower() for cat in prefs.get("categories", []) if cat]
    if preferred_categories:
        filtered = [
            rec for rec in recs
            if any(cat in str(rec.get("category", "")).lower() for cat in preferred_categories)
        ]
        recs = filtered or recs

    recs = recs[:limit]
    for rec in recs:
        rec["experiment_variant"] = variant
        rec["recommendation_explanation"] = build_recommendation_explanation(
            rec,
            user_id=request.user_id,
            preferred_categories=preferred_categories,
        )
    if recs:
        db.insert_one(
            "recommendation_history",
            {
                "user_id": request.user_id,
                "product_ids": [rec.get("product_id") for rec in recs if rec.get("product_id")],
                "strategy": recs[0].get("rec_strategy", "unknown"),
                "experiment_variant": variant,
                "explanations": [rec.get("recommendation_explanation") for rec in recs],
                "timestamp": now_iso(),
            },
        )
        track_recommendation_impressions(DEFAULT_EXPERIMENT_KEY, variant, recs)
        cache_recommendations(request.user_id, variant, limit, recs)

    return jsonify(recs), 200


@api_bp.route("/interactions", methods=["POST"])
@token_required
def record_interaction():
    data = json_body()
    product_id = data.get("product_id")
    if not product_id:
        return error_response("product_id is required")
    action_type = sanitize_string(data.get("type", "view"), 30)
    log_interaction(request.user_id, product_id, action_type)
    variant = sanitize_string(data.get("experiment_variant") or "", 30)
    if variant:
        track_experiment_event(DEFAULT_EXPERIMENT_KEY, variant, action_type)
    return jsonify({"message": "Interaction logged"}), 201


@api_bp.route("/analytics/summary", methods=["GET"])
@token_required
def analytics_summary():
    days = bounded_int_arg("days", 7, 1, 30)
    assignment = get_or_assign_experiment(request.user_id)
    payload = get_analytics_summary(days)
    payload["current_experiment"] = {
        "experiment_key": DEFAULT_EXPERIMENT_KEY,
        "variant_key": assignment.get("variant_key", "hybrid"),
    }
    payload["experiment_summary"] = get_experiment_summary(DEFAULT_EXPERIMENT_KEY)
    return jsonify(payload), 200
