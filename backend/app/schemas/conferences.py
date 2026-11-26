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
    venue: Optional[str] = None
    dates: Optional[str] = None

class ConferenceUpdate(BaseModel):
    fullName: str
    shortName: str
    applicationLink: str
    deadline: str
    scope: Optional[str] = "global"
    targetSections: Optional[List[str]] = []
    targetStudents: Optional[List[str]] = []
    venue: Optional[str] = None
    dates: Optional[str] = None

class ConferenceResponse(BaseModel):
    id: str
    fullName: str
    shortName: str
    applicationLink: str
    deadline: str
    createdBy: Optional[str] = "Admin"
    creatorRole: Optional[str] = "admin"
    creatorId: Optional[str] = None
    creatorEmail: Optional[str] = None
    createdAt: Optional[str] = None
    scope: str = "global"
    targetSections: Optional[List[str]] = []
    targetStudents: Optional[List[str]] = []
    status: str = "Active"
    venue: Optional[str] = None
    dates: Optional[str] = None
    acceptedCoordinators: Optional[List[str]] = []
    declinedCoordinators: Optional[List[str]] = []
    editHistory: Optional[List[dict]] = []

class DuplicateCheckRequest(BaseModel):
    fullName: str
    shortName: str
    applicationLink: Optional[str] = None
    venue: Optional[str] = None
    dates: Optional[str] = None
    excludeId: Optional[str] = None

class DuplicateCheckResponse(BaseModel):
    isDuplicate: bool
    existingConference: Optional[dict] = None
    message: Optional[str] = None

class BulkConferenceImportRequest(BaseModel):
    conferences: List[dict]

class BatchSuggestionActionRequest(BaseModel):
    action: str  # "accept" or "decline"
    conferenceIds: List[str]
