from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import time

class MdmSlotOptionBase(BaseModel):
    course_id: str
    faculty_id: str
    room_id: str

class MdmSlotOptionCreate(MdmSlotOptionBase):
    pass

class MdmSlotOptionResponse(MdmSlotOptionBase):
    id: str
    mdm_slot_id: str
    created_at: str
    course_name: Optional[str] = None
    faculty_name: Optional[str] = None
    room_name: Optional[str] = None
    department_name: Optional[str] = None
    capacity: Optional[int] = None

class MdmSlotBase(BaseModel):
    academic_year_id: str
    day_of_week: int = Field(ge=1, le=7)
    start_time: time
    end_time: time
    status: str = Field(default="draft", pattern="^(draft|locked)$")

class MdmSlotCreate(MdmSlotBase):
    pass

class MdmSlotUpdate(BaseModel):
    day_of_week: Optional[int] = Field(default=None, ge=1, le=7)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    status: Optional[str] = Field(default=None, pattern="^(draft|locked)$")

class MdmSlotResponse(MdmSlotBase):
    id: str
    created_by: Optional[str] = None
    locked_at: Optional[str] = None
    created_at: str
    options: List[MdmSlotOptionResponse] = []
