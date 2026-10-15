from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
import logging
from pydantic import BaseModel
from supabase import Client

from app.core.auth import (
    require_roles,
    get_current_user,
    UserContext,
    ensure_department_access,
)
from app.core.supabase_client import get_request_supabase as get_supabase

router = APIRouter(prefix="/mappings", tags=["Mappings"])
logger = logging.getLogger(__name__)

MANAGE_ROLES = ("superadmin", "college_tt_coordinator", "hod", "dept_tt_coordinator")


def _course_department_id(supabase: Client, course_id: str) -> Optional[str]:
    res = supabase.table("courses").select("department_id").eq("id", course_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Course not found")
    return res.data[0].get("department_id")


class FacultyCourseMapCreate(BaseModel):
    faculty_id: str
    course_id: str


class RoomCourseMapCreate(BaseModel):
    room_id: str
    course_id: str


class MapResponse(BaseModel):
    id: str
    created_at: Optional[str] = None


@router.get("/faculty")
async def list_faculty_course_maps(
    course_id: Optional[str] = Query(None),
    faculty_id: Optional[str] = Query(None),
    user: UserContext = Depends(get_current_user),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        query = supabase.table("faculty_course_map").select(
            "id, faculty_id, course_id, created_at, users(full_name, email), courses(code, name)"
        )
        if course_id:
            query = query.eq("course_id", course_id)
        if faculty_id:
            query = query.eq("faculty_id", faculty_id)
        return query.execute().data or []
    except Exception as e:
        logger.error(f"Error fetching faculty-course mappings: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch faculty-course mappings")


@router.post("/faculty", status_code=status.HTTP_201_CREATED)
async def create_faculty_course_map(
    mapping: FacultyCourseMapCreate,
    user: UserContext = Depends(require_roles(*MANAGE_ROLES)),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        ensure_department_access(user, _course_department_id(supabase, mapping.course_id))
        res = supabase.table("faculty_course_map").insert(mapping.model_dump()).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create mapping")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating faculty-course mapping: {e}")
        if "duplicate key" in str(e).lower():
            raise HTTPException(status_code=409, detail="Mapping already exists")
        raise HTTPException(status_code=500, detail="Failed to create faculty-course mapping")


@router.delete("/faculty/{mapping_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_faculty_course_map(
    mapping_id: str,
    user: UserContext = Depends(require_roles(*MANAGE_ROLES)),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        existing = supabase.table("faculty_course_map").select("course_id").eq("id", mapping_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Mapping not found")
        ensure_department_access(user, _course_department_id(supabase, existing.data[0]["course_id"]))
        supabase.table("faculty_course_map").delete().eq("id", mapping_id).execute()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting faculty-course mapping: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete faculty-course mapping")


@router.get("/rooms")
async def list_room_course_maps(
    course_id: Optional[str] = Query(None),
    room_id: Optional[str] = Query(None),
    user: UserContext = Depends(get_current_user),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        query = supabase.table("room_course_map").select(
            "id, room_id, course_id, created_at, rooms(name, room_type), courses(code, name)"
        )
        if course_id:
            query = query.eq("course_id", course_id)
        if room_id:
            query = query.eq("room_id", room_id)
        return query.execute().data or []
    except Exception as e:
        logger.error(f"Error fetching room-course mappings: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch room-course mappings")


@router.post("/rooms", status_code=status.HTTP_201_CREATED)
async def create_room_course_map(
    mapping: RoomCourseMapCreate,
    user: UserContext = Depends(require_roles(*MANAGE_ROLES)),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        ensure_department_access(user, _course_department_id(supabase, mapping.course_id))
        res = supabase.table("room_course_map").insert(mapping.model_dump()).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create mapping")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating room-course mapping: {e}")
        if "duplicate key" in str(e).lower():
            raise HTTPException(status_code=409, detail="Mapping already exists")
        raise HTTPException(status_code=500, detail="Failed to create room-course mapping")


@router.delete("/rooms/{mapping_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room_course_map(
    mapping_id: str,
    user: UserContext = Depends(require_roles(*MANAGE_ROLES)),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        existing = supabase.table("room_course_map").select("course_id").eq("id", mapping_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Mapping not found")
        ensure_department_access(user, _course_department_id(supabase, existing.data[0]["course_id"]))
        supabase.table("room_course_map").delete().eq("id", mapping_id).execute()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting room-course mapping: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete room-course mapping")
