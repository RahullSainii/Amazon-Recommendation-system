import os
import re
import smtplib
from datetime import datetime, timezone
from email.message import EmailMessage

from database import db
from ml_model import rec_system


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def parse_price(value):
    if value is None:
        return 0.0
    cleaned = re.sub(r"[^0-9.]", "", str(value))
    if cleaned.count(".") > 1:
        parts = cleaned.split(".")
        cleaned = parts[0] + "." + "".join(parts[1:])
    try:
        return float(cleaned) if cleaned else 0.0
    except ValueError:
        return 0.0


def validate_email(email):
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email or ""))


def sanitize_string(value, max_length=500):
    if not isinstance(value, str):
        return str(value)[:max_length]
    return value.strip()[:max_length]


def get_or_create_doc(collection, user_id, default_payload=None):
    doc = db.find_one(collection, {"user_id": user_id})
    if doc:
        return doc
    payload = {"user_id": user_id}
    if default_payload:
        payload.update(default_payload)
    db.insert_one(collection, payload)
    return payload


def hydrate_cart_items(items):
    hydrated = []
    subtotal = 0.0
    for item in items:
        product_id = item.get("product_id")
        quantity = int(item.get("quantity", 1))
        product = rec_system.get_product_details(product_id)
        if not product:
            continue
        unit_price = parse_price(product.get("discounted_price") or product.get("price"))
        line_total = unit_price * quantity
        subtotal += line_total
        hydrated.append(
            {
                "product_id": product_id,
                "quantity": quantity,
                "unit_price": unit_price,
                "line_total": line_total,
                "product": product,
            }
        )
    return hydrated, subtotal


def send_reset_email(recipient_email, reset_code):
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    sender_email = os.getenv("SMTP_SENDER_EMAIL", smtp_username)
    app_name = os.getenv("APP_NAME", "AmazonRecs")

    if not smtp_username or not smtp_password or not sender_email:
        return False, "SMTP credentials are not configured"
    if "your-email@gmail.com" in smtp_username or "your-app-password" in smtp_password:
        return False, "SMTP is using placeholder credentials in .env"

    msg = EmailMessage()
    msg["Subject"] = f"{app_name} Password Reset Code"
    msg["From"] = sender_email
    msg["To"] = recipient_email
    msg.set_content(
        f"""Your {app_name} password reset code is: {reset_code}

This code expires in 10 minutes.

If you did not request this reset, you can ignore this email.
"""
    )

    with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.send_message(msg)

    return True, None
