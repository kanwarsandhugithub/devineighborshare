from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.schemas import UserRegister, UserLogin, Token, UserOut
from app.utils.auth import get_password_hash, verify_password, create_access_token, get_current_user_id
from app.database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=Token)
async def register(user: UserRegister):
    with get_db() as db:
        existing = db.execute("SELECT id FROM users WHERE email = ?", (user.email,)).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        hashed = get_password_hash(user.password)
        cursor = db.execute(
            "INSERT INTO users (email, full_name, hashed_password, phone) VALUES (?, ?, ?, ?)",
            (user.email, user.full_name, hashed, user.phone),
        )
        user_id = cursor.lastrowid
    token = create_access_token({"sub": str(user_id)})
    return Token(access_token=token)


@router.post("/login", response_model=Token)
async def login(user: UserLogin):
    with get_db() as db:
        row = db.execute("SELECT id, hashed_password FROM users WHERE email = ?", (user.email,)).fetchone()
    if not row or not verify_password(user.password, row["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": str(row["id"])})
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
async def get_me(user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        avg = db.execute("SELECT AVG(rating) as avg_rating FROM reviews WHERE reviewed_user_id = ?", (user_id,)).fetchone()
    return UserOut(
        id=row["id"],
        email=row["email"],
        full_name=row["full_name"],
        phone=row["phone"],
        avatar_url=row["avatar_url"],
        bio=row["bio"],
        created_at=row["created_at"],
        avg_rating=round(avg["avg_rating"], 1) if avg["avg_rating"] else None,
    )
