from pydantic import BaseModel
from typing import Optional, List

class SectionCreate(BaseModel):
    academicYear: str
    sectionName: str

class SectionUpdate(BaseModel):
    academicYear: str
    sectionName: str

class SectionResponse(BaseModel):
    id: str
    academicYear: str
    sectionName: str
    status: str = "Active"
    studentCount: Optional[int] = 0
    coordinatorCount: Optional[int] = 0
    createdAt: Optional[str] = None

class BulkDeactivateRequest(BaseModel):
    ids: List[str]
