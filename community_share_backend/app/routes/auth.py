from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.schemas import UserRegister, UserLogin, Token, UserOut, ForgotPasswordRequest, ResetPasswordRequest
from app.utils.auth import get_password_hash, verify_password, create_access_token, get_current_user_id
from app.utils.email import send_password_reset_email
from app.database import get_db
import secrets
from datetime import datetime, timedelta, timezone

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


@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    with get_db() as db:
        row = db.execute("SELECT id, full_name FROM users WHERE email = ?", (req.email,)).fetchone()
        if not row:
            # Return success even if email not found to prevent email enumeration
            return {"message": "If an account with that email exists, a reset link has been generated.", "reset_token": None}
        # Generate a secure token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        # Invalidate any existing unused tokens for this user
        db.execute("UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0", (row["id"],))
        db.execute(
            "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
            (row["id"], token, expires_at.isoformat()),
        )
    # Send password reset email
    send_password_reset_email(req.email, row["full_name"], token)
    return {"message": "If an account with that email exists, a reset link has been sent to your email."}


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    with get_db() as db:
        row = db.execute(
            "SELECT id, user_id, expires_at FROM password_reset_tokens WHERE token = ? AND used = 0",
            (req.token,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        expires_at = datetime.fromisoformat(row["expires_at"]).replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(status_code=400, detail="Reset token has expired")
        hashed = get_password_hash(req.new_password)
        db.execute("UPDATE users SET hashed_password = ? WHERE id = ?", (hashed, row["user_id"]))
        db.execute("UPDATE password_reset_tokens SET used = 1 WHERE id = ?", (row["id"],))
    return {"message": "Password has been reset successfully"}


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
