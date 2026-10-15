from fastapi import APIRouter, HTTPException, status, Depends
import logging

from app.schemas.timetable import (
    GenerateTimetableRequest,
    GenerateTimetableResponse,
    PreflightItem,
    PreflightResponse,
    RoomTypeEnum,
)
from app.engine.solver import TimetableSolver
from app.engine.validator import TimetableValidator
from app.core.auth import require_roles, UserContext, ensure_department_access
from app.core.supabase_client import get_supabase_client

router = APIRouter(prefix="", tags=["Timetable Generation"])
logger = logging.getLogger(__name__)


def _build_preflight(request: GenerateTimetableRequest) -> PreflightResponse:
    """Computes the pre-generation readiness checklist from real request data."""
    items: list[PreflightItem] = []
    diagnostics: list[dict] = []

    faculties = request.faculties
    classrooms = [r for r in request.rooms if r.room_type != RoomTypeEnum.lab]
    labs = [r for r in request.rooms if r.room_type == RoomTypeEnum.lab]
    theory_courses = [c for c in request.courses if c.weekly_theory_hours > 0]
    lab_courses = [c for c in request.courses if c.weekly_lab_hours > 0]

    # 1. Faculty
    if faculties:
        max_limit = (request.settings.max_faculty_weekly_hours if request.settings else 18)
        overloaded = [f for f in faculties if f.max_weekly_hours > max_limit]
        items.append(PreflightItem(
            id="fac-1",
            title="Faculty Workload & Availability Limits",
            description=(
                f"{len(faculties)} faculty member(s) available. "
                + (f"{len(overloaded)} exceed the {max_limit}h weekly cap." if overloaded else f"All limits within {max_limit}h/week.")
            ),
            status="warning" if overloaded else "passed",
        ))
    else:
        items.append(PreflightItem(
            id="fac-1",
            title="Faculty Workload & Availability Limits",
            description="No faculty members are available for this department.",
            status="error",
        ))

    # 2. Rooms
    if not request.rooms:
        items.append(PreflightItem(
            id="room-2",
            title="Classrooms & Specialized Labs Defined",
            description="No rooms are configured for this department.",
            status="error",
        ))
    else:
        status_2 = "passed"
        if theory_courses and not classrooms:
            status_2 = "error"
        elif lab_courses and not labs:
            status_2 = "error"
        items.append(PreflightItem(
            id="room-2",
            title="Classrooms & Specialized Labs Defined",
            description=(
                f"{len(classrooms)} classroom(s) and {len(labs)} lab(s) configured."
            ),
            status=status_2,
        ))

    # 3. Courses
    if not request.courses:
        items.append(PreflightItem(
            id="course-3",
            title="Core Courses & Lab Hours Configured",
            description="No courses mapped to this department.",
            status="error",
        ))
    else:
        items.append(PreflightItem(
            id="course-3",
            title="Core Courses & Lab Hours Configured",
            description=(
                f"{len(theory_courses)} theory course(s) and {len(lab_courses)} lab course(s) with weekly hours."
            ),
            status="passed" if (theory_courses or lab_courses) else "error",
        ))

    # 4. Divisions & batches
    if not request.divisions:
        items.append(PreflightItem(
            id="div-4",
            title="Divisions & Lab Batches Setup",
            description="No divisions configured for this department.",
            status="error",
        ))
    else:
        missing_batches = [d.name for d in request.divisions if lab_courses and not d.batches]
        if missing_batches:
            items.append(PreflightItem(
                id="div-4",
                title="Divisions & Lab Batches Setup",
                description=f"{len(request.divisions)} division(s); labs cannot run for: {', '.join(missing_batches)} (no batches).",
                status="error",
            ))
        else:
            total_batches = sum(len(d.batches) for d in request.divisions)
            items.append(PreflightItem(
                id="div-4",
                title="Divisions & Lab Batches Setup",
                description=f"{len(request.divisions)} division(s) with {total_batches} lab batch(es) total.",
                status="passed",
            ))

    # 5. MDM — locked blocks must exist before departmental generation (MDM-S-004).
    mdm_all = request.mdm_slots
    mdm_locked = [m for m in mdm_all if m.is_locked]
    if not mdm_all:
        items.append(PreflightItem(
            id="mdm-5",
            title="Pre-Locked Multidisciplinary (MDM) Slots",
            description="No MDM slots configured — sessions will not be reserved for MDM.",
            status="warning",
        ))
    elif len(mdm_locked) < len(mdm_all):
        items.append(PreflightItem(
            id="mdm-5",
            title="Pre-Locked Multidisciplinary (MDM) Slots",
            description=(
                f"{len(mdm_all)} MDM slot(s) configured but "
                f"{len(mdm_all) - len(mdm_locked)} are not locked. "
                "Lock all MDM slots before running department generation."
            ),
            status="error",
        ))
    else:
        items.append(PreflightItem(
            id="mdm-5",
            title="Pre-Locked Multidisciplinary (MDM) Slots",
            description=f"{len(mdm_locked)} MDM slot(s) locked college-wide.",
            status="passed",
        ))

    # 6. PE
    pe_all = request.elective_slots
    pe_locked = [e for e in pe_all if e.is_locked]
    if not pe_all:
        items.append(PreflightItem(
            id="pe-6",
            title="Program Elective (PE) Slots",
            description="No PE slots configured — sessions will not be reserved for electives.",
            status="warning",
        ))
    elif len(pe_locked) < len(pe_all):
        items.append(PreflightItem(
            id="pe-6",
            title="Program Elective (PE) Slots",
            description=(
                f"{len(pe_all)} PE slot(s) configured but "
                f"{len(pe_all) - len(pe_locked)} are not locked; they will not be reserved."
            ),
            status="warning",
        ))
    else:
        items.append(PreflightItem(
            id="pe-6",
            title="Program Elective (PE) Slots",
            description=f"{len(pe_locked)} PE slot(s) locked.",
            status="passed",
        ))

    # 7. Lunch
    lunch_start = request.settings.lunch_start_time if request.settings else "12:00:00"
    lunch_end = request.settings.lunch_end_time if request.settings else "13:00:00"
    items.append(PreflightItem(
        id="lunch-7",
        title="College Lunch Break Interval",
        description=f"{lunch_start} - {lunch_end} protected across all working days.",
        status="passed",
    ))

    error_count = sum(1 for i in items if i.status == "error")
    warning_count = sum(1 for i in items if i.status == "warning")
    passed_count = sum(1 for i in items if i.status == "passed")

    return PreflightResponse(
        ready=error_count == 0,
        passed_count=passed_count,
        warning_count=warning_count,
        error_count=error_count,
        items=items,
        diagnostics=diagnostics,
    )


@router.post("/generate/preflight", response_model=PreflightResponse, status_code=status.HTTP_200_OK)
async def generate_preflight(
    request: GenerateTimetableRequest,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator", "hod", "dept_tt_coordinator")),
) -> PreflightResponse:
    """Returns a data-driven pre-generation readiness checklist (replaces FE sample items)."""
    ensure_department_access(user, request.department_id)
    return _build_preflight(request)


@router.post("/generate", response_model=GenerateTimetableResponse, status_code=status.HTTP_200_OK)
async def generate_timetable(
    request: GenerateTimetableRequest,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator", "hod", "dept_tt_coordinator")),
) -> GenerateTimetableResponse:
    """
    Solves the timetable constraint satisfaction problem using Google OR-Tools CP-SAT.
    Enforces faculty, room, division/batch, 1hr theory / 2hr lab durations,
    pre-locked MDM and PE blocks, lunch breaks, and weekly workload limits.
    """
    ensure_department_access(user, request.department_id)

    # MDM-S-004: MDM slots must be locked before departmental generation.
    preflight = _build_preflight(request)
    mdm_blocker = next(
        (i for i in preflight.items if i.id == "mdm-5" and i.status == "error"), None
    )
    if mdm_blocker:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": mdm_blocker.description,
                "items": [i.model_dump() for i in preflight.items],
            },
        )

    logger.info(
        f"Received generation request for term={request.term_id}, "
        f"department={request.department_id}, divisions={len(request.divisions)}, "
        f"courses={len(request.courses)}, faculties={len(request.faculties)}"
    )

    try:
        solver = TimetableSolver(request)
        result = solver.solve()

        # Post-generation validation: never hand back a schedule we know clashes.
        validation = TimetableValidator.validate_schedule(result.slots)
        result.validation = validation.model_dump()
        if validation.has_clash:
            result.success = False
            result.is_complete = False
            result.diagnostics.append({
                "type": "post_validation_failed",
                "severity": "error",
                "message": "Generated schedule failed hard-constraint validation and was not persisted.",
                "clashes": [c.model_dump() for c in validation.clashes],
            })
            result.message += " Post-generation validation detected clashes; nothing was saved."
            return result

        # Fail loudly if persistence was requested but could not complete (F-02/F-11).
        if result.success and request.save_to_db:
            supabase = get_supabase_client()
            if not supabase:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Generation succeeded but the database is unavailable; nothing was saved.",
                )

            records = []
            for slot in result.slots:
                records.append({
                    "term_id": slot.term_id,
                    "department_id": slot.department_id or request.department_id,
                    "academic_year_id": slot.academic_year_id,
                    "division_id": slot.division_id,
                    "batch_id": slot.batch_id,
                    "day_of_week": slot.day_of_week,
                    "start_time": slot.start_time,
                    "end_time": slot.end_time,
                    "session_type": slot.session_type.value,
                    "source_type": slot.source_type.value,
                    "course_id": slot.course_id,
                    "mdm_slot_option_id": slot.mdm_slot_option_id,
                    "elective_option_id": slot.elective_option_id,
                    "faculty_id": slot.faculty_id,
                    "room_id": slot.room_id,
                    "is_locked": slot.is_locked,
                    "status": "draft",
                })

            if records:
                div_ids = [d.id for d in request.divisions]
                try:
                    # Replace prior drafts for these divisions to avoid duplicates.
                    supabase.table("timetable").delete().eq(
                        "term_id", request.term_id
                    ).in_("division_id", div_ids).eq("status", "draft").execute()

                    supabase.table("timetable").insert(records).execute()
                except Exception as db_err:
                    logger.error(f"Failed to persist generated slots: {db_err}", exc_info=True)
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Timetable solved but could not be saved to the database: {db_err}",
                    )
                logger.info(f"Persisted {len(records)} timetable slots to Supabase.")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Solver pipeline encountered an unhandled error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete timetable generation: {str(e)}",
        )
