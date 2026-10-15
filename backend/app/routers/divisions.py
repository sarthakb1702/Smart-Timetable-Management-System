from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
import logging
from supabase import Client
from app.core.auth import (
    require_roles,
    get_current_user,
    UserContext,
    resolve_department_id,
    ensure_department_access,
)
from app.core.supabase_client import get_request_supabase as get_supabase
from pydantic import BaseModel, Field

class BatchItem(BaseModel):
    id: str
    name: str
    student_count: Optional[int] = 20

class DivisionBase(BaseModel):
    name: str = Field(min_length=1)
    department_id: str
    academic_year_id: str
    student_count: int = Field(default=60)
    faculty_id: Optional[str] = None
    class_teacher: Optional[str] = None
    academic_year_name: Optional[str] = None
    year_level: Optional[int] = None
    batches: List[BatchItem] = Field(default_factory=list)

class DivisionCreate(DivisionBase):
    pass

class DivisionResponse(DivisionBase):
    id: str

router = APIRouter(prefix="/divisions", tags=["Divisions"])

@router.get("", response_model=List[DivisionResponse])
async def list_divisions(
    department_id: Optional[str] = Query(None),
    supabase: Optional[Client] = Depends(get_supabase),
    user: UserContext = Depends(get_current_user),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    scoped_department_id = resolve_department_id(user, department_id)
    query = supabase.table("divisions").select("*, academic_years(name, code, sequence), batches(*)")
    if scoped_department_id:
        query = query.eq("department_id", scoped_department_id)
    res = query.order("name").execute()
    divs = res.data or []

    # Map faculty assigned to divisions
    div_ids = [d["id"] for d in divs]
    teacher_name_by_div = {}
    teacher_id_by_div = {}
    if div_ids:
        faculty_users = (
            supabase.table("users")
            .select("id, full_name, email, division_id")
            .eq("role", "faculty")
            .in_("division_id", div_ids)
            .execute()
            .data
            or []
        )
        for f in faculty_users:
            d_id = f.get("division_id")
            if d_id:
                teacher_name_by_div[d_id] = f.get("full_name") or f.get("email")
                teacher_id_by_div[d_id] = f.get("id")

    items = []
    for d in divs:
        ay = d.get("academic_years") or {}
        items.append({
            **d,
            "faculty_id": teacher_id_by_div.get(d["id"]),
            "class_teacher": teacher_name_by_div.get(d["id"], "Unassigned"),
            "academic_year_name": ay.get("name"),
            "year_level": ay.get("sequence"),
        })
    return items

@router.post("", response_model=DivisionResponse)
async def create_division(
    div: DivisionCreate,
    supabase: Optional[Client] = Depends(get_supabase),
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator", "hod", "dept_tt_coordinator")),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    ensure_department_access(user, div.department_id)

    term_res = supabase.table("academic_terms").select("id").eq("department_id", div.department_id).eq("is_current", True).execute()
    term_id = term_res.data[0]["id"] if term_res.data else None
    
    data = div.model_dump(exclude={"faculty_id", "class_teacher", "academic_year_name"})
    data["term_id"] = term_id
    
    try:
        res = supabase.table("divisions").insert(data).execute()
        created = res.data[0]

        # Link faculty user if selected
        if div.faculty_id:
            supabase.table("users").update({"division_id": created["id"]}).eq("id", div.faculty_id).execute()

        return {
            **created,
            "faculty_id": div.faculty_id,
            "class_teacher": div.class_teacher or "Unassigned",
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{div_id}", status_code=204)
async def delete_division(
    div_id: str,
    supabase: Optional[Client] = Depends(get_supabase),
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator", "hod", "dept_tt_coordinator")),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    existing = supabase.table("divisions").select("department_id").eq("id", div_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Division not found")
    ensure_department_access(user, existing.data[0].get("department_id"))

    # Clear division_id from users
    supabase.table("users").update({"division_id": None}).eq("division_id", div_id).execute()
    supabase.table("divisions").delete().eq("id", div_id).execute()
