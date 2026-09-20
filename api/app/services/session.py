# api/app/services/session.py
# In-memory session store shared by /process and /chat.
# Sessions are wiped when the server restarts.

import uuid
from threading import RLock

_SESSIONS: dict[str, dict] = {}
_LOCK = RLock()

def create(data: dict) -> str:
    sid = uuid.uuid4().hex
    with _LOCK:
        _SESSIONS[sid] = data
    return sid

def get(sid: str) -> dict | None:
    with _LOCK:
        return _SESSIONS.get(sid)

def require(sid: str) -> dict:
    session = get(sid)
    if session is None:
        raise KeyError(sid)
    return session

def delete(sid: str) -> bool:
    with _LOCK:
        return _SESSIONS.pop(sid, None) is not None

def count() -> int:
    with _LOCK:
        return len(_SESSIONS)
