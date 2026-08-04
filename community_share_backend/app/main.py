import os
from pathlib import Path
from dotenv import load_dotenv
# Load .env from the backend root (parent of the app/ directory)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routes import auth, users, communities, items, services, discussions, messages, reviews, uploads
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="ViciLend API")

# Configure CORS for production domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://vicinityshare.com", "https://vicilend.com", "http://vicinityshare.com"],  # Allow both new and old domains
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


@app.on_event("startup")
async def startup():
    init_db()


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(communities.router)
app.include_router(items.router)
app.include_router(services.router)
app.include_router(discussions.router)
app.include_router(messages.router)
app.include_router(reviews.router)
app.include_router(uploads.router)
