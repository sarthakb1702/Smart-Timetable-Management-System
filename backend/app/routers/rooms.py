from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
import logging
from supabase import Client

from app.core.auth import (
    require_roles,
    UserContext,
    is_global_role,
    resolve_department_id,
    ensure_department_access,
)
from app.core.supabase_client import get_request_supabase as get_supabase
from app.schemas.rooms import RoomResponse, RoomCreate, RoomUpdate

router = APIRouter(prefix="/rooms", tags=["Rooms"])
logger = logging.getLogger(__name__)

@router.get("", response_model=List[RoomResponse])
async def list_rooms(
    department_id: Optional[str] = Query(None),
    is_shared: bool = Query(False),
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator", "hod", "dept_tt_coordinator")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        query = supabase.table("rooms").select("*")
        if is_shared:
            query = query.is_("department_id", "null")
        elif department_id:
            query = query.eq("department_id", resolve_department_id(user, department_id))
        elif not is_global_role(user.role):
            # Department-bound roles only see their own department's rooms.
            query = query.eq("department_id", resolve_department_id(user, None))

        res = query.order("name").execute()
        return res.data or []
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching rooms: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch rooms")

@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_room(
    room: RoomCreate,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator", "hod", "dept_tt_coordinator")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        data = room.model_dump()
        if data.get("department_id") is None:
            if not is_global_role(user.role):
                raise HTTPException(status_code=403, detail="Only global coordinators can create shared rooms")
        else:
            data["department_id"] = resolve_department_id(user, data["department_id"])
        res = supabase.table("rooms").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create room")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating room: {e}")
        raise HTTPException(status_code=500, detail="Failed to create room")

@router.put("/{room_id}", response_model=RoomResponse)
async def update_room(
    room_id: str,
    room: RoomUpdate,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator", "hod", "dept_tt_coordinator")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        existing = supabase.table("rooms").select("department_id").eq("id", room_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Room not found")
        current_dept = existing.data[0].get("department_id")
        if current_dept is None:
            if not is_global_role(user.role):
                raise HTTPException(status_code=403, detail="Only global coordinators can modify shared rooms")
        else:
            ensure_department_access(user, current_dept)

        update_data = {k: v for k, v in room.model_dump().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        if "department_id" in update_data:
            update_data["department_id"] = resolve_department_id(user, update_data["department_id"])

        res = supabase.table("rooms").update(update_data).eq("id", room_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Room not found")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating room: {e}")
        raise HTTPException(status_code=500, detail="Failed to update room")

@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(
    room_id: str,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator", "hod", "dept_tt_coordinator")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        existing = supabase.table("rooms").select("department_id").eq("id", room_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Room not found")
        current_dept = existing.data[0].get("department_id")
        if current_dept is None:
            if not is_global_role(user.role):
                raise HTTPException(status_code=403, detail="Only global coordinators can delete shared rooms")
        else:
            ensure_department_access(user, current_dept)

        res = supabase.table("rooms").delete().eq("id", room_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Room not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting room: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete room")
