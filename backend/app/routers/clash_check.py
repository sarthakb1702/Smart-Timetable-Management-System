from fastapi import APIRouter, HTTPException, status
import logging
from backend.app.schemas.timetable import ClashCheckRequest, ClashCheckResponse
from backend.app.engine.validator import TimetableValidator

router = APIRouter(prefix="", tags=["Clash Validation"])
logger = logging.getLogger(__name__)


@router.post("/clash-check", response_model=ClashCheckResponse, status_code=status.HTTP_200_OK)
async def check_clash(request: ClashCheckRequest) -> ClashCheckResponse:
    """
    Real-time clash checking endpoint for slot allocation and drag-and-drop operations.
    Validates faculty availability, room occupancy, division/batch concurrency,
    locked MDM/PE blocks, lunch break constraints, and maximum theory limits.
    """
    try:
        response = TimetableValidator.validate_slot_move(request)
        return response
    except Exception as e:
        logger.error(f"Error during clash check: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while evaluating schedule conflicts: {str(e)}",
        )
