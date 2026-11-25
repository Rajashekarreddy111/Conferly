from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime, timezone
from app.database.connection import get_database
from app.core.dependencies import require_admin, get_current_user
from app.schemas.academic_years import (
    AcademicYearCreate,
    AcademicYearResponse,
    AcademicYearStatusUpdate,
)
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/academic-years", tags=["Academic Years"])

@router.get("", response_model=List[AcademicYearResponse])
async def list_academic_years(current_user: dict = Depends(get_current_user)):
    db = get_database()
    years = await db["academic_years"].find({}).sort("year", -1).to_list(100)
    
    result = []
    for y in years:
        year_name = y.get("year")
        sec_count = await db["sections"].count_documents({"academicYear": year_name})
        stu_count = await db["students"].count_documents({"academicYear": year_name})
        result.append(
            AcademicYearResponse(
                id=str(y.get("id") or y.get("_id") or f"ay-{year_name}"),
                year=year_name,
                status=y.get("status", "Active"),
                totalSections=sec_count,
                totalStudents=stu_count
            )
        )
    return result

@router.post("", response_model=AcademicYearResponse, status_code=status.HTTP_201_CREATED)
async def create_academic_year(req: AcademicYearCreate, current_user: dict = Depends(require_admin)):
    db = get_database()
    clean_year = req.year.strip()
    
    existing = await db["academic_years"].find_one({"year": {"$regex": f"^{clean_year}$", "$options": "i"}})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Academic Year '{clean_year}' already exists."
        )
        
    doc = {
        "id": f"ay-{int(datetime.now(timezone.utc).timestamp())}",
        "year": clean_year,
        "status": "Active",
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    await db["academic_years"].insert_one(doc)
    
    return AcademicYearResponse(
        id=doc["id"],
        year=clean_year,
        status="Active",
        totalSections=0,
        totalStudents=0
    )

@router.patch("/{year_name}/status", response_model=MessageResponse)
async def toggle_academic_year_status(year_name: str, req: AcademicYearStatusUpdate, current_user: dict = Depends(require_admin)):
    db = get_database()
    clean_year = year_name.strip()
    
    ay = await db["academic_years"].find_one({"year": clean_year})
    if not ay:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Academic year not found.")
        
    new_status = req.status
    await db["academic_years"].update_one({"year": clean_year}, {"$set": {"status": new_status}})
    
    # Cascade: If deactivating academic year, deactivate all class sections under that year
    await db["sections"].update_many({"academicYear": clean_year}, {"$set": {"status": new_status}})
    
    return MessageResponse(message=f"Academic Year '{clean_year}' and its sections set to {new_status}.")

@router.delete("/{year_name}", response_model=MessageResponse)
async def delete_academic_year(year_name: str, current_user: dict = Depends(require_admin)):
    db = get_database()
    clean_year = year_name.strip()
    
    sections_count = await db["sections"].count_documents({"academicYear": clean_year})
    if sections_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete Academic Year '{clean_year}'. There are {sections_count} section(s) registered under this year."
        )
        
    res = await db["academic_years"].delete_one({"year": clean_year})
    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Academic year not found.")
        
    return MessageResponse(message=f"Academic Year '{clean_year}' deleted successfully.")
