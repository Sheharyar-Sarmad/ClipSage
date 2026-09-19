from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import settings
from app.routes import process, chat


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n[app] ClipSage AI service starting...")
    yield
    print("\n[app] ClipSage AI service stopped")


app: FastAPI = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    contact={"name": settings.AUTHOR_NAME, "email": settings.AUTHOR_EMAIL},
    lifespan=lifespan,
)

# CORS 
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(process.router)
app.include_router(chat.router)