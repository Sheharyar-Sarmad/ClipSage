# api/app/main.py

from contextlib import asynccontextmanager
from collections import defaultdict
from time import time

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.config.settings import settings
from app.routes import process, chat

# Lifespan

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n[app] ClipSage AI service starting...")
    yield
    print("\n[app] ClipSage AI service stopped")

# Simple in-memory rate limiter (per IP)
class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Lightweight per-IP rate limiter.
    - Window: 60 seconds
    - Max requests per window: 30
    Good enough for a demo on Groq's free tier — not a production WAF.
    """

    def __init__(self, app, max_requests: int = 30, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        # Skip rate-limiting for preflight + docs + health
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path
        if path.startswith(("/docs", "/redoc", "/openapi.json", "/health")):
            return await call_next(request)

        client_ip = (
            request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or (request.client.host if request.client else "unknown")
        )

        now = time()
        window_start = now - self.window_seconds

        # Drop old hits
        self._hits[client_ip] = [t for t in self._hits[client_ip] if t > window_start]

        if len(self._hits[client_ip]) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Rate limit exceeded. Max {self.max_requests} requests "
                    f"per {self.window_seconds}s per IP. Please slow down."
                ),
            )

        self._hits[client_ip].append(now)
        return await call_next(request)

# App
app: FastAPI = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    contact={"name": settings.AUTHOR_NAME, "email": settings.AUTHOR_EMAIL},
    lifespan=lifespan,
)

# CORS — locked to the deployed frontend + local dev

ALLOWED_ORIGINS = [
    "https://clipsage-gamma.vercel.app",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Rate limiter (attached AFTER CORS so preflight is unaffected)
app.add_middleware(RateLimitMiddleware, max_requests=30, window_seconds=60)

# Routes

app.include_router(process.router)
app.include_router(chat.router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": settings.APP_NAME}