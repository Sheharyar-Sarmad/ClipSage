# api/server.py
# Local development entry point.
# In production, the platform runs: uvicorn app.main:app --host 0.0.0.0 --port $PORT

import uvicorn
from app.config.settings import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0" if settings.is_production else "127.0.0.1",
        port=8000,
        reload=settings.is_development,
    )