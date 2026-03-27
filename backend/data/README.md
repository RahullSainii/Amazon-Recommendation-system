# Backend Data Notes

This directory is intentionally kept out of GitHub for large or generated files.

Typical local-only files include:

- `amazon.csv`
- `products.json`
- `users.json`
- `preferences.json`
- `carts.json`
- `wishlists.json`
- `orders.json`
- `interactions.json`
- `recommendation_history.json`

How to restore locally:

1. Place `amazon.csv` in this directory if you want to rebuild product data from the original dataset.
2. Run `python seed.py` from the `backend` directory to repopulate local data sources.
3. If Postgres is configured, the app can bootstrap existing JSON documents into Postgres on startup.

For GitHub, keep only source code and configuration templates in the repo.
