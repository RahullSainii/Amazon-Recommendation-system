from flask import jsonify

from ml_model import rec_system

from . import api_bp


@api_bp.route("/ml/metrics", methods=["GET"])
def get_ml_metrics():
    return jsonify(rec_system.get_metrics()), 200


@api_bp.route("/ml/health", methods=["GET"])
def ml_health():
    has_model = rec_system.df is not None
    return jsonify(
        {
            "status": "healthy" if has_model else "degraded",
            "model_loaded": has_model,
            "collaborative_filtering": rec_system.user_factors is not None,
            "content_based": rec_system.tfidf_matrix is not None,
            "n_products": len(rec_system.df) if has_model else 0,
            "eval_metrics": rec_system.get_metrics(),
        }
    ), 200
