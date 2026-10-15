from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
import logging

from app.core.config import settings
from app.core.supabase_client import get_supabase_client

router = APIRouter(prefix="/auth", tags=["Auth (Dev)"])
logger = logging.getLogger(__name__)

ROLE_ORDER = [
    "superadmin",
    "college_tt_coordinator",
    "hod",
    "dept_tt_coordinator",
    "faculty",
    "student",
]

ROLE_LABELS = {
    "superadmin": "Super Admin",
    "college_tt_coordinator": "College TT Coordinator",
    "hod": "HOD",
    "dept_tt_coordinator": "Dept TT Coordinator",
    "faculty": "Faculty",
    "student": "Student",
}


class DemoAccount(BaseModel):
    email: str
    full_name: str
    role: str
    role_label: str
    department_name: Optional[str] = None


class DevLoginRequest(BaseModel):
    email: str


class DevLoginResponse(BaseModel):
    hashed_token: str
    verification_type: str


def _require_demo_enabled() -> None:
    if settings.ENVIRONMENT.lower() == "production" or not settings.ALLOW_DEMO_ACCOUNTS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found",
        )


@router.post("/dev-login", response_model=DevLoginResponse)
async def dev_login(request: DevLoginRequest):
    """
    Development-only helper: generates a magiclink token for instant 1-click dev login.
    Disabled unless ALLOW_DEMO_ACCOUNTS is enabled and environment is not production.
    """
    _require_demo_enabled()

    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not available",
        )

    try:
        user_res = (
            supabase.table("users")
            .select("id, email, is_active")
            .eq("email", request.email)
            .eq("is_active", True)
            .maybe_single()
            .execute()
        )
        if not user_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User {request.email} not found or inactive",
            )

        link_res = supabase.auth.admin.generate_link(
            {"type": "magiclink", "email": request.email}
        )

        return DevLoginResponse(
            hashed_token=link_res.properties.hashed_token,
            verification_type=link_res.properties.verification_type or "magiclink",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate dev login link: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate dev login link",
        )


@router.get("/demo-accounts", response_model=List[DemoAccount])
async def list_demo_accounts():
    """
    Development-only helper: lists seeded accounts so the login screen can offer
    account discovery. Disabled unless ALLOW_DEMO_ACCOUNTS is enabled and the
    environment is not production. Never returns credentials.
    """
    _require_demo_enabled()

    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not available",
        )

    try:
        profiles_res = (
            supabase.table("users")
            .select("id, email, full_name, role, is_active, departments(name)")
            .eq("is_active", True)
            .execute()
        )
        profiles = profiles_res.data or []

        accounts = []
        for p in profiles:
            accounts.append(
                DemoAccount(
                    email=p.get("email") or "",
                    full_name=p.get("full_name") or "",
                    role=p.get("role") or "student",
                    role_label=ROLE_LABELS.get(p.get("role") or "", "User"),
                    department_name=(p.get("departments") or {}).get("name"),
                )
            )

        accounts.sort(
            key=lambda a: (
                ROLE_ORDER.index(a.role) if a.role in ROLE_ORDER else 99,
                a.email,
            )
        )
        return accounts

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list demo accounts: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load demo accounts",
        )