"""
Cloudinary Migration Script
---------------------------
Safely migrates existing local and GridFS uploaded images to Cloudinary without deleting the originals.
Can be executed multiple times safely (idempotent & re-runnable).
"""

import os
import sys
import asyncio
import logging
from bson import ObjectId
from dotenv import load_dotenv

# Add parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

load_dotenv(os.path.join(current_dir, ".env"))

import cloudinary
import cloudinary.uploader
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("conferly.migration")

CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "").strip('"\' ')
API_KEY = os.getenv("CLOUDINARY_API_KEY", "").strip('"\' ')
API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "").strip('"\' ')
MONGODB_URI = os.getenv("MONGODB_URI", "")
DB_NAME = os.getenv("MONGODB_DATABASE", "conference_management")
UPLOAD_DIR = os.path.join(current_dir, "uploads")


def init_cloudinary():
    if not (CLOUD_NAME and API_KEY and API_SECRET):
        logger.error("Cloudinary credentials missing in .env. Cannot proceed with migration.")
        sys.exit(1)
    cloudinary.config(
        cloud_name=CLOUD_NAME,
        api_key=API_KEY,
        api_secret=API_SECRET,
        secure=True,
    )
    logger.info("Cloudinary SDK configured for account '%s'", CLOUD_NAME)


async def get_file_bytes_and_name(file_id: str, gridfs: AsyncIOMotorGridFSBucket):
    """Retrieves file bytes from local disk or GridFS."""
    # 1. Check local disk
    if os.path.exists(UPLOAD_DIR):
        for fname in os.listdir(UPLOAD_DIR):
            if fname.startswith(file_id):
                filepath = os.path.join(UPLOAD_DIR, fname)
                with open(filepath, "rb") as f:
                    return f.read(), fname

    # 2. Check GridFS
    try:
        obj_id = ObjectId(file_id)
        grid_out = await gridfs.open_download_stream(obj_id)
        chunks = []
        while chunk := await grid_out.readchunk():
            chunks.append(chunk)
        filename = grid_out.filename or f"proof_{file_id}.png"
        return b"".join(chunks), filename
    except Exception:
        pass

    return None, None


async def run_migration():
    init_cloudinary()

    logger.info("Connecting to MongoDB: %s / %s", MONGODB_URI.split("@")[-1] if "@" in MONGODB_URI else "local", DB_NAME)
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]
    gridfs = AsyncIOMotorGridFSBucket(db)

    # Scan applications collection
    total_scanned = 0
    migrated_count = 0
    already_cloud_count = 0
    skipped_count = 0
    failed_count = 0

    cursor = db.applications.find({})
    async for doc in cursor:
        total_scanned += 1
        doc_id = doc["_id"]
        proof_url = doc.get("screenshotProof", "")
        existing_public_id = doc.get("cloudinaryPublicId")

        # Check if already a Cloudinary URL and public_id exists
        if existing_public_id and "cloudinary.com" in proof_url:
            already_cloud_count += 1
            continue

        # Extract file identifier from URL like "/api/upload/file/<file_id>" or raw file ID
        file_id = proof_url.split("/file/")[-1] if "/file/" in proof_url else proof_url
        if not file_id:
            skipped_count += 1
            continue

        file_bytes, filename = await get_file_bytes_and_name(file_id, gridfs)
        if not file_bytes:
            logger.warning("Could not find file bytes for application %s (fileId: %s). Skipping.", doc_id, file_id)
            skipped_count += 1
            continue

        try:
            logger.info("Uploading proof for application %s (%s)...", doc_id, filename)
            upload_res = cloudinary.uploader.upload(
                file_bytes,
                folder="conferly/proofs",
                resource_type="auto",
                use_filename=True,
                unique_filename=True,
                overwrite=False,
            )

            new_secure_url = upload_res.get("secure_url")
            new_public_id = upload_res.get("public_id")

            # Update MongoDB document without altering original file on disk
            await db.applications.update_one(
                {"_id": doc_id},
                {
                    "$set": {
                        "screenshotProof": new_secure_url,
                        "cloudinaryPublicId": new_public_id,
                        "migratedToCloudinaryAt": upload_res.get("created_at"),
                    }
                },
            )
            migrated_count += 1
            logger.info("Application %s successfully updated with Cloudinary URL: %s", doc_id, new_secure_url)
        except Exception as e:
            logger.error("Failed to migrate application %s: %s", doc_id, e)
            failed_count += 1

    print("\n" + "=" * 55)
    print("           CLOUDINARY MIGRATION REPORT           ")
    print("=" * 55)
    print(f"Total Applications Scanned:  {total_scanned}")
    print(f"Already on Cloudinary:       {already_cloud_count}")
    print(f"Successfully Migrated:       {migrated_count}")
    print(f"Skipped / Missing Local:    {skipped_count}")
    print(f"Failed:                      {failed_count}")
    print("Original local and GridFS files remain completely intact.")
    print("=" * 55 + "\n")


if __name__ == "__main__":
    asyncio.run(run_migration())
