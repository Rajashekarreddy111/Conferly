from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    phoneNumber: Optional[str] = None
    rollNumber: Optional[str] = None
    section: Optional[str] = None
    academicYear: Optional[str] = None
    assignedSections: Optional[List[str]] = None
    status: str = "Active"

class LoginRequest(BaseModel):
    identifier: str
    password: str
    role: Optional[str] = None

class LoginResponse(BaseModel):
    token: str
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    newPassword: str

class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str
