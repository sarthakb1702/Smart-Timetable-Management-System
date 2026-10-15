from typing import Optional, List
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from app.core.supabase_client import get_supabase_client, get_scoped_client
from app.core.config import settings

security = HTTPBearer(auto_error=False)

GLOBAL_ROLES = ("superadmin", "college_tt_coordinator")
DEPARTMENT_ROLES = ("hod", "dept_tt_coordinator", "faculty", "student")


class UserContext:
    def __init__(
        self,
        user_id: str,
        email: str,
        role: str,
        department_id: Optional[str] = None,
        division_id: Optional[str] = None,
        batch_id: Optional[str] = None,
        is_active: bool = True,
    ):
        self.user_id = user_id
        self.email = email
        self.role = role
        self.department_id = department_id
        self.division_id = division_id
        self.batch_id = batch_id
        self.is_active = is_active


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    supabase: Optional[Client] = Depends(get_supabase_client),
) -> UserContext:
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase client not configured",
        )

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        user_response = supabase.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        auth_user = user_response.user

        # Read the profile through a JWT-scoped client so RLS applies.
        profile_client = get_scoped_client(token) or supabase
        profile_response = (
            profile_client.table("users")
            .select("id, email, role, department_id, division_id, batch_id, is_active")
            .eq("id", auth_user.id)
            .single()
            .execute()
        )

        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found",
            )

        profile = profile_response.data

        if not profile.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )

        return UserContext(
            user_id=auth_user.id,
            email=profile["email"],
            role=profile["role"],
            department_id=profile.get("department_id"),
            division_id=profile.get("division_id"),
            batch_id=profile.get("batch_id"),
            is_active=profile.get("is_active", True),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_roles(*allowed_roles: str):
    async def role_checker(user: UserContext = Depends(get_current_user)) -> UserContext:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role(s): {', '.join(allowed_roles)}. Your role: {user.role}",
            )
        return user

    return role_checker


def require_department_access(user: UserContext = Depends(get_current_user)) -> UserContext:
    if user.role in GLOBAL_ROLES:
        return user

    if not user.department_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no assigned department",
        )

    return user


def is_global_role(role: str) -> bool:
    return role in GLOBAL_ROLES


def resolve_department_id(
    user: UserContext, requested_department_id: Optional[str] = None
) -> Optional[str]:
    """Returns the effective department id for a query.

    Global roles may pass any (or no) department; department-bound roles are
    forced to their own department and forbidden from requesting another.
    """
    if is_global_role(user.role):
        return requested_department_id

    if not user.department_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no assigned department",
        )

    if requested_department_id and requested_department_id != user.department_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to another department is forbidden",
        )

    return user.department_id


def ensure_department_access(user: UserContext, target_department_id: Optional[str]) -> None:
    """Raises 403 when a department-bound user touches another department."""
    if is_global_role(user.role):
        return

    if not user.department_id or target_department_id != user.department_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to another department is forbidden",
        )


def ensure_can_write_department(user: UserContext, target_department_id: Optional[str]) -> None:
    """Write guard: global roles and the user's own department admins only."""
    if is_global_role(user.role):
        return
    if user.role not in ("hod", "dept_tt_coordinator"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient role to modify timetable data",
        )
    ensure_department_access(user, target_department_id)


def require_assigned_department(
    user: UserContext = Depends(get_current_user),
) -> UserContext:
    """Dependency enforcing that department-bound roles have a department_id."""
    if user.role in DEPARTMENT_ROLES and not user.department_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no assigned department",
        )
    return user


async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    supabase: Optional[Client] = Depends(get_supabase_client),
) -> Optional[UserContext]:
    if not supabase or not credentials:
        return None

    try:
        return await get_current_user(request, credentials, supabase)
    except HTTPException:
        return None


ROLE_HIERARCHY = {
    "student": 0,
    "faculty": 1,
    "dept_tt_coordinator": 2,
    "hod": 3,
    "college_tt_coordinator": 4,
    "superadmin": 5,
}


def role_level(role: str) -> int:
    return ROLE_HIERARCHY.get(role, -1)


def can_access_department(user: UserContext, target_department_id: str) -> bool:
    if user.role in ("superadmin", "college_tt_coordinator"):
        return True
    return user.department_id == target_department_id