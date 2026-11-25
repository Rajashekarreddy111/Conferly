"""
Conferly - Database Seed Script
Ensures Admin credentials exist.
All other collections remain empty for fresh production use.
"""
import sys
import os
import asyncio

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.core.security import get_password_hash
from app.database.connection import connect_to_mongo, get_database
from app.database.indexes import init_indexes

async def seed_records(db):
    print("Initializing / Preserving Admin credentials...")

    mounika_admin_hash = get_password_hash("Cse@1234")

    # Only Admin credentials are seeded / preserved
    admin_users = [
        {
            "username": "medurimounika4",
            "email": "medurimounika4@gmail.com",
            "name": "Mounika Meduri",
            "role": "admin",
            "passwordHash": mounika_admin_hash,
            "status": "Active"
        }
    ]

    for u in admin_users:
        await db.users.update_one(
            {"email": u["email"]},
            {"$set": u},
            upsert=True
        )

    # Remove obsolete admin account if present
    await db.users.delete_many({"email": "admin@college.edu"})

    print("[OK] Admin credentials verified and active.")
    print("\n=======================================================")
    print("Database ready with Admin credentials:")
    print("  Admin: medurimounika4@gmail.com / Cse@1234")
    print("=======================================================\n")

async def seed_database():
    print(f"Connecting to MongoDB at {settings.MONGODB_URI}...")
    await connect_to_mongo()
    await init_indexes()
    db = get_database()
    await seed_records(db)

if __name__ == "__main__":
    asyncio.run(seed_database())
