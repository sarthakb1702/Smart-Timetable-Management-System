from typing import Optional
import logging
from supabase import create_client, Client
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Optional[Client]:
    """
    Returns a cached singleton instance of Supabase Client.
    Prefers service role key for administrative tasks (like timetable batch inserts)
    if available, otherwise falls back to public anon key.
    """
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    key_to_use = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY

    if not settings.SUPABASE_URL or not key_to_use or "your-project" in settings.SUPABASE_URL:
        logger.warning("Supabase URL or Key not set. Running in mock/standalone mode.")
        return None

    try:
        _supabase_client = create_client(settings.SUPABASE_URL, key_to_use)
        logger.info("Successfully connected to Supabase.")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        return None

    return _supabase_client
