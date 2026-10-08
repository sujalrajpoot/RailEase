import os
from dotenv import load_dotenv
load_dotenv()
import redis

r = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"), decode_responses=True)

TTL = int(os.getenv("HOLD_TTL_SECONDS", 600))
# delete only if value matches (owner-safe release)
_RELEASE = "if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end"

def seat_key(train, date, cls, seat): return f"seat_hold:{train}:{date}:{cls}:{seat}"

def release(key, hold_id):
    try: return r.eval(_RELEASE, 1, key, hold_id)
    except Exception:  # fakeredis without Lua support (tests only)
        if r.get(key) == hold_id: return r.delete(key)
        return 0
