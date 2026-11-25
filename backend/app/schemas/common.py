from pydantic import BaseModel, Field
from typing import Optional, List, Any

class MessageResponse(BaseModel):
    message: str
    success: bool = True

class StatusResponse(BaseModel):
    success: bool = True
    status: str
    message: Optional[str] = None
