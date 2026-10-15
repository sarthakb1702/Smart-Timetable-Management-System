from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Any
from pydantic import BaseModel
from supabase import Client
from datetime import datetime, timezone
from app.core.auth import (
    require_roles,
    UserContext,
    is_global_role,
    resolve_department_id,
    ensure_department_access,
)
from app.core.supabase_client import get_request_supabase as get_supabase
from app.engine.validator import TimetableValidator
from app.engine.constraints import is_time_overlapping
from app.schemas.timetable import GeneratedSlot, ClashCheckRequest, SessionTypeEnum

router = APIRouter(prefix="/timetable", tags=["Timetable Management"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_term_writable(supabase: Client, term_id: str) -> None:
    """DEC-13: locked/historical terms are read-only."""
    res = supabase.table("academic_terms").select("is_locked").eq("id", term_id).execute()
    if res.data and res.data[0].get("is_locked"):
        raise HTTPException(
            status_code=409,
            detail="This academic term is locked and read-only. Unlock it to make changes.",
        )


def _validate_slot_write(
    supabase: Client, slot: "SlotCreateUpdate", exclude_id: Optional[str] = None
) -> None:
    """Server-side clash validation for manual slot create/update (EDIT-001..006)."""
    request = ClashCheckRequest(
        term_id=slot.term_id,
        division_id=slot.division_id,
        batch_id=slot.batch_id,
        day_of_week=slot.day_of_week,
        start_time=slot.start_time,
        end_time=slot.end_time,
        session_type=(
            SessionTypeEnum.lab if slot.session_type == "lab" else SessionTypeEnum.theory
        ),
        course_id=slot.course_id,
        faculty_id=slot.faculty_id,
        room_id=slot.room_id,
        exclude_timetable_id=exclude_id,
    )
    result = TimetableValidator.validate_slot_move(request)
    if result.has_clash:
        raise HTTPException(
            status_code=409,
            detail={"message": "Slot violates hard constraints.", "clashes": result.reasons},
        )


def _rows_to_slots(rows: List[dict]) -> List[GeneratedSlot]:
    slots: List[GeneratedSlot] = []
    for row in rows or []:
        try:
            slots.append(GeneratedSlot(**{
                "id": row.get("id"),
                "term_id": row["term_id"],
                "department_id": row.get("department_id"),
                "academic_year_id": row.get("academic_year_id"),
                "division_id": row["division_id"],
                "batch_id": row.get("batch_id"),
                "day_of_week": row["day_of_week"],
                "start_time": str(row["start_time"]),
                "end_time": str(row["end_time"]),
                "session_type": row["session_type"],
                "source_type": row["source_type"],
                "course_id": row.get("course_id"),
                "mdm_slot_option_id": row.get("mdm_slot_option_id"),
                "elective_option_id": row.get("elective_option_id"),
                "faculty_id": row.get("faculty_id"),
                "room_id": row.get("room_id"),
                "is_locked": row.get("is_locked", False),
                "status": row.get("status", "draft"),
            }))
        except Exception:
            continue
    return slots

# --- Schemas ---

class SlotCreateUpdate(BaseModel):
    term_id: str
    department_id: str
    academic_year_id: str
    division_id: str
    batch_id: Optional[str] = None
    source_type: str = "regular"
    course_id: Optional[str] = None
    faculty_id: str
    room_id: str
    day_of_week: int
    start_time: str
    end_time: str
    session_type: str = "theory"
    reason: Optional[str] = "Manual update"

class SlotMove(BaseModel):
    day_of_week: int
    start_time: str
    end_time: str
    reason: Optional[str] = "Interactive drag-and-drop reschedule"

class ApprovalSubmit(BaseModel):
    term_id: str
    department_id: str

class ApprovalAction(BaseModel):
    term_id: str
    department_id: str
    status: str # 'published' or 'rejected'
    comments: Optional[str] = None

# --- Helper: Log Edit ---
def log_edit(supabase: Client, user_id: str, term_id: str, dept_id: str, action: str, 
             before: Any, after: Any, reason: str = "", entry_id: str = None):
    supabase.table("timetable_edit_log").insert({
        "timetable_entry_id": entry_id,
        "term_id": term_id,
        "department_id": dept_id,
        "action": action,
        "changed_by": user_id,
        "before_data": before,
        "after_data": after,
        "reason": reason
    }).execute()

# --- Endpoints ---

@router.get("")
async def get_timetable(
    term_id: str,
    department_id: Optional[str] = None,
    division_id: Optional[str] = None,
    faculty_id: Optional[str] = None,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator", "hod", "dept_tt_coordinator", "faculty", "student")),
    supabase: Client = Depends(get_supabase)
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    query = supabase.table("timetable").select("*, courses(code, name), rooms(id, name, room_type), users!timetable_faculty_id_fkey(full_name)")
    query = query.eq("term_id", term_id)

    if is_global_role(user.role):
        if department_id:
            query = query.eq("department_id", department_id)
        if division_id:
            query = query.eq("division_id", division_id)
        if faculty_id:
            query = query.eq("faculty_id", faculty_id)
    elif user.role in ("hod", "dept_tt_coordinator"):
        # Department admins are locked to their own department.
        query = query.eq("department_id", resolve_department_id(user, department_id))
        if division_id:
            query = query.eq("division_id", division_id)
        if faculty_id:
            query = query.eq("faculty_id", faculty_id)
    elif user.role == "faculty":
        # Faculty may only read their own schedule.
        query = query.eq("department_id", resolve_department_id(user, None))
        query = query.eq("faculty_id", user.user_id)
    elif user.role == "student":
        query = query.eq("department_id", resolve_department_id(user, None))
        target_division = division_id or user.division_id
        if target_division:
            query = query.eq("division_id", target_division)
        query = query.in_("status", ["published", "approved", "draft"])

    res = query.execute()
    return res.data

@router.post("/slots")
async def add_slot(
    slot: SlotCreateUpdate,
    user: UserContext = Depends(require_roles("superadmin", "hod", "dept_tt_coordinator")),
    supabase: Client = Depends(get_supabase)
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    ensure_department_access(user, slot.department_id)
    _ensure_term_writable(supabase, slot.term_id)
    _validate_slot_write(supabase, slot)

    data = slot.model_dump(exclude={"reason"})
    data["created_by"] = user.user_id

    try:
        res = supabase.table("timetable").insert(data).execute()
        new_slot = res.data[0]
        
        log_edit(supabase, user.user_id, slot.term_id, slot.department_id, "create", None, new_slot, slot.reason, new_slot["id"])
        return new_slot
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/slots/{slot_id}")
async def update_slot(
    slot_id: str,
    slot: SlotCreateUpdate,
    user: UserContext = Depends(require_roles("superadmin", "hod", "dept_tt_coordinator")),
    supabase: Client = Depends(get_supabase)
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    old_res = supabase.table("timetable").select("*").eq("id", slot_id).execute()
    if not old_res.data:
        raise HTTPException(status_code=404, detail="Slot not found")
    old_slot = old_res.data[0]
    ensure_department_access(user, old_slot.get("department_id"))
    ensure_department_access(user, slot.department_id)
    _ensure_term_writable(supabase, old_slot.get("term_id"))
    if old_slot.get("is_locked"):
        raise HTTPException(status_code=409, detail="Locked slots cannot be modified")
    _validate_slot_write(supabase, slot, exclude_id=slot_id)

    data = slot.model_dump(exclude={"reason"})
    data["updated_by"] = user.user_id
    data["updated_at"] = _now_iso()
    
    try:
        res = supabase.table("timetable").update(data).eq("id", slot_id).execute()
        new_slot = res.data[0]
        
        log_edit(supabase, user.user_id, slot.term_id, slot.department_id, "update", old_slot, new_slot, slot.reason, slot_id)
        return new_slot
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/slots/{slot_id}/move")
async def move_slot(
    slot_id: str,
    move: SlotMove,
    user: UserContext = Depends(require_roles("superadmin", "hod", "dept_tt_coordinator")),
    supabase: Client = Depends(get_supabase)
):
    """Drag-and-drop reschedule: clash-checked, term/lock-aware, and edit-logged."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    old_res = supabase.table("timetable").select("*").eq("id", slot_id).execute()
    if not old_res.data:
        raise HTTPException(status_code=404, detail="Slot not found")
    old_slot = old_res.data[0]
    ensure_department_access(user, old_slot.get("department_id"))
    _ensure_term_writable(supabase, old_slot.get("term_id"))
    if old_slot.get("is_locked"):
        raise HTTPException(status_code=409, detail="Locked slots cannot be moved")

    request = ClashCheckRequest(
        term_id=old_slot["term_id"],
        division_id=old_slot["division_id"],
        batch_id=old_slot.get("batch_id"),
        day_of_week=move.day_of_week,
        start_time=move.start_time,
        end_time=move.end_time,
        session_type=(
            SessionTypeEnum.lab if old_slot.get("session_type") == "lab" else SessionTypeEnum.theory
        ),
        course_id=old_slot.get("course_id"),
        faculty_id=old_slot.get("faculty_id"),
        room_id=old_slot.get("room_id"),
        exclude_timetable_id=slot_id,
    )
    result = TimetableValidator.validate_slot_move(request)
    if result.has_clash:
        raise HTTPException(
            status_code=409,
            detail={"message": "Move violates hard constraints.", "clashes": result.reasons},
        )

    data = {
        "day_of_week": move.day_of_week,
        "start_time": move.start_time,
        "end_time": move.end_time,
        "updated_by": user.user_id,
        "updated_at": _now_iso(),
    }
    try:
        res = supabase.table("timetable").update(data).eq("id", slot_id).execute()
        new_slot = res.data[0] if res.data else {**old_slot, **data}
        log_edit(
            supabase,
            user.user_id,
            old_slot["term_id"],
            old_slot["department_id"],
            "update",
            {
                "day_of_week": old_slot.get("day_of_week"),
                "start_time": str(old_slot.get("start_time")),
                "end_time": str(old_slot.get("end_time")),
            },
            {
                "day_of_week": move.day_of_week,
                "start_time": move.start_time,
                "end_time": move.end_time,
            },
            move.reason or "Drag-and-drop reschedule",
            slot_id,
        )
        return new_slot
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/slots/{slot_id}", status_code=204)
async def delete_slot(
    slot_id: str,
    reason: str = "Manual deletion",
    user: UserContext = Depends(require_roles("superadmin", "hod", "dept_tt_coordinator")),
    supabase: Client = Depends(get_supabase)
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    old_res = supabase.table("timetable").select("*").eq("id", slot_id).execute()
    if not old_res.data:
        return
    old_slot = old_res.data[0]
    ensure_department_access(user, old_slot.get("department_id"))
    _ensure_term_writable(supabase, old_slot.get("term_id"))
    if old_slot.get("is_locked"):
        raise HTTPException(status_code=409, detail="Locked slots cannot be deleted")

    supabase.table("timetable").delete().eq("id", slot_id).execute()
    log_edit(supabase, user.user_id, old_slot["term_id"], old_slot["department_id"], "delete", old_slot, None, reason, slot_id)

@router.post("/approvals/submit")
async def submit_for_approval(
    req: ApprovalSubmit,
    user: UserContext = Depends(require_roles("hod", "dept_tt_coordinator")),
    supabase: Client = Depends(get_supabase)
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    ensure_department_access(user, req.department_id)
    _ensure_term_writable(supabase, req.term_id)

    slots = (
        supabase.table("timetable")
        .select("id, status")
        .eq("term_id", req.term_id)
        .eq("department_id", req.department_id)
        .execute()
    ).data or []
    if not slots:
        raise HTTPException(status_code=400, detail="No timetable slots to submit")

    current = (
        supabase.table("timetable_approvals")
        .select("status")
        .eq("term_id", req.term_id)
        .eq("department_id", req.department_id)
        .execute()
    ).data
    if current and current[0].get("status") == "published":
        raise HTTPException(status_code=409, detail="Timetable is already published")

    data = {
        "term_id": req.term_id,
        "department_id": req.department_id,
        "status": "pending_approval",
        "submitted_by": user.user_id,
        "submitted_at": _now_iso(),
    }

    try:
        # Upsert approval state
        res = supabase.table("timetable_approvals").upsert(data, on_conflict="term_id, department_id").execute()

        # Move draft/rejected slots for this dept/term to pending_approval
        supabase.table("timetable").update({"status": "pending_approval"}).eq(
            "term_id", req.term_id
        ).eq("department_id", req.department_id).in_("status", ["draft", "rejected"]).execute()

        log_edit(supabase, user.user_id, req.term_id, req.department_id, "submit", None, {"status": "pending_approval"}, "Submitted for HOD approval")
        return res.data[0] if res.data else {"status": "pending_approval"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/approvals/action")
async def action_approval(
    req: ApprovalAction,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator", "hod")),
    supabase: Client = Depends(get_supabase)
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    if req.status not in ["published", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    if not is_global_role(user.role):
        ensure_department_access(user, req.department_id)

    # DEC-05: HOD may reject; only College TT Coordinator / Superadmin may publish.
    if req.status == "published" and not is_global_role(user.role):
        raise HTTPException(
            status_code=403,
            detail="Only the College TT Coordinator or Superadmin can publish or override.",
        )

    _ensure_term_writable(supabase, req.term_id)

    approvals = (
        supabase.table("timetable_approvals")
        .select("status")
        .eq("term_id", req.term_id)
        .eq("department_id", req.department_id)
        .execute()
    ).data
    current_status = approvals[0].get("status") if approvals else "draft"

    if not is_global_role(user.role) and current_status != "pending_approval":
        raise HTTPException(
            status_code=409,
            detail=f"Cannot {req.status} a timetable in '{current_status}' state.",
        )

    # DEC-11 / DEF-03: never publish a schedule that violates hard constraints.
    if req.status == "published":
        rows = (
            supabase.table("timetable")
            .select(
                "id, term_id, department_id, academic_year_id, division_id, batch_id, "
                "day_of_week, start_time, end_time, session_type, source_type, "
                "course_id, mdm_slot_option_id, elective_option_id, faculty_id, room_id, "
                "is_locked, status"
            )
            .eq("term_id", req.term_id)
            .eq("department_id", req.department_id)
            .execute()
        ).data or []

        if not rows:
            raise HTTPException(status_code=400, detail="No timetable slots to publish")

        validation = TimetableValidator.validate_schedule(_rows_to_slots(rows))
        if validation.has_clash:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Timetable has unresolved clashes and cannot be published.",
                    "clashes": [c.model_dump() for c in validation.clashes],
                },
            )

    data = {
        "term_id": req.term_id,
        "department_id": req.department_id,
        "status": req.status,
        "reviewed_by": user.user_id,
        "reviewed_at": _now_iso(),
        "comments": req.comments,
    }

    try:
        res = supabase.table("timetable_approvals").upsert(
            data, on_conflict="term_id, department_id"
        ).execute()

        # Update all slots for this dept/term to the new status (override-safe).
        supabase.table("timetable").update({"status": req.status}).eq(
            "term_id", req.term_id
        ).eq("department_id", req.department_id).execute()

        # edit_action enum only allows 'publish'/'reject', not 'published'/'rejected'.
        log_action = "publish" if req.status == "published" else "reject"
        log_edit(supabase, user.user_id, req.term_id, req.department_id, log_action, {"status": current_status}, {"status": req.status, "comments": req.comments}, f"{req.status.capitalize()} by {user.role}")
        return res.data[0] if res.data else {"status": req.status}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/approvals/overview")
async def get_approvals_overview(
    term_id: Optional[str] = Query(None),
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator")),
    supabase: Client = Depends(get_supabase)
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    # 1. Resolve term_id if not provided
    if not term_id:
        term_res = supabase.table("academic_terms").select("id").eq("is_current", True).limit(1).execute()
        if term_res.data:
            term_id = term_res.data[0]["id"]
        else:
            term_res = supabase.table("academic_terms").select("id").limit(1).execute()
            if term_res.data:
                term_id = term_res.data[0]["id"]

    # 2. Fetch all departments
    depts = supabase.table("departments").select("id, name, code").order("name").execute().data or []

    # 3. Fetch divisions count per department
    div_counts: dict = {}
    divs = supabase.table("divisions").select("id, department_id").execute().data or []
    for d in divs:
        did = d.get("department_id")
        div_counts[did] = div_counts.get(did, 0) + 1

    # 4. Fetch faculty count per department
    fac_counts: dict = {}
    facs = supabase.table("users").select("id, department_id").eq("role", "faculty").execute().data or []
    for f in facs:
        did = f.get("department_id")
        fac_counts[did] = fac_counts.get(did, 0) + 1

    # 5. Fetch approvals for this term
    approvals_by_dept: dict = {}
    submitter_ids = set()
    if term_id:
        approvals = supabase.table("timetable_approvals").select("*").eq("term_id", term_id).execute().data or []
        for a in approvals:
            approvals_by_dept[a["department_id"]] = a
            if a.get("submitted_by"):
                submitter_ids.add(a["submitted_by"])
            if a.get("reviewed_by"):
                submitter_ids.add(a["reviewed_by"])

    user_names: dict = {}
    if submitter_ids:
        u_res = supabase.table("users").select("id, full_name, email").in_("id", list(submitter_ids)).execute().data or []
        for u in u_res:
            user_names[u["id"]] = u.get("full_name") or u.get("email")

    # 6. Fetch slots for this term
    slots_by_dept: dict = {}
    all_slots = []
    if term_id:
        all_slots = supabase.table("timetable").select(
            "id, department_id, status, faculty_id, room_id, day_of_week, start_time, end_time"
        ).eq("term_id", term_id).execute().data or []

    for s in all_slots:
        did = s.get("department_id")
        slots_by_dept[did] = slots_by_dept.get(did, 0) + 1

    # 7. Calculate clashes across slots
    clashes_by_dept: dict = {}
    slots_by_day: dict = {}
    for s in all_slots:
        slots_by_day.setdefault(s.get("day_of_week"), []).append(s)

    for day, day_slots in slots_by_day.items():
        n = len(day_slots)
        for i in range(n):
            for j in range(i + 1, n):
                s1 = day_slots[i]
                s2 = day_slots[j]
                if is_time_overlapping(s1["start_time"], s1["end_time"], s2["start_time"], s2["end_time"]):
                    has_conflict = False
                    if s1.get("faculty_id") and s1["faculty_id"] == s2.get("faculty_id"):
                        has_conflict = True
                    elif s1.get("room_id") and s1["room_id"] == s2.get("room_id"):
                        has_conflict = True

                    if has_conflict:
                        d1 = s1.get("department_id")
                        d2 = s2.get("department_id")
                        if d1:
                            clashes_by_dept[d1] = clashes_by_dept.get(d1, 0) + 1
                        if d2 and d2 != d1:
                            clashes_by_dept[d2] = clashes_by_dept.get(d2, 0) + 1

    # 8. Assemble result
    dept_items = []
    awaiting_review = 0
    published_count = 0

    for dept in depts:
        d_id = dept["id"]
        appr = approvals_by_dept.get(d_id)
        slot_count = slots_by_dept.get(d_id, 0)
        status = appr.get("status") if appr else "draft"
        clashes = clashes_by_dept.get(d_id, 0)

        div_count = div_counts.get(d_id, 0)
        fac_count = fac_counts.get(d_id, 0)

        if status == "published":
            readiness = 100
            published_count += 1
        elif status == "pending_approval":
            readiness = 90
            awaiting_review += 1
        elif status == "rejected":
            readiness = 35
        else:  # draft
            if slot_count == 0:
                readiness = 0
            else:
                expected = max(1, div_count * 20)
                readiness = min(85, max(15, int((slot_count / expected) * 100)))

        sub_by = user_names.get(appr.get("submitted_by")) if appr else None
        last_upd = None
        if appr:
            raw_dt = appr.get("reviewed_at") or appr.get("submitted_at") or appr.get("created_at")
            if raw_dt:
                try:
                    dt = datetime.fromisoformat(str(raw_dt).replace("Z", "+00:00"))
                    last_upd = dt.strftime("%b %d, %Y %H:%M")
                except Exception:
                    last_upd = str(raw_dt)[:16]

        dept_items.append({
            "id": d_id,
            "name": dept["name"],
            "code": dept["code"],
            "divisions_count": div_count,
            "faculty_count": fac_count,
            "slot_count": slot_count,
            "status": status,
            "clashes_count": clashes,
            "readiness_percent": readiness,
            "submitted_by": sub_by or "Not submitted yet",
            "last_updated": last_upd or "Not yet",
            "comments": appr.get("comments") if appr else None,
        })

    return {
        "term_id": term_id,
        "departments": dept_items,
        "stats": {
            "departments_active": len(depts),
            "total_divisions": sum(div_counts.values()),
            "awaiting_review": awaiting_review,
            "published": published_count,
            "total_clashes": sum(clashes_by_dept.values()),
        }
    }


@router.get("/approvals")
async def get_approval_state(
    term_id: str,
    department_id: str,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator", "hod", "dept_tt_coordinator")),
    supabase: Client = Depends(get_supabase)
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    scoped_department_id = resolve_department_id(user, department_id)

    approval = (
        supabase.table("timetable_approvals")
        .select("*")
        .eq("term_id", term_id)
        .eq("department_id", scoped_department_id)
        .execute()
    ).data or []

    slots = (
        supabase.table("timetable")
        .select("status")
        .eq("term_id", term_id)
        .eq("department_id", scoped_department_id)
        .execute()
    ).data or []

    counts: dict = {}
    for row in slots:
        key = row.get("status") or "draft"
        counts[key] = counts.get(key, 0) + 1

    status = approval[0].get("status") if approval else (next(iter(counts), "draft") if counts else "draft")

    submitted_by_name = None
    if approval and approval[0].get("submitted_by"):
        u_res = supabase.table("users").select("full_name, email").eq("id", approval[0]["submitted_by"]).execute()
        if u_res.data:
            submitted_by_name = u_res.data[0].get("full_name") or u_res.data[0].get("email")

    return {
        "status": status,
        "approval": approval[0] if approval else None,
        "submitted_by_name": submitted_by_name,
        "slot_count": len(slots),
        "slots_by_status": counts,
    }


@router.get("/logs")
async def get_logs(
    term_id: str,
    department_id: str,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator", "hod", "dept_tt_coordinator")),
    supabase: Client = Depends(get_supabase)
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")
    scoped_department_id = resolve_department_id(user, department_id)
    res = supabase.table("timetable_edit_log").select("*, users!timetable_edit_log_changed_by_fkey(full_name)").eq("term_id", term_id).eq("department_id", scoped_department_id).order("created_at", desc=True).execute()
    return res.data
