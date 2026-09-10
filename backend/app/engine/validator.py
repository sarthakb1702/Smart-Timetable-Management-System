import logging
from typing import List, Optional, Tuple
from backend.app.schemas.timetable import (
    ClashCheckRequest,
    ClashCheckResponse,
    ClashDetail,
    GeneratedSlot,
    SessionTypeEnum,
    LockStatusEnum,
)
from backend.app.engine.constraints import (
    is_time_overlapping,
    CLASH_FACULTY_DOUBLE_BOOKED,
    CLASH_ROOM_DOUBLE_BOOKED,
    CLASH_DIVISION_OVERLAP,
    CLASH_BATCH_CONCURRENCY,
    CLASH_LUNCH_OVERLAP,
    CLASH_LOCKED_SLOT_OVERLAP,
    CLASH_MAX_THEORY_PER_DAY,
)
from backend.app.core.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


class TimetableValidator:
    """
    Validates proposed timetable slot placements, drag-and-drop moves,
    and manual modifications for hard clashes and policy constraints.
    """

    @classmethod
    def validate_slot_move(
        cls,
        request: ClashCheckRequest,
    ) -> ClashCheckResponse:
        reasons: List[str] = []
        clashes: List[ClashDetail] = []

        # 1. Gather existing slots: use provided in-memory list or fetch from database
        existing_slots = request.existing_slots
        if existing_slots is None:
            existing_slots = cls._fetch_db_slots_for_term(request.academic_term_id)

        # 2. Check Lunch Overlap
        lunch_clash = cls._check_lunch_overlap(request)
        if lunch_clash:
            reasons.append(lunch_clash.message)
            clashes.append(lunch_clash)

        # 3. Iterate over existing slots
        for slot in existing_slots:
            # Skip comparing slot against itself (when moving an existing slot)
            if request.exclude_timetable_id and slot.id == request.exclude_timetable_id:
                continue

            # Only check on the same day of week
            if slot.day_of_week != request.day_of_week:
                continue

            # Check if time intervals overlap
            if not is_time_overlapping(request.start_time, request.end_time, slot.start_time, slot.end_time):
                continue

            # A. Check Faculty Double-Booking
            if request.faculty_id and slot.faculty_id and request.faculty_id == slot.faculty_id:
                msg = (
                    f"Faculty conflict: {slot.faculty_name or 'Faculty'} is already scheduled "
                    f"for {slot.course_name or slot.session_type} ({slot.start_time} - {slot.end_time}) "
                    f"in {slot.division_name or 'another division'}."
                )
                reasons.append(msg)
                clashes.append(
                    ClashDetail(
                        clash_type=CLASH_FACULTY_DOUBLE_BOOKED,
                        message=msg,
                        conflicting_slot_id=slot.id,
                        conflicting_resource=request.faculty_id,
                    )
                )

            # B. Check Room Double-Booking
            if request.room_id and slot.room_id and request.room_id == slot.room_id:
                msg = (
                    f"Room conflict: Room {slot.room_code or slot.room_id} is already occupied by "
                    f"{slot.division_name or 'Division'} for {slot.course_name or slot.session_type} "
                    f"({slot.start_time} - {slot.end_time})."
                )
                reasons.append(msg)
                clashes.append(
                    ClashDetail(
                        clash_type=CLASH_ROOM_DOUBLE_BOOKED,
                        message=msg,
                        conflicting_slot_id=slot.id,
                        conflicting_resource=request.room_id,
                    )
                )

            # C. Check Division and Batch Conflicts
            if slot.division_id == request.division_id:
                # C1: Locked slot overlap (MDM / PE)
                if slot.lock_status in (LockStatusEnum.locked_mdm, LockStatusEnum.locked_pe, LockStatusEnum.manual_locked):
                    msg = (
                        f"Locked slot conflict: Overlaps with locked {slot.session_type.upper()} block "
                        f"({slot.start_time} - {slot.end_time}) which cannot be displaced."
                    )
                    reasons.append(msg)
                    clashes.append(
                        ClashDetail(
                            clash_type=CLASH_LOCKED_SLOT_OVERLAP,
                            message=msg,
                            conflicting_slot_id=slot.id,
                        )
                    )

                # C2: Whole-division Theory conflict
                # If proposed is Theory (batch_id is None) and existing is any session
                if request.batch_id is None:
                    msg = (
                        f"Division schedule conflict: Division already has a "
                        f"{slot.session_type} session ({slot.course_name or 'Session'}) scheduled "
                        f"at {slot.start_time} - {slot.end_time}."
                    )
                    reasons.append(msg)
                    clashes.append(
                        ClashDetail(
                            clash_type=CLASH_DIVISION_OVERLAP,
                            message=msg,
                            conflicting_slot_id=slot.id,
                        )
                    )
                else:
                    # Proposed is Batch-specific Lab / Tutorial
                    # Conflict if existing is Whole-division Theory
                    if slot.batch_id is None:
                        msg = (
                            f"Division conflict: Cannot schedule batch session during full division "
                            f"theory session ({slot.course_name or 'Theory'}) at {slot.start_time} - {slot.end_time}."
                        )
                        reasons.append(msg)
                        clashes.append(
                            ClashDetail(
                                clash_type=CLASH_DIVISION_OVERLAP,
                                message=msg,
                                conflicting_slot_id=slot.id,
                            )
                        )
                    elif slot.batch_id == request.batch_id:
                        msg = (
                            f"Batch conflict: Batch {slot.batch_name or slot.batch_id} is already booked for "
                            f"{slot.course_name or 'Lab'} at {slot.start_time} - {slot.end_time}."
                        )
                        reasons.append(msg)
                        clashes.append(
                            ClashDetail(
                                clash_type=CLASH_BATCH_CONCURRENCY,
                                message=msg,
                                conflicting_slot_id=slot.id,
                            )
                        )

        # 4. Check Max 1 Theory Session per Course per Day for the Division
        if request.session_type == SessionTypeEnum.theory and request.course_id:
            for slot in existing_slots:
                if request.exclude_timetable_id and slot.id == request.exclude_timetable_id:
                    continue
                if (
                    slot.division_id == request.division_id
                    and slot.course_id == request.course_id
                    and slot.day_of_week == request.day_of_week
                    and slot.session_type == SessionTypeEnum.theory
                ):
                    msg = (
                        f"Daily frequency limit: Division already has a theory lecture for "
                        f"{slot.course_code or 'this course'} on Day {request.day_of_week} "
                        f"at {slot.start_time} - {slot.end_time} (Max 1 theory/day allowed)."
                    )
                    reasons.append(msg)
                    clashes.append(
                        ClashDetail(
                            clash_type=CLASH_MAX_THEORY_PER_DAY,
                            message=msg,
                            conflicting_slot_id=slot.id,
                        )
                    )
                    break

        has_clash = len(reasons) > 0
        return ClashCheckResponse(
            has_clash=has_clash,
            reasons=reasons,
            clashes=clashes,
        )

    @classmethod
    def _check_lunch_overlap(cls, request: ClashCheckRequest) -> Optional[ClashDetail]:
        """Default college lunch break is 12:00:00 - 13:00:00."""
        # Can be queried from college_settings or lunch_breaks table
        default_lunch_start = "12:00:00"
        default_lunch_end = "13:00:00"

        if is_time_overlapping(request.start_time, request.end_time, default_lunch_start, default_lunch_end):
            return ClashDetail(
                clash_type=CLASH_LUNCH_OVERLAP,
                message=(
                    f"Lunch break conflict: Proposed time ({request.start_time} - {request.end_time}) "
                    f"overlaps with official lunch break ({default_lunch_start} - {default_lunch_end})."
                ),
            )
        return None

    @classmethod
    def _fetch_db_slots_for_term(cls, term_id: str) -> List[GeneratedSlot]:
        """Fetches active timetable slots from Supabase for clash checking."""
        supabase = get_supabase_client()
        if not supabase:
            return []

        try:
            res = (
                supabase.table("timetable")
                .select(
                    "id, academic_term_id, division_id, batch_id, day_of_week, start_time, end_time, "
                    "session_type, slot_source, course_id, mdm_slot_option_id, elective_option_id, "
                    "faculty_id, room_id, lock_status, status, "
                    "courses(name, code), users(full_name), rooms(code), divisions(name), batches(name)"
                )
                .eq("academic_term_id", term_id)
                .execute()
            )

            slots = []
            for row in res.data or []:
                course_info = row.get("courses") or {}
                faculty_info = row.get("users") or {}
                room_info = row.get("rooms") or {}
                div_info = row.get("divisions") or {}
                batch_info = row.get("batches") or {}

                slots.append(
                    GeneratedSlot(
                        id=row["id"],
                        academic_term_id=row["academic_term_id"],
                        division_id=row["division_id"],
                        division_name=div_info.get("name"),
                        batch_id=row.get("batch_id"),
                        batch_name=batch_info.get("name"),
                        day_of_week=row["day_of_week"],
                        start_time=row["start_time"],
                        end_time=row["end_time"],
                        session_type=row["session_type"],
                        slot_source=row["slot_source"],
                        course_id=row.get("course_id"),
                        course_code=course_info.get("code"),
                        course_name=course_info.get("name"),
                        mdm_slot_option_id=row.get("mdm_slot_option_id"),
                        elective_option_id=row.get("elective_option_id"),
                        faculty_id=row.get("faculty_id"),
                        faculty_name=faculty_info.get("full_name"),
                        room_id=row.get("room_id"),
                        room_code=room_info.get("code"),
                        lock_status=row["lock_status"],
                        status=row["status"],
                    )
                )
            return slots
        except Exception as e:
            logger.error(f"Error querying timetable slots for clash validation: {e}")
            return []
