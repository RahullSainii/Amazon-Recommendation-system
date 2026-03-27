import json

try:
    from redis import Redis
except ImportError:  # pragma: no cover - dependency may be installed later
    Redis = None

from config import Config


def get_redis():
    if Redis is None or not Config.REDIS_URL:
        return None
    try:
        client = Redis.from_url(Config.REDIS_URL, decode_responses=True, socket_connect_timeout=2, socket_timeout=2)
        client.ping()
        return client
    except Exception:
        return None


redis_client = get_redis()


def redis_available():
    return redis_client is not None


def cache_get_json(key):
    if redis_client is None:
        return None
    value = redis_client.get(key)
    if not value:
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return None


def cache_set_json(key, value, ttl_seconds):
    if redis_client is None:
        return False
    redis_client.setex(key, ttl_seconds, json.dumps(value))
    return True


def increment_counter(key, amount=1):
    if redis_client is None:
        return None
    return redis_client.incrby(key, amount)
