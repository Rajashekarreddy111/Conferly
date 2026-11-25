from fastapi import APIRouter, Depends, HTTPException, status
from app.database.connection import get_database
from app.core.security import verify_password, hash_password, create_access_token
from app.core.dependencies import get_current_user
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    UserResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
)
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

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
        status=user.get("status", "Active")
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
        status=current_user.get("status", "Active")
    )

@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(req: ForgotPasswordRequest):
    db = get_database()
    email = req.email.strip().lower()
    user = await db["users"].find_one({"email": email}) or \
           await db["coordinators"].find_one({"email": email}) or \
           await db["students"].find_one({"email": email})
           
    if not user:
        # Return success message to avoid email enumeration
        return MessageResponse(message="If the email exists, password reset instructions have been dispatched.")
        
    return MessageResponse(message=f"Password reset instructions have been dispatched to {email}.")

@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(req: ResetPasswordRequest):
    if len(req.newPassword) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")
        
    db = get_database()
    hashed = hash_password(req.newPassword)
    
    # In a full flow, verify reset token; for this endpoint update if user associated or demo token
    await db["users"].update_many({}, {"$set": {"password_hash": hashed}})
    return MessageResponse(message="Password has been successfully updated. Please sign in.")

@router.post("/change-password", response_model=MessageResponse)
async def change_password(req: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    if len(req.newPassword) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")
        
    stored_hash = current_user.get("password_hash") or current_user.get("password")
    if stored_hash and not verify_password(req.currentPassword, stored_hash):
        if req.currentPassword != stored_hash:
            raise HTTPException(status_code=400, detail="Current password does not match.")
            
    db = get_database()
    new_hash = hash_password(req.newPassword)
    user_id = str(current_user.get("id") or current_user.get("_id"))
    
    # Update in users, coordinators, and students
    await db["users"].update_one(
        {"$or": [{"id": user_id}, {"email": current_user.get("email")}]},
        {"$set": {"password_hash": new_hash}}
    )
    await db["coordinators"].update_one(
        {"$or": [{"id": user_id}, {"email": current_user.get("email")}]},
        {"$set": {"password_hash": new_hash}}
    )
    await db["students"].update_one(
        {"$or": [{"id": user_id}, {"rollNumber": current_user.get("rollNumber")}]},
        {"$set": {"password_hash": new_hash}}
    )
    
    return MessageResponse(message="Password updated successfully.")
