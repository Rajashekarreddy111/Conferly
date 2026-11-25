from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_access_token
from app.database.connection import get_database

security_bearer = HTTPBearer(auto_error=False)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_bearer)) -> dict:
    """
    Validates JWT token, retrieves the active user from MongoDB, and enforces
    server-side account & section deactivation rules.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired or invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user_id = payload.get("uid") or payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token claims.")
        
    from bson import ObjectId
    db = get_database()
    
    # Support lookup by ObjectId _id, string id, email, username, or rollNumber
    user = None
    try:
        user = await db["users"].find_one({"_id": ObjectId(user_id)})
    except Exception:
        pass

    if not user:
        user = await db["users"].find_one({
            "$or": [
                {"_id": user_id},
                {"id": user_id},
                {"email": user_id},
                {"username": user_id},
                {"rollNumber": user_id}
            ]
        })

    if not user:
        # Check students or coordinators directly if not in users collection
        try:
            user = await db["students"].find_one({"_id": ObjectId(user_id)})
        except Exception:
            pass
        if not user:
            user = await db["students"].find_one({
                "$or": [
                    {"_id": user_id},
                    {"id": user_id},
                    {"rollNumber": user_id},
                    {"email": user_id}
                ]
            })
        if user:
            user["role"] = "student"
        else:
            try:
                user = await db["coordinators"].find_one({"_id": ObjectId(user_id)})
            except Exception:
                pass
            if not user:
                user = await db["coordinators"].find_one({
                    "$or": [
                        {"_id": user_id},
                        {"id": user_id},
                        {"email": user_id}
                    ]
                })
            if user:
                user["role"] = "coordinator"
                
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found.")
        
    if user.get("status") == "Inactive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is currently inactive. Please contact administration."
        )
        
    # Server-Side Section Deactivation Enforcement:
    # If student, verify that their assigned class section is not deactivated
    if user.get("role") == "student" and user.get("section"):
        section_doc = await db["sections"].find_one({"sectionName": user["section"]})
        if section_doc and section_doc.get("status") == "Inactive":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Your class section ({user['section']}) is currently deactivated by administration."
            )
            
    return user

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required for this operation."
        )
    return user

async def require_coordinator_or_admin(user: dict = Depends(get_current_user)) -> dict:
    role = (user.get("role") or "").lower()
    if role not in ["admin", "coordinator", "mentor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Faculty coordinator or administrative privileges required."
        )
    return user
