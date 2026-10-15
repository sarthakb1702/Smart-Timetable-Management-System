from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import time


class CollegeSettingsBase(BaseModel):
    working_days: List[int] = Field(default=[1, 2, 3, 4, 5], description="Monday=1 to Sunday=7")
    day_start_time: time = Field(default="08:00:00")
    day_end_time: time = Field(default="17:00:00")
    slot_duration_minutes: int = Field(default=60, ge=30, le=120)
    max_faculty_weekly_hours: int = Field(default=18, ge=10, le=40)


class CollegeSettingsUpdate(CollegeSettingsBase):
    pass


class CollegeSettingsResponse(CollegeSettingsBase):
    id: str
    updated_by: Optional[str] = None
    updated_at: str

    class Config:
        from_attributes = True


class LunchBreakBase(BaseModel):
    department_id: Optional[str] = None
    academic_year_id: Optional[str] = None
    day_of_week: Optional[int] = Field(default=None, ge=1, le=7)
    start_time: time
    end_time: time


class LunchBreakCreate(LunchBreakBase):
    pass


class LunchBreakUpdate(BaseModel):
    start_time: Optional[time] = None
    end_time: Optional[time] = None


class LunchBreakResponse(LunchBreakBase):
    id: str
    created_at: str

    class Config:
        from_attributes = True


class DepartmentBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    code: str = Field(min_length=1, max_length=20)


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    code: Optional[str] = Field(default=None, min_length=1, max_length=20)


class DepartmentResponse(DepartmentBase):
    id: str
    created_at: str

    class Config:
        from_attributes = True


class AcademicYearBase(BaseModel):
    code: str = Field(min_length=1, max_length=20)
    name: str = Field(min_length=1, max_length=100)
    sequence: int = Field(ge=1)


class AcademicYearCreate(AcademicYearBase):
    pass


class AcademicYearUpdate(BaseModel):
    code: Optional[str] = Field(default=None, min_length=1, max_length=20)
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    sequence: Optional[int] = Field(default=None, ge=1)


class AcademicYearResponse(AcademicYearBase):
    id: str
    created_at: str

    class Config:
        from_attributes = True


class AcademicTermBase(BaseModel):
    department_id: str
    name: str = Field(min_length=1, max_length=100)
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class AcademicTermCreate(AcademicTermBase):
    is_current: bool = False


class AcademicTermUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_locked: Optional[bool] = None


class AcademicTermResponse(AcademicTermBase):
    id: str
    is_current: bool
    is_locked: bool
    created_at: str

    class Config:
        from_attributes = True


class UserRoleAssign(BaseModel):
    user_id: str
    role: str = Field(pattern="^(superadmin|college_tt_coordinator|hod|dept_tt_coordinator|faculty|student)$")
    department_id: Optional[str] = None


class UserCreate(BaseModel):
    email: str
    full_name: str
    password: str = Field(default="password123", min_length=6)
    role: str = Field(pattern="^(superadmin|college_tt_coordinator|hod|dept_tt_coordinator|faculty|student)$")
    department_id: Optional[str] = None
    employee_code: Optional[str] = None
    phone: Optional[str] = None


class UserRoleUpdate(BaseModel):
    role: Optional[str] = Field(default=None, pattern="^(superadmin|college_tt_coordinator|hod|dept_tt_coordinator|faculty|student)$")
    department_id: Optional[str] = None
    employee_code: Optional[str] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None


class UserWithRoleResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    employee_code: Optional[str] = None
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True