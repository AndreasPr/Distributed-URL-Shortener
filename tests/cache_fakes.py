"""Thread-safe Redis model with NX/PX/PXAT and the two cache Lua operations."""

import time
from collections import Counter
from threading import RLock

from redis.exceptions import ConnectionError


class FakeRedis:
    def __init__(self):
        self.values = {}
        self.deadlines = {}
        self.calls = Counter()
        self.lock = RLock()
        self.down = False

    def check(self, name):
        self.calls[name] += 1
        if self.down:
            raise ConnectionError("Redis stopped")

    def get(self, key):
        with self.lock:
            self.check("get")
            if self.deadlines.get(key, float("inf")) <= time.time() * 1000:
                self.values.pop(key, None)
            return self.values.get(key)

    def set(self, key, value, nx=False, px=None, pxat=None, ex=None):
        with self.lock:
            self.check("set")
            if nx and self.get(key) is not None:
                return None
            self.values[key] = value
            self.deadlines[key] = (
                pxat
                if pxat is not None
                else time.time() * 1000
                + (px if px is not None else (ex or 86400) * 1000)
            )
            return True

    def delete(self, *keys):
        with self.lock:
            self.check("delete")
            removed = 0
            for key in keys:
                removed += self.values.pop(key, None) is not None
                self.deadlines.pop(key, None)
            return removed

    def eval(self, script, numkeys, *args):
        with self.lock:
            self.check("eval")
            if numkeys == 2:
                key, lock_key, token, value, deadline = args
                if self.get(lock_key) != token:
                    return 0
                self.set(key, value, pxat=deadline)
                return 1
            key, token = args
            return self.delete(key) if self.get(key) == token else 0

    def ping(self):
        self.check("ping")
        return True

    def dbsize(self):
        self.check("dbsize")
        return len(self.values)
