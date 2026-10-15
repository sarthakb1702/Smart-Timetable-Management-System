from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
import logging
from supabase import Client
import datetime

from app.core.auth import require_roles, UserContext
from app.core.supabase_client import get_request_supabase as get_supabase
from app.schemas.mdm import MdmSlotResponse, MdmSlotCreate, MdmSlotUpdate, MdmSlotOptionResponse, MdmSlotOptionCreate

router = APIRouter(prefix="/mdm", tags=["MDM Slots"])
logger = logging.getLogger(__name__)

@router.get("/slots", response_model=List[MdmSlotResponse])
async def list_mdm_slots(
    academic_year_id: Optional[str] = Query(None),
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator", "hod", "dept_tt_coordinator")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        query = supabase.table("mdm_slots").select("*, mdm_slot_options(*, courses(name, department_id), users(full_name), rooms(name, capacity))")
        if academic_year_id:
            query = query.eq("academic_year_id", academic_year_id)
            
        res = query.order("day_of_week").order("start_time").execute()
        
        slots = []
        for s in res.data or []:
            opts = []
            for o in s.get("mdm_slot_options", []):
                # Fetch dept name safely
                dept_id = o.get("courses", {}).get("department_id")
                dept_name = None
                if dept_id:
                    d_res = supabase.table("departments").select("name").eq("id", dept_id).execute()
                    dept_name = d_res.data[0]["name"] if d_res.data else None
                    
                opts.append({
                    "id": o["id"],
                    "mdm_slot_id": o["mdm_slot_id"],
                    "course_id": o["course_id"],
                    "faculty_id": o["faculty_id"],
                    "room_id": o["room_id"],
                    "created_at": o["created_at"],
                    "course_name": o.get("courses", {}).get("name"),
                    "faculty_name": o.get("users", {}).get("full_name"),
                    "room_name": o.get("rooms", {}).get("name"),
                    "capacity": o.get("rooms", {}).get("capacity"),
                    "department_name": dept_name
                })
            slots.append({
                **s,
                "options": opts
            })
        return slots
    except Exception as e:
        logger.error(f"Error fetching MDM slots: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch MDM slots")

@router.post("/slots", response_model=MdmSlotResponse, status_code=status.HTTP_201_CREATED)
async def create_mdm_slot(
    slot: MdmSlotCreate,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        data = slot.model_dump()
        # Convert time to string
        data["start_time"] = data["start_time"].isoformat()
        data["end_time"] = data["end_time"].isoformat()
        data["created_by"] = user.user_id

        res = supabase.table("mdm_slots").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create MDM slot")

        return {**res.data[0], "options": []}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating MDM slot: {e}")
        raise HTTPException(status_code=500, detail="Failed to create MDM slot")


def _mdm_slot_with_options(supabase: Client, slot_id: str) -> dict:
    res = supabase.table("mdm_slots").select("*").eq("id", slot_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="MDM slot not found")
    return {**res.data[0], "options": []}


@router.patch("/slots/{slot_id}", response_model=MdmSlotResponse)
async def update_mdm_slot(
    slot_id: str,
    slot: MdmSlotUpdate,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    """Update an MDM slot and lock/unlock it (DEC-02: draft <-> locked)."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    existing = supabase.table("mdm_slots").select("*").eq("id", slot_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="MDM slot not found")
    current = existing.data[0]

    data = slot.model_dump(exclude_none=True)
    if "start_time" in data and data["start_time"] is not None:
        data["start_time"] = data["start_time"].isoformat()
    if "end_time" in data and data["end_time"] is not None:
        data["end_time"] = data["end_time"].isoformat()

    # Locked MDM slots cannot have their day/time changed until unlocked.
    time_fields = {"day_of_week", "start_time", "end_time"} & set(data.keys())
    if current.get("status") == "locked" and time_fields and data.get("status") != "draft":
        raise HTTPException(
            status_code=409,
            detail="Unlock the MDM slot before changing its day or time.",
        )

    if data.get("status") == "locked":
        data["locked_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    elif data.get("status") == "draft":
        data["locked_at"] = None

    if not data:
        return _mdm_slot_with_options(supabase, slot_id)

    try:
        res = supabase.table("mdm_slots").update(data).eq("id", slot_id).execute()
        return {**res.data[0], "options": []}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating MDM slot: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to update MDM slot: {e}")


@router.post("/slots/{slot_id}/lock", response_model=MdmSlotResponse)
async def lock_mdm_slot(
    slot_id: str,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    """Lock (publish) an MDM slot so departmental generators reserve the block."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    res = supabase.table("mdm_slots").update({
        "status": "locked",
        "locked_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }).eq("id", slot_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="MDM slot not found")
    return {**res.data[0], "options": []}


@router.post("/slots/{slot_id}/unlock", response_model=MdmSlotResponse)
async def unlock_mdm_slot(
    slot_id: str,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    """Revert a locked MDM slot to draft so it can be edited."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    res = supabase.table("mdm_slots").update({
        "status": "draft",
        "locked_at": None,
    }).eq("id", slot_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="MDM slot not found")
    return {**res.data[0], "options": []}


@router.delete("/slots/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mdm_slot(
    slot_id: str,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        res = supabase.table("mdm_slots").delete().eq("id", slot_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="MDM slot not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting MDM slot: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete MDM slot")

@router.post("/slots/{slot_id}/options", response_model=MdmSlotOptionResponse, status_code=status.HTTP_201_CREATED)
async def create_mdm_slot_option(
    slot_id: str,
    option: MdmSlotOptionCreate,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    parent = supabase.table("mdm_slots").select("status").eq("id", slot_id).execute()
    if not parent.data:
        raise HTTPException(status_code=404, detail="MDM slot not found")
    if parent.data[0].get("status") == "locked":
        raise HTTPException(
            status_code=409,
            detail="MDM slot is locked. Unlock it before adding course options.",
        )

    try:
        data = option.model_dump()
        data["mdm_slot_id"] = slot_id
        
        res = supabase.table("mdm_slot_options").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create option")
            
        o = res.data[0]
        
        # Fetch related data for response
        course_res = supabase.table("courses").select("name, department_id").eq("id", o["course_id"]).execute()
        faculty_res = supabase.table("users").select("full_name").eq("id", o["faculty_id"]).execute()
        room_res = supabase.table("rooms").select("name, capacity").eq("id", o["room_id"]).execute()
        
        dept_name = None
        if course_res.data and course_res.data[0].get("department_id"):
            dept_res = supabase.table("departments").select("name").eq("id", course_res.data[0]["department_id"]).execute()
            dept_name = dept_res.data[0]["name"] if dept_res.data else None
            
        return {
            "id": o["id"],
            "mdm_slot_id": o["mdm_slot_id"],
            "course_id": o["course_id"],
            "faculty_id": o["faculty_id"],
            "room_id": o["room_id"],
            "created_at": o["created_at"],
            "course_name": course_res.data[0]["name"] if course_res.data else None,
            "faculty_name": faculty_res.data[0]["full_name"] if faculty_res.data else None,
            "room_name": room_res.data[0]["name"] if room_res.data else None,
            "capacity": room_res.data[0]["capacity"] if room_res.data else None,
            "department_name": dept_name
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating MDM slot option: {e}")
        raise HTTPException(status_code=500, detail="Failed to create option")


@router.patch("/slots/options/{option_id}", response_model=MdmSlotOptionResponse)
async def update_mdm_slot_option(
    option_id: str,
    option: MdmSlotOptionCreate,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    """Update an MDM option (course/faculty/room). Blocked while the parent slot is locked."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    existing = supabase.table("mdm_slot_options").select("*, mdm_slots(status)").eq("id", option_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="MDM slot option not found")
    parent_status = (existing.data[0].get("mdm_slots") or {}).get("status")
    if parent_status == "locked":
        raise HTTPException(
            status_code=409,
            detail="MDM slot is locked. Unlock it before editing options.",
        )

    try:
        res = supabase.table("mdm_slot_options").update(option.model_dump()).eq("id", option_id).execute()
        o = res.data[0]
        course_res = supabase.table("courses").select("name, code, department_id").eq("id", o["course_id"]).execute()
        faculty_res = supabase.table("users").select("full_name").eq("id", o["faculty_id"]).execute()
        room_res = supabase.table("rooms").select("name, code, capacity").eq("id", o["room_id"]).execute()
        return {
            "id": o["id"],
            "mdm_slot_id": o["mdm_slot_id"],
            "course_id": o["course_id"],
            "faculty_id": o["faculty_id"],
            "room_id": o["room_id"],
            "created_at": o["created_at"],
            "course_name": course_res.data[0]["name"] if course_res.data else None,
            "faculty_name": faculty_res.data[0]["full_name"] if faculty_res.data else None,
            "room_name": (room_res.data[0].get("code") or room_res.data[0]["name"]) if room_res.data else None,
            "capacity": room_res.data[0]["capacity"] if room_res.data else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating MDM slot option: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to update option: {e}")


@router.delete("/slots/options/{option_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mdm_slot_option(
    option_id: str,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        res = supabase.table("mdm_slot_options").delete().eq("id", option_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="MDM slot option not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting MDM slot option: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete option")
