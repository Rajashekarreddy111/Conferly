import os
import io
import logging
from typing import Dict, Any, Optional
import cloudinary
import cloudinary.uploader
from fastapi import HTTPException, status
from app.core.config import settings

logger = logging.getLogger("conferly.cloudinary")

# Configure Cloudinary credentials if available
if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
    logger.info("Cloudinary service initialized with cloud name: %s", settings.CLOUDINARY_CLOUD_NAME)
else:
    logger.warning("Cloudinary credentials missing in environment. Using fallback mode.")


def is_cloudinary_configured() -> bool:
    """Returns True if Cloudinary credentials are fully configured."""
    return bool(
        settings.CLOUDINARY_CLOUD_NAME
        and settings.CLOUDINARY_API_KEY
        and settings.CLOUDINARY_API_SECRET
    )


def validate_image_file(filename: str, file_size: int):
    """
    Validates file type and size against institutional security thresholds.
    Max size: 5MB.
    Allowed extensions: .png, .jpg, .jpeg, .pdf, .webp.
    """
    ext = os.path.splitext(filename)[1].lower() if filename else ""
    if ext not in settings.ALLOWED_EXTENSIONS:
        allowed = ", ".join(settings.ALLOWED_EXTENSIONS)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file format '{ext}'. Allowed formats: {allowed}",
        )

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file_size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB.",
        )


async def upload_image_to_cloudinary(
    file_bytes: bytes,
    filename: str,
    folder: str = "conferly/proofs",
    resource_type: str = "auto",
) -> Dict[str, Any]:
    """
    Uploads an image/document buffer directly to Cloudinary.
    Returns a dict containing 'secure_url', 'public_id', 'format', and 'bytes'.
    """
    validate_image_file(filename, len(file_bytes))

    if not is_cloudinary_configured():
        logger.warning("Cloudinary not configured. Fallback upload will be used.")
        return {
            "secure_url": f"/api/upload/file/mock_{os.path.basename(filename)}",
            "public_id": f"mock_{os.path.basename(filename)}",
            "format": os.path.splitext(filename)[1].replace(".", ""),
            "bytes": len(file_bytes),
        }

    try:
        # Determine resource type: images and pdfs
        file_io = io.BytesIO(file_bytes)
        upload_result = cloudinary.uploader.upload(
            file_io,
            folder=folder,
            resource_type=resource_type,
            use_filename=True,
            unique_filename=True,
            overwrite=False,
        )

        return {
            "secure_url": upload_result.get("secure_url"),
            "public_id": upload_result.get("public_id"),
            "format": upload_result.get("format"),
            "bytes": upload_result.get("bytes", len(file_bytes)),
        }
    except Exception as exc:
        logger.error("Cloudinary upload failed for %s: %s", filename, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Cloudinary image upload failed: {str(exc)}",
        )


async def delete_image_from_cloudinary(public_id: Optional[str]) -> bool:
    """
    Deletes an asset from Cloudinary by its public_id.
    Safely ignores empty or mock IDs.
    """
    if not public_id or public_id.startswith("mock_") or public_id.startswith("local_"):
        return True

    if not is_cloudinary_configured():
        logger.warning("Cloudinary not configured, skipping deletion of %s", public_id)
        return True

    try:
        res = cloudinary.uploader.destroy(public_id)
        result_status = res.get("result")
        logger.info("Deleted Cloudinary image %s: %s", public_id, result_status)
        return result_status in ("ok", "not found")
    except Exception as exc:
        logger.error("Failed to delete Cloudinary asset %s: %s", public_id, exc)
        return False
