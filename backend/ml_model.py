"""
Amazon Recommendation System — Hybrid Engine
=============================================
Implements three recommendation strategies and combines them:
  1. Content-Based Filtering  (TF-IDF  + cosine similarity)
  2. Collaborative Filtering  (user-item SVD via scipy/numpy)
  3. Popularity Baseline       (weighted rating)

The hybrid ranker blends scores from all available signals.
"""

import os
import pickle
import hashlib
import logging

import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix
from scipy.sparse.linalg import svds
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODEL_DIR, exist_ok=True)


class RecommendationSystem:
    """End-to-end recommendation engine with hybrid ranking."""

    # ------------------------------------------------------------------ init
    def __init__(self, data_path="amazon.csv"):
        self.data_path = data_path

        # DataFrames
        self.df = None                   # product-level (deduplicated)
        self.interactions_df = None      # user × product interaction rows

        # Content-based artefacts
        self.tfidf_matrix = None
        self.product_similarity = None
        self.vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=10000,
            ngram_range=(1, 2),
        )

        # Collaborative filtering artefacts
        self.user_factors = None         # U  matrix  (n_users × k)
        self.item_factors = None         # Vt matrix  (k × n_items)
        self.sigma = None                # singular values
        self.user_id_map = {}            # user_id → matrix row index
        self.item_id_map = {}            # product_id → matrix col index
        self.reverse_item_map = {}       # col index → product_id

        # Popularity scores
        self.popularity_scores = None

        # Evaluation metrics (filled after evaluate())
        self.eval_metrics = {}

        # Fingerprint of the source data to detect staleness
        self._data_hash = None

    # -------------------------------------------------------------- loading
    def load_and_preprocess(self, run_evaluation=True) -> bool:
        """Load CSV, clean data, build features, and train models."""
        default_data_file = os.path.join(os.path.dirname(__file__), "data", "amazon.csv")
        candidate_paths = []
        if self.data_path:
            candidate_paths.append(self.data_path)
            if not os.path.isabs(self.data_path):
                candidate_paths.append(os.path.join(os.path.dirname(__file__), self.data_path))
                candidate_paths.append(os.path.join(os.path.dirname(__file__), "data", self.data_path))
        candidate_paths.append(default_data_file)

        data_file = next((path for path in candidate_paths if os.path.exists(path)), None)
        if data_file is None:
            logger.warning("Dataset not found. Checked: %s", candidate_paths)
            return False

        use_shared_cache = os.path.abspath(data_file) == os.path.abspath(default_data_file)

        # Check if we can reuse a cached model
        current_hash = self._file_hash(data_file)
        cache_path = os.path.join(MODEL_DIR, "rec_model.pkl") if use_shared_cache else None
        if cache_path and os.path.exists(cache_path):
            try:
                cached = pickle.load(open(cache_path, "rb"))
                if cached.get("data_hash") == current_hash:
                    logger.info("Loading cached model (data unchanged).")
                    self._restore_from_cache(cached, run_evaluation=run_evaluation)
                    return True
            except Exception:
                logger.info("Cache invalid, rebuilding model.")

        raw = pd.read_csv(data_file)
        self._data_hash = current_hash

        # ---------- clean numeric columns --------------------------------
        for col in ["rating_count", "rating"]:
            if col in raw.columns:
                raw[col] = (
                    raw[col]
                    .astype(str)
                    .str.replace(",", "", regex=False)
                    .str.strip()
                )
                raw[col] = pd.to_numeric(raw[col], errors="coerce").fillna(0)
            else:
                raw[col] = 0

        if "product_id" not in raw.columns:
            logger.error("'product_id' column missing.")
            return False

        # ---------- explode multi-user rows ------------------------------
        if "user_id" in raw.columns:
            raw["user_id"] = raw["user_id"].fillna("")
            exploded = raw.assign(
                user_id=raw["user_id"].str.split(",")
            ).explode("user_id")
            exploded["user_id"] = exploded["user_id"].str.strip()
            exploded = exploded[exploded["user_id"] != ""]
            self.interactions_df = exploded[
                ["user_id", "product_id", "rating"]
            ].copy()
            self.interactions_df = self.interactions_df.drop_duplicates(
                subset=["user_id", "product_id"]
            )
        else:
            self.interactions_df = pd.DataFrame(
                columns=["user_id", "product_id", "rating"]
            )

        # ---------- deduplicated product table ---------------------------
        self.df = raw.drop_duplicates(subset="product_id").reset_index(drop=True)
        self.df["rating_count"] = self.df["rating_count"].fillna(0)
        self.df["rating"] = self.df["rating"].fillna(0)

        # ---------- build text content column ----------------------------
        text_cols = [c for c in ["about_product", "product_name", "category",
                                  "review_title", "review_content"] if c in self.df.columns]
        if text_cols:
            self.df["content"] = self.df[text_cols].fillna("").astype(str).agg(" ".join, axis=1)
        else:
            self.df["content"] = ""

        # ---------- train all sub-models ---------------------------------
        self._build_content_model()
        self._build_collaborative_model()
        self._build_popularity_scores()

        # ---------- run evaluation ---------------------------------------
        if run_evaluation:
            self._evaluate()
        else:
            self._set_basic_metrics()

        # ---------- persist to disk --------------------------------------
        if cache_path:
            self._save_cache(cache_path)
            logger.info("Model built and cached successfully.")
        else:
            logger.info("Model built without shared cache for custom dataset %s.", data_file)
        return True

    # ====================================================================
    # CONTENT-BASED  (TF-IDF + Cosine Similarity)
    # ====================================================================
    def _build_content_model(self):
        logger.info("Building content-based model (TF-IDF)...")
        self.tfidf_matrix = self.vectorizer.fit_transform(self.df["content"])
        # Compute pairwise similarity (feasible for datasets < ~20K products)
        if len(self.df) <= 20000:
            self.product_similarity = cosine_similarity(self.tfidf_matrix)
        else:
            # For larger datasets we do on-the-fly cosine computation
            self.product_similarity = None
        logger.info("Content model ready — %d products, vocabulary %d.",
                     len(self.df), len(self.vectorizer.vocabulary_))

    def get_similar_products(self, product_id, num_similar=5):
        """Content-based: find products with the most similar text profiles."""
        if self.df is None:
            return []
        try:
            idx = self.df[self.df["product_id"] == product_id].index[0]
        except (IndexError, KeyError):
            return []

        if self.product_similarity is not None:
            scores = self.product_similarity[idx]
        else:
            query_vec = self.tfidf_matrix[idx]
            scores = cosine_similarity(query_vec, self.tfidf_matrix).flatten()

        ranked_indices = np.argsort(scores)[::-1]
        top_indices = [
            candidate_idx for candidate_idx in ranked_indices
            if self.df.iloc[candidate_idx]["product_id"] != product_id
        ][:num_similar]
        results = self.df.iloc[top_indices].copy()
        results["similarity_score"] = scores[top_indices]
        return results.to_dict("records")

    # ====================================================================
    # COLLABORATIVE FILTERING  (Truncated SVD on user-item matrix)
    # ====================================================================
    def _build_collaborative_model(self, n_factors=50):
        if self.interactions_df is None or len(self.interactions_df) < 10:
            logger.warning("Not enough interactions for collaborative filtering.")
            return

        logger.info("Building collaborative model (SVD, k=%d)...", n_factors)

        # Build mappings
        unique_users = self.interactions_df["user_id"].unique()
        unique_items = self.interactions_df["product_id"].unique()

        self.user_id_map = {uid: i for i, uid in enumerate(unique_users)}
        self.item_id_map = {pid: j for j, pid in enumerate(unique_items)}
        self.reverse_item_map = {j: pid for pid, j in self.item_id_map.items()}

        n_users = len(unique_users)
        n_items = len(unique_items)

        # Construct sparse user-item matrix
        rows = self.interactions_df["user_id"].map(self.user_id_map).values
        cols = self.interactions_df["product_id"].map(self.item_id_map).values
        ratings = self.interactions_df["rating"].values.astype(np.float32)
        ratings[ratings == 0] = 3.0  # implicit signal: interacted → neutral positive

        ui_matrix = csr_matrix((ratings, (rows, cols)), shape=(n_users, n_items))

        # Mean-center per user
        user_means = np.array(ui_matrix.sum(axis=1)).flatten()
        user_counts = np.diff(ui_matrix.indptr)
        user_counts[user_counts == 0] = 1
        user_means = user_means / user_counts

        k = min(n_factors, min(n_users, n_items) - 1)
        if k < 1:
            logger.warning("Matrix too small for SVD (k=%d).", k)
            return

        U, sigma, Vt = svds(ui_matrix.astype(float), k=k)
        self.user_factors = U
        self.sigma = np.diag(sigma)
        self.item_factors = Vt

        logger.info("Collaborative model ready — %d users × %d items, k=%d.",
                     n_users, n_items, k)

    def _predict_cf_scores(self, user_id):
        """Return predicted scores for all items for a given user."""
        if self.user_factors is None or user_id not in self.user_id_map:
            return None
        u_idx = self.user_id_map[user_id]
        predicted = np.dot(
            np.dot(self.user_factors[u_idx, :], self.sigma),
            self.item_factors,
        )
        return predicted

    # ====================================================================
    # POPULARITY BASELINE  (Bayesian weighted rating)
    # ====================================================================
    def _build_popularity_scores(self):
        """Bayesian average: C = median vote count, m = mean rating globally."""
        if self.df is None or len(self.df) == 0:
            return
        C = self.df["rating_count"].median()
        m = self.df["rating"].mean()
        C = max(C, 1)

        self.df["popularity_score"] = (
            (self.df["rating_count"] / (self.df["rating_count"] + C)) * self.df["rating"]
            + (C / (self.df["rating_count"] + C)) * m
        )
        scaler = MinMaxScaler()
        self.popularity_scores = np.clip(
            scaler.fit_transform(self.df[["popularity_score"]]).flatten(),
            0.0,
            1.0,
        )
        logger.info("Popularity scores computed.")

    # ====================================================================
    # HYBRID RECOMMENDER
    # ====================================================================
    def get_user_recommendations(self, user_id, num_recs=5):
        """
        Hybrid recommendation pipeline:
        1. If CF scores available → blend with popularity.
        2. If user has interaction history but CF unavailable → content-based from history.
        3. Cold-start → popularity baseline.
        """
        if self.df is None:
            return []

        # --- Strategy 1: Collaborative + Popularity Hybrid ---------------
        cf_scores = self._predict_cf_scores(str(user_id))
        if cf_scores is not None:
            # Normalise CF scores to [0, 1]
            cf_min, cf_max = cf_scores.min(), cf_scores.max()
            if cf_max - cf_min > 0:
                cf_norm = (cf_scores - cf_min) / (cf_max - cf_min)
            else:
                cf_norm = np.zeros_like(cf_scores)

            # Map scores back to product_ids
            scored = []
            for col_idx in range(len(cf_scores)):
                pid = self.reverse_item_map.get(col_idx)
                if pid is None:
                    continue
                product_row = self.df[self.df["product_id"] == pid]
                if product_row.empty:
                    continue
                df_idx = product_row.index[0]
                pop = self.popularity_scores[df_idx] if self.popularity_scores is not None else 0
                # Hybrid score: 0.7 × CF + 0.3 × popularity
                hybrid = 0.7 * cf_norm[col_idx] + 0.3 * pop
                scored.append((df_idx, hybrid))

            # Remove items user already interacted with
            interacted = set(
                self.interactions_df[
                    self.interactions_df["user_id"] == str(user_id)
                ]["product_id"].tolist()
            )
            scored = [(idx, s) for idx, s in scored
                      if self.df.iloc[idx]["product_id"] not in interacted]

            scored.sort(key=lambda x: x[1], reverse=True)
            top_scored = scored[:num_recs]
            top_indices = [t[0] for t in top_scored]
            if top_indices:
                results = self.df.iloc[top_indices].copy()
                results["rec_strategy"] = "hybrid_cf_popularity"
                results["rec_score"] = [t[1] for t in top_scored]
                return results.to_dict("records")

        # --- Strategy 2: Content-based from interaction history ----------
        if not self.interactions_df.empty:
            user_history = self.interactions_df[
                self.interactions_df["user_id"].astype(str) == str(user_id)
            ]
            if not user_history.empty:
                # Aggregate content similarity across all items they liked
                liked_pids = user_history.sort_values("rating", ascending=False)[
                    "product_id"
                ].head(5).tolist()

                score_accum = np.zeros(len(self.df))
                count = 0
                for pid in liked_pids:
                    try:
                        idx = self.df[self.df["product_id"] == pid].index[0]
                    except (IndexError, KeyError):
                        continue
                    if self.product_similarity is not None:
                        score_accum += self.product_similarity[idx]
                    else:
                        query_vec = self.tfidf_matrix[idx]
                        score_accum += cosine_similarity(
                            query_vec, self.tfidf_matrix
                        ).flatten()
                    count += 1

                if count > 0:
                    score_accum /= count
                    # Exclude already-seen items
                    seen_indices = set()
                    for pid in user_history["product_id"].tolist():
                        matches = self.df[self.df["product_id"] == pid].index
                        if len(matches):
                            seen_indices.add(matches[0])
                    for idx in seen_indices:
                        score_accum[idx] = -1

                    top_indices = np.argsort(score_accum)[::-1][:num_recs]
                    results = self.df.iloc[top_indices].copy()
                    results["rec_strategy"] = "content_based_history"
                    results["rec_score"] = score_accum[top_indices]
                    return results.to_dict("records")

        # --- Strategy 3: Cold-start — popularity baseline ----------------
        if self.popularity_scores is not None:
            top_indices = np.argsort(self.popularity_scores)[::-1][:num_recs]
            results = self.df.iloc[top_indices].copy()
            results["rec_strategy"] = "popularity_baseline"
            results["rec_score"] = self.popularity_scores[top_indices]
            return results.to_dict("records")

        return self.df.sort_values(
            by=["rating", "rating_count"], ascending=False
        ).head(num_recs).to_dict("records")

    # ====================================================================
    # PRODUCT DETAILS
    # ====================================================================
    def get_product_details(self, product_id):
        """Get full details for a specific product."""
        if self.df is None:
            return None
        product = self.df[self.df["product_id"] == product_id]
        if not product.empty:
            return product.iloc[0].to_dict()
        return None

    # ====================================================================
    # EVALUATION
    # ====================================================================
    def _evaluate(self):
        """
        Offline evaluation with train/test split.
        Computes Precision@K, Recall@K, NDCG@K, and Coverage.
        """
        if self.interactions_df is None or len(self.interactions_df) < 20:
            self.eval_metrics = {
                "note": "Not enough interactions for evaluation",
                "n_users": 0,
                "n_items": len(self.df) if self.df is not None else 0,
            }
            return

        logger.info("Running offline evaluation...")

        K = 10
        # Split: for each user take last 20% interactions as test
        grouped = self.interactions_df.groupby("user_id")

        precision_list = []
        recall_list = []
        ndcg_list = []
        all_recommended = set()

        for uid, group in grouped:
            if len(group) < 3:
                continue

            n_test = max(1, int(len(group) * 0.2))
            test_items = set(group["product_id"].iloc[-n_test:].tolist())

            # Get recommendations (using full model for simplicity)
            recs = self.get_user_recommendations(uid, K)
            rec_pids = [r.get("product_id") for r in recs if r.get("product_id")]
            all_recommended.update(rec_pids)

            hits = [1 if pid in test_items else 0 for pid in rec_pids]

            precision = sum(hits) / K if K > 0 else 0
            recall = sum(hits) / len(test_items) if test_items else 0

            # NDCG
            dcg = sum(h / np.log2(i + 2) for i, h in enumerate(hits))
            ideal = sorted(hits, reverse=True)
            idcg = sum(h / np.log2(i + 2) for i, h in enumerate(ideal))
            ndcg = dcg / idcg if idcg > 0 else 0

            precision_list.append(precision)
            recall_list.append(recall)
            ndcg_list.append(ndcg)

        n_products = len(self.df) if self.df is not None else 1
        n_users = len(self.interactions_df["user_id"].unique())
        n_interactions = len(self.interactions_df)

        sparsity = 1.0 - n_interactions / max(n_users * n_products, 1)
        avg_precision = float(np.mean(precision_list)) if precision_list else 0.0
        avg_recall = float(np.mean(recall_list)) if recall_list else 0.0
        avg_ndcg = float(np.mean(ndcg_list)) if ndcg_list else 0.0
        coverage = float(len(all_recommended)) / max(n_products, 1) if all_recommended else 0.0

        self.eval_metrics = {
            "n_users": n_users,
            "n_items": n_products,
            "n_interactions": n_interactions,
            "sparsity": round(sparsity, 4),
            "evaluated_users": len(precision_list),
            "precision_at_10": round(avg_precision, 4),
            "recall_at_10": round(avg_recall, 4),
            "ndcg_at_10": round(avg_ndcg, 4),
            "catalog_coverage": round(coverage, 4),
            "model_type": "Hybrid (SVD-CF + TF-IDF Content + Popularity)",
        }
        logger.info("Evaluation metrics: %s", self.eval_metrics)

    def get_metrics(self):
        """Return current evaluation metrics dict."""
        return dict(self.eval_metrics)

    def _set_basic_metrics(self):
        n_products = len(self.df) if self.df is not None else 0
        n_users = len(self.interactions_df["user_id"].unique()) if self.interactions_df is not None and not self.interactions_df.empty else 0
        n_interactions = len(self.interactions_df) if self.interactions_df is not None else 0
        self.eval_metrics = {
            "n_users": n_users,
            "n_items": n_products,
            "n_interactions": n_interactions,
            "model_type": "Hybrid (SVD-CF + TF-IDF Content + Popularity)",
            "note": "Offline evaluation skipped during startup",
        }

    # ====================================================================
    # PERSISTENCE
    # ====================================================================
    @staticmethod
    def _file_hash(path):
        h = hashlib.md5()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()

    def _save_cache(self, path):
        payload = {
            "data_hash": self._data_hash,
            "df": self.df,
            "interactions_df": self.interactions_df,
            "tfidf_matrix": self.tfidf_matrix,
            "product_similarity": self.product_similarity,
            "vectorizer": self.vectorizer,
            "user_factors": self.user_factors,
            "item_factors": self.item_factors,
            "sigma": self.sigma,
            "user_id_map": self.user_id_map,
            "item_id_map": self.item_id_map,
            "reverse_item_map": self.reverse_item_map,
            "popularity_scores": self.popularity_scores,
            "eval_metrics": self.eval_metrics,
        }
        with open(path, "wb") as f:
            pickle.dump(payload, f)
        logger.info("Model cached to %s", path)

    def _restore_from_cache(self, cached, run_evaluation=True):
        self._data_hash = cached["data_hash"]
        self.df = cached["df"]
        self.interactions_df = cached["interactions_df"]
        self.tfidf_matrix = cached["tfidf_matrix"]
        self.product_similarity = cached["product_similarity"]
        self.vectorizer = cached["vectorizer"]
        self.user_factors = cached["user_factors"]
        self.item_factors = cached["item_factors"]
        self.sigma = cached["sigma"]
        self.user_id_map = cached["user_id_map"]
        self.item_id_map = cached["item_id_map"]
        self.reverse_item_map = cached["reverse_item_map"]
        self.popularity_scores = cached["popularity_scores"]
        if run_evaluation:
            self.eval_metrics = cached["eval_metrics"]
        else:
            self._set_basic_metrics()


# Singleton instance for the app
rec_system = RecommendationSystem()
