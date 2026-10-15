from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel, Field
from supabase import Client
from datetime import datetime, timezone
from app.core.auth import (
    require_roles,
    UserContext,
    resolve_department_id,
    ensure_department_access,
)
from app.core.supabase_client import get_request_supabase as get_supabase
from app.engine.constraints import is_time_overlapping

router = APIRouter(prefix="/electives", tags=["Program Electives"])

DEFAULT_LUNCH_START = "12:00:00"
DEFAULT_LUNCH_END = "13:00:00"

# --- Schemas ---

class ElectiveCourseBase(BaseModel):
    code: str
    name: str
    theory_credits: int = 0
    lab_credits: int = 0
    academic_year_id: str
    department_id: str

class ElectiveCourseCreate(ElectiveCourseBase):
    pass

class ElectiveCourseResponse(ElectiveCourseBase):
    id: str
    created_at: str

class ElectiveOptionBase(BaseModel):
    elective_course_id: str
    term_id: str
    faculty_id: str
    capacity: int
    theory_room_id: Optional[str] = None

class ElectiveOptionCreate(ElectiveOptionBase):
    pass

class ElectiveOptionResponse(ElectiveOptionBase):
    id: str
    created_at: str
    course_name: Optional[str] = None
    course_code: Optional[str] = None
    faculty_name: Optional[str] = None

class ElectiveSlotBase(BaseModel):
    department_id: str
    academic_year_id: str
    session_type: str = "theory"
    day_of_week: int
    start_time: str
    end_time: str
    status: str = "draft"

class ElectiveSlotCreate(ElectiveSlotBase):
    pass

class ElectiveSlotUpdate(BaseModel):
    status: Optional[str] = Field(default=None, pattern="^(draft|locked)$")
    day_of_week: Optional[int] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None

class ElectiveSlotResponse(ElectiveSlotBase):
    id: str
    created_at: str
    locked_by: Optional[str] = None
    locked_at: Optional[str] = None

class ElectiveSelectionCreate(BaseModel):
    elective_option_id: str
    term_id: str

class ElectiveSelectionResponse(ElectiveSelectionCreate):
    id: str
    student_id: str
    status: str
    selected_at: str

# --- Endpoints ---

@router.get("/courses", response_model=List[ElectiveCourseResponse])
async def list_elective_courses(
    department_id: Optional[str] = None,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator", "hod", "dept_tt_coordinator")),
    supabase: Client = Depends(get_supabase)
):
    scoped_department_id = resolve_department_id(user, department_id)
    query = supabase.table("elective_courses").select("*")
    if scoped_department_id:
        query = query.eq("department_id", scoped_department_id)

    res = query.execute()
    return res.data

@router.post("/courses", response_model=ElectiveCourseResponse)
async def create_elective_course(
    course: ElectiveCourseCreate,
    user: UserContext = Depends(require_roles("superadmin", "hod", "dept_tt_coordinator")),
    supabase: Client = Depends(get_supabase)
):
    if user.role in ["hod", "dept_tt_coordinator"] and user.department_id != course.department_id:
        raise HTTPException(status_code=403, detail="Cannot create elective course for another department")
        
    try:
        res = supabase.table("elective_courses").insert(course.model_dump()).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/courses/{course_id}", status_code=204)
async def delete_elective_course(
    course_id: str,
    user: UserContext = Depends(require_roles("superadmin", "hod", "dept_tt_coordinator")),
    supabase: Client = Depends(get_supabase)
):
    # Security: Ensure department matches if not superadmin
    if user.role != "superadmin":
        c_res = supabase.table("elective_courses").select("department_id").eq("id", course_id).execute()
        if not c_res.data or c_res.data[0]["department_id"] != user.department_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this course")
            
    supabase.table("elective_courses").delete().eq("id", course_id).execute()

@router.get("/options", response_model=List[ElectiveOptionResponse])
async def list_elective_options(
    term_id: Optional[str] = None,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator", "hod", "dept_tt_coordinator", "student")),
    supabase: Client = Depends(get_supabase)
):
    query = supabase.table("elective_options").select("*, elective_courses(name, code, department_id), users!elective_options_faculty_id_fkey(full_name)")
    if term_id:
        query = query.eq("term_id", term_id)
        
    res = query.execute()
    
    # Filter by user department if restricted
    options = []
    for row in res.data:
        if user.role in ["hod", "dept_tt_coordinator", "student"] and user.department_id:
            if row.get("elective_courses", {}).get("department_id") != user.department_id:
                continue
                
        opt = dict(row)
        if row.get("elective_courses"):
            opt["course_name"] = row["elective_courses"]["name"]
            opt["course_code"] = row["elective_courses"]["code"]
        if row.get("users"):
            opt["faculty_name"] = row["users"]["full_name"]
        options.append(opt)
        
    return options

@router.post("/options", response_model=ElectiveOptionResponse)
async def create_elective_option(
    option: ElectiveOptionCreate,
    user: UserContext = Depends(require_roles("superadmin", "hod", "dept_tt_coordinator")),
    supabase: Client = Depends(get_supabase)
):
    course_res = supabase.table("elective_courses").select("department_id").eq("id", option.elective_course_id).execute()
    if not course_res.data:
        raise HTTPException(status_code=404, detail="Elective course not found")
    ensure_department_access(user, course_res.data[0].get("department_id"))

    try:
        res = supabase.table("elective_options").insert(option.model_dump()).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/options/{option_id}", status_code=204)
async def delete_elective_option(
    option_id: str,
    user: UserContext = Depends(require_roles("superadmin", "hod", "dept_tt_coordinator")),
    supabase: Client = Depends(get_supabase)
):
    existing = supabase.table("elective_options").select("elective_courses(department_id)").eq("id", option_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Elective option not found")
    dept = (existing.data[0].get("elective_courses") or {}).get("department_id")
    ensure_department_access(user, dept)
    supabase.table("elective_options").delete().eq("id", option_id).execute()

@router.get("/slots", response_model=List[ElectiveSlotResponse])
async def list_elective_slots(
    department_id: Optional[str] = None,
    academic_year_id: Optional[str] = None,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator", "hod", "dept_tt_coordinator", "student")),
    supabase: Client = Depends(get_supabase)
):
    scoped_department_id = resolve_department_id(user, department_id)
    query = supabase.table("elective_slots").select("*")
    if scoped_department_id:
        query = query.eq("department_id", scoped_department_id)
    if academic_year_id:
        query = query.eq("academic_year_id", academic_year_id)

    res = query.execute()
    return res.data

def _validate_pe_window(
    supabase: Client,
    department_id: str,
    academic_year_id: str,
    day_of_week: int,
    start_time: str,
    end_time: str,
    exclude_id: Optional[str] = None,
) -> List[str]:
    """PE-009: a PE slot must not overlap lunch, locked MDM blocks, or core lectures."""
    reasons: List[str] = []

    if is_time_overlapping(start_time, end_time, DEFAULT_LUNCH_START, DEFAULT_LUNCH_END):
        reasons.append(
            f"Overlaps the lunch break ({DEFAULT_LUNCH_START}-{DEFAULT_LUNCH_END})."
        )

    try:
        mdm = (
            supabase.table("mdm_slots")
            .select("id, day_of_week, start_time, end_time, status")
            .eq("academic_year_id", academic_year_id)
            .eq("day_of_week", day_of_week)
            .execute()
        ).data or []
        for m in mdm:
            if m.get("status") != "locked":
                continue
            if is_time_overlapping(start_time, end_time, str(m["start_time"]), str(m["end_time"])):
                reasons.append(
                    f"Overlaps a locked MDM block on day {day_of_week} "
                    f"({str(m['start_time'])[:5]}-{str(m['end_time'])[:5]})."
                )
    except Exception:
        pass

    try:
        cores = (
            supabase.table("timetable")
            .select("id, day_of_week, start_time, end_time, source_type")
            .eq("department_id", department_id)
            .eq("academic_year_id", academic_year_id)
            .eq("day_of_week", day_of_week)
            .eq("source_type", "regular")
            .execute()
        ).data or []
        for c in cores:
            if exclude_id and c.get("id") == exclude_id:
                continue
            if is_time_overlapping(start_time, end_time, str(c["start_time"]), str(c["end_time"])):
                reasons.append(
                    f"Overlaps an existing core lecture on day {day_of_week} "
                    f"({str(c['start_time'])[:5]}-{str(c['end_time'])[:5]})."
                )
    except Exception:
        pass

    return reasons


@router.post("/slots", response_model=ElectiveSlotResponse)
async def create_elective_slot(
    slot: ElectiveSlotCreate,
    user: UserContext = Depends(require_roles("superadmin", "hod", "dept_tt_coordinator")),
    supabase: Client = Depends(get_supabase)
):
    ensure_department_access(user, slot.department_id)
    scoped_department_id = resolve_department_id(user, slot.department_id)

    reasons = _validate_pe_window(
        supabase,
        scoped_department_id,
        slot.academic_year_id,
        slot.day_of_week,
        slot.start_time,
        slot.end_time,
    )
    if reasons:
        raise HTTPException(
            status_code=409,
            detail={"message": "PE slot conflicts with existing schedule.", "reasons": reasons},
        )

    try:
        data = slot.model_dump()
        data["department_id"] = scoped_department_id
        res = supabase.table("elective_slots").insert(data).execute()
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/slots/{slot_id}", response_model=ElectiveSlotResponse)
async def update_elective_slot(
    slot_id: str,
    update: ElectiveSlotUpdate,
    user: UserContext = Depends(require_roles("superadmin", "hod", "dept_tt_coordinator")),
    supabase: Client = Depends(get_supabase)
):
    """Lock/unlock a PE slot and (when unlocked) adjust its window (PE-004)."""
    existing = supabase.table("elective_slots").select("*").eq("id", slot_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Elective slot not found")
    current = existing.data[0]
    ensure_department_access(user, current.get("department_id"))

    data = update.model_dump(exclude_none=True)
    if not data:
        return current

    day = data.get("day_of_week", current["day_of_week"])
    start_time = data.get("start_time", str(current["start_time"]))
    end_time = data.get("end_time", str(current["end_time"]))

    # Locked slots cannot have their window changed until unlocked.
    window_changed = {"day_of_week", "start_time", "end_time"} & set(data.keys())
    if current.get("status") == "locked" and window_changed and data.get("status") != "draft":
        raise HTTPException(
            status_code=409,
            detail="Unlock the PE slot before changing its day or time.",
        )

    if window_changed or data.get("status") == "locked":
        reasons = _validate_pe_window(
            supabase,
            current["department_id"],
            current["academic_year_id"],
            day,
            start_time,
            end_time,
            exclude_id=slot_id,
        )
        if reasons:
            raise HTTPException(
                status_code=409,
                detail={"message": "PE slot conflicts with existing schedule.", "reasons": reasons},
            )

    if data.get("status") == "locked":
        data["locked_by"] = user.user_id
        data["locked_at"] = datetime.now(timezone.utc).isoformat()
    elif data.get("status") == "draft":
        data["locked_by"] = None
        data["locked_at"] = None

    try:
        res = supabase.table("elective_slots").update(data).eq("id", slot_id).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/slots/{slot_id}/lock", response_model=ElectiveSlotResponse)
async def lock_elective_slot(
    slot_id: str,
    user: UserContext = Depends(require_roles("superadmin", "hod", "dept_tt_coordinator")),
    supabase: Client = Depends(get_supabase)
):
    return await update_elective_slot(
        slot_id, ElectiveSlotUpdate(status="locked"), user, supabase
    )


@router.post("/slots/{slot_id}/unlock", response_model=ElectiveSlotResponse)
async def unlock_elective_slot(
    slot_id: str,
    user: UserContext = Depends(require_roles("superadmin", "hod", "dept_tt_coordinator")),
    supabase: Client = Depends(get_supabase)
):
    return await update_elective_slot(
        slot_id, ElectiveSlotUpdate(status="draft"), user, supabase
    )


@router.delete("/slots/{slot_id}", status_code=204)
async def delete_elective_slot(
    slot_id: str,
    user: UserContext = Depends(require_roles("superadmin", "hod", "dept_tt_coordinator")),
    supabase: Client = Depends(get_supabase)
):
    existing = supabase.table("elective_slots").select("department_id").eq("id", slot_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Elective slot not found")
    ensure_department_access(user, existing.data[0].get("department_id"))
    supabase.table("elective_slots").delete().eq("id", slot_id).execute()

@router.post("/selections", response_model=ElectiveSelectionResponse)
async def create_elective_selection(
    selection: ElectiveSelectionCreate,
    user: UserContext = Depends(require_roles("student")),
    supabase: Client = Depends(get_supabase)
):
    data = selection.model_dump()
    data["student_id"] = user.user_id
    try:
        # Upsert: A student can only have 1 selection per term (UNIQUE(student_id, term_id))
        res = supabase.table("student_elective_selections").upsert(data, on_conflict="student_id, term_id").execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/selections/me", response_model=List[ElectiveSelectionResponse])
async def get_my_selections(
    user: UserContext = Depends(require_roles("student")),
    supabase: Client = Depends(get_supabase)
):
    res = supabase.table("student_elective_selections").select("*").eq("student_id", user.user_id).execute()
    return res.data
