# api/app/services/session.py
# In-memory session store shared by /process and /chat.
# Sessions are wiped when the server restarts.

import uuid
from threading import RLock


_SESSIONS: dict[str, dict] = {}
_LOCK = RLock()


def create(data: dict) -> str:
    # Create a new session, return its ID
    sid = uuid.uuid4().hex
    with _LOCK:
        _SESSIONS[sid] = data
    return sid


def get(sid: str) -> dict | None:
    # Return session data or None if it doesn't exist
    with _LOCK:
        return _SESSIONS.get(sid)


def require(sid: str) -> dict:
    """Like get(), but raises if the session is missing."""
    session = get(sid)
    if session is None:
        raise KeyError(sid)
    return session


def delete(sid: str) -> bool:
    """Remove a session. Returns True if it existed."""
    with _LOCK:
        return _SESSIONS.pop(sid, None) is not None


def count() -> int:
    """Number of live sessions — useful for /health or /stats."""
    with _LOCK:
        return len(_SESSIONS)