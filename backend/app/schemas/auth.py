from pydantic import BaseModel, Field
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
    emailChangedOnce: bool = False

class LoginRequest(BaseModel):
    identifier: str
    password: str
    role: Optional[str] = None

class LoginResponse(BaseModel):
    token: str
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class SendOtpRequest(BaseModel):
    email: Optional[str] = None
    purpose: str = "forgot_password"  # "forgot_password" | "change_password"

class SendOtpResponse(BaseModel):
    message: str
    cooldownSeconds: int = 60

class VerifyOtpRequest(BaseModel):
    email: Optional[str] = None
    otp: str = Field(..., min_length=6, max_length=6)
    purpose: str = "forgot_password"

class VerifyOtpResponse(BaseModel):
    message: str
    resetToken: str

class UpdatePasswordWithTokenRequest(BaseModel):
    resetToken: str
    newPassword: str = Field(..., min_length=6)
    confirmPassword: str = Field(..., min_length=6)

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    resetToken: str
    newPassword: str
    confirmPassword: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    resetToken: str
    newPassword: str
    confirmPassword: Optional[str] = None

class ChangeEmailOnceRequest(BaseModel):
    newEmail: str
    currentPassword: str

class ChangeEmailOnceResponse(BaseModel):
    success: bool = True
    message: str
    user: UserResponse
    token: str
