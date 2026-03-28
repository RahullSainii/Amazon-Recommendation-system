"""
Application configuration with environment variable management.
"""

import os
from dotenv import load_dotenv

# Let platform env vars win in production, while still supporting local .env files.
load_dotenv(override=False)


class Config:
    """Base configuration."""

    # Database
    DB_BACKEND = os.getenv("DB_BACKEND", "postgres" if os.getenv("DATABASE_URL") else "json").lower()
    DATABASE_URL = os.getenv("DATABASE_URL", "")
    DIRECT_URL = os.getenv("DIRECT_URL", "")
    MONGO_URI = os.getenv("MONGO_URI", "")
    DB_NAME = os.getenv("DB_NAME", "amazon_recsys")
    REDIS_URL = os.getenv("REDIS_URL", "")
    RATE_LIMIT_STORAGE_URI = REDIS_URL or "memory://"

    # JWT
    SECRET_KEY = os.getenv("SECRET_KEY") or os.getenv("JWT_SECRET_KEY") or "dev-fallback-replace-me"

    # App
    APP_ENV = os.getenv("APP_ENV", "development")
    APP_NAME = os.getenv("APP_NAME", "AmazonRecs")
    DEBUG = APP_ENV == "development"
    RUN_ML_EVAL_ON_STARTUP = os.getenv("RUN_ML_EVAL_ON_STARTUP", "false").lower() == "true"
    LOAD_ML_ON_STARTUP = os.getenv("LOAD_ML_ON_STARTUP", "true").lower() == "true"

    # SMTP
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_SENDER_EMAIL = os.getenv("SMTP_SENDER_EMAIL", "")

    # ML Model
    MODEL_CACHE_DIR = os.path.join(os.path.dirname(__file__), "models")
    DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

    @classmethod
    def validate(cls):
        """Check that critical env vars are set in production."""
        if cls.APP_ENV == "production":
            assert cls.SECRET_KEY != "dev-fallback-replace-me", \
                "SECRET_KEY must be set in production!"
            if cls.DB_BACKEND == "postgres":
                assert cls.DATABASE_URL, "DATABASE_URL must be set in production when using Postgres!"
            elif cls.DB_BACKEND == "mongo":
                assert cls.MONGO_URI, "MONGO_URI must be set in production when using Mongo!"
