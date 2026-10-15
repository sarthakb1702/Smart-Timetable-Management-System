from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field


class UserRoleEnum(str, Enum):
    superadmin = "superadmin"
    college_coordinator = "college_coordinator"
    hod = "hod"
    dept_coordinator = "dept_coordinator"
    faculty = "faculty"
    student = "student"


class SessionTypeEnum(str, Enum):
    # Matches DB enum `session_type`
    theory = "theory"
    lab = "lab"


class RoomTypeEnum(str, Enum):
    # Matches DB enum `room_type`
    classroom = "classroom"
    lab = "lab"


class TimetableStatusEnum(str, Enum):
    # Matches DB enum `timetable_status`
    draft = "draft"
    pending_approval = "pending_approval"
    published = "published"
    rejected = "rejected"


class SlotSourceEnum(str, Enum):
    # Matches DB enum `slot_source`
    regular = "regular"
    mdm = "mdm"
    pe = "pe"


class LockStatusEnum(str, Enum):
    # Matches DB enum `lock_status` (used by mdm_slots / elective_slots)
    draft = "draft"
    locked = "locked"


# --- Component Inputs for Generation ---

class FacultyInput(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    department_id: Optional[str] = None
    max_weekly_hours: int = 18


class RoomInput(BaseModel):
    id: str
    name: str
    code: str
    room_type: RoomTypeEnum = RoomTypeEnum.classroom
    capacity: int = 60
    department_id: Optional[str] = None


class CourseInput(BaseModel):
    id: str
    code: str
    name: str
    credits: int = 3
    weekly_theory_hours: int = 3
    weekly_lab_hours: int = 0
    weekly_tutorial_hours: int = 0
    preferred_room_type: RoomTypeEnum = RoomTypeEnum.classroom
    assigned_faculty_ids: List[str] = Field(default_factory=list)
    # Rooms/Labs explicitly mapped to this course (room_course_map). Empty = any.
    allowed_room_ids: List[str] = Field(default_factory=list)


class BatchInput(BaseModel):
    id: str
    name: str
    student_count: int = 20


class DivisionInput(BaseModel):
    id: str
    name: str
    academic_year_id: Optional[str] = None
    year_level: int = 1
    capacity: int = 60
    batches: List[BatchInput] = Field(default_factory=list)


class MDMSlotInput(BaseModel):
    id: str
    name: str
    day_of_week: int
    start_time: str
    end_time: str
    is_locked: bool = True
    faculty_id: Optional[str] = None
    room_id: Optional[str] = None


class ElectiveSlotInput(BaseModel):
    id: str
    name: str
    day_of_week: int
    start_time: str
    end_time: str
    slot_duration_minutes: int = 60
    is_locked: bool = True
    faculty_id: Optional[str] = None
    room_id: Optional[str] = None


class LunchBreakInput(BaseModel):
    day_of_week: int
    start_time: str
    end_time: str
    division_id: Optional[str] = None


class CollegeSettingsInput(BaseModel):
    working_days: List[int] = [1, 2, 3, 4, 5, 6]  # 1=Mon .. 6=Sat
    day_start_time: str = "08:00:00"
    day_end_time: str = "17:00:00"
    slot_duration_minutes: int = 60
    lunch_start_time: str = "12:00:00"
    lunch_end_time: str = "13:00:00"
    max_faculty_weekly_hours: int = 18
    max_solver_time_seconds: int = 60


# --- Main Timetable Slot Representation ---

class GeneratedSlot(BaseModel):
    id: Optional[str] = None
    term_id: str
    department_id: Optional[str] = None
    academic_year_id: Optional[str] = None
    division_id: str
    division_name: Optional[str] = None
    batch_id: Optional[str] = None
    batch_name: Optional[str] = None
    day_of_week: int
    start_time: str
    end_time: str
    session_type: SessionTypeEnum
    source_type: SlotSourceEnum
    course_id: Optional[str] = None
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    mdm_slot_option_id: Optional[str] = None
    elective_option_id: Optional[str] = None
    faculty_id: Optional[str] = None
    faculty_name: Optional[str] = None
    room_id: Optional[str] = None
    room_code: Optional[str] = None
    is_locked: bool = False
    status: TimetableStatusEnum = TimetableStatusEnum.draft


class GenerateTimetableRequest(BaseModel):
    term_id: str
    department_id: str
    divisions: List[DivisionInput]
    courses: List[CourseInput]
    faculties: List[FacultyInput]
    rooms: List[RoomInput]
    mdm_slots: List[MDMSlotInput] = Field(default_factory=list)
    elective_slots: List[ElectiveSlotInput] = Field(default_factory=list)
    lunch_breaks: List[LunchBreakInput] = Field(default_factory=list)
    settings: Optional[CollegeSettingsInput] = None
    save_to_db: bool = False


class GenerateTimetableResponse(BaseModel):
    success: bool
    status: str
    message: str
    total_slots_generated: int
    solver_time_seconds: float
    slots: List[GeneratedSlot] = Field(default_factory=list)
    unallocated_courses: List[Dict[str, Any]] = Field(default_factory=list)
    # Explicit status flags (DEC-11): is_complete = all requested sessions placed;
    # timed_out = solver hit its time cap before proving optimality.
    is_complete: bool = True
    timed_out: bool = False
    diagnostics: List[Dict[str, Any]] = Field(default_factory=list)
    validation: Optional[Dict[str, Any]] = None


# --- Preflight (pre-generation readiness) Schemas ---

class PreflightItem(BaseModel):
    id: str
    title: str
    description: str
    status: str  # 'passed' | 'warning' | 'error'


class PreflightResponse(BaseModel):
    ready: bool
    passed_count: int
    warning_count: int
    error_count: int
    items: List[PreflightItem] = Field(default_factory=list)
    diagnostics: List[Dict[str, Any]] = Field(default_factory=list)


# --- Clash Check Schemas ---

class ClashCheckRequest(BaseModel):
    term_id: str
    division_id: str
    batch_id: Optional[str] = None
    day_of_week: int
    start_time: str
    end_time: str
    session_type: SessionTypeEnum = SessionTypeEnum.theory
    course_id: Optional[str] = None
    faculty_id: Optional[str] = None
    room_id: Optional[str] = None
    exclude_timetable_id: Optional[str] = None
    existing_slots: Optional[List[GeneratedSlot]] = None


class ClashDetail(BaseModel):
    clash_type: str  # e.g., 'faculty_double_booked', 'room_double_booked', 'division_overlap', 'lunch_overlap', 'locked_slot_overlap'
    message: str
    conflicting_slot_id: Optional[str] = None
    conflicting_resource: Optional[str] = None


class ClashCheckResponse(BaseModel):
    has_clash: bool
    reasons: List[str]
    clashes: List[ClashDetail] = Field(default_factory=list)
