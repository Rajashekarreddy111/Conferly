from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime

class BasePaperSubmit(BaseModel):
    title: str = Field(..., min_length=3, max_length=400, description="Base paper title")

class BasePaperResponse(BaseModel):
    id: str
    paperId: str
    title: str
    rollNumber: str
    studentName: str
    section: str
    academicYear: str
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

class MyPaperResponse(BaseModel):
    hasPaper: bool
    paper: Optional[BasePaperResponse] = None

class PaperTrackingStudentItem(BaseModel):
    id: str
    rollNumber: str
    name: str
    section: str
    academicYear: str
    status: str  # "Selected" | "Not Selected"
    paperId: Optional[str] = None
    paperTitle: Optional[str] = None
    submittedAt: Optional[str] = None

class PaperTrackingSummary(BaseModel):
    totalStudents: int
    selectedCount: int
    notSelectedCount: int

class PaperTrackingResponse(BaseModel):
    summary: PaperTrackingSummary
    students: List[PaperTrackingStudentItem]
    availableSections: List[str]
    availableAcademicYears: List[str]
    total: int
    page: int
    limit: int
    totalPages: int

class FindRelatedPapersRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=500, description="Query paper title to find related work")

class RelatedPaperResult(BaseModel):
    rank: int
    paperId: str
    paperTitle: str
    rollNumber: str
    studentName: str
    section: str
    academicYear: str
    matchedKeywords: List[str]
    matchScore: float
    submittedAt: Optional[str] = None

class FindRelatedPapersResponse(BaseModel):
    totalInputKeywords: int
    keywords: List[str]
    keywordCounts: Dict[str, int]
    results: List[RelatedPaperResult]
