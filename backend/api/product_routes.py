from flask import jsonify

from models import Product
from ml_model import rec_system

from . import api_bp
from .services import cache_similar_products, get_cached_similar_products
from .utils import get_product_record
from .validators import bounded_int_arg


@api_bp.route("/products", methods=["GET"])
def get_products():
    return jsonify(Product.get_all(bounded_int_arg("limit", 20, 1, 100))), 200


@api_bp.route("/products/<product_id>", methods=["GET"])
def get_product_details(product_id):
    product = get_product_record(product_id)
    if not product:
        return jsonify({"message": "Product not found"}), 404
    return jsonify(product), 200


@api_bp.route("/products/<product_id>/similar", methods=["GET"])
def get_similar_products(product_id):
    limit = bounded_int_arg("limit", 5, 1, 20)
    cached = get_cached_similar_products(product_id, limit)
    if cached:
        return jsonify(cached), 200
    results = rec_system.get_similar_products(product_id, limit)
    cache_similar_products(product_id, limit, results)
    return jsonify(results), 200
