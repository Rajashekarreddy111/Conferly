from pydantic import BaseModel
from typing import Optional

class ApplicationSubmitRequest(BaseModel):
    conferenceId: str
    studentId: Optional[str] = None
    rollNumber: str
    studentName: Optional[str] = None
    section: Optional[str] = None
    screenshotProof: str
    proofFileName: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: str
    conferenceId: str
    studentId: Optional[str] = None
    rollNumber: str
    studentName: Optional[str] = None
    section: Optional[str] = None
    status: str = "Applied"
    appliedAt: str
    screenshotProof: str
    proofFileName: Optional[str] = None

class ScreenshotUploadResponse(BaseModel):
    fileUrl: str
    fileName: str
