# Amazon Recommendation System

An end-to-end recommendation platform built with a hybrid ML engine, a Flask API, and a React storefront. The project now includes hosted-database readiness, explainable recommendations, experiment tracking, and dashboard analytics.

## What It Does

- Personalized recommendations with hybrid collaborative filtering, content similarity, and popularity fallback
- Product catalog, product details, similar products, cart, wishlist, checkout, and order history
- JWT auth with signup, login, and password reset
- Explainable recommendations such as preference match, browsing-based recs, and trending picks
- Experiment assignment for recommendation variants
- Analytics inside the dashboard for impressions, clicks, add-to-cart, purchases, CTR, and conversion
- Supabase Postgres and Render Key Value compatible configuration

## Architecture

### Recommender

- Collaborative filtering: truncated SVD on the user-item interaction matrix
- Content-based filtering: TF-IDF over product text with cosine similarity
- Popularity baseline: Bayesian-weighted score
- Ranking: strategy-specific recommendations plus preference-aware filtering

### Application Stack

- Frontend: React, React Router, Axios
- Backend: Flask, Flask-Limiter, JWT auth
- ML: pandas, NumPy, scipy, scikit-learn
- Storage: Supabase Postgres as primary store
- Cache and counters: Render Key Value / Redis-compatible store

## Project Structure

```text
amazon-recsys/
├─ backend/
│  ├─ app.py
│  ├─ ml_model.py
│  ├─ database.py
│  ├─ pg_db.py
│  ├─ redis_client.py
│  ├─ seed.py
│  ├─ api/
│  └─ data/
├─ frontend/
│  ├─ src/
│  └─ .env.example
└─ README.md
```

## Local Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
python app.py
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm start
```

## Required Backend Environment Variables

```env
APP_ENV=development
APP_NAME=AmazonRecs
PORT=5000
SECRET_KEY=replace-me
CORS_ORIGINS=http://localhost:3000

DB_BACKEND=postgres
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
REDIS_URL=redis://...

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_SENDER_EMAIL=
```

If your database password contains special characters like `@` or `#`, URL-encode them inside `DATABASE_URL`.

## Core API Endpoints

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/forget-password`
- `POST /api/auth/reset-password`

### Catalog and Recommendations

- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/products/:id/similar`
- `GET /api/recommendations`
- `GET /api/preferences`
- `PUT /api/preferences`

### Shopping

- `GET /api/cart`
- `POST /api/cart`
- `PATCH /api/cart/:product_id`
- `DELETE /api/cart/:product_id`
- `GET /api/wishlist`
- `POST /api/wishlist/toggle`
- `POST /api/checkout`
- `GET /api/orders`

### ML and Analytics

- `GET /api/ml/metrics`
- `GET /api/ml/health`
- `POST /api/interactions`
- `GET /api/analytics/summary`

## Deployment Plan

### Backend

Recommended host: Render Web Service

- Root directory: `backend`
- Runtime: `Python`
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app`
- Health check path: `/api/ml/health`

Production backend env vars:

```env
APP_ENV=production
APP_NAME=AmazonRecs
SECRET_KEY=your-production-secret
CORS_ORIGINS=https://your-frontend-domain
DB_BACKEND=postgres
DATABASE_URL=your-supabase-postgres-url
DIRECT_URL=your-supabase-postgres-url
REDIS_URL=your-render-keyvalue-url
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email
SMTP_PASSWORD=your-app-password
SMTP_SENDER_EMAIL=your-email
```

### Frontend

Recommended host: Render Static Site

- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Publish directory: `build`

Production frontend env vars:

```env
REACT_APP_API_URL=https://your-backend-domain
```

If you deploy the frontend as a static site on Render and use React Router, add a rewrite rule in the Render dashboard so `/*` rewrites to `/index.html`. Render documents static site rewrites for client-side routing here: https://render.com/docs/redirects-rewrites

Render static site setup: https://render.com/docs/static-sites  
Render Blueprint reference: https://render.com/docs/blueprint-spec  
Render web service requirement to bind to `0.0.0.0` and the default public web service behavior: https://render.com/docs/web-services

## Production Verification Checklist

After deployment, verify these flows:

1. Home page loads products
2. Signup and login return a JWT successfully
3. Dashboard loads recommendations
4. Recommendation explanations are visible
5. Analytics cards render without errors
6. Product details page loads similar items
7. Add to cart, wishlist, and checkout work
8. Password reset works if SMTP is configured
9. CORS only allows your deployed frontend origin

## Interview Talking Points

- Why a hybrid recommender was chosen instead of only collaborative filtering
- Cold-start handling with popularity fallback
- Preference-aware re-ranking
- Explainable recommendations for better product trust
- Experiment assignment and analytics inside the same product dashboard
- Migration path from JSON storage to hosted Postgres and Redis-compatible caching

## Future Improvements

- Move the transitional document-style Postgres layer to fully relational SQL tables
- Add charts for analytics trends
- Add recommendation feedback such as "not interested"
- Add scheduled retraining and model versioning
- Add production monitoring and error tracking
