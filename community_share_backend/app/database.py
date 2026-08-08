import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.environ.get("DATABASE_PATH", "/data/app.db")

def get_db_path():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    return DB_PATH

def get_connection():
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    with get_db() as db:
        # Migration: add price_unit columns if missing
        try:
            db.execute("ALTER TABLE items ADD COLUMN price_unit TEXT DEFAULT 'per_day'")
        except sqlite3.OperationalError:
            pass
        try:
            db.execute("ALTER TABLE services ADD COLUMN price_unit TEXT DEFAULT 'per_service'")
        except sqlite3.OperationalError:
            pass
        try:
            db.execute("ALTER TABLE users ADD COLUMN unit TEXT DEFAULT ''")
        except sqlite3.OperationalError:
            pass

        db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            hashed_password TEXT NOT NULL,
            phone TEXT,
            avatar_url TEXT,
            bio TEXT DEFAULT '',
            unit TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS communities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            address TEXT DEFAULT '',
            join_code TEXT UNIQUE NOT NULL,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS community_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            role TEXT DEFAULT 'member',
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(community_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            category TEXT DEFAULT 'other',
            price_per_day REAL DEFAULT 0,
            price_unit TEXT DEFAULT 'per_day',
            image_url TEXT,
            is_available INTEGER DEFAULT 1,
            owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            category TEXT DEFAULT 'other',
            price REAL DEFAULT 0,
            price_unit TEXT DEFAULT 'per_service',
            is_available INTEGER DEFAULT 1,
            provider_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS rental_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
            requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            start_date TEXT,
            end_date TEXT,
            status TEXT DEFAULT 'pending',
            message TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS service_bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
            requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            scheduled_date TEXT,
            status TEXT DEFAULT 'pending',
            message TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reviewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            reviewed_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
            comment TEXT DEFAULT '',
            item_id INTEGER REFERENCES items(id),
            service_id INTEGER REFERENCES services(id),
            rental_id INTEGER REFERENCES rental_requests(id),
            booking_id INTEGER REFERENCES service_bookings(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS discussions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
            author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            pinned INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS discussion_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            discussion_id INTEGER REFERENCES discussions(id) ON DELETE CASCADE,
            author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS item_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
            image_url TEXT NOT NULL,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            token TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            used INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        # Migrations for existing databases
        try:
            db.execute("ALTER TABLE reviews ADD COLUMN rental_id INTEGER REFERENCES rental_requests(id)")
        except Exception:
            pass
        try:
            db.execute("ALTER TABLE reviews ADD COLUMN booking_id INTEGER REFERENCES service_bookings(id)")
        except Exception:
            pass
        try:
            db.execute("ALTER TABLE users ADD COLUMN is_super_admin INTEGER DEFAULT 0")
        except Exception:
            pass
        # Ensure kanwarsandhu@gmail.com is super admin
        db.execute("UPDATE users SET is_super_admin = 1 WHERE email = 'kanwarsandhu@gmail.com'")
