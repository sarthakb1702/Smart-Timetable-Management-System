from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from datetime import time, datetime, timezone
import logging
from supabase import Client

from app.core.auth import (
    get_current_user,
    require_roles,
    UserContext,
    resolve_department_id,
)
from app.core.supabase_client import (
    get_request_supabase as get_supabase,
    get_supabase_client,
)
from app.schemas.settings import (
    CollegeSettingsResponse,
    CollegeSettingsUpdate,
    LunchBreakResponse,
    LunchBreakCreate,
    LunchBreakUpdate,
    DepartmentResponse,
    DepartmentCreate,
    DepartmentUpdate,
    AcademicYearResponse,
    AcademicYearCreate,
    AcademicYearUpdate,
    AcademicTermResponse,
    AcademicTermCreate,
    AcademicTermUpdate,
    UserWithRoleResponse,
    UserRoleAssign,
    UserRoleUpdate,
    UserCreate,
)

router = APIRouter(prefix="/settings", tags=["Settings"])
logger = logging.getLogger(__name__)

SINGLETON_SETTINGS_ID = "00000000-0000-0000-0000-000000000001"


# --- College Settings (Singleton) ---

@router.get("/college", response_model=CollegeSettingsResponse)
async def get_college_settings(
    user: UserContext = Depends(get_current_user),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        res = supabase.table("college_settings").select("*").eq("id", SINGLETON_SETTINGS_ID).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="College settings not initialized")
        return res.data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching college settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch college settings")


@router.put("/college", response_model=CollegeSettingsResponse)
async def update_college_settings(
    settings: CollegeSettingsUpdate,
    user: UserContext = Depends(require_roles("superadmin")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        update_data = settings.model_dump(mode="json")
        update_data["updated_by"] = user.user_id
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

        res = supabase.table("college_settings").update(update_data).eq("id", SINGLETON_SETTINGS_ID).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="College settings not found")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating college settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to update college settings")


# --- Lunch Breaks ---

@router.get("/lunch-breaks", response_model=List[LunchBreakResponse])
async def list_lunch_breaks(
    department_id: Optional[str] = Query(None),
    academic_year_id: Optional[str] = Query(None),
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        query = supabase.table("lunch_breaks").select("*")
        if department_id:
            query = query.eq("department_id", department_id)
        if academic_year_id:
            query = query.eq("academic_year_id", academic_year_id)
        res = query.order("day_of_week", desc=False).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching lunch breaks: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch lunch breaks")


@router.post("/lunch-breaks", response_model=LunchBreakResponse, status_code=status.HTTP_201_CREATED)
async def create_lunch_break(
    lunch_break: LunchBreakCreate,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        data = lunch_break.model_dump(mode="json")
        res = supabase.table("lunch_breaks").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create lunch break")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating lunch break: {e}")
        raise HTTPException(status_code=500, detail="Failed to create lunch break")


@router.put("/lunch-breaks/{break_id}", response_model=LunchBreakResponse)
async def update_lunch_break(
    break_id: str,
    lunch_break: LunchBreakUpdate,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        update_data = {k: v for k, v in lunch_break.model_dump(mode="json").items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        res = supabase.table("lunch_breaks").update(update_data).eq("id", break_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Lunch break not found")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating lunch break: {e}")
        raise HTTPException(status_code=500, detail="Failed to update lunch break")


@router.delete("/lunch-breaks/{break_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lunch_break(
    break_id: str,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        res = supabase.table("lunch_breaks").delete().eq("id", break_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Lunch break not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting lunch break: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete lunch break")


# --- Departments ---

@router.get("/departments", response_model=List[DepartmentResponse])
async def list_departments(
    user: UserContext = Depends(get_current_user),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        res = supabase.table("departments").select("*").order("name").execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching departments: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch departments")


@router.post("/departments", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
async def create_department(
    dept: DepartmentCreate,
    user: UserContext = Depends(require_roles("superadmin")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        res = supabase.table("departments").insert(dept.model_dump()).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create department")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating department: {e}")
        if "duplicate key" in str(e).lower():
            raise HTTPException(status_code=409, detail="Department code or name already exists")
        raise HTTPException(status_code=500, detail="Failed to create department")


@router.put("/departments/{dept_id}", response_model=DepartmentResponse)
async def update_department(
    dept_id: str,
    dept: DepartmentUpdate,
    user: UserContext = Depends(require_roles("superadmin")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        update_data = {k: v for k, v in dept.model_dump().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        res = supabase.table("departments").update(update_data).eq("id", dept_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Department not found")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating department: {e}")
        if "duplicate key" in str(e).lower():
            raise HTTPException(status_code=409, detail="Department code or name already exists")
        raise HTTPException(status_code=500, detail="Failed to update department")


@router.delete("/departments/{dept_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(
    dept_id: str,
    user: UserContext = Depends(require_roles("superadmin")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        res = supabase.table("departments").delete().eq("id", dept_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Department not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting department: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete department")


# --- Academic Years ---

@router.get("/academic-years", response_model=List[AcademicYearResponse])
async def list_academic_years(
    user: UserContext = Depends(get_current_user),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        res = supabase.table("academic_years").select("*").order("sequence").execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching academic years: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch academic years")


@router.post("/academic-years", response_model=AcademicYearResponse, status_code=status.HTTP_201_CREATED)
async def create_academic_year(
    year: AcademicYearCreate,
    user: UserContext = Depends(require_roles("superadmin")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        res = supabase.table("academic_years").insert(year.model_dump()).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create academic year")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating academic year: {e}")
        if "duplicate key" in str(e).lower():
            raise HTTPException(status_code=409, detail="Academic year code or sequence already exists")
        raise HTTPException(status_code=500, detail="Failed to create academic year")


@router.put("/academic-years/{year_id}", response_model=AcademicYearResponse)
async def update_academic_year(
    year_id: str,
    year: AcademicYearUpdate,
    user: UserContext = Depends(require_roles("superadmin")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        update_data = {k: v for k, v in year.model_dump().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        res = supabase.table("academic_years").update(update_data).eq("id", year_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Academic year not found")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating academic year: {e}")
        if "duplicate key" in str(e).lower():
            raise HTTPException(status_code=409, detail="Academic year code or sequence already exists")
        raise HTTPException(status_code=500, detail="Failed to update academic year")


@router.delete("/academic-years/{year_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_academic_year(
    year_id: str,
    user: UserContext = Depends(require_roles("superadmin")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        res = supabase.table("academic_years").delete().eq("id", year_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Academic year not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting academic year: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete academic year")


# --- Academic Terms ---

@router.get("/academic-terms", response_model=List[AcademicTermResponse])
async def list_academic_terms(
    department_id: Optional[str] = Query(None),
    user: UserContext = Depends(get_current_user),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        scoped_department_id = resolve_department_id(user, department_id)
        query = supabase.table("academic_terms").select("*")
        if scoped_department_id:
            query = query.eq("department_id", scoped_department_id)
        res = query.order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching academic terms: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch academic terms")


@router.post("/academic-terms", response_model=AcademicTermResponse, status_code=status.HTTP_201_CREATED)
async def create_academic_term(
    term: AcademicTermCreate,
    user: UserContext = Depends(require_roles("superadmin")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        data = term.model_dump(exclude_none=True)
        if data.get("is_current"):
            supabase.table("academic_terms").update({"is_current": False}).eq(
                "department_id", term.department_id
            ).eq("is_current", True).execute()

        res = supabase.table("academic_terms").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create academic term")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating academic term: {e}")
        raise HTTPException(status_code=500, detail="Failed to create academic term")


@router.put("/academic-terms/{term_id}", response_model=AcademicTermResponse)
async def update_academic_term(
    term_id: str,
    term: AcademicTermUpdate,
    user: UserContext = Depends(require_roles("superadmin")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        existing = supabase.table("academic_terms").select("is_locked").eq("id", term_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Academic term not found")
        if existing.data[0].get("is_locked"):
            raise HTTPException(status_code=409, detail="Term is locked and cannot be modified")

        update_data = {k: v for k, v in term.model_dump().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        res = supabase.table("academic_terms").update(update_data).eq("id", term_id).execute()
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating academic term: {e}")
        raise HTTPException(status_code=500, detail="Failed to update academic term")


@router.post("/academic-terms/{term_id}/set-current", response_model=AcademicTermResponse)
async def set_current_academic_term(
    term_id: str,
    user: UserContext = Depends(require_roles("superadmin")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        existing = supabase.table("academic_terms").select("*").eq("id", term_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Academic term not found")
        term = existing.data[0]

        supabase.table("academic_terms").update({"is_current": False}).eq(
            "department_id", term["department_id"]
        ).eq("is_current", True).execute()

        res = supabase.table("academic_terms").update({"is_current": True}).eq("id", term_id).execute()
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting current academic term: {e}")
        raise HTTPException(status_code=500, detail="Failed to set current academic term")


@router.delete("/academic-terms/{term_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_academic_term(
    term_id: str,
    user: UserContext = Depends(require_roles("superadmin")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        existing = supabase.table("academic_terms").select("is_locked").eq("id", term_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Academic term not found")
        if existing.data[0].get("is_locked"):
            raise HTTPException(status_code=409, detail="Term is locked and cannot be deleted")

        supabase.table("academic_terms").delete().eq("id", term_id).execute()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting academic term: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete academic term")


# --- User Role Management ---

@router.get("/users", response_model=List[UserWithRoleResponse])
async def list_users(
    department_id: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator", "hod", "dept_tt_coordinator")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        scoped_department_id = resolve_department_id(user, department_id)
        query = supabase.table("users").select("*, departments(name)")
        if scoped_department_id:
            query = query.eq("department_id", scoped_department_id)
        if role:
            query = query.eq("role", role)
        res = query.order("created_at", desc=True).execute()

        users = []
        for u in res.data or []:
            users.append({
                **u,
                "department_name": u.get("departments", {}).get("name") if u.get("departments") else None,
            })
        return users
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch users")


@router.post("/users", response_model=UserWithRoleResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator", "hod")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    admin = get_supabase_client()
    if not admin:
        raise HTTPException(status_code=503, detail="Database not available")
    supabase = admin

    try:
        # Enforce role boundaries for HOD
        if user.role == "hod":
            if user_data.role not in ("faculty", "student"):
                raise HTTPException(status_code=403, detail="HOD can only create faculty or student accounts")
            if user.department_id and user_data.department_id and user_data.department_id != user.department_id:
                raise HTTPException(status_code=403, detail="HOD can only create accounts for their own department")
            if not user_data.department_id:
                user_data.department_id = user.department_id

        # Create user in auth system
        auth_response = supabase.auth.admin.create_user({
            "email": user_data.email,
            "password": user_data.password,
            "email_confirm": True,
            "user_metadata": {"full_name": user_data.full_name}
        })
        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Failed to create auth user")
        
        # Create profile
        profile_data = {
            "id": auth_response.user.id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "role": user_data.role,
            "department_id": user_data.department_id,
            "employee_code": user_data.employee_code,
        }
        res = supabase.table("users").insert(profile_data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create user profile")
        
        # Fetch with department
        result = res.data[0]
        if result.get("department_id"):
            dept_res = supabase.table("departments").select("name").eq("id", result["department_id"]).execute()
            result["department_name"] = dept_res.data[0]["name"] if dept_res.data else None
        else:
            result["department_name"] = None
            
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        if "duplicate key" in str(e).lower() or "already registered" in str(e).lower():
            raise HTTPException(status_code=409, detail="User already exists")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/users/assign-role", response_model=UserWithRoleResponse, status_code=status.HTTP_201_CREATED)
async def assign_user_role(
    assignment: UserRoleAssign,
    user: UserContext = Depends(require_roles("superadmin")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    admin = get_supabase_client()
    if not admin:
        raise HTTPException(status_code=503, detail="Database not available")
    supabase = admin

    try:
        # Check if user exists in auth.users
        auth_user = supabase.auth.admin.get_user_by_id(assignment.user_id)
        if not auth_user or not auth_user.user:
            raise HTTPException(status_code=404, detail="User not found in auth system")

        # Check if profile exists
        existing = supabase.table("users").select("*").eq("id", assignment.user_id).execute()
        if existing.data:
            # Update existing profile
            update_data = {"role": assignment.role}
            if assignment.department_id is not None:
                update_data["department_id"] = assignment.department_id
            res = supabase.table("users").update(update_data).eq("id", assignment.user_id).execute()
        else:
            # Create new profile
            profile_data = {
                "id": assignment.user_id,
                "email": auth_user.user.email,
                "full_name": auth_user.user.user_metadata.get("full_name", auth_user.user.email.split("@")[0]),
                "role": assignment.role,
                "department_id": assignment.department_id,
            }
            res = supabase.table("users").insert(profile_data).execute()

        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to assign role")

        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning user role: {e}")
        if "duplicate key" in str(e).lower() and "one_college_tt_coordinator" in str(e):
            raise HTTPException(status_code=409, detail="College TT Coordinator already exists (only one allowed)")
        raise HTTPException(status_code=500, detail="Failed to assign user role")


@router.put("/users/{user_id}/role", response_model=UserWithRoleResponse)
async def update_user_role(
    user_id: str,
    update: UserRoleUpdate,
    user: UserContext = Depends(require_roles("superadmin", "college_tt_coordinator", "hod")),
    supabase: Optional[Client] = Depends(get_supabase),
):
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        update_data = {k: v for k, v in update.model_dump().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        # HOD boundary check
        if user.role == "hod":
            target = supabase.table("users").select("department_id, role").eq("id", user_id).single().execute()
            if not target.data or target.data.get("department_id") != user.department_id:
                raise HTTPException(status_code=403, detail="Cannot edit user outside your department")
            if "role" in update_data and update_data["role"] not in ("faculty", "student"):
                raise HTTPException(status_code=403, detail="HOD cannot assign administrative roles")

        # Prevent demoting the last superadmin
        if "role" in update_data and update_data["role"] != "superadmin":
            superadmins = supabase.table("users").select("id").eq("role", "superadmin").execute()
            if superadmins.data and len(superadmins.data) == 1 and superadmins.data[0]["id"] == user_id:
                raise HTTPException(status_code=400, detail="Cannot demote the only superadmin")

        res = supabase.table("users").update(update_data).eq("id", user_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="User not found")

        # Fetch with department name
        result = res.data[0]
        dept_res = supabase.table("departments").select("name").eq("id", result.get("department_id")).execute()
        result["department_name"] = dept_res.data[0]["name"] if dept_res.data else None
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user role: {e}")
        if "duplicate key" in str(e).lower() and "one_college_tt_coordinator" in str(e):
            raise HTTPException(status_code=409, detail="College TT Coordinator already exists (only one allowed)")
        raise HTTPException(status_code=500, detail="Failed to update user role")