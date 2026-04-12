import secrets
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.schemas.schemas import CommunityCreate, CommunityOut, CommunityJoin
from app.utils.auth import get_current_user_id
from app.database import get_db

router = APIRouter(prefix="/api/communities", tags=["communities"])


@router.post("/", response_model=CommunityOut)
async def create_community(data: CommunityCreate, current_user_id: int = Depends(get_current_user_id)):
    join_code = secrets.token_urlsafe(6)
    with get_db() as db:
        cursor = db.execute(
            "INSERT INTO communities (name, description, address, join_code, created_by) VALUES (?, ?, ?, ?, ?)",
            (data.name, data.description, data.address, join_code, current_user_id),
        )
        community_id = cursor.lastrowid
        db.execute(
            "INSERT INTO community_members (community_id, user_id, role) VALUES (?, ?, 'admin')",
            (community_id, current_user_id),
        )
        row = db.execute("SELECT * FROM communities WHERE id = ?", (community_id,)).fetchone()
    return CommunityOut(
        id=row["id"], name=row["name"], description=row["description"],
        address=row["address"], join_code=row["join_code"],
        created_by=row["created_by"], created_at=row["created_at"], member_count=1,
    )


@router.post("/join", response_model=CommunityOut)
async def join_community(data: CommunityJoin, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        community = db.execute("SELECT * FROM communities WHERE join_code = ?", (data.join_code,)).fetchone()
        if not community:
            raise HTTPException(status_code=404, detail="Invalid join code")
        existing = db.execute(
            "SELECT id FROM community_members WHERE community_id = ? AND user_id = ?",
            (community["id"], current_user_id),
        ).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Already a member")
        db.execute(
            "INSERT INTO community_members (community_id, user_id) VALUES (?, ?)",
            (community["id"], current_user_id),
        )
        count = db.execute(
            "SELECT COUNT(*) as cnt FROM community_members WHERE community_id = ?", (community["id"],)
        ).fetchone()["cnt"]
    return CommunityOut(
        id=community["id"], name=community["name"], description=community["description"],
        address=community["address"], join_code=community["join_code"],
        created_by=community["created_by"], created_at=community["created_at"],
        member_count=count,
    )


@router.get("/my", response_model=List[CommunityOut])
async def get_my_communities(current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        rows = db.execute(
            """SELECT c.*, (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) as member_count
               FROM communities c
               JOIN community_members cm ON cm.community_id = c.id
               WHERE cm.user_id = ?
               ORDER BY c.created_at DESC""",
            (current_user_id,),
        ).fetchall()
    return [
        CommunityOut(
            id=r["id"], name=r["name"], description=r["description"],
            address=r["address"], join_code=r["join_code"],
            created_by=r["created_by"], created_at=r["created_at"],
            member_count=r["member_count"],
        )
        for r in rows
    ]


@router.get("/all", response_model=List[CommunityOut])
async def get_all_communities(current_user_id: int = Depends(get_current_user_id)):
    """Admin-only: returns all communities. User must be admin of at least one community."""
    with get_db() as db:
        # Check if user is admin of any community
        is_admin = db.execute(
            "SELECT id FROM community_members WHERE user_id = ? AND role = 'admin' LIMIT 1",
            (current_user_id,),
        ).fetchone()
        if not is_admin:
            raise HTTPException(status_code=403, detail="Admin access required")
        rows = db.execute(
            """SELECT c.*,
                      (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) as member_count,
                      (SELECT full_name FROM users WHERE id = c.created_by) as creator_name
               FROM communities c
               ORDER BY c.created_at DESC"""
        ).fetchall()
    return [
        CommunityOut(
            id=r["id"], name=r["name"], description=r["description"],
            address=r["address"], join_code=r["join_code"],
            created_by=r["created_by"], created_at=r["created_at"],
            member_count=r["member_count"],
        )
        for r in rows
    ]


@router.get("/{community_id}", response_model=CommunityOut)
async def get_community(community_id: int, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        row = db.execute("SELECT * FROM communities WHERE id = ?", (community_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Community not found")
        member = db.execute(
            "SELECT id FROM community_members WHERE community_id = ? AND user_id = ?",
            (community_id, current_user_id),
        ).fetchone()
        if not member:
            raise HTTPException(status_code=403, detail="Not a member of this community")
        count = db.execute(
            "SELECT COUNT(*) as cnt FROM community_members WHERE community_id = ?", (community_id,)
        ).fetchone()["cnt"]
    return CommunityOut(
        id=row["id"], name=row["name"], description=row["description"],
        address=row["address"], join_code=row["join_code"],
        created_by=row["created_by"], created_at=row["created_at"],
        member_count=count,
    )


@router.get("/{community_id}/members")
async def get_members(community_id: int, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        # Allow access if user is a member of this community OR is admin of any community
        member = db.execute(
            "SELECT id FROM community_members WHERE community_id = ? AND user_id = ?",
            (community_id, current_user_id),
        ).fetchone()
        if not member:
            is_admin = db.execute(
                "SELECT id FROM community_members WHERE user_id = ? AND role = 'admin' LIMIT 1",
                (current_user_id,),
            ).fetchone()
            if not is_admin:
                raise HTTPException(status_code=403, detail="Not a member")
        rows = db.execute(
            """SELECT u.id, u.full_name, u.email, u.avatar_url, cm.role, cm.joined_at
               FROM users u JOIN community_members cm ON cm.user_id = u.id
               WHERE cm.community_id = ? ORDER BY cm.joined_at""",
            (community_id,),
        ).fetchall()
    return [dict(r) for r in rows]
