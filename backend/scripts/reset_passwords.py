"""Mass password reset utility.

Credentials are read exclusively from the environment; nothing is hardcoded.
Never run this against production. It refuses to run when ENVIRONMENT=production
unless the caller passes --force.
"""
import argparse
import os
import sys
from supabase import create_client


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        print(f"Error: environment variable {name} is required.", file=sys.stderr)
        raise SystemExit(2)
    return value


def reset_all_passwords(new_password: str) -> None:
    supabase = create_client(
        _require_env("SUPABASE_URL"),
        _require_env("SUPABASE_SERVICE_ROLE_KEY"),
    )

    try:
        users = supabase.auth.admin.list_users()

        if not users:
            print("No users found")
            return

        print(f"Found {len(users)} users. Resetting passwords...")

        for user in users:
            try:
                supabase.auth.admin.update_user_by_id(
                    user.id,
                    {"password": new_password},
                )
                print(f"Updated password for: {user.email} (ID: {user.id})")
            except Exception as e:
                print(f"Failed to update {user.email}: {e}")

        print("Password reset complete!")

    except Exception as e:
        print(f"Error: {e}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Reset all Supabase user passwords.")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Required when ENVIRONMENT=production.",
    )
    args = parser.parse_args()

    if os.getenv("ENVIRONMENT", "development").lower() == "production" and not args.force:
        print(
            "Refusing to reset passwords in production without --force.",
            file=sys.stderr,
        )
        raise SystemExit(1)

    new_password = _require_env("RESET_PASSWORD")
    reset_all_passwords(new_password)


if __name__ == "__main__":
    main()
