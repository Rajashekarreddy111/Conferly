from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Union
from datetime import datetime, timezone
from app.database.connection import get_database
from app.core.dependencies import require_admin, get_current_user
from app.core.security import hash_password
from app.schemas.coordinators import (
    CoordinatorCreate,
    CoordinatorUpdate,
    CoordinatorResponse,
    CoordinatorStatusUpdate,
)
from app.schemas.common import MessageResponse, StatusResponse

router = APIRouter(prefix="/coordinators", tags=["Faculty Coordinators"])

@router.get("", response_model=List[CoordinatorResponse])
async def list_coordinators(current_user: dict = Depends(get_current_user)):
    db = get_database()
    coords = await db["coordinators"].find({}).sort("name", 1).to_list(500)
    result = []
    for c in coords:
        result.append(
            CoordinatorResponse(
                id=str(c.get("id") or c.get("_id")),
                name=c.get("name", ""),
                email=c.get("email", ""),
                phoneNumber=c.get("phoneNumber", ""),
                role="coordinator",
                assignedSections=c.get("assignedSections", []),
                status=c.get("status", "Active"),
                createdAt=c.get("createdAt")
            )
        )
    return result

@router.post("", response_model=CoordinatorResponse, status_code=status.HTTP_201_CREATED)
async def create_coordinator(req: CoordinatorCreate, current_user: dict = Depends(require_admin)):
    db = get_database()
    clean_email = req.email.strip().lower()
    
    existing = await db["coordinators"].find_one({"email": clean_email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A coordinator with email '{clean_email}' already exists."
        )
        
    sections = req.assignedSections if isinstance(req.assignedSections, list) else [req.assignedSections]
    initial_pwd = req.initialPassword or "CoordPass123"
    hashed_pwd = hash_password(initial_pwd)
    
    doc_id = f"coord-{int(datetime.now(timezone.utc).timestamp())}"
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    doc = {
        "id": doc_id,
        "name": req.name.strip(),
        "email": clean_email,
        "phoneNumber": (req.phoneNumber or "").strip(),
        "role": "coordinator",
        "assignedSections": sections,
        "status": "Active",
        "password_hash": hashed_pwd,
        "createdAt": now_str
    }
    await db["coordinators"].insert_one(doc)
    
    # Also sync into users collection for login
    await db["users"].update_one(
        {"email": clean_email},
        {"$set": {
            "id": doc_id,
            "name": req.name.strip(),
            "email": clean_email,
            "phoneNumber": (req.phoneNumber or "").strip(),
            "role": "coordinator",
            "assignedSections": sections,
            "status": "Active",
            "password_hash": hashed_pwd
        }},
        upsert=True
    )
    
    return CoordinatorResponse(
        id=doc_id,
        name=doc["name"],
        email=clean_email,
        phoneNumber=doc["phoneNumber"],
        role="coordinator",
        assignedSections=sections,
        status="Active",
        createdAt=now_str
    )

@router.put("/{id}", response_model=CoordinatorResponse)
async def update_coordinator(id: str, req: CoordinatorUpdate, current_user: dict = Depends(require_admin)):
    db = get_database()
    clean_email = req.email.strip().lower()
    
    coord = await db["coordinators"].find_one({"$or": [{"id": id}, {"_id": id}]})
    if not coord:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coordinator not found.")
        
    # Check duplicate email
    dup = await db["coordinators"].find_one({"email": clean_email, "id": {"$ne": coord.get("id")}})
    if dup:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Another coordinator with this email already exists.")
        
    sections = req.assignedSections if isinstance(req.assignedSections, list) else [req.assignedSections]
    
    update_data = {
        "name": req.name.strip(),
        "email": clean_email,
        "phoneNumber": (req.phoneNumber or "").strip(),
        "assignedSections": sections
    }
    
    await db["coordinators"].update_one({"$or": [{"id": id}, {"_id": id}]}, {"$set": update_data})
    await db["users"].update_one({"$or": [{"id": id}, {"email": coord.get("email")}]}, {"$set": update_data})
    
    return CoordinatorResponse(
        id=coord.get("id"),
        name=req.name.strip(),
        email=clean_email,
        phoneNumber=(req.phoneNumber or "").strip(),
        role="coordinator",
        assignedSections=sections,
        status=coord.get("status", "Active"),
        createdAt=coord.get("createdAt")
    )

@router.patch("/{id}/status", response_model=StatusResponse)
async def toggle_coordinator_status(id: str, req: CoordinatorStatusUpdate, current_user: dict = Depends(require_admin)):
    db = get_database()
    coord = await db["coordinators"].find_one({"$or": [{"id": id}, {"_id": id}]})
    if not coord:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coordinator not found.")
        
    new_status = req.status
    await db["coordinators"].update_one({"$or": [{"id": id}, {"_id": id}]}, {"$set": {"status": new_status}})
    await db["users"].update_one({"$or": [{"id": id}, {"email": coord.get("email")}]}, {"$set": {"status": new_status}})
    
    return StatusResponse(success=True, status=new_status, message=f"Coordinator account is now {new_status}.")

@router.delete("/{id}", response_model=MessageResponse)
async def delete_coordinator(id: str, current_user: dict = Depends(require_admin)):
    db = get_database()
    coord = await db["coordinators"].find_one({"$or": [{"id": id}, {"_id": id}]})
    if not coord:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coordinator not found.")
        
    # Delete coordinator account without deleting the sections or students they manage
    await db["coordinators"].delete_one({"$or": [{"id": id}, {"_id": id}]})
    await db["users"].delete_one({"$or": [{"id": id}, {"email": coord.get("email")}]})
    
    return MessageResponse(message=f"Coordinator '{coord.get('name')}' permanently deleted. Associated sections and students were preserved.")

@router.post("/import-bulk", response_model=MessageResponse)
async def bulk_import_coordinators(payload: dict, current_user: dict = Depends(require_admin)):
    db = get_database()
    rows = payload.get("coordinators", [])
    added = 0
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    for row in rows:
        email = str(row.get("email", "")).strip().lower()
        if not email or "@" not in email:
            continue
        exists = await db["coordinators"].find_one({"email": email})
        if not exists:
            doc_id = f"coord-{int(datetime.now(timezone.utc).timestamp())}-{added}"
            sections = row.get("assignedSections", [])
            if isinstance(sections, str):
                sections = [s.strip() for s in sections.split(",") if s.strip()]
            pwd = row.get("initialPassword") or "Coord123"
            doc = {
                "id": doc_id,
                "name": str(row.get("name", "")).strip(),
                "email": email,
                "phoneNumber": str(row.get("phoneNumber", "")).strip(),
                "role": "coordinator",
                "assignedSections": sections,
                "status": "Active",
                "password_hash": hash_password(pwd),
                "createdAt": now_str
            }
            await db["coordinators"].insert_one(doc)
            await db["users"].insert_one(doc)
            added += 1
            
    return MessageResponse(message=f"Successfully imported {added} coordinators out of {len(rows)} submitted.")
