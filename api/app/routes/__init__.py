from fastapi import APIRouter
from app.config.settings import settings

API_PREFIX = f"/api/{settings.APP_VERSION_PREFIX}"


def make_router(name: str, tag: str | None = None) -> APIRouter:
    return APIRouter(prefix=f"{API_PREFIX}/{name}", tags=[tag or name])