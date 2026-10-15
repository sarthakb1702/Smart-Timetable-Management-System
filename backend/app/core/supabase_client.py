from typing import Optional
import logging
from fastapi import Request
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger(__name__)

_admin_client: Optional[Client] = None


def _is_configured() -> bool:
    return bool(settings.SUPABASE_URL) and "your-project" not in settings.SUPABASE_URL


def get_supabase_client() -> Optional[Client]:
    """Returns a cached service-role (admin) client.

    Bypasses Row Level Security and must only be used for server-side
    administrative or background jobs. Never expose this to user requests
    that should honour department/role scoping.
    """
    global _admin_client
    if _admin_client is not None:
        return _admin_client

    key_to_use = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY

    if not _is_configured() or not key_to_use:
        logger.warning("Supabase URL or service key not set. Running in mock/standalone mode.")
        return None

    try:
        _admin_client = create_client(settings.SUPABASE_URL, key_to_use)
        logger.info("Successfully connected to Supabase (admin client).")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase admin client: {e}")
        return None

    return _admin_client


def get_anon_key() -> Optional[str]:
    """Public anon key used to construct JWT-scoped (RLS-enforced) clients."""
    return settings.SUPABASE_ANON_KEY or settings.SUPABASE_KEY or None


def get_scoped_client(token: str) -> Optional[Client]:
    """Builds a per-request Supabase client authenticated with the caller's JWT.

    PostgREST requests then run as that user so Row Level Security applies.
    Falls back to the admin client when no anon key is configured.
    """
    anon_key = get_anon_key()
    if not _is_configured() or not anon_key:
        logger.warning(
            "No anon key configured; falling back to admin client. "
            "RLS will not be enforced at the database layer."
        )
        return get_supabase_client()

    try:
        client = create_client(settings.SUPABASE_URL, anon_key)
        client.postgrest.auth(token)
        return client
    except Exception as e:
        logger.error(f"Failed to create JWT-scoped Supabase client: {e}")
        return get_supabase_client()


async def get_request_supabase(request: Request) -> Optional[Client]:
    """FastAPI dependency returning an RLS-enforced client for the caller's JWT."""
    authorization = request.headers.get("authorization")
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        if token:
            return get_scoped_client(token)
    return get_supabase_client()
