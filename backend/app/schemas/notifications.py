from pydantic import BaseModel
from typing import Optional

class DeadlineAlertResponse(BaseModel):
    id: str
    conferenceId: str
    conferenceName: str
    fullName: str
    deadline: str
    remainingTime: str
    eligibleCount: Optional[int] = None
    unappliedCount: Optional[int] = None
    applicationLink: Optional[str] = None
    message: str
