from pydantic import BaseModel, EmailStr
from typing import Optional, List

class StudentCreate(BaseModel):
    rollNumber: str
    name: str
    email: str
    phoneNumber: Optional[str] = ""
    academicYear: str
    section: str
    initialPassword: Optional[str] = None

class StudentUpdate(BaseModel):
    rollNumber: str
    name: str
    email: str
    phoneNumber: Optional[str] = ""
    academicYear: str
    section: str

class StudentResponse(BaseModel):
    id: str
    rollNumber: str
    name: str
    email: str
    phoneNumber: Optional[str] = ""
    academicYear: str
    section: str
    status: str = "Active"
    createdAt: Optional[str] = None

class StudentStatusUpdate(BaseModel):
    status: str
