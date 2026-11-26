from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database.connection import get_database
from app.core.security import verify_password, hash_password, create_access_token, decode_access_token
from app.core.dependencies import get_current_user
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    UserResponse,
    SendOtpRequest,
    SendOtpResponse,
    VerifyOtpRequest,
    VerifyOtpResponse,
    UpdatePasswordWithTokenRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    ChangeEmailOnceRequest,
    ChangeEmailOnceResponse,
)
from app.schemas.common import MessageResponse
from app.services.otp_service import request_otp, verify_otp, consume_reset_token

router = APIRouter(prefix="/auth", tags=["Authentication"])
optional_bearer = HTTPBearer(auto_error=False)

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(optional_bearer)) -> dict:
    if not credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        if not payload:
            return None
        user_id = payload.get("uid") or payload.get("sub")
        if not user_id:
            return None
        db = get_database()
        user = await db["users"].find_one({"$or": [{"_id": user_id}, {"id": user_id}, {"email": user_id}]})
        if not user:
            user = await db["coordinators"].find_one({"$or": [{"_id": user_id}, {"id": user_id}, {"email": user_id}]})
        if not user:
            user = await db["students"].find_one({"$or": [{"_id": user_id}, {"id": user_id}, {"email": user_id}, {"rollNumber": user_id}]})
        return user
    except Exception:
        return None

@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    db = get_database()
    clean_id = str(req.identifier).strip().lower()
    clean_pwd = str(req.password).strip()
    norm_role = (req.role or "").strip().lower()
    if norm_role == "mentor":
        norm_role = "coordinator"

    # Search user across collections: users, coordinators, students
    user = None
    query = {"$or": [{"email": clean_id}, {"rollNumber": clean_id}, {"username": clean_id}]}
    
    # Check users collection first
    user = await db["users"].find_one(query)
    
    # If not found in users, check coordinators or students
    if not user:
        if norm_role in ["coordinator", "mentor"] or "@" in clean_id:
            user = await db["coordinators"].find_one({"email": clean_id})
            if user:
                user["role"] = "coordinator"
        if not user and (norm_role == "student" or not "@" in clean_id):
            user = await db["students"].find_one({"$or": [{"rollNumber": clean_id.upper()}, {"email": clean_id}]})
            if user:
                user["role"] = "student"

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. No user found matching the provided identifier."
        )

    # Verify Password
    stored_hash = user.get("passwordHash") or user.get("password_hash") or user.get("hashedPassword") or user.get("password")
    if not stored_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid account configuration.")
        
    if not verify_password(clean_pwd, stored_hash):
        # Support default plaintext fallback if not hashed yet
        if clean_pwd != stored_hash:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password.")

    # Status check
    if user.get("status") == "Inactive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is currently deactivated. Please contact your coordinator or administrator."
        )

    # Server-side Section Deactivation Enforcement for Students
    role = (user.get("role") or norm_role or "student").lower()
    if role == "mentor":
        role = "coordinator"
        
    if role == "student" and user.get("section"):
        sec = await db["sections"].find_one({"sectionName": user["section"]})
        if sec and sec.get("status") == "Inactive":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Your class section ({user['section']}) is currently deactivated by administration."
            )

    user_id = str(user.get("id") or user.get("_id"))
    token = create_access_token(
        subject=clean_id,
        role=role,
        user_id=user_id,
        extra_claims={
            "name": user.get("name", "User"),
            "email": user.get("email", ""),
            "section": user.get("section"),
            "rollNumber": user.get("rollNumber")
        }
    )

    user_resp = UserResponse(
        id=user_id,
        name=user.get("name", "User"),
        email=user.get("email", ""),
        role=role,
        phoneNumber=user.get("phoneNumber"),
        rollNumber=user.get("rollNumber"),
        section=user.get("section"),
        academicYear=user.get("academicYear"),
        assignedSections=user.get("assignedSections", []),
        status=user.get("status", "Active"),
        emailChangedOnce=bool(user.get("emailChangedOnce", False))
    )

    return LoginResponse(
        token=token,
        access_token=token,
        token_type="bearer",
        user=user_resp
    )

@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user.get("id") or current_user.get("_id"))
    role = (current_user.get("role") or "").lower()
    if role == "mentor":
        role = "coordinator"
    return UserResponse(
        id=user_id,
        name=current_user.get("name", "User"),
        email=current_user.get("email", ""),
        role=role,
        phoneNumber=current_user.get("phoneNumber"),
        rollNumber=current_user.get("rollNumber"),
        section=current_user.get("section"),
        academicYear=current_user.get("academicYear"),
        assignedSections=current_user.get("assignedSections", []),
        status=current_user.get("status", "Active"),
        emailChangedOnce=bool(current_user.get("emailChangedOnce", False))
    )

# =========================================================================
# OTP Authentication & Password Reset Endpoints (Brevo API)
# =========================================================================

@router.post("/otp/send", response_model=SendOtpResponse)
async def send_otp_endpoint(
    req: SendOtpRequest,
    current_user: dict = Depends(get_optional_user)
):
    """
    Dispatches a 6-digit OTP code to the user's email via Brevo transactional email.
    Supports both 'change_password' (authenticated) and 'forgot_password' (unauthenticated).
    Enforces a 60-second cooldown and hourly request limits.
    For 'forgot_password', returns a generic success response to prevent email enumeration.
    """
    db = get_database()
    clean_purpose = req.purpose.strip().lower()
    if clean_purpose not in ["forgot_password", "change_password"]:
        clean_purpose = "forgot_password"

    target_email = None
    target_name = "Conferly User"

    if clean_purpose == "change_password":
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to request a change-password OTP."
            )
        target_email = current_user.get("email")
        target_name = current_user.get("name", "User")
    else:
        # forgot_password
        if not req.email or not req.email.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address is required."
            )
        clean_input_email = req.email.strip().lower()
        # Lookup user across collections
        found_user = await db["users"].find_one({"email": clean_input_email}) or \
                     await db["coordinators"].find_one({"email": clean_input_email}) or \
                     await db["students"].find_one({"email": clean_input_email})
        if not found_user:
            # Generic response to prevent user enumeration
            return SendOtpResponse(
                message="If that email is registered with an account, a verification code has been dispatched.",
                cooldownSeconds=60
            )
        target_email = clean_input_email
        target_name = found_user.get("name", "User")

    if not target_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid email address found for this account."
        )

    _, msg, cooldown = await request_otp(target_email, clean_purpose, target_name)
    return SendOtpResponse(message=msg, cooldownSeconds=cooldown)

@router.post("/otp/verify", response_model=VerifyOtpResponse)
async def verify_otp_endpoint(
    req: VerifyOtpRequest,
    current_user: dict = Depends(get_optional_user)
):
    """
    Verifies the submitted 6-digit OTP code against its salted SHA-256 hash.
    Enforces max 5 incorrect attempts and 10-minute expiry.
    Upon verification, issues a short-lived single-use resetToken.
    """
    clean_purpose = req.purpose.strip().lower()
    target_email = (req.email or "").strip().lower()

    if clean_purpose == "change_password" and current_user:
        target_email = current_user.get("email", "").lower()

    if not target_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is required to verify OTP."
        )

    if not req.otp or len(req.otp.strip()) != 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid 6-digit OTP code."
        )

    reset_token = await verify_otp(target_email, req.otp.strip(), clean_purpose)
    return VerifyOtpResponse(
        message="OTP verified successfully. You may now enter your new password.",
        resetToken=reset_token
    )

@router.post("/password/update", response_model=MessageResponse)
async def update_password_with_token(req: UpdatePasswordWithTokenRequest):
    """
    Updates the account password using the single-use resetToken issued after OTP verification.
    The OTP step cannot be skipped. Invalidates all active sessions.
    """
    clean_token = req.resetToken.strip()
    if not clean_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verified resetToken is required. Please complete OTP verification first."
        )

    if len(req.newPassword) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long."
        )

    if req.confirmPassword and req.newPassword != req.confirmPassword:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match."
        )

    # Consume single-use token (throws 400 if expired or already consumed)
    verified_email = await consume_reset_token(clean_token)

    db = get_database()
    new_hash = hash_password(req.newPassword)
    now = datetime.now(timezone.utc)

    # Update in users, coordinators, and students
    # Also invalidate sessions by incrementing tokenVersion and recording sessionInvalidatedAt
    update_fields = {
        "passwordHash": new_hash,
        "password_hash": new_hash,
        "hashedPassword": new_hash,
        "password": new_hash,
        "sessionInvalidatedAt": now
    }

    await db["users"].update_many(
        {"email": verified_email},
        {"$set": update_fields, "$inc": {"tokenVersion": 1}}
    )
    await db["coordinators"].update_many(
        {"email": verified_email},
        {"$set": update_fields, "$inc": {"tokenVersion": 1}}
    )
    await db["students"].update_many(
        {"email": verified_email},
        {"$set": update_fields, "$inc": {"tokenVersion": 1}}
    )

    return MessageResponse(message="Password successfully updated. Please sign in with your new credentials.")

# Secure aliases for backward compatibility that enforce OTP verification
@router.post("/forgot-password", response_model=SendOtpResponse)
async def forgot_password_legacy(req: ForgotPasswordRequest):
    """Initiates the OTP-based forgot password flow."""
    return await send_otp_endpoint(SendOtpRequest(email=req.email, purpose="forgot_password"))

@router.post("/reset-password", response_model=MessageResponse)
async def reset_password_legacy(req: ResetPasswordRequest):
    """Secure endpoint: strictly requires verified resetToken from OTP verification."""
    if not req.resetToken or not req.resetToken.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A verified OTP reset token is required. The OTP verification step cannot be bypassed."
        )
    return await update_password_with_token(
        UpdatePasswordWithTokenRequest(
            resetToken=req.resetToken,
            newPassword=req.newPassword,
            confirmPassword=req.confirmPassword or req.newPassword
        )
    )

@router.post("/change-password", response_model=MessageResponse)
async def change_password_legacy(req: ChangePasswordRequest):
    """Secure endpoint: strictly requires verified resetToken from OTP verification."""
    if not req.resetToken or not req.resetToken.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A verified OTP reset token is required. Direct password changing without OTP verification is disabled."
        )
    return await update_password_with_token(
        UpdatePasswordWithTokenRequest(
            resetToken=req.resetToken,
            newPassword=req.newPassword,
            confirmPassword=req.confirmPassword or req.newPassword
        )
    )

@router.post("/change-email-once", response_model=ChangeEmailOnceResponse)
async def change_email_once(
    req: ChangeEmailOnceRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Enables administrators and faculty coordinators to update their account email ONCE after login.
    Enforces password verification, global email uniqueness, and permanent lock once changed.
    """
    role = (current_user.get("role") or "").lower()
    if role not in ["admin", "coordinator", "mentor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators and faculty coordinators are permitted to change their email."
        )

    if current_user.get("emailChangedOnce", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already changed your email address once. Further modifications are prohibited."
        )

    db = get_database()
    clean_new_email = str(req.newEmail).strip().lower()
    current_email = str(current_user.get("email", "")).strip().lower()

    if not clean_new_email or "@" not in clean_new_email or "." not in clean_new_email.split("@")[-1]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid email address format."
        )

    if clean_new_email == current_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New email address must be different from your current email address."
        )

    # Verify current password
    stored_hash = current_user.get("passwordHash") or current_user.get("password_hash") or current_user.get("hashedPassword") or current_user.get("password")
    if not stored_hash or not verify_password(req.currentPassword, stored_hash):
        if req.currentPassword != stored_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect account password. Verification failed."
            )

    # Check uniqueness across all collections (users, coordinators, students)
    existing_user = await db["users"].find_one({"email": clean_new_email})
    existing_coord = await db["coordinators"].find_one({"email": clean_new_email})
    existing_student = await db["students"].find_one({"email": clean_new_email})

    if existing_user or existing_coord or existing_student:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"The email address '{clean_new_email}' is already registered in the system."
        )

    now_str = datetime.now(timezone.utc).isoformat()
    user_id = str(current_user.get("id") or current_user.get("_id"))

    # Update in users collection
    await db["users"].update_many(
        {"$or": [{"_id": current_user.get("_id")}, {"id": user_id}, {"email": current_email}]},
        {"$set": {
            "email": clean_new_email,
            "emailChangedOnce": True,
            "emailChangedAt": now_str,
            "previousEmail": current_email
        }}
    )

    # If coordinator, also update in coordinators collection & conferences creatorEmail
    if role in ["coordinator", "mentor"]:
        await db["coordinators"].update_many(
            {"$or": [{"_id": current_user.get("_id")}, {"id": user_id}, {"email": current_email}]},
            {"$set": {
                "email": clean_new_email,
                "emailChangedOnce": True,
                "emailChangedAt": now_str,
                "previousEmail": current_email
            }}
        )
        await db["conferences"].update_many(
            {"creatorEmail": current_email},
            {"$set": {"creatorEmail": clean_new_email}}
        )

    # Issue a new JWT access token reflecting the updated email
    new_token = create_access_token(
        subject=clean_new_email,
        role=role,
        user_id=user_id,
        extra_claims={
            "name": current_user.get("name", "User"),
            "email": clean_new_email,
            "section": current_user.get("section"),
            "rollNumber": current_user.get("rollNumber")
        }
    )

    user_resp = UserResponse(
        id=user_id,
        name=current_user.get("name", "User"),
        email=clean_new_email,
        role=role,
        phoneNumber=current_user.get("phoneNumber"),
        rollNumber=current_user.get("rollNumber"),
        section=current_user.get("section"),
        academicYear=current_user.get("academicYear"),
        assignedSections=current_user.get("assignedSections", []),
        status=current_user.get("status", "Active"),
        emailChangedOnce=True
    )

    return ChangeEmailOnceResponse(
        success=True,
        message="Email address successfully updated. This change is permanent and can only be performed once.",
        user=user_resp,
        token=new_token
    )
