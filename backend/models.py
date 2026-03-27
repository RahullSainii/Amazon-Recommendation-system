from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime

class User:
    def __init__(self, username, email, password_hash, role="user", _id=None):
        self.username = username
        self.email = email
        self.password_hash = password_hash
        self.role = role
        self._id = _id if _id else str(datetime.utcnow().timestamp())

    def to_dict(self):
        return {
            "_id": str(self._id),
            "username": self.username,
            "email": self.email,
            "password_hash": self.password_hash,
            "role": self.role
        }

class Product:
    def __init__(self, product_id, title, description, price, image_url, category, _id=None):
        self.product_id = product_id
        self.title = title
        self.description = description
        self.price = price
        self.image_url = image_url
        self.category = category
        self._id = _id if _id else str(datetime.utcnow().timestamp())

    def to_dict(self):
        return {
            "_id": str(self._id),
            "product_id": self.product_id,
            "title": self.title,
            "description": self.description,
            "price": self.price,
            "image_url": self.image_url,
            "category": self.category
        }

    @staticmethod
    def get_all(limit=20):
        from database import db
        products = db.get_collection("products")
        return products[:limit] if limit else products

class Rating:
    def __init__(self, user_id, product_id, rating, timestamp=None, _id=None):
        self.user_id = user_id
        self.product_id = product_id
        self.rating = rating
        self.timestamp = timestamp if timestamp else datetime.utcnow().isoformat()
        self._id = _id if _id else str(datetime.utcnow().timestamp())

    def to_dict(self):
        return {
            "_id": str(self._id),
            "user_id": str(self.user_id),
            "product_id": str(self.product_id),
            "rating": self.rating,
            "timestamp": self.timestamp
        }

class History:
    def __init__(self, user_id, product_id, action_type, timestamp=None, _id=None):
        self.user_id = user_id
        self.product_id = product_id
        self.action_type = action_type  # e.g., 'view', 'add_to_cart', 'purchase'
        self.timestamp = timestamp if timestamp else datetime.utcnow().isoformat()
        self._id = _id if _id else str(datetime.utcnow().timestamp())

    def to_dict(self):
        return {
            "_id": str(self._id),
            "user_id": str(self.user_id),
            "product_id": str(self.product_id),
            "action_type": self.action_type,
            "timestamp": self.timestamp
        }
