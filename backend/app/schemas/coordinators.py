from pydantic import BaseModel, EmailStr
from typing import Optional, List, Union

class CoordinatorCreate(BaseModel):
    name: str
    email: str
    phoneNumber: Optional[str] = ""
    assignedSections: Union[List[str], str] = []
    initialPassword: Optional[str] = None

class CoordinatorUpdate(BaseModel):
    name: str
    email: str
    phoneNumber: Optional[str] = ""
    assignedSections: Union[List[str], str] = []

class CoordinatorResponse(BaseModel):
    id: str
    name: str
    email: str
    phoneNumber: Optional[str] = ""
    role: str = "coordinator"
    assignedSections: List[str] = []
    status: str = "Active"
    createdAt: Optional[str] = None

class CoordinatorStatusUpdate(BaseModel):
    status: str
