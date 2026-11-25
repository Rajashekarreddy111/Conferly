from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime, timezone
from app.database.connection import get_database
from app.core.dependencies import get_current_user, require_coordinator_or_admin
from app.core.security import hash_password
from app.schemas.students import (
    StudentCreate,
    StudentUpdate,
    StudentResponse,
    StudentStatusUpdate,
)
from app.schemas.common import MessageResponse, StatusResponse

router = APIRouter(prefix="/students", tags=["Students"])

@router.get("", response_model=List[StudentResponse])
async def list_students(
    section: Optional[str] = None,
    academicYear: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    query = {}
    
    # Enforce Coordinator Scope Restrictions:
    user_role = (current_user.get("role") or "").lower()
    if user_role in ["coordinator", "mentor"]:
        coord_sections = current_user.get("assignedSections", [])
        if section:
            if section not in coord_sections:
                return []
            query["section"] = section
        else:
            query["section"] = {"$in": coord_sections}
    elif section:
        query["section"] = section
        
    if academicYear:
        query["academicYear"] = academicYear
    if status_filter:
        query["status"] = status_filter
        
    students = await db["students"].find(query).sort("rollNumber", 1).to_list(1000)
    result = []
    for s in students:
        result.append(
            StudentResponse(
                id=str(s.get("id") or s.get("_id")),
                rollNumber=s.get("rollNumber", ""),
                name=s.get("name", ""),
                email=s.get("email", ""),
                phoneNumber=s.get("phoneNumber", ""),
                academicYear=s.get("academicYear", ""),
                section=s.get("section", ""),
                status=s.get("status", "Active"),
                createdAt=s.get("createdAt")
            )
        )
    return result

@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(req: StudentCreate, current_user: dict = Depends(require_coordinator_or_admin)):
    db = get_database()
    clean_roll = req.rollNumber.strip().upper()
    clean_email = req.email.strip().lower()
    clean_sec = req.section.strip().upper()
    
    # Coordinator authorization check: section must be in assignedSections
    user_role = (current_user.get("role") or "").lower()
    if user_role in ["coordinator", "mentor"]:
        if clean_sec not in current_user.get("assignedSections", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You are not authorized to manage students in section '{clean_sec}'."
            )
            
    # Check Section active
    sec = await db["sections"].find_one({"sectionName": clean_sec})
    if sec and sec.get("status") == "Inactive":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Section '{clean_sec}' is currently deactivated. Please assign student to an active section."
        )
        
    # Check duplicate roll number or email
    dup = await db["students"].find_one({"$or": [{"rollNumber": clean_roll}, {"email": clean_email}]})
    if dup:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Student with roll number '{clean_roll}' or email '{clean_email}' already exists."
        )
        
    initial_pwd = req.initialPassword or "Student123"
    hashed_pwd = hash_password(initial_pwd)
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    doc_id = f"stu-{int(datetime.now(timezone.utc).timestamp())}"
    
    doc = {
        "id": doc_id,
        "rollNumber": clean_roll,
        "name": req.name.strip(),
        "email": clean_email,
        "phoneNumber": (req.phoneNumber or "").strip(),
        "academicYear": req.academicYear.strip(),
        "section": clean_sec,
        "role": "student",
        "status": "Active",
        "password_hash": hashed_pwd,
        "createdAt": now_str
    }
    await db["students"].insert_one(doc)
    
    # Also sync into users collection for authentication
    await db["users"].update_one(
        {"rollNumber": clean_roll},
        {"$set": doc},
        upsert=True
    )
    
    return StudentResponse(
        id=doc_id,
        rollNumber=clean_roll,
        name=doc["name"],
        email=clean_email,
        phoneNumber=doc["phoneNumber"],
        academicYear=doc["academicYear"],
        section=clean_sec,
        status="Active",
        createdAt=now_str
    )

@router.put("/{id}", response_model=StudentResponse)
async def update_student(id: str, req: StudentUpdate, current_user: dict = Depends(require_coordinator_or_admin)):
    db = get_database()
    clean_roll = req.rollNumber.strip().upper()
    clean_email = req.email.strip().lower()
    clean_sec = req.section.strip().upper()
    
    stu = await db["students"].find_one({"$or": [{"id": id}, {"_id": id}, {"rollNumber": id}]})
    if not stu:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
        
    # Scope check for coordinators
    user_role = (current_user.get("role") or "").lower()
    if user_role in ["coordinator", "mentor"]:
        coord_secs = current_user.get("assignedSections", [])
        if stu.get("section") not in coord_secs or clean_sec not in coord_secs:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized outside of assigned sections.")
            
    update_data = {
        "rollNumber": clean_roll,
        "name": req.name.strip(),
        "email": clean_email,
        "phoneNumber": (req.phoneNumber or "").strip(),
        "academicYear": req.academicYear.strip(),
        "section": clean_sec
    }
    
    await db["students"].update_one({"$or": [{"id": id}, {"_id": id}, {"rollNumber": id}]}, {"$set": update_data})
    await db["users"].update_one({"$or": [{"id": id}, {"rollNumber": stu.get("rollNumber")}]}, {"$set": update_data})
    
    return StudentResponse(
        id=stu.get("id"),
        rollNumber=clean_roll,
        name=req.name.strip(),
        email=clean_email,
        phoneNumber=(req.phoneNumber or "").strip(),
        academicYear=req.academicYear.strip(),
        section=clean_sec,
        status=stu.get("status", "Active"),
        createdAt=stu.get("createdAt")
    )

@router.patch("/{id}/status", response_model=StatusResponse)
async def toggle_student_status(id: str, req: StudentStatusUpdate, current_user: dict = Depends(require_coordinator_or_admin)):
    db = get_database()
    stu = await db["students"].find_one({"$or": [{"id": id}, {"_id": id}, {"rollNumber": id}]})
    if not stu:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
        
    user_role = (current_user.get("role") or "").lower()
    if user_role in ["coordinator", "mentor"]:
        if stu.get("section") not in current_user.get("assignedSections", []):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized outside assigned sections.")
            
    new_status = req.status
    await db["students"].update_one({"$or": [{"id": id}, {"_id": id}, {"rollNumber": id}]}, {"$set": {"status": new_status}})
    await db["users"].update_one({"$or": [{"id": id}, {"rollNumber": stu.get("rollNumber")}]}, {"$set": {"status": new_status}})
    
    return StatusResponse(success=True, status=new_status, message=f"Student account is now {new_status}.")

@router.delete("/{id}", response_model=MessageResponse)
async def delete_student(id: str, current_user: dict = Depends(require_coordinator_or_admin)):
    db = get_database()
    stu = await db["students"].find_one({"$or": [{"id": id}, {"_id": id}, {"rollNumber": id}]})
    if not stu:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
        
    user_role = (current_user.get("role") or "").lower()
    if user_role in ["coordinator", "mentor"]:
        if stu.get("section") not in current_user.get("assignedSections", []):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized outside assigned sections.")
            
    roll = stu.get("rollNumber")
    await db["students"].delete_one({"$or": [{"id": id}, {"_id": id}, {"rollNumber": id}]})
    await db["users"].delete_one({"rollNumber": roll})
    await db["applications"].delete_many({"rollNumber": roll})
    
    return MessageResponse(message=f"Student '{stu.get('name')}' ({roll}) permanently deleted.")

@router.get("/{id}/applications")
async def get_student_applications(id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    # Accept roll number or student id
    apps = await db["applications"].find({"$or": [{"studentId": id}, {"rollNumber": id}]}).to_list(100)
    for a in apps:
        a["id"] = str(a.get("id") or a.get("_id"))
        a.pop("_id", None)
    return apps

@router.post("/import-bulk", response_model=MessageResponse)
async def bulk_import_students(payload: dict, current_user: dict = Depends(require_coordinator_or_admin)):
    db = get_database()
    rows = payload.get("students", [])
    added = 0
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    for row in rows:
        roll = str(row.get("rollNumber", "")).strip().upper()
        email = str(row.get("email", "")).strip().lower()
        if not roll or not email:
            continue
            
        exists = await db["students"].find_one({"$or": [{"rollNumber": roll}, {"email": email}]})
        if not exists:
            pwd = row.get("initialPassword") or "Student123"
            doc_id = f"stu-{int(datetime.now(timezone.utc).timestamp())}-{added}"
            doc = {
                "id": doc_id,
                "rollNumber": roll,
                "name": str(row.get("name", "")).strip(),
                "email": email,
                "phoneNumber": str(row.get("phoneNumber", "")).strip(),
                "academicYear": str(row.get("academicYear", "2025-2026")).strip(),
                "section": str(row.get("section", "")).strip().upper(),
                "role": "student",
                "status": "Active",
                "password_hash": hash_password(pwd),
                "createdAt": now_str
            }
            await db["students"].insert_one(doc)
            await db["users"].insert_one(doc)
            added += 1
            
    return MessageResponse(message=f"Successfully imported {added} students out of {len(rows)} submitted.")
