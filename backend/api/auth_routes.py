import os
import random
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from flask import jsonify

from auth import generate_token
from database import db

from . import api_bp
from .services import initialize_user_state
from .utils import now_iso, sanitize_string, send_reset_email, validate_email
from .validators import error_response, json_body, required_fields


@api_bp.route("/auth/signup", methods=["POST"])
def signup():
    data = json_body()
    username = sanitize_string(data.get("username", "").strip(), 50)
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    missing = required_fields({"username": username, "email": email, "password": password}, "username", "email", "password")
    if missing:
        return error_response("username, email and password are required")
    if not validate_email(email):
        return error_response("Invalid email format")
    if len(password) < 6:
        return error_response("Password must be at least 6 characters")
    if db.find_one("users", {"email": email}):
        return error_response("User already exists")

    user = {
        "_id": str(uuid.uuid4()),
        "username": username,
        "email": email,
        "password_hash": bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
        "role": "user",
        "created_at": now_iso(),
    }
    db.insert_one("users", user)
    initialize_user_state(user["_id"])
    return jsonify({"message": "User created successfully"}), 201


@api_bp.route("/auth/login", methods=["POST"])
def login():
    data = json_body()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    if not email or not password:
        return error_response("Email and password are required")

    user = db.find_one("users", {"email": email})
    if not user or not bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        return error_response("Invalid credentials", 401)

    user_id = user.get("_id") or user.get("email") or str(uuid.uuid4())
    token = generate_token(user_id, user["role"])
    return jsonify(
        {
            "token": token,
            "user": {
                "id": str(user_id),
                "username": user.get("username", "User"),
                "email": user["email"],
                "role": user.get("role", "user"),
            },
        }
    ), 200


@api_bp.route("/auth/forget-password", methods=["POST"])
def forget_password():
    data = json_body()
    email = data.get("email", "").strip().lower()
    if not email:
        return error_response("Email is required")

    user = db.find_one("users", {"email": email})
    if not user:
        return jsonify({"message": "If a user with that email exists, a reset code has been sent."}), 200

    reset_code = str(random.randint(100000, 999999))
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    db.update_one("users", {"email": email}, {"$set": {"reset_code": reset_code, "reset_code_expires": expires_at}})

    email_sent = False
    email_error = None
    try:
        email_sent, email_error = send_reset_email(email, reset_code)
    except Exception as exc:  # pragma: no cover - defensive path
        email_error = str(exc)

    app_env = os.getenv("APP_ENV", "development").lower()
    if not email_sent and app_env != "production":
        return jsonify(
            {
                "message": "SMTP not configured. Using development fallback reset code.",
                "reset_code": reset_code,
                "email_error": email_error,
            }
        ), 200
    if not email_sent:
        return error_response("Could not send reset email right now. Please try again later.", 500)

    return jsonify({"message": "A reset code has been sent to your email"}), 200


@api_bp.route("/auth/reset-password", methods=["POST"])
def reset_password():
    data = json_body()
    email = data.get("email", "").strip().lower()
    code = data.get("code", "").strip()
    new_password = data.get("new_password", "")

    if not all([email, code, new_password]):
        return error_response("All fields are required")
    if len(new_password) < 6:
        return error_response("Password must be at least 6 characters")

    user = db.find_one("users", {"email": email})
    if not user:
        return error_response("Invalid email or code")
    if user.get("reset_code") != code:
        return error_response("Invalid or expired reset code")

    expires = user.get("reset_code_expires")
    if expires:
        try:
            if datetime.now(timezone.utc) > datetime.fromisoformat(expires):
                return error_response("Reset code has expired. Request a new one.")
        except ValueError:
            return error_response("Invalid reset code metadata. Request a new code.")

    password_hash = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    db.update_one(
        "users",
        {"email": email},
        {"$set": {"password_hash": password_hash, "reset_code": None, "reset_code_expires": None}},
    )
    return jsonify({"message": "Password has been reset successfully"}), 200
