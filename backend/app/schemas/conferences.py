from pydantic import BaseModel
from typing import Optional, List

class ConferenceCreate(BaseModel):
    fullName: str
    shortName: str
    applicationLink: str
    deadline: str  # YYYY-MM-DD
    scope: str = "global"  # "global" | "targeted"
    targetSections: Optional[List[str]] = []
    targetStudents: Optional[List[str]] = []
    creatorName: Optional[str] = "Admin"
    creatorRole: Optional[str] = "admin"

class ConferenceUpdate(BaseModel):
    fullName: str
    shortName: str
    applicationLink: str
    deadline: str
    scope: Optional[str] = "global"
    targetSections: Optional[List[str]] = []
    targetStudents: Optional[List[str]] = []

class ConferenceResponse(BaseModel):
    id: str
    fullName: str
    shortName: str
    applicationLink: str
    deadline: str
    createdBy: Optional[str] = "Admin"
    creatorRole: Optional[str] = "admin"
    createdAt: Optional[str] = None
    scope: str = "global"
    targetSections: Optional[List[str]] = []
    targetStudents: Optional[List[str]] = []
    status: str = "Active"

class DuplicateCheckRequest(BaseModel):
    fullName: str
    shortName: str
    excludeId: Optional[str] = None

class DuplicateCheckResponse(BaseModel):
    isDuplicate: bool
    existingConference: Optional[dict] = None
    message: Optional[str] = None

class BulkConferenceImportRequest(BaseModel):
    conferences: List[dict]
