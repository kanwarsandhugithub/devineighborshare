from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.schemas.schemas import DiscussionCreate, DiscussionOut, CommentCreate, CommentOut
from app.utils.auth import get_current_user_id
from app.utils.notifications import notify_community
from app.database import get_db

router = APIRouter(prefix="/api/discussions", tags=["discussions"])


def _check_membership(db, community_id: int, user_id: int):
    member = db.execute(
        "SELECT id FROM community_members WHERE community_id = ? AND user_id = ?",
        (community_id, user_id),
    ).fetchone()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this community")


@router.post("/", response_model=DiscussionOut)
async def create_discussion(data: DiscussionCreate, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        _check_membership(db, data.community_id, current_user_id)
        cursor = db.execute(
            "INSERT INTO discussions (community_id, author_id, title, content, category) VALUES (?, ?, ?, ?, ?)",
            (data.community_id, current_user_id, data.title, data.content, data.category),
        )
        discussion_id = cursor.lastrowid
        notify_community(
            db,
            data.community_id,
            current_user_id,
            "discussion",
            "New community post",
            f"A new post '{data.title}' was shared in your community",
            {"type": "discussion", "id": discussion_id, "community_id": data.community_id},
        )
        row = db.execute(
            """SELECT d.*, u.full_name as author_name, u.avatar_url as author_avatar_url,
               (SELECT ROUND(AVG(rv.rating), 1) FROM reviews rv WHERE rv.reviewed_user_id = d.author_id) as author_avg_rating,
               (SELECT COUNT(*) FROM discussion_comments WHERE discussion_id = d.id) as comment_count
               FROM discussions d JOIN users u ON u.id = d.author_id WHERE d.id = ?""",
            (discussion_id,),
        ).fetchone()
    return _discussion_from_row(row)


@router.get("/community/{community_id}", response_model=List[DiscussionOut])
async def get_community_discussions(community_id: int, category: str = None, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        _check_membership(db, community_id, current_user_id)
        query = """SELECT d.*, u.full_name as author_name, u.avatar_url as author_avatar_url,
                   (SELECT ROUND(AVG(rv.rating), 1) FROM reviews rv WHERE rv.reviewed_user_id = d.author_id) as author_avg_rating,
                   (SELECT COUNT(*) FROM discussion_comments WHERE discussion_id = d.id) as comment_count
                   FROM discussions d JOIN users u ON u.id = d.author_id
                   WHERE d.community_id = ?"""
        params: list = [community_id]
        if category:
            query += " AND d.category = ?"
            params.append(category)
        query += " ORDER BY d.pinned DESC, d.created_at DESC"
        rows = db.execute(query, params).fetchall()
    return [_discussion_from_row(r) for r in rows]


@router.get("/{discussion_id}", response_model=DiscussionOut)
async def get_discussion(discussion_id: int):
    with get_db() as db:
        row = db.execute(
            """SELECT d.*, u.full_name as author_name, u.avatar_url as author_avatar_url,
               (SELECT ROUND(AVG(rv.rating), 1) FROM reviews rv WHERE rv.reviewed_user_id = d.author_id) as author_avg_rating,
               (SELECT COUNT(*) FROM discussion_comments WHERE discussion_id = d.id) as comment_count
               FROM discussions d JOIN users u ON u.id = d.author_id WHERE d.id = ?""",
            (discussion_id,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Discussion not found")
    return _discussion_from_row(row)


@router.delete("/{discussion_id}")
async def delete_discussion(discussion_id: int, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        d = db.execute("SELECT * FROM discussions WHERE id = ?", (discussion_id,)).fetchone()
        if not d:
            raise HTTPException(status_code=404, detail="Discussion not found")
        if d["author_id"] != current_user_id:
            raise HTTPException(status_code=403, detail="Not the author")
        db.execute("DELETE FROM discussions WHERE id = ?", (discussion_id,))
    return {"status": "deleted"}


# Comments
@router.post("/{discussion_id}/comments", response_model=CommentOut)
async def add_comment(discussion_id: int, data: CommentCreate, current_user_id: int = Depends(get_current_user_id)):
    with get_db() as db:
        d = db.execute("SELECT community_id FROM discussions WHERE id = ?", (discussion_id,)).fetchone()
        if not d:
            raise HTTPException(status_code=404, detail="Discussion not found")
        _check_membership(db, d["community_id"], current_user_id)
        cursor = db.execute(
            "INSERT INTO discussion_comments (discussion_id, author_id, content) VALUES (?, ?, ?)",
            (discussion_id, current_user_id, data.content),
        )
        row = db.execute(
            """SELECT dc.*, u.full_name as author_name, u.avatar_url as author_avatar_url,
               (SELECT ROUND(AVG(rv.rating), 1) FROM reviews rv WHERE rv.reviewed_user_id = dc.author_id) as author_avg_rating
               FROM discussion_comments dc
               JOIN users u ON u.id = dc.author_id WHERE dc.id = ?""",
            (cursor.lastrowid,),
        ).fetchone()
    return CommentOut(
        id=row["id"], discussion_id=row["discussion_id"],
        author_id=row["author_id"], content=row["content"],
        created_at=row["created_at"], author_name=row["author_name"],
        author_avatar_url=row["author_avatar_url"], author_avg_rating=row["author_avg_rating"],
    )


@router.get("/{discussion_id}/comments", response_model=List[CommentOut])
async def get_comments(discussion_id: int):
    with get_db() as db:
        rows = db.execute(
            """SELECT dc.*, u.full_name as author_name, u.avatar_url as author_avatar_url,
               (SELECT ROUND(AVG(rv.rating), 1) FROM reviews rv WHERE rv.reviewed_user_id = dc.author_id) as author_avg_rating
               FROM discussion_comments dc
               JOIN users u ON u.id = dc.author_id
               WHERE dc.discussion_id = ? ORDER BY dc.created_at ASC""",
            (discussion_id,),
        ).fetchall()
    return [
        CommentOut(
            id=r["id"], discussion_id=r["discussion_id"],
            author_id=r["author_id"], content=r["content"],
            created_at=r["created_at"], author_name=r["author_name"],
            author_avatar_url=r["author_avatar_url"], author_avg_rating=r["author_avg_rating"],
        )
        for r in rows
    ]


def _discussion_from_row(row):
    return DiscussionOut(
        id=row["id"], community_id=row["community_id"],
        author_id=row["author_id"], title=row["title"],
        content=row["content"], category=row["category"],
        pinned=bool(row["pinned"]), created_at=row["created_at"],
        author_name=row["author_name"],
        author_avatar_url=row["author_avatar_url"],
        author_avg_rating=row["author_avg_rating"],
        comment_count=row["comment_count"],
    )
