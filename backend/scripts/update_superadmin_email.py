"""One-off utility to update the superadmin auth email.

Credentials are read exclusively from the environment; nothing is hardcoded.
"""
import os
import sys
from supabase import create_client


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        print(f"Error: environment variable {name} is required.", file=sys.stderr)
        raise SystemExit(2)
    return value


def update_auth_email(supabase, user_id: str, new_email: str) -> None:
    try:
        response = supabase.auth.admin.update_user_by_id(
            user_id,
            {"email": new_email},
        )
        print(f"Updated auth email for user {user_id} to {new_email}")
        print(response)
    except Exception as e:
        print(f"Error updating auth email: {e}")


if __name__ == "__main__":
    supabase = create_client(
        _require_env("SUPABASE_URL"),
        _require_env("SUPABASE_SERVICE_ROLE_KEY"),
    )
    new_email = _require_env("SUPERADMIN_EMAIL")

    users_response = (
        supabase.table("users").select("id, email, role").eq("role", "superadmin").execute()
    )

    if users_response.data:
        for user in users_response.data:
            print(f"Found superadmin: {user['email']} (ID: {user['id']})")
            update_auth_email(supabase, user["id"], new_email)
    else:
        print("No superadmin found in public.users table")
