from flask import jsonify

from config import Config
from database import db, using_postgres
from pg_db import db as postgres_db

from . import api_bp


@api_bp.route("/debug/db", methods=["GET"])
def debug_db():
    product_sample = []
    user_sample = []
    error = None

    try:
        product_sample = db.find("products", {}, limit=2)
        user_sample = db.find("users", {}, limit=2)
    except Exception as exc:  # pragma: no cover - diagnostic endpoint
        error = str(exc)

    return jsonify(
        {
            "db_backend_config": Config.DB_BACKEND,
            "database_url_set": bool(Config.DATABASE_URL),
            "active_backend": "postgres" if using_postgres() else "json",
            "postgres_session_ready": postgres_db.SessionLocal is not None,
            "postgres_init_error": str(postgres_db.init_error) if postgres_db.init_error else None,
            "products_visible": len(product_sample),
            "users_visible": len(user_sample),
            "sample_product_ids": [item.get("product_id") for item in product_sample],
            "sample_user_emails": [item.get("email") for item in user_sample],
            "query_error": error,
        }
    ), 200
