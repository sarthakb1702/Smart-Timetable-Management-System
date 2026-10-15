from typing import List, Optional
from pydantic import BaseModel, Field

class CourseBase(BaseModel):
    code: str = Field(min_length=1, max_length=20)
    name: str = Field(min_length=1, max_length=150)
    credits: int = Field(ge=1, le=10)
    session_type: str = Field(pattern="^(theory|lab)$")
    is_mdm: bool = Field(default=False)
    department_id: Optional[str] = None
    academic_year_id: Optional[str] = None

class CourseCreate(CourseBase):
    pass

class CourseUpdate(BaseModel):
    code: Optional[str] = Field(default=None, min_length=1, max_length=20)
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    credits: Optional[int] = Field(default=None, ge=1, le=10)
    session_type: Optional[str] = Field(default=None, pattern="^(theory|lab)$")
    department_id: Optional[str] = None
    academic_year_id: Optional[str] = None

class CourseResponse(CourseBase):
    id: str
    created_at: str
    department_name: Optional[str] = None
    academic_year_name: Optional[str] = None

    class Config:
        from_attributes = True
