import json


def create_notification(db, user_id: int, type: str, title: str, message: str, data: dict = None):
    db.execute(
        "INSERT INTO notifications (user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?)",
        (user_id, type, title, message, json.dumps(data or {})),
    )


def notify_community(db, community_id: int, exclude_user_id: int, type: str, title: str, message: str, data: dict = None):
    members = db.execute(
        "SELECT user_id FROM community_members WHERE community_id = ? AND user_id != ?",
        (community_id, exclude_user_id),
    ).fetchall()
    for member in members:
        create_notification(db, member["user_id"], type, title, message, data)
