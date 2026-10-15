from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
import logging
from supabase import Client

from app.core.auth import (
    require_roles,
    UserContext,
    resolve_department_id,
    ensure_department_access,
)
from app.core.supabase_client import get_request_supabase as get_supabase
from app.schemas.courses import CourseResponse, CourseCreate, CourseUpdate

router = APIRouter(prefix="/courses", tags=["Courses"])
logger = logging.getLogger(__name__)

@router.get("/mdm", response_model=List[CourseResponse])
async def list_mdm_courses(
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        res = supabase.table("courses").select("*, departments(name), academic_years(name)").eq("is_mdm", True).order("created_at", desc=True).execute()
        
        courses = []
        for c in res.data or []:
            courses.append({
                **c,
                "department_name": c.get("departments", {}).get("name") if c.get("departments") else None,
                "academic_year_name": c.get("academic_years", {}).get("name") if c.get("academic_years") else None,
            })
        return courses
    except Exception as e:
        logger.error(f"Error fetching MDM courses: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch MDM courses")

@router.post("/mdm", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_mdm_course(
    course: CourseCreate,
    user: UserContext = Depends(require_roles("superadmin")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        data = course.model_dump()
        data["is_mdm"] = True
        res = supabase.table("courses").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create MDM course")
            
        c = res.data[0]
        # Fetch names for response
        dept_name = None
        if c.get("department_id"):
            dept_res = supabase.table("departments").select("name").eq("id", c["department_id"]).execute()
            dept_name = dept_res.data[0]["name"] if dept_res.data else None
            
        year_name = None
        if c.get("academic_year_id"):
            year_res = supabase.table("academic_years").select("name").eq("id", c["academic_year_id"]).execute()
            year_name = year_res.data[0]["name"] if year_res.data else None
            
        return {**c, "department_name": dept_name, "academic_year_name": year_name}
    except Exception as e:
        logger.error(f"Error creating MDM course: {e}")
        raise HTTPException(status_code=500, detail="Failed to create MDM course")

@router.put("/mdm/{course_id}", response_model=CourseResponse)
async def update_mdm_course(
    course_id: str,
    course: CourseUpdate,
    user: UserContext = Depends(require_roles("superadmin")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        update_data = {k: v for k, v in course.model_dump().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        res = supabase.table("courses").update(update_data).eq("id", course_id).eq("is_mdm", True).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="MDM course not found")
            
        c = res.data[0]
        # Fetch names for response
        dept_name = None
        if c.get("department_id"):
            dept_res = supabase.table("departments").select("name").eq("id", c["department_id"]).execute()
            dept_name = dept_res.data[0]["name"] if dept_res.data else None
            
        year_name = None
        if c.get("academic_year_id"):
            year_res = supabase.table("academic_years").select("name").eq("id", c["academic_year_id"]).execute()
            year_name = year_res.data[0]["name"] if year_res.data else None
            
        return {**c, "department_name": dept_name, "academic_year_name": year_name}
    except Exception as e:
        logger.error(f"Error updating MDM course: {e}")
        raise HTTPException(status_code=500, detail="Failed to update MDM course")

@router.delete("/mdm/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mdm_course(
    course_id: str,
    user: UserContext = Depends(require_roles("superadmin")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        res = supabase.table("courses").delete().eq("id", course_id).eq("is_mdm", True).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="MDM course not found")
    except Exception as e:
        logger.error(f"Error deleting MDM course: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete MDM course")

@router.get("", response_model=List[CourseResponse])
async def list_dept_courses(
    department_id: Optional[str] = Query(None),
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator", "hod", "dept_tt_coordinator")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase: raise HTTPException(status_code=503, detail="Database not available")
    try:
        scoped_department_id = resolve_department_id(user, department_id)
        query = supabase.table("courses").select("*, departments(name), academic_years(name)").eq("is_mdm", False)
        if scoped_department_id:
            query = query.eq("department_id", scoped_department_id)
        res = query.order("created_at", desc=True).execute()
        courses = []
        for c in res.data or []:
            courses.append({
                **c,
                "department_name": c.get("departments", {}).get("name") if c.get("departments") else None,
                "academic_year_name": c.get("academic_years", {}).get("name") if c.get("academic_years") else None,
            })
        return courses
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch courses")

@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_dept_course(
    course: CourseCreate,
    user: UserContext = Depends(require_roles("superadmin", "hod", "dept_tt_coordinator")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase: raise HTTPException(status_code=503, detail="Database not available")
    try:
        data = course.model_dump()
        data["is_mdm"] = False
        data["department_id"] = resolve_department_id(user, course.department_id)
        res = supabase.table("courses").insert(data).execute()
        if not res.data: raise HTTPException(status_code=400, detail="Failed to create course")
        c = res.data[0]
        return {**c, "department_name": None, "academic_year_name": None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create course")

@router.put("/{course_id}", response_model=CourseResponse)
async def update_dept_course(
    course_id: str,
    course: CourseUpdate,
    user: UserContext = Depends(require_roles("superadmin", "hod", "dept_tt_coordinator")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase: raise HTTPException(status_code=503, detail="Database not available")
    try:
        existing = supabase.table("courses").select("department_id").eq("id", course_id).eq("is_mdm", False).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Course not found")
        ensure_department_access(user, existing.data[0].get("department_id"))

        update_data = {k: v for k, v in course.model_dump().items() if v is not None}
        if "department_id" in update_data:
            update_data["department_id"] = resolve_department_id(user, update_data["department_id"])
        res = supabase.table("courses").update(update_data).eq("id", course_id).eq("is_mdm", False).execute()
        if not res.data: raise HTTPException(status_code=404, detail="Course not found")
        return {**res.data[0], "department_name": None, "academic_year_name": None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update course")

@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dept_course(
    course_id: str,
    user: UserContext = Depends(require_roles("superadmin", "hod", "dept_tt_coordinator")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase: raise HTTPException(status_code=503, detail="Database not available")
    try:
        existing = supabase.table("courses").select("department_id").eq("id", course_id).eq("is_mdm", False).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Course not found")
        ensure_department_access(user, existing.data[0].get("department_id"))
        res = supabase.table("courses").delete().eq("id", course_id).eq("is_mdm", False).execute()
        if not res.data: raise HTTPException(status_code=404, detail="Course not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete course")
