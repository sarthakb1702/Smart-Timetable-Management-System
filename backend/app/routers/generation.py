from fastapi import APIRouter, HTTPException, status
import logging
from backend.app.schemas.timetable import (
    GenerateTimetableRequest,
    GenerateTimetableResponse,
)
from backend.app.engine.solver import TimetableSolver
from backend.app.core.supabase_client import get_supabase_client

router = APIRouter(prefix="", tags=["Timetable Generation"])
logger = logging.getLogger(__name__)


@router.post("/generate", response_model=GenerateTimetableResponse, status_code=status.HTTP_200_OK)
async def generate_timetable(request: GenerateTimetableRequest) -> GenerateTimetableResponse:
    """
    Solves the timetable constraint satisfaction problem using Google OR-Tools CP-SAT.
    Enforces faculty, room, division/batch, 1hr theory / 2hr lab durations,
    pre-locked MDM and PE blocks, lunch breaks, and weekly workload limits.
    """
    logger.info(
        f"Received generation request for term={request.academic_term_id}, "
        f"department={request.department_id}, divisions={len(request.divisions)}, "
        f"courses={len(request.courses)}, faculties={len(request.faculties)}"
    )

    try:
        solver = TimetableSolver(request)
        result = solver.solve()

        # If solver succeeded and user requested DB persistence
        if result.success and request.save_to_db:
            supabase = get_supabase_client()
            if supabase:
                try:
                    records = []
                    for slot in result.slots:
                        records.append({
                            "academic_term_id": slot.academic_term_id,
                            "division_id": slot.division_id,
                            "batch_id": slot.batch_id,
                            "day_of_week": slot.day_of_week,
                            "start_time": slot.start_time,
                            "end_time": slot.end_time,
                            "session_type": slot.session_type.value,
                            "slot_source": slot.slot_source.value,
                            "course_id": slot.course_id,
                            "mdm_slot_option_id": slot.mdm_slot_option_id,
                            "elective_option_id": slot.elective_option_id,
                            "faculty_id": slot.faculty_id,
                            "room_id": slot.room_id,
                            "lock_status": slot.lock_status.value,
                            "status": "draft",
                        })

                    if records:
                        # Clear old draft records for this term and divisions to avoid duplicates
                        div_ids = [d.id for d in request.divisions]
                        supabase.table("timetable").delete().eq(
                            "academic_term_id", request.academic_term_id
                        ).in_("division_id", div_ids).eq("status", "draft").execute()

                        # Batch insert new generated slots
                        supabase.table("timetable").insert(records).execute()
                        logger.info(f"Persisted {len(records)} timetable slots to Supabase.")
                except Exception as db_err:
                    logger.error(f"Failed to persist generated slots to Supabase: {db_err}")
                    result.message += f" (Note: DB persistence encountered: {str(db_err)})"

        return result

    except Exception as e:
        logger.error(f"Solver pipeline encountered an unhandled error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete timetable generation: {str(e)}",
        )
