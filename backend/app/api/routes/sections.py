from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime, timezone
from app.database.connection import get_database
from app.core.dependencies import require_admin, get_current_user
from app.schemas.sections import (
    SectionCreate,
    SectionUpdate,
    SectionResponse,
    BulkDeactivateRequest,
)
from app.schemas.common import MessageResponse, StatusResponse

router = APIRouter(prefix="/sections", tags=["Class Sections"])

@router.get("", response_model=List[SectionResponse])
async def list_sections(
    academicYear: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    query = {}
    if academicYear:
        query["academicYear"] = academicYear
    if status_filter:
        query["status"] = status_filter
        
    sections = await db["sections"].find(query).sort("sectionName", 1).to_list(200)
    
    result = []
    for s in sections:
        sec_name = s.get("sectionName")
        sec_year = s.get("academicYear")
        stu_count = await db["students"].count_documents({"section": sec_name, "academicYear": sec_year})
        coord_count = await db["coordinators"].count_documents({"assignedSections": sec_name})
        
        result.append(
            SectionResponse(
                id=str(s.get("id") or s.get("_id")),
                academicYear=sec_year,
                sectionName=sec_name,
                status=s.get("status", "Active"),
                studentCount=stu_count,
                coordinatorCount=coord_count,
                createdAt=s.get("createdAt")
            )
        )
    return result

@router.post("", response_model=SectionResponse, status_code=status.HTTP_201_CREATED)
async def create_section(req: SectionCreate, current_user: dict = Depends(require_admin)):
    db = get_database()
    sec_name = req.sectionName.strip().upper()
    acad_year = req.academicYear.strip()
    
    existing = await db["sections"].find_one({"academicYear": acad_year, "sectionName": sec_name})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Section '{sec_name}' already exists for academic year {acad_year}."
        )
        
    doc = {
        "id": f"sec-{int(datetime.now(timezone.utc).timestamp())}",
        "academicYear": acad_year,
        "sectionName": sec_name,
        "status": "Active",
        "createdAt": datetime.now(timezone.utc).strftime("%Y-%m-%d")
    }
    await db["sections"].insert_one(doc)
    
    return SectionResponse(
        id=doc["id"],
        academicYear=acad_year,
        sectionName=sec_name,
        status="Active",
        studentCount=0,
        coordinatorCount=0,
        createdAt=doc["createdAt"]
    )

@router.put("/{id}", response_model=SectionResponse)
async def update_section(id: str, req: SectionUpdate, current_user: dict = Depends(require_admin)):
    db = get_database()
    sec_name = req.sectionName.strip().upper()
    acad_year = req.academicYear.strip()
    
    sec = await db["sections"].find_one({"$or": [{"id": id}, {"_id": id}]})
    if not sec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found.")
        
    # Check duplicate if name/year changed
    dup = await db["sections"].find_one({
        "academicYear": acad_year,
        "sectionName": sec_name,
        "id": {"$ne": sec.get("id")}
    })
    if dup:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Another section with this name and year already exists.")
        
    await db["sections"].update_one(
        {"$or": [{"id": id}, {"_id": id}]},
        {"$set": {"academicYear": acad_year, "sectionName": sec_name}}
    )
    
    # Sync students if section name changed
    old_name = sec.get("sectionName")
    if old_name != sec_name:
        await db["students"].update_many({"section": old_name}, {"$set": {"section": sec_name, "academicYear": acad_year}})
        await db["coordinators"].update_many(
            {"assignedSections": old_name},
            {"$set": {"assignedSections.$": sec_name}}
        )
        
    return SectionResponse(
        id=sec.get("id"),
        academicYear=acad_year,
        sectionName=sec_name,
        status=sec.get("status", "Active"),
        studentCount=await db["students"].count_documents({"section": sec_name}),
        coordinatorCount=await db["coordinators"].count_documents({"assignedSections": sec_name}),
        createdAt=sec.get("createdAt")
    )

@router.patch("/{id}/deactivate", response_model=StatusResponse)
async def deactivate_section(id: str, current_user: dict = Depends(require_admin)):
    db = get_database()
    sec = await db["sections"].find_one({"$or": [{"id": id}, {"_id": id}]})
    if not sec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found.")
        
    await db["sections"].update_one({"$or": [{"id": id}, {"_id": id}]}, {"$set": {"status": "Inactive"}})
    return StatusResponse(success=True, status="Inactive", message=f"Section {sec.get('sectionName')} has been deactivated.")

@router.patch("/{id}/reactivate", response_model=StatusResponse)
async def reactivate_section(id: str, current_user: dict = Depends(require_admin)):
    db = get_database()
    sec = await db["sections"].find_one({"$or": [{"id": id}, {"_id": id}]})
    if not sec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found.")
        
    await db["sections"].update_one({"$or": [{"id": id}, {"_id": id}]}, {"$set": {"status": "Active"}})
    return StatusResponse(success=True, status="Active", message=f"Section {sec.get('sectionName')} has been reactivated.")

@router.delete("/{id}", response_model=MessageResponse)
async def delete_section(id: str, cascade: bool = Query(False), current_user: dict = Depends(require_admin)):
    db = get_database()
    sec = await db["sections"].find_one({"$or": [{"id": id}, {"_id": id}]})
    if not sec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found.")
        
    sec_name = sec.get("sectionName")
    student_count = await db["students"].count_documents({"section": sec_name})
    
    if student_count > 0 and not cascade:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete section '{sec_name}'. There are {student_count} student(s) currently enrolled. Use cascade=true to delete students."
        )
        
    if cascade:
        # Cascade delete students enrolled in this section
        students = await db["students"].find({"section": sec_name}).to_list(1000)
        rolls = [s["rollNumber"] for s in students if "rollNumber" in s]
        await db["students"].delete_many({"section": sec_name})
        await db["users"].delete_many({"rollNumber": {"$in": rolls}})
        await db["applications"].delete_many({"rollNumber": {"$in": rolls}})
        
    # Unassign section from coordinators
    await db["coordinators"].update_many(
        {"assignedSections": sec_name},
        {"$pull": {"assignedSections": sec_name}}
    )
    
    await db["sections"].delete_one({"$or": [{"id": id}, {"_id": id}]})
    return MessageResponse(message=f"Section '{sec_name}'{' and its enrolled students' if cascade else ''} deleted successfully.")

@router.post("/bulk-deactivate", response_model=MessageResponse)
async def bulk_deactivate_sections(req: BulkDeactivateRequest, current_user: dict = Depends(require_admin)):
    db = get_database()
    res = await db["sections"].update_many(
        {"id": {"$in": req.ids}},
        {"$set": {"status": "Inactive"}}
    )
    return MessageResponse(message=f"Successfully deactivated {res.modified_count} sections.")

@router.get("/{name}/students")
async def get_section_students(name: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    students = await db["students"].find({"section": name}).sort("rollNumber", 1).to_list(500)
    for s in students:
        s["id"] = str(s.get("id") or s.get("_id"))
        s.pop("_id", None)
        s.pop("password_hash", None)
    return students

@router.get("/{name}/coordinators")
async def get_section_coordinators(name: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    coords = await db["coordinators"].find({"assignedSections": name}).to_list(100)
    for c in coords:
        c["id"] = str(c.get("id") or c.get("_id"))
        c.pop("_id", None)
        c.pop("password_hash", None)
    return coords
