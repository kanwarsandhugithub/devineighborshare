#!/usr/bin/env python3
"""
Script to clear demo data (items, services, discussions, comments, rentals, bookings)
while keeping users and communities intact.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "vicilend.db")

def clear_demo_data():
    """Clear all demo data from the database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Clear data in order of dependencies
        print("Clearing comments...")
        cursor.execute("DELETE FROM comments")
        
        print("Clearing discussions...")
        cursor.execute("DELETE FROM discussions")
        
        print("Clearing rental requests...")
        cursor.execute("DELETE FROM rental_requests")
        
        print("Clearing service bookings...")
        cursor.execute("DELETE FROM service_bookings")
        
        print("Clearing reviews...")
        cursor.execute("DELETE FROM reviews")
        
        print("Clearing services...")
        cursor.execute("DELETE FROM services")
        
        print("Clearing items...")
        cursor.execute("DELETE FROM items")
        
        print("Clearing messages...")
        cursor.execute("DELETE FROM messages")
        
        conn.commit()
        
        # Verify clearing
        for table in ["items", "services", "discussions", "comments", "rental_requests", "service_bookings", "reviews", "messages"]:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"  {table}: {count} rows remaining")
        
        print("\n✅ Demo data cleared successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    clear_demo_data()
