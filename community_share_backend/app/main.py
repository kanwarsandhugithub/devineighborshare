from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routes import auth, users, communities, items, services, discussions, messages, reviews, uploads
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="ViciLend API")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
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
