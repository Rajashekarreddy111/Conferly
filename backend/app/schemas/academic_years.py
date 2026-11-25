from pydantic import BaseModel, Field, field_validator
from typing import Optional
import re

class AcademicYearCreate(BaseModel):
    year: str

    @field_validator("year")
    def validate_year_format(cls, v: str) -> str:
        clean = v.strip()
        if not re.match(r"^\d{4}-\d{4}$", clean):
            raise ValueError("Academic Year must follow the format YYYY-YYYY (e.g. 2025-2026)")
        return clean

class AcademicYearResponse(BaseModel):
    id: str
    year: str
    status: str = "Active"
    totalSections: int = 0
    totalStudents: int = 0

class AcademicYearStatusUpdate(BaseModel):
    status: str
