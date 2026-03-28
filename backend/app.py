from flask import Flask
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
from dotenv import load_dotenv
from routes import api_bp
from ml_model import rec_system
from config import Config
from redis_client import redis_available
from database import bootstrap_postgres_from_json


DEFAULT_CORS_ORIGINS = (
    "http://localhost:3000",
    "https://amazon-recsys-frontend.onrender.com",
    "https://amazon-recommendation-system-1.onrender.com",
)


def resolve_cors_origins():
    configured = os.environ.get("CORS_ORIGINS", "*").strip()
    if configured == "*":
        return "*"

    origins = [origin.strip() for origin in configured.split(",") if origin.strip()]
    for origin in DEFAULT_CORS_ORIGINS:
        if origin not in origins:
            origins.append(origin)
    return origins


def create_app():
    # Load environment variables from .env if present
    load_dotenv(override=False)
    Config.validate() if Config.APP_ENV == "production" else None

    app = Flask(__name__)
    app.config["SECRET_KEY"] = Config.SECRET_KEY
    cors_origins = resolve_cors_origins()
    if cors_origins == "*":
        CORS(app)
    else:
        CORS(app, resources={r"/api/*": {"origins": cors_origins}})

    # Rate limiting on auth endpoints
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["200 per minute"],
        storage_uri=Config.REDIS_URL if redis_available() else "memory://",
    )
    limiter.limit("10 per minute")(api_bp)

    # Register blueprints
    app.register_blueprint(api_bp, url_prefix='/api')

    bootstrap_result = bootstrap_postgres_from_json()
    if bootstrap_result.get("bootstrapped"):
        print("Imported existing JSON data into Postgres:")
        for collection_name, count in bootstrap_result.get("collections", {}).items():
            print(f"  {collection_name}: {count}")

    # Initialize ML Model
    print("=" * 50)
    print("Initializing Recommendation System...")
    if not Config.LOAD_ML_ON_STARTUP:
        print("ML startup disabled via LOAD_ML_ON_STARTUP=false.")
    else:
        success = rec_system.load_and_preprocess(run_evaluation=Config.RUN_ML_EVAL_ON_STARTUP)
        if success:
            metrics = rec_system.get_metrics()
            print(f"ML Model loaded successfully.")
            print(f"  Products:     {metrics.get('n_items', 'N/A')}")
            print(f"  Users:        {metrics.get('n_users', 'N/A')}")
            print(f"  Interactions: {metrics.get('n_interactions', 'N/A')}")
            print(f"  Model:        {metrics.get('model_type', 'N/A')}")
            if Config.RUN_ML_EVAL_ON_STARTUP:
                p_at_k = [v for k, v in metrics.items() if 'precision' in str(k)]
                if p_at_k:
                    print(f"  Precision@10: {p_at_k[0]}")
            else:
                print("  Offline eval: skipped on startup")
        else:
            print("ML Model initialization failed (ensure amazon.csv is in data/).")
    print("=" * 50)

    return app

app = create_app()


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=Config.DEBUG)
