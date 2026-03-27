import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import app as app_module
import database as database_module
from ml_model import rec_system


@pytest.fixture
def client(tmp_path, monkeypatch):
    database_module.db.data_dir = str(tmp_path)
    os.makedirs(database_module.db.data_dir, exist_ok=True)

    sample_product = {
        "product_id": "P001",
        "product_name": "Sample Product",
        "category": "Electronics|Audio",
        "discounted_price": "499",
        "rating": 4.5,
        "img_link": "https://example.com/p1.png",
    }
    database_module.db.insert_one("products", sample_product)

    monkeypatch.setattr(app_module.rec_system, "load_and_preprocess", lambda: True)
    monkeypatch.setattr(app_module.rec_system, "get_metrics", lambda: {"n_items": 1, "n_users": 0, "n_interactions": 0, "model_type": "test"})
    monkeypatch.setattr(rec_system, "get_product_details", lambda product_id: sample_product if product_id == "P001" else None)
    monkeypatch.setattr(rec_system, "get_similar_products", lambda product_id, limit=5: [])
    monkeypatch.setattr(
        rec_system,
        "get_user_recommendations",
        lambda user_id, num_recs=5: [
            {"product_id": "P001", "category": "Electronics", "rec_strategy": "popularity_baseline", "product_name": "Sample Product"},
            {"product_id": "P002", "category": "Books", "rec_strategy": "popularity_baseline", "product_name": "Book Product"},
        ][:num_recs],
    )

    app = app_module.create_app()
    app.config["TESTING"] = True
    return app.test_client()


def auth_headers(client):
    client.post("/api/auth/signup", json={"username": "testuser", "email": "test@example.com", "password": "secret1"})
    response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "secret1"})
    token = response.get_json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_signup_login_and_preferences_flow(client):
    signup_response = client.post(
        "/api/auth/signup",
        json={"username": "alice", "email": "alice@example.com", "password": "secret1"},
    )
    assert signup_response.status_code == 201

    login_response = client.post("/api/auth/login", json={"email": "alice@example.com", "password": "secret1"})
    assert login_response.status_code == 200
    token = login_response.get_json()["token"]

    prefs_response = client.put(
        "/api/preferences",
        json={"categories": ["Electronics"], "price_range": "mid"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert prefs_response.status_code == 200
    assert prefs_response.get_json()["categories"] == ["Electronics"]


def test_cart_and_checkout_flow(client):
    headers = auth_headers(client)

    add_response = client.post("/api/cart", json={"product_id": "P001", "quantity": 2}, headers=headers)
    assert add_response.status_code == 201

    cart_response = client.get("/api/cart", headers=headers)
    cart_payload = cart_response.get_json()
    assert cart_payload["count"] == 2
    assert cart_payload["subtotal"] == 998.0

    checkout_response = client.post(
        "/api/checkout",
        json={"address": "221B Baker Street", "payment_method": "card"},
        headers=headers,
    )
    assert checkout_response.status_code == 200
    assert checkout_response.get_json()["order"]["status"] == "confirmed"


def test_recommendations_respect_preferences(client):
    headers = auth_headers(client)
    client.put("/api/preferences", json={"categories": ["Electronics"], "price_range": "any"}, headers=headers)

    response = client.get("/api/recommendations?limit=5", headers=headers)
    payload = response.get_json()

    assert response.status_code == 200
    assert len(payload) == 1
    assert payload[0]["product_id"] == "P001"


def test_password_reset_returns_dev_code_when_smtp_unavailable(client, monkeypatch):
    client.post("/api/auth/signup", json={"username": "reset", "email": "reset@example.com", "password": "secret1"})
    monkeypatch.setattr("api.auth_routes.send_reset_email", lambda email, code: (False, "missing smtp"))

    response = client.post("/api/auth/forget-password", json={"email": "reset@example.com"})
    payload = response.get_json()

    assert response.status_code == 200
    assert payload["reset_code"].isdigit()
