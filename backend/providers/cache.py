"""Tiny in-memory TTL cache. Not thread-safe beyond asyncio single-loop use."""
import time

_store: dict = {}


def get(key):
    hit = _store.get(key)
    if hit and hit[0] > time.time():
        return hit[1]
    return None


def put(key, value, ttl: float):
    _store[key] = (time.time() + ttl, value)
    return value
