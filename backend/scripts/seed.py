"""Environment-guarded database seed for the Smart Timetable Management System.

Creates a minimal, valid baseline (department, academic year, current term and a
superadmin user). Credentials are read from the environment or generated; nothing
is hardcoded.

Refuses to run against a production environment unless ``--force`` is supplied.
"""
import argparse
import os
import secrets
import sys
from supabase import create_client


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        print(f"Error: environment variable {name} is required.", file=sys.stderr)
        raise SystemExit(2)
    return value


def _generate_password() -> str:
    return "Sa-" + secrets.token_urlsafe(12)


def seed(
    supabase,
    dept_code: str,
    dept_name: str,
    year_code: str,
    year_name: str,
    term_name: str,
    admin_email: str,
    admin_password: str,
    admin_name: str,
) -> None:
    dept = (
        supabase.table("departments")
        .upsert({"code": dept_code, "name": dept_name}, on_conflict="code")
        .execute()
        .data[0]
    )
    print(f"Department ready: {dept['name']} ({dept['id']})")

    year = (
        supabase.table("academic_years")
        .upsert(
            {"code": year_code, "name": year_name, "sequence": int(year_code[:4])},
            on_conflict="code",
        )
        .execute()
        .data[0]
    )
    print(f"Academic year ready: {year['name']} ({year['id']})")

    existing_term = (
        supabase.table("academic_terms")
        .select("id, name")
        .eq("department_id", dept["id"])
        .eq("name", term_name)
        .execute()
    )
    if existing_term.data:
        term = existing_term.data[0]
        print(f"Academic term already exists: {term['name']} ({term['id']})")
    else:
        supabase.table("academic_terms").update({"is_current": False}).eq(
            "department_id", dept["id"]
        ).eq("is_current", True).execute()
        term = (
            supabase.table("academic_terms")
            .insert(
                {
                    "department_id": dept["id"],
                    "name": term_name,
                    "is_current": True,
                }
            )
            .execute()
            .data[0]
        )
        print(f"Academic term created: {term['name']} ({term['id']})")

    existing_user = (
        supabase.table("users").select("id").eq("email", admin_email).execute()
    )
    if existing_user.data:
        print(f"User already exists: {admin_email} ({existing_user.data[0]['id']})")
        return

    auth_user = supabase.auth.admin.create_user(
        {
            "email": admin_email,
            "password": admin_password,
            "email_confirm": True,
        }
    )
    user_id = auth_user.user.id
    supabase.table("users").upsert(
        {
            "id": user_id,
            "email": admin_email,
            "full_name": admin_name,
            "role": "superadmin",
            "is_active": True,
        },
        on_conflict="id",
    ).execute()
    print(f"Superadmin created: {admin_email} ({user_id})")
    print(f"Generated password: {admin_password}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed the timetable database.")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Allow running when ENVIRONMENT=production.",
    )
    args = parser.parse_args()

    environment = os.getenv("ENVIRONMENT", "development").lower()
    if environment == "production" and not args.force:
        print(
            "Refusing to seed a production environment without --force.",
            file=sys.stderr,
        )
        raise SystemExit(3)

    supabase = create_client(
        _require_env("SUPABASE_URL"),
        _require_env("SUPABASE_SERVICE_ROLE_KEY"),
    )

    seed(
        supabase,
        dept_code=os.getenv("SEED_DEPT_CODE", "CSE"),
        dept_name=os.getenv("SEED_DEPT_NAME", "Computer Science & Engineering"),
        year_code=os.getenv("SEED_YEAR_CODE", "2025-26"),
        year_name=os.getenv("SEED_YEAR_NAME", "Academic Year 2025-26"),
        term_name=os.getenv("SEED_TERM_NAME", "Odd Semester 2025-26"),
        admin_email=_require_env("SEED_ADMIN_EMAIL"),
        admin_password=os.getenv("SEED_ADMIN_PASSWORD") or _generate_password(),
        admin_name=os.getenv("SEED_ADMIN_NAME", "System Administrator"),
    )
