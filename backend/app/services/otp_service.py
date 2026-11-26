import hashlib
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Tuple, Optional
from fastapi import HTTPException, status
from app.database.connection import get_database
from app.services.email_service import send_otp_email

logger = logging.getLogger("conferly.otp")

OTP_EXPIRY_MINUTES = 10
RESET_TOKEN_EXPIRY_MINUTES = 15
RESEND_COOLDOWN_SECONDS = 60
MAX_HOURLY_REQUESTS = 5
MAX_ATTEMPTS = 5

def hash_otp(raw_otp: str, email: str) -> str:
    """Computes a salted SHA-256 hash of the OTP tied to the email."""
    salt = f"conferly_otp_{email.lower().strip()}"
    return hashlib.sha256(f"{raw_otp}:{salt}".encode("utf-8")).hexdigest()

async def request_otp(email: str, purpose: str, user_name: Optional[str] = None) -> Tuple[bool, str, int]:
    """
    Validates cooldown and rate limits, cancels any active OTP for this email/purpose,
    hashes and stores a new 6-digit OTP, and dispatches the email via Brevo.
    Returns: (success: bool, message: str, cooldown_remaining: int)
    """
    db = get_database()
    clean_email = email.lower().strip()
    now = datetime.now(timezone.utc)

    # 1. Check 60-second cooldown
    latest_otp = await db["otps"].find_one(
        {"email": clean_email, "purpose": purpose},
        sort=[("createdAt", -1)]
    )
    if latest_otp and "createdAt" in latest_otp:
        created_at = latest_otp["createdAt"]
        if not created_at.tzinfo:
            created_at = created_at.replace(tzinfo=timezone.utc)
        elapsed = (now - created_at).total_seconds()
        if elapsed < RESEND_COOLDOWN_SECONDS:
            remaining = int(RESEND_COOLDOWN_SECONDS - elapsed)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining} seconds before requesting a new OTP."
            )

    # 2. Check hourly rate limit (max 5 OTPs per hour)
    one_hour_ago = now - timedelta(hours=1)
    recent_count = await db["otps"].count_documents({
        "email": clean_email,
        "createdAt": {"$gte": one_hour_ago}
    })
    if recent_count >= MAX_HOURLY_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Hourly OTP limit reached. Please try again in an hour."
        )

    # 3. Generate secure random 6-digit numeric OTP
    raw_otp = f"{secrets.randbelow(900000) + 100000}"
    hashed_otp = hash_otp(raw_otp, clean_email)

    # 4. Invalidate / cancel any existing OTPs for this email and purpose
    await db["otps"].delete_many({"email": clean_email, "purpose": purpose})

    # 5. Store OTP record (only the hash is persisted)
    expires_at = now + timedelta(minutes=OTP_EXPIRY_MINUTES)
    otp_doc = {
        "email": clean_email,
        "purpose": purpose,
        "otpHash": hashed_otp,
        "attempts": 0,
        "maxAttempts": MAX_ATTEMPTS,
        "createdAt": now,
        "expiresAt": expires_at,
        "verified": False
    }
    await db["otps"].insert_one(otp_doc)

    # 6. Send transactional email via Brevo
    name = user_name or "Conferly User"
    sent = await send_otp_email(clean_email, name, raw_otp, purpose=purpose)
    if not sent:
        logger.warning(f"Brevo email dispatch failed for {clean_email}, check Brevo API keys.")

    return True, "Verification code sent to your email address.", RESEND_COOLDOWN_SECONDS

async def verify_otp(email: str, raw_otp: str, purpose: str) -> str:
    """
    Verifies an OTP against its stored hash.
    Enforces maximum attempts and expiry.
    Upon success, destroys the OTP and generates a single-use resetToken.
    Returns: reset_token string
    """
    db = get_database()
    clean_email = email.lower().strip()
    clean_otp = raw_otp.strip()
    now = datetime.now(timezone.utc)

    otp_doc = await db["otps"].find_one({
        "email": clean_email,
        "purpose": purpose,
        "verified": False
    })

    if not otp_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP. Please request a new code."
        )

    expires_at = otp_doc["expiresAt"]
    if not expires_at.tzinfo:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if now > expires_at:
        await db["otps"].delete_one({"_id": otp_doc["_id"]})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new code."
        )

    attempts = otp_doc.get("attempts", 0)
    if attempts >= MAX_ATTEMPTS:
        await db["otps"].delete_one({"_id": otp_doc["_id"]})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum verification attempts exceeded. Please request a new OTP."
        )

    # Verify Hash
    expected_hash = hash_otp(clean_otp, clean_email)
    if otp_doc["otpHash"] != expected_hash:
        new_attempts = attempts + 1
        await db["otps"].update_one(
            {"_id": otp_doc["_id"]},
            {"$set": {"attempts": new_attempts}}
        )
        remaining = MAX_ATTEMPTS - new_attempts
        if remaining <= 0:
            await db["otps"].delete_one({"_id": otp_doc["_id"]})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many incorrect attempts. This OTP has been invalidated. Please request a new code."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incorrect verification code. {remaining} attempt(s) remaining."
        )

    # Success: Single-use OTP is deleted immediately
    await db["otps"].delete_one({"_id": otp_doc["_id"]})

    # Issue short-lived, single-use reset token (valid for 15 minutes)
    reset_token = secrets.token_urlsafe(32)
    token_doc = {
        "resetToken": reset_token,
        "email": clean_email,
        "purpose": purpose,
        "createdAt": now,
        "expiresAt": now + timedelta(minutes=RESET_TOKEN_EXPIRY_MINUTES),
        "used": False
    }
    await db["password_reset_tokens"].insert_one(token_doc)

    return reset_token

async def consume_reset_token(reset_token: str) -> str:
    """
    Validates a reset token and immediately marks it as consumed (single-use).
    Returns the associated user's clean_email.
    """
    db = get_database()
    now = datetime.now(timezone.utc)

    token_doc = await db["password_reset_tokens"].find_one({
        "resetToken": reset_token.strip(),
        "used": False
    })

    if not token_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or already used reset token. Please verify OTP again."
        )

    expires_at = token_doc["expiresAt"]
    if not expires_at.tzinfo:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if now > expires_at:
        await db["password_reset_tokens"].delete_one({"_id": token_doc["_id"]})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired. Please verify OTP again."
        )

    # Mark as consumed immediately
    await db["password_reset_tokens"].update_one(
        {"_id": token_doc["_id"]},
        {"$set": {"used": True, "usedAt": now}}
    )

    return token_doc["email"]
