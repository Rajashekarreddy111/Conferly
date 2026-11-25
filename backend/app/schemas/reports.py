from pydantic import BaseModel
from typing import List, Optional

class ReportSummary(BaseModel):
    totalStudents: int
    totalCoordinators: int
    totalSections: int
    totalConferences: int
    totalApplied: int
    totalNotApplied: int
    overallParticipationRate: float

class ConferenceReportItem(BaseModel):
    id: str
    sno: int
    fullName: str
    shortName: str
    status: str
    deadline: str
    eligibleCount: int
    appliedCount: int
    pendingCount: int
    expiredNotAppliedCount: int
    participationRate: str

class SectionReportItem(BaseModel):
    id: str
    sno: int
    sectionName: str
    academicYear: str
    studentEnrollment: int
    totalEligibleSubmissions: int
    appliedSubmissions: int
    pendingSubmissions: int
    expiredNotAppliedSubmissions: int
    participationRate: str

class CoordinatorReportItem(BaseModel):
    id: str
    sno: int
    coordinatorName: str
    email: str
    sections: str
    studentStrength: int
    totalEligibleSubmissions: int
    appliedSubmissions: int
    pendingSubmissions: int
    expiredNotAppliedSubmissions: int
    participationRate: str

class AdminReportResponse(BaseModel):
    summary: ReportSummary
    conferenceWise: List[ConferenceReportItem]
    sectionWise: List[SectionReportItem]
    coordinatorWise: List[CoordinatorReportItem]
