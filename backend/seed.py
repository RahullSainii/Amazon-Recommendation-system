import pandas as pd
from database import db
from models import User, Product
import bcrypt
import os
import uuid

def seed_db():
    print("Starting seeding process...")
    
    # Define paths
    csv_path = os.path.join(os.path.dirname(__file__), 'data', 'amazon.csv')
    
    # 1. Seed Products from amazon.csv if available
    try:
        if os.path.exists(csv_path):
            print(f"Loading data from {csv_path}...")
            df = pd.read_csv(csv_path)
            # Postgres JSONB rejects NaN, so normalize missing CSV values to null.
            df = df.astype(object).where(pd.notnull(df), None)
            products = df.to_dict('records')
            # Clear existing
            db.delete_many("products", {})
            db.insert_many("products", products)
            print(f"Inserted {len(products)} products.")
        else:
            print(f"Error: Dataset not found at {csv_path}")
            print("Please ensure the amazon.csv file is in the backend/data/ directory.")
    except Exception as e:
        print(f"Error seeding products: {e}")

    # 2. Seed Admin and Sample User
    try:
        db.delete_many("users", {})
        
        password = "password123".encode('utf-8')
        hashed = bcrypt.hashpw(password, bcrypt.gensalt()).decode('utf-8')
        
        admin_user = {
            "_id": str(uuid.uuid4()),
            "username": "admin",
            "email": "admin@amazon.com",
            "password_hash": hashed,
            "role": "admin"
        }
        
        sample_user = {
            "_id": str(uuid.uuid4()),
            "username": "rahul",
            "email": "rahul@example.com",
            "password_hash": hashed,
            "role": "user"
        }
        
        db.insert_one("users", admin_user)
        db.insert_one("users", sample_user)
        print("Inserted admin and sample users.")
    except Exception as e:
        print(f"Error seeding users: {e}")

    print("Seeding complete.")

if __name__ == "__main__":
    seed_db()
