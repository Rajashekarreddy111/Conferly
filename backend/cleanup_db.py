"""
Conferly - Database Cleanup Script
Deletes everything in the database EXCEPT the admin credentials.
"""
import sys
import os
import asyncio

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.core.security import get_password_hash
from app.database.connection import connect_to_mongo, close_mongo_connection, get_database
from app.database.indexes import init_indexes

async def cleanup_database():
    print(f"Connecting to MongoDB at {settings.MONGODB_URI}...")
    await connect_to_mongo()
    await init_indexes()
    db = get_database()

    print("\n--- Cleaning up database collections ---")

    # 1. Delete all Conferences
    conf_res = await db.conferences.delete_many({})
    print(f"[CLEARED] Conferences deleted: {conf_res.deleted_count}")

    # 2. Delete all Applications
    app_res = await db.applications.delete_many({})
    print(f"[CLEARED] Applications deleted: {app_res.deleted_count}")

    # 3. Delete all Students
    stu_res = await db.students.delete_many({})
    print(f"[CLEARED] Students deleted: {stu_res.deleted_count}")

    # 4. Delete all Coordinators
    coord_res = await db.coordinators.delete_many({})
    print(f"[CLEARED] Coordinators deleted: {coord_res.deleted_count}")

    # 5. Delete all Sections
    sec_res = await db.sections.delete_many({})
    print(f"[CLEARED] Sections deleted: {sec_res.deleted_count}")

    # 6. Delete all Academic Years
    ay_res = await db.academic_years.delete_many({})
    print(f"[CLEARED] Academic Years deleted: {ay_res.deleted_count}")

    # 7. Delete all Notifications
    notif_res = await db.notifications.delete_many({})
    print(f"[CLEARED] Notifications deleted: {notif_res.deleted_count}")

    # 8. Delete all Base Papers
    paper_res = await db.base_papers.delete_many({})
    print(f"[CLEARED] Base Papers deleted: {paper_res.deleted_count}")

    # 9. Clean Users collection: keep ONLY the specific Admin user
    admin_emails = ["medurimounika4@gmail.com"]
    user_del_res = await db.users.delete_many({"role": {"$ne": "admin"}})
    print(f"[CLEARED] Non-admin users deleted: {user_del_res.deleted_count}")

    # Remove any admin that is not in the approved admin list (including admin@college.edu)
    stray_admins_res = await db.users.delete_many({"email": {"$nin": admin_emails}})
    if stray_admins_res.deleted_count > 0:
        print(f"[CLEARED] Unrecognized or obsolete admin accounts deleted: {stray_admins_res.deleted_count}")

    # 9. Ensure the approved admin account exists with valid password hash
    mounika_hash = get_password_hash("Cse@1234")

    admins = [
        {
            "username": "medurimounika4",
            "email": "medurimounika4@gmail.com",
            "name": "Mounika Meduri",
            "role": "admin",
            "passwordHash": mounika_hash,
            "status": "Active"
        }
    ]

    for a in admins:
        await db.users.update_one(
            {"email": a["email"]},
            {"$set": a},
            upsert=True
        )
    print("[PRESERVED] Admin credentials verified and active:")
    for a in admins:
        print(f"  - {a['email']} (role: {a['role']})")

    # 10. Clean local uploads directory
    uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
    if os.path.exists(uploads_dir):
        cleared_files = 0
        for f in os.listdir(uploads_dir):
            file_path = os.path.join(uploads_dir, f)
            try:
                if os.path.isfile(file_path):
                    os.unlink(file_path)
                    cleared_files += 1
            except Exception:
                pass
        print(f"[CLEARED] Local uploads files cleared: {cleared_files}")

    print("\n=======================================================")
    print("Database cleanup completed successfully!")
    print("Everything has been deleted EXCEPT the Admin credentials.")
    print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(cleanup_database())
