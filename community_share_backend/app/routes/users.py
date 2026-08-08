from fastapi import APIRouter, HTTPException, Depends
from app.schemas.schemas import UserOut, UserUpdate
from app.utils.auth import get_current_user_id
from app.database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/{user_id}", response_model=UserOut)
async def get_user(user_id: int):
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
        unit=row["unit"] if "unit" in row.keys() else "",
        created_at=row["created_at"],
        avg_rating=round(avg["avg_rating"], 1) if avg["avg_rating"] else None,
    )


@router.put("/me", response_model=UserOut)
async def update_profile(update: UserUpdate, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        row = db.execute("SELECT * FROM users WHERE id = ?", (current_user_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        fields = {}
        if update.full_name is not None:
            fields["full_name"] = update.full_name
        if update.phone is not None:
            fields["phone"] = update.phone
        if update.bio is not None:
            fields["bio"] = update.bio
        if update.unit is not None:
            fields["unit"] = update.unit
        if update.avatar_url is not None:
            fields["avatar_url"] = update.avatar_url
        if fields:
            set_clause = ", ".join(f"{k} = ?" for k in fields)
            values = list(fields.values()) + [current_user_id]
            db.execute(f"UPDATE users SET {set_clause} WHERE id = ?", values)
        updated = db.execute("SELECT * FROM users WHERE id = ?", (current_user_id,)).fetchone()
        avg = db.execute("SELECT AVG(rating) as avg_rating FROM reviews WHERE reviewed_user_id = ?", (current_user_id,)).fetchone()
    return UserOut(
        id=updated["id"],
        email=updated["email"],
        full_name=updated["full_name"],
        phone=updated["phone"],
        avatar_url=updated["avatar_url"],
        bio=updated["bio"],
        unit=updated["unit"] if "unit" in updated.keys() else "",
        created_at=updated["created_at"],
        avg_rating=round(avg["avg_rating"], 1) if avg["avg_rating"] else None,
    )
