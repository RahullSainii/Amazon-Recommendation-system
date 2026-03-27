import os

from config import Config
from json_db import db as json_db
from pg_db import db as postgres_db


class DatabaseProxy:
    def _active_backend(self):
        if os.getenv("PYTEST_CURRENT_TEST") or os.getenv("APP_ENV") == "test":
            return json_db
        if Config.DB_BACKEND == "postgres" and Config.DATABASE_URL and postgres_db.SessionLocal is not None:
            return postgres_db
        return json_db

    def __getattr__(self, name):
        return getattr(self._active_backend(), name)

    def __setattr__(self, name, value):
        setattr(self._active_backend(), name, value)


db = DatabaseProxy()


BOOTSTRAP_COLLECTIONS = (
    "products",
    "users",
    "preferences",
    "carts",
    "wishlists",
    "orders",
    "interactions",
    "recommendation_history",
)


def using_postgres():
    return db._active_backend() is postgres_db


def bootstrap_postgres_from_json():
    if not using_postgres():
        return {"bootstrapped": False, "reason": "postgres not active"}

    imported = {}
    for collection_name in BOOTSTRAP_COLLECTIONS:
        if postgres_db.find_one(collection_name, {}):
            continue
        docs = json_db.find(collection_name, {})
        if not docs:
            continue
        postgres_db.insert_many(collection_name, docs)
        imported[collection_name] = len(docs)
    return {"bootstrapped": bool(imported), "collections": imported}
