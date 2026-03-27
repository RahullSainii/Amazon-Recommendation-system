from flask import jsonify, request

from auth import token_required
from database import db
from ml_model import rec_system

from . import api_bp
from .services import build_cart_response, create_order, log_interaction
from .utils import get_or_create_doc, now_iso
from .validators import error_response, json_body


@api_bp.route("/cart", methods=["GET"])
@token_required
def get_cart():
    return jsonify(build_cart_response(request.user_id)), 200


@api_bp.route("/cart", methods=["POST"])
@token_required
def add_to_cart():
    data = json_body()
    product_id = data.get("product_id")
    if not product_id:
        return error_response("product_id is required")

    try:
        quantity = max(1, int(data.get("quantity", 1)))
    except (TypeError, ValueError):
        quantity = 1

    cart = get_or_create_doc("carts", request.user_id, {"items": [], "updated_at": now_iso()})
    items = cart.get("items", [])

    for item in items:
        if item.get("product_id") == product_id:
            item["quantity"] = int(item.get("quantity", 1)) + quantity
            break
    else:
        items.append({"product_id": product_id, "quantity": quantity, "added_at": now_iso()})

    db.update_one("carts", {"user_id": request.user_id}, {"$set": {"items": items, "updated_at": now_iso()}})
    log_interaction(request.user_id, product_id, "add_to_cart")
    return jsonify({"message": "Added to cart"}), 201


@api_bp.route("/cart/<product_id>", methods=["PATCH"])
@token_required
def update_cart_item(product_id):
    data = json_body()
    try:
        quantity = int(data.get("quantity", 1))
    except (TypeError, ValueError):
        quantity = 1

    cart = get_or_create_doc("carts", request.user_id, {"items": [], "updated_at": now_iso()})
    items = cart.get("items", [])
    for item in items:
        if item.get("product_id") == product_id:
            item["quantity"] = max(1, quantity)
            break

    db.update_one("carts", {"user_id": request.user_id}, {"$set": {"items": items, "updated_at": now_iso()}})
    return jsonify({"message": "Cart updated"}), 200


@api_bp.route("/cart/<product_id>", methods=["DELETE"])
@token_required
def remove_cart_item(product_id):
    cart = get_or_create_doc("carts", request.user_id, {"items": [], "updated_at": now_iso()})
    items = [item for item in cart.get("items", []) if item.get("product_id") != product_id]
    db.update_one("carts", {"user_id": request.user_id}, {"$set": {"items": items, "updated_at": now_iso()}})
    return jsonify({"message": "Item removed"}), 200


@api_bp.route("/wishlist", methods=["GET"])
@token_required
def get_wishlist():
    wishlist = get_or_create_doc("wishlists", request.user_id, {"product_ids": [], "updated_at": now_iso()})
    products = [rec_system.get_product_details(pid) for pid in wishlist.get("product_ids", [])]
    products = [product for product in products if product]
    return jsonify({"items": products, "count": len(products)}), 200


@api_bp.route("/wishlist/toggle", methods=["POST"])
@token_required
def toggle_wishlist():
    data = json_body()
    product_id = data.get("product_id")
    if not product_id:
        return error_response("product_id is required")

    wishlist = get_or_create_doc("wishlists", request.user_id, {"product_ids": [], "updated_at": now_iso()})
    product_ids = wishlist.get("product_ids", [])
    in_wishlist = product_id in product_ids

    if in_wishlist:
        product_ids = [pid for pid in product_ids if pid != product_id]
    else:
        product_ids.append(product_id)

    db.update_one(
        "wishlists",
        {"user_id": request.user_id},
        {"$set": {"product_ids": product_ids, "updated_at": now_iso()}},
    )
    return jsonify({"in_wishlist": not in_wishlist, "count": len(product_ids)}), 200


@api_bp.route("/checkout", methods=["POST"])
@token_required
def checkout():
    data = json_body()
    order = create_order(request.user_id, data.get("address", ""), data.get("payment_method", "card"))
    if order is None:
        return error_response("Cart is empty")
    return jsonify({"message": "Checkout successful", "order": order}), 200


@api_bp.route("/orders", methods=["GET"])
@token_required
def get_orders():
    return jsonify(db.find("orders", {"user_id": request.user_id})), 200
