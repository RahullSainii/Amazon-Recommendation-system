"""
Standalone evaluation script for the recommendation system.
Run: python evaluate.py

Outputs Precision@K, Recall@K, NDCG@K, catalog coverage,
and comparison against random and popularity-only baselines.
"""

import os
import sys
import json
import numpy as np
import pandas as pd

# Ensure the project root is on the path
sys.path.insert(0, os.path.dirname(__file__))

from ml_model import RecommendationSystem


def random_baseline(all_products, k=10):
    """Return K random products."""
    return list(np.random.choice(all_products, size=min(k, len(all_products)), replace=False))


def popularity_baseline(df, k=10):
    """Return top K products by rating × rating_count."""
    return (
        df.sort_values(by=["rating", "rating_count"], ascending=False)
        .head(k)["product_id"]
        .tolist()
    )


def evaluate_recommender(rec_system, k=10):
    """Full offline evaluation with multiple baselines."""
    interactions = rec_system.interactions_df
    if interactions is None or len(interactions) < 20:
        print("Not enough interactions for evaluation.")
        return {}

    grouped = interactions.groupby("user_id")
    all_products = rec_system.df["product_id"].unique()

    results = {
        "hybrid": {"precision": [], "recall": [], "ndcg": []},
        "random": {"precision": [], "recall": [], "ndcg": []},
        "popularity": {"precision": [], "recall": [], "ndcg": []},
    }
    rec_items_all = set()

    pop_recs = popularity_baseline(rec_system.df, k)

    for uid, group in grouped:
        if len(group) < 3:
            continue
        n_test = max(1, int(len(group) * 0.2))
        test_items = set(group["product_id"].iloc[-n_test:].tolist())

        # Hybrid
        recs = rec_system.get_user_recommendations(uid, k)
        rec_pids = [r.get("product_id") for r in recs if r.get("product_id")]
        rec_items_all.update(rec_pids)
        _compute_metrics(rec_pids, test_items, k, results["hybrid"])

        # Random baseline
        rand_pids = random_baseline(all_products, k)
        _compute_metrics(rand_pids, test_items, k, results["random"])

        # Popularity baseline
        _compute_metrics(pop_recs, test_items, k, results["popularity"])

    report = {}
    for strategy, metrics in results.items():
        report[strategy] = {
            f"precision@{k}": _safe_mean(metrics["precision"]),
            f"recall@{k}": _safe_mean(metrics["recall"]),
            f"ndcg@{k}": _safe_mean(metrics["ndcg"]),
        }

    n_total = len(all_products)
    report["hybrid"]["catalog_coverage"] = round(len(rec_items_all) / max(n_total, 1), 4)
    report["dataset_stats"] = {
        "n_users": len(interactions["user_id"].unique()),
        "n_items": n_total,
        "n_interactions": len(interactions),
        "sparsity": round(
            1 - len(interactions) / max(
                len(interactions["user_id"].unique()) * n_total, 1
            ), 6
        ),
    }
    return report


def _compute_metrics(rec_pids, test_items, k, container):
    hits = [1 if pid in test_items else 0 for pid in rec_pids]
    container["precision"].append(sum(hits) / k if k > 0 else 0)
    container["recall"].append(sum(hits) / len(test_items) if test_items else 0)
    dcg = sum(h / np.log2(i + 2) for i, h in enumerate(hits))
    ideal = sorted(hits, reverse=True)
    idcg = sum(h / np.log2(i + 2) for i, h in enumerate(ideal))
    container["ndcg"].append(dcg / idcg if idcg > 0 else 0)


def _safe_mean(lst):
    return round(float(np.mean(lst)), 4) if lst else 0.0


if __name__ == "__main__":
    print("=" * 60)
    print("Amazon RecSys — Offline Evaluation Report")
    print("=" * 60)

    rec = RecommendationSystem()
    if not rec.load_and_preprocess():
        print("ERROR: Could not load dataset. Place amazon.csv in data/")
        sys.exit(1)

    report = evaluate_recommender(rec, k=10)
    print(json.dumps(report, indent=2))
    print("\n✅ Evaluation complete.")
