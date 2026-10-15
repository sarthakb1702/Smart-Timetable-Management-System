from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional
import logging
from supabase import Client
from app.schemas.timetable import ClashCheckRequest, ClashCheckResponse
from app.engine.validator import TimetableValidator
from app.core.auth import require_roles, UserContext, ensure_department_access
from app.core.supabase_client import get_request_supabase

router = APIRouter(prefix="", tags=["Clash Validation"])
logger = logging.getLogger(__name__)


@router.post("/clash-check", response_model=ClashCheckResponse, status_code=status.HTTP_200_OK)
async def check_clash(
    request: ClashCheckRequest,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator", "hod", "dept_tt_coordinator")),
    supabase: Optional[Client] = Depends(get_request_supabase),
) -> ClashCheckResponse:
    """
    Real-time clash checking endpoint for slot allocation and drag-and-drop operations.
    Validates faculty availability, room occupancy, division/batch concurrency,
    locked MDM/PE blocks, lunch break constraints, and maximum theory limits.
    """
    if supabase and request.division_id:
        div_res = supabase.table("divisions").select("department_id").eq("id", request.division_id).execute()
        if div_res.data:
            ensure_department_access(user, div_res.data[0].get("department_id"))

    try:
        response = TimetableValidator.validate_slot_move(request)
        return response
    except Exception as e:
        logger.error(f"Error during clash check: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while evaluating schedule conflicts: {str(e)}",
        )
