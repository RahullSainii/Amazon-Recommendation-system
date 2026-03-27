"""
Unit tests for the recommendation system and API routes.
Run: python -m pytest tests/ -v
"""

import os
import sys
import json
import pytest
import numpy as np
import pandas as pd

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from ml_model import RecommendationSystem
from config import Config


# ============================================================
# ML MODEL TESTS
# ============================================================

class TestRecommendationSystem:
    """Tests for the core ML recommendation engine."""

    @pytest.fixture
    def sample_csv(self, tmp_path):
        """Create a minimal test CSV dataset."""
        data = {
            "product_id": [f"P{i:03d}" for i in range(30)],
            "product_name": [f"Product {i}" for i in range(30)],
            "category": ["Electronics"] * 10 + ["Books"] * 10 + ["Clothing"] * 10,
            "about_product": [f"Description for product {i} with some detail" for i in range(30)],
            "rating": [round(3.0 + np.random.random() * 2, 1) for _ in range(30)],
            "rating_count": [f"{np.random.randint(100, 10000):,}" for _ in range(30)],
            "user_id": [
                ",".join([f"U{j:03d}" for j in range(i % 5, i % 5 + 3)])
                for i in range(30)
            ],
            "discounted_price": [f"₹{np.random.randint(100, 5000)}" for _ in range(30)],
            "actual_price": [f"₹{np.random.randint(5000, 10000)}" for _ in range(30)],
            "img_link": ["https://example.com/img.jpg"] * 30,
        }
        csv_path = tmp_path / "amazon.csv"
        pd.DataFrame(data).to_csv(csv_path, index=False)
        return str(csv_path)

    def test_load_and_preprocess(self, sample_csv):
        rec = RecommendationSystem(data_path=sample_csv)
        result = rec.load_and_preprocess()
        assert result is True
        assert rec.df is not None
        assert len(rec.df) == 30

    def test_rating_count_parsed(self, sample_csv):
        rec = RecommendationSystem(data_path=sample_csv)
        rec.load_and_preprocess()
        # rating_count should be numeric, not contain commas
        assert rec.df["rating_count"].dtype in [np.float64, np.int64, np.float32]
        assert all(rec.df["rating_count"] >= 0)

    def test_interactions_exploded(self, sample_csv):
        rec = RecommendationSystem(data_path=sample_csv)
        rec.load_and_preprocess()
        # Each product had 3 users, so interactions should be > 30
        assert rec.interactions_df is not None
        assert len(rec.interactions_df) > 30

    def test_content_model_built(self, sample_csv):
        rec = RecommendationSystem(data_path=sample_csv)
        rec.load_and_preprocess()
        assert rec.tfidf_matrix is not None
        assert rec.tfidf_matrix.shape[0] == 30

    def test_collaborative_model_built(self, sample_csv):
        rec = RecommendationSystem(data_path=sample_csv)
        rec.load_and_preprocess()
        assert rec.user_factors is not None
        assert rec.item_factors is not None

    def test_popularity_scores(self, sample_csv):
        rec = RecommendationSystem(data_path=sample_csv)
        rec.load_and_preprocess()
        assert rec.popularity_scores is not None
        assert len(rec.popularity_scores) == 30
        assert all(0 <= s <= 1 for s in rec.popularity_scores)

    def test_get_similar_products(self, sample_csv):
        rec = RecommendationSystem(data_path=sample_csv)
        rec.load_and_preprocess()
        similar = rec.get_similar_products("P000", num_similar=5)
        assert isinstance(similar, list)
        assert len(similar) <= 5
        # Should not contain the product itself
        assert all(p.get("product_id") != "P000" for p in similar)

    def test_get_similar_products_invalid_id(self, sample_csv):
        rec = RecommendationSystem(data_path=sample_csv)
        rec.load_and_preprocess()
        similar = rec.get_similar_products("NONEXISTENT")
        assert similar == []

    def test_get_user_recommendations(self, sample_csv):
        rec = RecommendationSystem(data_path=sample_csv)
        rec.load_and_preprocess()
        recs = rec.get_user_recommendations("U001", num_recs=5)
        assert isinstance(recs, list)
        assert len(recs) <= 5
        # Each rec should have recommendation metadata
        for r in recs:
            assert "product_id" in r

    def test_cold_start_recommendations(self, sample_csv):
        rec = RecommendationSystem(data_path=sample_csv)
        rec.load_and_preprocess()
        recs = rec.get_user_recommendations("BRAND_NEW_USER", num_recs=5)
        assert isinstance(recs, list)
        assert len(recs) > 0  # Should fall back to popularity

    def test_get_product_details(self, sample_csv):
        rec = RecommendationSystem(data_path=sample_csv)
        rec.load_and_preprocess()
        details = rec.get_product_details("P005")
        assert details is not None
        assert details["product_id"] == "P005"

    def test_get_product_details_nonexistent(self, sample_csv):
        rec = RecommendationSystem(data_path=sample_csv)
        rec.load_and_preprocess()
        details = rec.get_product_details("NONEXISTENT")
        assert details is None

    def test_eval_metrics(self, sample_csv):
        rec = RecommendationSystem(data_path=sample_csv)
        rec.load_and_preprocess()
        metrics = rec.get_metrics()
        assert isinstance(metrics, dict)
        assert "n_items" in metrics

    def test_load_nonexistent_file(self):
        rec = RecommendationSystem(data_path="/nonexistent/path.csv")
        result = rec.load_and_preprocess()
        assert result is False

    def test_model_caching(self, sample_csv, tmp_path):
        """Model should cache and restore correctly."""
        rec1 = RecommendationSystem(data_path=sample_csv)
        rec1.load_and_preprocess()
        recs1 = rec1.get_user_recommendations("U001", 5)

        # Second load should use cache
        rec2 = RecommendationSystem(data_path=sample_csv)
        rec2.load_and_preprocess()
        recs2 = rec2.get_user_recommendations("U001", 5)

        # Results should be consistent
        ids1 = [r["product_id"] for r in recs1]
        ids2 = [r["product_id"] for r in recs2]
        assert ids1 == ids2


# ============================================================
# UTILITY TESTS
# ============================================================

class TestUtilities:
    """Tests for route utility functions."""

    def test_parse_price(self):
        from routes import _parse_price
        assert _parse_price("₹1,299") == 1299.0
        assert _parse_price("$49.99") == 49.99
        assert _parse_price(None) == 0.0
        assert _parse_price("") == 0.0
        assert _parse_price("free") == 0.0

    def test_validate_email(self):
        from routes import _validate_email
        assert _validate_email("user@example.com") is True
        assert _validate_email("a@b.co") is True
        assert _validate_email("notanemail") is False
        assert _validate_email("") is False

    def test_sanitize_string(self):
        from routes import _sanitize_string
        assert len(_sanitize_string("a" * 1000, 100)) == 100
        assert _sanitize_string("  hello  ") == "hello"


# ============================================================
# CONFIG TESTS
# ============================================================

class TestConfig:
    def test_config_defaults(self):
        assert Config.APP_NAME == "AmazonRecs" or isinstance(Config.APP_NAME, str)
        assert isinstance(Config.SMTP_PORT, int)

    def test_config_model_dir(self):
        assert os.path.basename(Config.MODEL_CACHE_DIR) == "models"
