from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

class RoomBase(BaseModel):
    name: str = Field(min_length=1)
    room_type: str = Field(pattern="^(classroom|lab)$")
    capacity: int = Field(ge=1)
    equipment_tags: Optional[List[str]] = Field(default_factory=list)
    department_id: Optional[str] = None

    @field_validator("equipment_tags", mode="before")
    def ensure_list(cls, v):
        return v if v is not None else []

class RoomCreate(RoomBase):
    pass

class RoomUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)
    room_type: Optional[str] = Field(default=None, pattern="^(classroom|lab)$")
    capacity: Optional[int] = Field(default=None, ge=1)
    equipment_tags: Optional[List[str]] = None
    department_id: Optional[str] = None

class RoomResponse(RoomBase):
    id: str
    created_at: str

    class Config:
        from_attributes = True
