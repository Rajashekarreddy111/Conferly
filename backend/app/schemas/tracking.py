from pydantic import BaseModel
from typing import Optional, List, Any

class StudentTrackingConferenceItem(BaseModel):
    id: str
    shortName: str
    fullName: str
    deadline: str
    scope: str
    applicationLink: str
    appliedStatus: str  # "Applied" | "Pending" | "Expired Not Applied"
    appliedAt: Optional[str] = None
    screenshotProof: Optional[str] = None
    proofFileName: Optional[str] = None

class StudentTrackingResponse(BaseModel):
    student: dict
    conferences: List[dict]

class ConferenceTrackingStudentItem(BaseModel):
    id: str
    rollNumber: str
    name: str
    phoneNumber: Optional[str] = ""
    email: str
    section: str
    academicYear: str
    status: str  # "Applied" | "Pending" | "Expired Not Applied"
    appliedAt: Optional[str] = None
    screenshotProof: Optional[str] = None
    proofFileName: Optional[str] = None

class ConferenceTrackingResponse(BaseModel):
    conference: dict
    eligibleCount: int
    appliedCount: int
    pendingCount: int
    expiredNotAppliedCount: int
    completionPercentage: float
    students: List[ConferenceTrackingStudentItem]
