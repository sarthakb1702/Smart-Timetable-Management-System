"""
Comprehensive seed script for Smart Timetable Management System.
Seeds:
- Academic Terms named "Sem - 5" (current) and "Sem - 2"
- Rooms: 5XXX (IT, 3rd/4th flr), 6XXX (ENTC), 3XXX (CS)
- Faculty accounts (auth.users + public.users)
- Courses (Theory & Labs) with accurate credits
- Faculty-Course Mappings (faculty_course_map)
- Divisions (80-90 students) & 3 Sub-Batches each
- Central MDM Course Offerings & Locked Wednesday 3-5 PM Slot
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.supabase_client import get_supabase_client
from app.core.config import settings

def seed():
    sb = get_supabase_client()
    if not sb:
        print("ERROR: Supabase client could not be initialized.")
        return

    print("--- 1. VERIFYING EXISTING DEPARTMENTS ---")
    depts = sb.table("departments").select("*").execute().data or []
    dept_map = {d["code"]: d["id"] for d in depts}
    
    it_dept_id = dept_map.get("IT", "11111111-1111-1111-1111-111111111111")
    ce_dept_id = dept_map.get("CE", "22222222-2222-2222-2222-222222222222")
    entc_dept_id = dept_map.get("ENTC", "25dcb024-42fa-4b7f-89fa-1cc46784c36c")

    print(f"IT Dept ID:   {it_dept_id}")
    print(f"CE Dept ID:   {ce_dept_id}")
    print(f"ENTC Dept ID: {entc_dept_id}")

    print("\n--- 2. UPDATING ACADEMIC TERMS ('Sem - 5' and 'Sem - 2') ---")
    # For each department, ensure Sem - 5 is current and Sem - 2 exists
    for did in [it_dept_id, ce_dept_id, entc_dept_id]:
        # Clean up old names or update existing current terms
        existing_terms = sb.table("academic_terms").select("*").eq("department_id", did).execute().data or []
        current_term = next((t for t in existing_terms if t.get("is_current")), None)

        if current_term:
            sb.table("academic_terms").update({
                "name": "Sem - 5",
                "is_current": True
            }).eq("id", current_term["id"]).execute()
            print(f"Updated current term for dept {did} to 'Sem - 5'")
        else:
            sb.table("academic_terms").insert({
                "department_id": did,
                "name": "Sem - 5",
                "is_current": True
            }).execute()
            print(f"Inserted new current term 'Sem - 5' for dept {did}")

        # Check Sem - 2
        sem2 = next((t for t in existing_terms if "2" in t.get("name", "")), None)
        if not sem2:
            sb.table("academic_terms").insert({
                "department_id": did,
                "name": "Sem - 2",
                "is_current": False
            }).execute()
            print(f"Inserted 'Sem - 2' for dept {did}")

    # Fetch active term IDs map
    active_terms = sb.table("academic_terms").select("id, department_id").eq("is_current", True).execute().data or []
    term_by_dept = {t["department_id"]: t["id"] for t in active_terms}
    it_term_id = term_by_dept[it_dept_id]
    ce_term_id = term_by_dept[ce_dept_id]
    entc_term_id = term_by_dept[entc_dept_id]

    print("\n--- 3. VERIFYING ACADEMIC YEARS ---")
    years = sb.table("academic_years").select("*").order("sequence").execute().data or []
    year_map = {y["code"]: y["id"] for y in years}
    ty_year_id = year_map.get("TY")
    sy_year_id = year_map.get("SY")
    fy_year_id = year_map.get("FY")
    btech_year_id = year_map.get("BTech")
    print(f"TY Year ID: {ty_year_id}")

    print("\n--- 4. SEEDING CLASSROOMS AND LABS ---")
    # IT Building: 5XXX (3rd & 4th floor only)
    it_rooms = [
        # Classrooms (Floor 3 & 4)
        {"name": "Room 5301", "department_id": it_dept_id, "room_type": "classroom", "capacity": 95},
        {"name": "Room 5302", "department_id": it_dept_id, "room_type": "classroom", "capacity": 95},
        {"name": "Room 5303", "department_id": it_dept_id, "room_type": "classroom", "capacity": 95},
        {"name": "Room 5304", "department_id": it_dept_id, "room_type": "classroom", "capacity": 95},
        {"name": "Room 5401", "department_id": it_dept_id, "room_type": "classroom", "capacity": 95},
        {"name": "Room 5402", "department_id": it_dept_id, "room_type": "classroom", "capacity": 95},
        {"name": "Room 5403", "department_id": it_dept_id, "room_type": "classroom", "capacity": 95},
        {"name": "Room 5404", "department_id": it_dept_id, "room_type": "classroom", "capacity": 95},
        # Labs
        {"name": "Lab 5305L", "department_id": it_dept_id, "room_type": "lab", "capacity": 35, "equipment_tags": ["DBMS", "AI"]},
        {"name": "Lab 5306L", "department_id": it_dept_id, "room_type": "lab", "capacity": 35, "equipment_tags": ["Networks", "CNT"]},
        {"name": "Lab 5405L", "department_id": it_dept_id, "room_type": "lab", "capacity": 35, "equipment_tags": ["Web", "Software"]},
        {"name": "Lab 5406L", "department_id": it_dept_id, "room_type": "lab", "capacity": 35, "equipment_tags": ["Cloud", "Analytics"]},
    ]

    # ENTC Building: 6XXX
    entc_rooms = [
        {"name": "Room 6201", "department_id": entc_dept_id, "room_type": "classroom", "capacity": 95},
        {"name": "Room 6202", "department_id": entc_dept_id, "room_type": "classroom", "capacity": 95},
        {"name": "Room 6301", "department_id": entc_dept_id, "room_type": "classroom", "capacity": 95},
        {"name": "Room 6302", "department_id": entc_dept_id, "room_type": "classroom", "capacity": 95},
        {"name": "Lab 6203L", "department_id": entc_dept_id, "room_type": "lab", "capacity": 35, "equipment_tags": ["DSP", "Audio"]},
        {"name": "Lab 6204L", "department_id": entc_dept_id, "room_type": "lab", "capacity": 35, "equipment_tags": ["IoT", "Embedded"]},
        {"name": "Lab 6303L", "department_id": entc_dept_id, "room_type": "lab", "capacity": 35, "equipment_tags": ["Comm", "VLSI"]},
    ]

    # CS Building: 3XXX
    cs_rooms = [
        {"name": "Room 3201", "department_id": ce_dept_id, "room_type": "classroom", "capacity": 95},
        {"name": "Room 3202", "department_id": ce_dept_id, "room_type": "classroom", "capacity": 95},
        {"name": "Room 3203", "department_id": ce_dept_id, "room_type": "classroom", "capacity": 95},
        {"name": "Room 3204", "department_id": ce_dept_id, "room_type": "classroom", "capacity": 95},
        {"name": "Room 3301", "department_id": ce_dept_id, "room_type": "classroom", "capacity": 95},
        {"name": "Room 3302", "department_id": ce_dept_id, "room_type": "classroom", "capacity": 95},
        {"name": "Lab 3205L", "department_id": ce_dept_id, "room_type": "lab", "capacity": 35, "equipment_tags": ["High Performance", "OS"]},
        {"name": "Lab 3206L", "department_id": ce_dept_id, "room_type": "lab", "capacity": 35, "equipment_tags": ["Systems", "Compiler"]},
        {"name": "Lab 3305L", "department_id": ce_dept_id, "room_type": "lab", "capacity": 35, "equipment_tags": ["ML", "Data Science"]},
        {"name": "Lab 3306L", "department_id": ce_dept_id, "room_type": "lab", "capacity": 35, "equipment_tags": ["Programming", "Java"]},
    ]

    all_rooms_to_seed = it_rooms + entc_rooms + cs_rooms
    for r in all_rooms_to_seed:
        existing = sb.table("rooms").select("id").eq("name", r["name"]).execute().data
        if not existing:
            sb.table("rooms").insert(r).execute()
    print(f"Rooms ready: {len(all_rooms_to_seed)} total classrooms and labs.")

    # Room ID cache
    db_rooms = sb.table("rooms").select("id, name, room_type, department_id").execute().data or []
    room_by_name = {r["name"]: r["id"] for r in db_rooms}

    print("\n--- 5. SEEDING FACULTY ACCOUNTS ---")
    faculty_definitions = [
        # IT Faculty
        {"name": "Rajesh Phurshule", "email": "rajesh.phurshule@schedulr.app", "dept_id": it_dept_id, "code": "FAC-IT-01"},
        {"name": "Rakhi Pagar", "email": "rakhi.pagar@schedulr.app", "dept_id": it_dept_id, "code": "FAC-IT-02"},
        {"name": "Mukta Jamage", "email": "mukta.jamage@schedulr.app", "dept_id": it_dept_id, "code": "FAC-IT-03"},
        {"name": "Rohit Tate", "email": "rohit.tate@schedulr.app", "dept_id": it_dept_id, "code": "FAC-IT-04"},
        {"name": "Shweta Devdas", "email": "shweta.devdas@schedulr.app", "dept_id": it_dept_id, "code": "FAC-IT-05"},
        {"name": "Rohini Pise", "email": "rohini.pise@schedulr.app", "dept_id": it_dept_id, "code": "FAC-IT-06"},
        {"name": "Maya Bembde", "email": "maya.bembde@schedulr.app", "dept_id": it_dept_id, "code": "FAC-IT-07"},
        {"name": "Prof. Sachin Kadam", "email": "sachin.kadam@schedulr.app", "dept_id": it_dept_id, "code": "FAC-IT-08"},
        {"name": "Prof. Anjali Deshmukh", "email": "anjali.deshmukh@schedulr.app", "dept_id": it_dept_id, "code": "FAC-IT-09"},
        
        # CS / CE Faculty
        {"name": "Dr. Arvind Patil", "email": "arvind.patil@schedulr.app", "dept_id": ce_dept_id, "code": "FAC-CE-01"},
        {"name": "Prof. Sunita More", "email": "sunita.more@schedulr.app", "dept_id": ce_dept_id, "code": "FAC-CE-02"},
        {"name": "Prof. Nitin Shinde", "email": "nitin.shinde@schedulr.app", "dept_id": ce_dept_id, "code": "FAC-CE-03"},
        {"name": "Prof. Priya Joshi", "email": "priya.joshi@schedulr.app", "dept_id": ce_dept_id, "code": "FAC-CE-04"},
        {"name": "Prof. Vikram Ghorpade", "email": "vikram.ghorpade@schedulr.app", "dept_id": ce_dept_id, "code": "FAC-CE-05"},
        {"name": "Prof. Snehal Mane", "email": "snehal.mane@schedulr.app", "dept_id": ce_dept_id, "code": "FAC-CE-06"},
        {"name": "Prof. Harish Kulkarni", "email": "harish.kulkarni@schedulr.app", "dept_id": ce_dept_id, "code": "FAC-CE-07"},
        {"name": "Prof. Meera Kulkarni", "email": "meera.kulkarni@schedulr.app", "dept_id": ce_dept_id, "code": "FAC-CE-08"},
        {"name": "Prof. Swapnil Chougule", "email": "swapnil.chougule@schedulr.app", "dept_id": ce_dept_id, "code": "FAC-CE-09"},
        {"name": "Prof. Tanvi Rane", "email": "tanvi.rane@schedulr.app", "dept_id": ce_dept_id, "code": "FAC-CE-10"},

        # ENTC Faculty
        {"name": "Dr. Suresh Gaikwad", "email": "suresh.gaikwad@schedulr.app", "dept_id": entc_dept_id, "code": "FAC-EC-01"},
        {"name": "Prof. Vandana Jagtap", "email": "vandana.jagtap@schedulr.app", "dept_id": entc_dept_id, "code": "FAC-EC-02"},
        {"name": "Prof. Rahul Bhosale", "email": "rahul.bhosale@schedulr.app", "dept_id": entc_dept_id, "code": "FAC-EC-03"},
        {"name": "Prof. Deepali Pawar", "email": "deepali.pawar@schedulr.app", "dept_id": entc_dept_id, "code": "FAC-EC-04"},
        {"name": "Prof. Kiran Salunkhe", "email": "kiran.salunkhe@schedulr.app", "dept_id": entc_dept_id, "code": "FAC-EC-05"},
        {"name": "Prof. Pooja Thorat", "email": "pooja.thorat@schedulr.app", "dept_id": entc_dept_id, "code": "FAC-EC-06"},
    ]

    faculty_id_by_name = {}

    for f in faculty_definitions:
        existing = sb.table("users").select("id").eq("email", f["email"]).execute().data
        if existing:
            user_id = existing[0]["id"]
            sb.table("users").update({
                "full_name": f["name"],
                "role": "faculty",
                "department_id": f["dept_id"],
                "employee_code": f["code"],
                "is_active": True
            }).eq("id", user_id).execute()
        else:
            try:
                auth_res = sb.auth.admin.create_user({
                    "email": f["email"],
                    "password": "Password123!",
                    "email_confirm": True
                })
                user_id = auth_res.user.id
            except Exception as e:
                # If already exists in auth
                users_list = sb.auth.admin.list_users()
                matched = next((u for u in users_list if u.email == f["email"]), None)
                if matched:
                    user_id = matched.id
                else:
                    raise e

            sb.table("users").upsert({
                "id": user_id,
                "email": f["email"],
                "full_name": f["name"],
                "role": "faculty",
                "department_id": f["dept_id"],
                "employee_code": f["code"],
                "is_active": True
            }, on_conflict="id").execute()

        faculty_id_by_name[f["name"]] = user_id

    print(f"Seeded/Updated {len(faculty_definitions)} faculty profiles.")

    print("\n--- 6. SEEDING CORE COURSES & LABS (Sem - 5 / TY & Sem - 2 / SY) ---")
    courses_data = [
        # IT Department - Sem 5 (TY)
        {"code": "IT501", "name": "Design & Analysis of Algorithms (DAA)", "credits": 3, "session_type": "theory", "dept_id": it_dept_id, "year_id": ty_year_id, "teachers": ["Rajesh Phurshule"]},
        {"code": "IT501L", "name": "DAA Lab", "credits": 2, "session_type": "lab", "dept_id": it_dept_id, "year_id": ty_year_id, "teachers": ["Rajesh Phurshule", "Prof. Sachin Kadam"]},
        {"code": "IT502", "name": "Database Management Systems (DBMS)", "credits": 3, "session_type": "theory", "dept_id": it_dept_id, "year_id": ty_year_id, "teachers": ["Rakhi Pagar"]},
        {"code": "IT502L", "name": "DBMS Lab", "credits": 2, "session_type": "lab", "dept_id": it_dept_id, "year_id": ty_year_id, "teachers": ["Rakhi Pagar", "Prof. Sachin Kadam"]},
        {"code": "IT503", "name": "Artificial Intelligence & ML (AIML)", "credits": 3, "session_type": "theory", "dept_id": it_dept_id, "year_id": ty_year_id, "teachers": ["Mukta Jamage"]},
        {"code": "IT507", "name": "Web Development", "credits": 3, "session_type": "theory", "dept_id": it_dept_id, "year_id": ty_year_id, "teachers": ["Shweta Devdas"]},
        {"code": "IT507L", "name": "Web Development Lab", "credits": 2, "session_type": "lab", "dept_id": it_dept_id, "year_id": ty_year_id, "teachers": ["Shweta Devdas", "Prof. Anjali Deshmukh"]},
        {"code": "IT511", "name": "Computer Networks Technology (CNT)", "credits": 3, "session_type": "theory", "dept_id": it_dept_id, "year_id": ty_year_id, "teachers": ["Maya Bembde"]},
        {"code": "IT511L", "name": "CNT Lab", "credits": 2, "session_type": "lab", "dept_id": it_dept_id, "year_id": ty_year_id, "teachers": ["Maya Bembde", "Prof. Anjali Deshmukh"]},
        {"code": "IT506L", "name": "Python Programming Lab", "credits": 2, "session_type": "lab", "dept_id": it_dept_id, "year_id": ty_year_id, "teachers": ["Shweta Devdas", "Prof. Sachin Kadam"]},

        # IT Department - Sem 2 (SY)
        {"code": "IT201", "name": "Digital Electronics & Logic Design (DELD)", "credits": 3, "session_type": "theory", "dept_id": it_dept_id, "year_id": sy_year_id, "teachers": ["Mukta Jamage"]},
        {"code": "IT202", "name": "Object Oriented Programming (CPP)", "credits": 3, "session_type": "theory", "dept_id": it_dept_id, "year_id": sy_year_id, "teachers": ["Rohit Tate"]},
        {"code": "IT202L", "name": "CPP Lab", "credits": 2, "session_type": "lab", "dept_id": it_dept_id, "year_id": sy_year_id, "teachers": ["Rohit Tate"]},
        {"code": "IT203", "name": "Computer Organization & Architecture (COA)", "credits": 3, "session_type": "theory", "dept_id": it_dept_id, "year_id": sy_year_id, "teachers": ["Rohini Pise"]},
        {"code": "IT204", "name": "Software Engineering & Modeling (SEML)", "credits": 3, "session_type": "theory", "dept_id": it_dept_id, "year_id": sy_year_id, "teachers": ["Rohini Pise"]},
        {"code": "IT205", "name": "Cloud Computing", "credits": 3, "session_type": "theory", "dept_id": it_dept_id, "year_id": sy_year_id, "teachers": ["Maya Bembde"]},

        # CS / CE Department - Sem 5 (TY, 4 Divisions)
        {"code": "CE501", "name": "Advanced Data Structures", "credits": 3, "session_type": "theory", "dept_id": ce_dept_id, "year_id": ty_year_id, "teachers": ["Dr. Arvind Patil", "Prof. Priya Joshi"]},
        {"code": "CE501L", "name": "ADS Lab", "credits": 2, "session_type": "lab", "dept_id": ce_dept_id, "year_id": ty_year_id, "teachers": ["Dr. Arvind Patil", "Prof. Priya Joshi"]},
        {"code": "CE502", "name": "Operating Systems Engineering", "credits": 3, "session_type": "theory", "dept_id": ce_dept_id, "year_id": ty_year_id, "teachers": ["Prof. Sunita More", "Prof. Vikram Ghorpade"]},
        {"code": "CE502L", "name": "OS Lab", "credits": 2, "session_type": "lab", "dept_id": ce_dept_id, "year_id": ty_year_id, "teachers": ["Prof. Sunita More", "Prof. Vikram Ghorpade"]},
        {"code": "CE503", "name": "Database Engineering", "credits": 3, "session_type": "theory", "dept_id": ce_dept_id, "year_id": ty_year_id, "teachers": ["Prof. Nitin Shinde", "Prof. Snehal Mane"]},
        {"code": "CE503L", "name": "Database Lab", "credits": 2, "session_type": "lab", "dept_id": ce_dept_id, "year_id": ty_year_id, "teachers": ["Prof. Nitin Shinde", "Prof. Snehal Mane"]},
        {"code": "CE504", "name": "Theory of Computation", "credits": 3, "session_type": "theory", "dept_id": ce_dept_id, "year_id": ty_year_id, "teachers": ["Prof. Priya Joshi", "Prof. Harish Kulkarni"]},
        {"code": "CE505", "name": "Software Architecture", "credits": 3, "session_type": "theory", "dept_id": ce_dept_id, "year_id": ty_year_id, "teachers": ["Prof. Vikram Ghorpade", "Prof. Meera Kulkarni"]},

        # CS / CE Department - Sem 2 (SY)
        {"code": "CE201", "name": "Machine Learning Foundations", "credits": 3, "session_type": "theory", "dept_id": ce_dept_id, "year_id": sy_year_id, "teachers": ["Prof. Snehal Mane"]},
        {"code": "CE201L", "name": "ML Lab", "credits": 2, "session_type": "lab", "dept_id": ce_dept_id, "year_id": sy_year_id, "teachers": ["Prof. Snehal Mane"]},
        {"code": "CE202", "name": "Computer Graphics", "credits": 3, "session_type": "theory", "dept_id": ce_dept_id, "year_id": sy_year_id, "teachers": ["Prof. Harish Kulkarni"]},
        {"code": "CE203", "name": "Distributed Systems", "credits": 3, "session_type": "theory", "dept_id": ce_dept_id, "year_id": sy_year_id, "teachers": ["Prof. Tanvi Rane"]},

        # ENTC Department - Sem 5 (TY, 2 Divisions)
        {"code": "EC501", "name": "Digital Signal Processing", "credits": 3, "session_type": "theory", "dept_id": entc_dept_id, "year_id": ty_year_id, "teachers": ["Dr. Suresh Gaikwad"]},
        {"code": "EC501L", "name": "DSP Lab", "credits": 2, "session_type": "lab", "dept_id": entc_dept_id, "year_id": ty_year_id, "teachers": ["Dr. Suresh Gaikwad"]},
        {"code": "EC502", "name": "Microcontrollers & Embedded Systems", "credits": 3, "session_type": "theory", "dept_id": entc_dept_id, "year_id": ty_year_id, "teachers": ["Prof. Vandana Jagtap"]},
        {"code": "EC502L", "name": "Embedded Lab", "credits": 2, "session_type": "lab", "dept_id": entc_dept_id, "year_id": ty_year_id, "teachers": ["Prof. Vandana Jagtap"]},
        {"code": "EC503", "name": "Analog & Digital Communication", "credits": 3, "session_type": "theory", "dept_id": entc_dept_id, "year_id": ty_year_id, "teachers": ["Prof. Rahul Bhosale"]},
        {"code": "EC503L", "name": "Comm Lab", "credits": 2, "session_type": "lab", "dept_id": entc_dept_id, "year_id": ty_year_id, "teachers": ["Prof. Rahul Bhosale"]},
        {"code": "EC504", "name": "VLSI Design", "credits": 3, "session_type": "theory", "dept_id": entc_dept_id, "year_id": ty_year_id, "teachers": ["Prof. Deepali Pawar"]},
        {"code": "EC504L", "name": "VLSI Lab", "credits": 2, "session_type": "lab", "dept_id": entc_dept_id, "year_id": ty_year_id, "teachers": ["Prof. Deepali Pawar"]},
        {"code": "EC505", "name": "Electromagnetic Engineering", "credits": 3, "session_type": "theory", "dept_id": entc_dept_id, "year_id": ty_year_id, "teachers": ["Prof. Kiran Salunkhe"]},
        {"code": "EC506", "name": "Control Systems", "credits": 3, "session_type": "theory", "dept_id": entc_dept_id, "year_id": ty_year_id, "teachers": ["Prof. Pooja Thorat"]},
    ]

    course_id_by_code = {}

    for c in courses_data:
        existing = sb.table("courses").select("id").eq("code", c["code"]).execute().data
        if existing:
            c_id = existing[0]["id"]
            sb.table("courses").update({
                "name": c["name"],
                "credits": c["credits"],
                "session_type": c["session_type"],
                "department_id": c["dept_id"],
                "academic_year_id": c["year_id"],
                "is_mdm": False
            }).eq("id", c_id).execute()
        else:
            res = sb.table("courses").insert({
                "code": c["code"],
                "name": c["name"],
                "credits": c["credits"],
                "session_type": c["session_type"],
                "department_id": c["dept_id"],
                "academic_year_id": c["year_id"],
                "is_mdm": False
            }).execute()
            c_id = res.data[0]["id"]

        course_id_by_code[c["code"]] = c_id

        # Map faculty to course
        for teacher_name in c["teachers"]:
            f_id = faculty_id_by_name.get(teacher_name)
            if f_id:
                sb.table("faculty_course_map").upsert({
                    "faculty_id": f_id,
                    "course_id": c_id
                }, on_conflict="faculty_id, course_id").execute()

    print(f"Courses & Faculty mappings ready: {len(courses_data)} subjects configured across Sem-5 and Sem-2.")

    print("\n--- 7. SEEDING ACADEMIC DIVISIONS & SUB-BATCHES (85-88 students) ---")
    divisions_info = [
        # IT Department: 2 Divisions
        {"name": "IT-A", "dept_id": it_dept_id, "term_id": it_term_id, "headcount": 85, "teacher": "Rajesh Phurshule", "batches": [("IT-A1", 28), ("IT-A2", 28), ("IT-A3", 29)]},
        {"name": "IT-B", "dept_id": it_dept_id, "term_id": it_term_id, "headcount": 85, "teacher": "Rakhi Pagar", "batches": [("IT-B1", 28), ("IT-B2", 28), ("IT-B3", 29)]},

        # ENTC Department: 2 Divisions
        {"name": "ENTC-A", "dept_id": entc_dept_id, "term_id": entc_term_id, "headcount": 85, "teacher": "Dr. Suresh Gaikwad", "batches": [("ENTC-A1", 28), ("ENTC-A2", 28), ("ENTC-A3", 29)]},
        {"name": "ENTC-B", "dept_id": entc_dept_id, "term_id": entc_term_id, "headcount": 85, "teacher": "Prof. Vandana Jagtap", "batches": [("ENTC-B1", 28), ("ENTC-B2", 28), ("ENTC-B3", 29)]},

        # CS Department: 4 Divisions
        {"name": "CS-A", "dept_id": ce_dept_id, "term_id": ce_term_id, "headcount": 88, "teacher": "Dr. Arvind Patil", "batches": [("CS-A1", 29), ("CS-A2", 29), ("CS-A3", 30)]},
        {"name": "CS-B", "dept_id": ce_dept_id, "term_id": ce_term_id, "headcount": 88, "teacher": "Prof. Sunita More", "batches": [("CS-B1", 29), ("CS-B2", 29), ("CS-B3", 30)]},
        {"name": "CS-C", "dept_id": ce_dept_id, "term_id": ce_term_id, "headcount": 88, "teacher": "Prof. Nitin Shinde", "batches": [("CS-C1", 29), ("CS-C2", 29), ("CS-C3", 30)]},
        {"name": "CS-D", "dept_id": ce_dept_id, "term_id": ce_term_id, "headcount": 88, "teacher": "Prof. Priya Joshi", "batches": [("CS-D1", 29), ("CS-D2", 29), ("CS-D3", 30)]},
    ]

    for d in divisions_info:
        existing = sb.table("divisions").select("id").eq("department_id", d["dept_id"]).eq("name", d["name"]).execute().data
        if existing:
            div_id = existing[0]["id"]
            sb.table("divisions").update({
                "student_count": d["headcount"],
                "academic_year_id": ty_year_id,
                "term_id": d["term_id"]
            }).eq("id", div_id).execute()
        else:
            res = sb.table("divisions").insert({
                "name": d["name"],
                "department_id": d["dept_id"],
                "academic_year_id": ty_year_id,
                "term_id": d["term_id"],
                "student_count": d["headcount"]
            }).execute()
            div_id = res.data[0]["id"]

        # Link class teacher faculty to division_id in users
        teacher_id = faculty_id_by_name.get(d["teacher"])
        if teacher_id:
            sb.table("users").update({"division_id": div_id}).eq("id", teacher_id).execute()

        # Seed sub-batches
        for b_name, b_count in d["batches"]:
            b_exist = sb.table("batches").select("id").eq("division_id", div_id).eq("name", b_name).execute().data
            if not b_exist:
                sb.table("batches").insert({
                    "division_id": div_id,
                    "name": b_name,
                    "student_count": b_count
                }).execute()

    print(f"Divisions & Batches ready: {len(divisions_info)} divisions with 3 batches each.")

    print("\n--- 8. SEEDING MULTIDISCIPLINARY MINORS (MDM) ---")
    # 1. Ensure MDM courses exist
    mdm_courses_def = [
        {"code": "MDM-IT301", "name": "Business Intelligence & Data Analytics", "credits": 2, "session_type": "theory", "dept_id": it_dept_id, "teacher": "Prof. Sachin Kadam", "room": "Room 5401"},
        {"code": "MDM-CS301", "name": "Applied Artificial Intelligence & GenAI", "credits": 2, "session_type": "theory", "dept_id": ce_dept_id, "teacher": "Prof. Meera Kulkarni", "room": "Room 3201"},
        {"code": "MDM-EC301", "name": "Robotics & Smart IoT Systems", "credits": 2, "session_type": "theory", "dept_id": entc_dept_id, "teacher": "Prof. Vandana Jagtap", "room": "Room 6201"},
    ]

    mdm_course_map = {}
    for mc in mdm_courses_def:
        m_exist = sb.table("courses").select("id").eq("code", mc["code"]).execute().data
        if m_exist:
            mc_id = m_exist[0]["id"]
            sb.table("courses").update({
                "name": mc["name"],
                "credits": mc["credits"],
                "session_type": "theory",
                "department_id": mc["dept_id"],
                "academic_year_id": ty_year_id,
                "is_mdm": True
            }).eq("id", mc_id).execute()
        else:
            res = sb.table("courses").insert({
                "code": mc["code"],
                "name": mc["name"],
                "credits": mc["credits"],
                "session_type": "theory",
                "department_id": mc["dept_id"],
                "academic_year_id": ty_year_id,
                "is_mdm": True
            }).execute()
            mc_id = res.data[0]["id"]
        mdm_course_map[mc["code"]] = mc_id

    # 2. Central MDM Slot for TY (Wednesday 15:00 - 17:00, Locked)
    slot_exist = sb.table("mdm_slots").select("id").eq("academic_year_id", ty_year_id).execute().data
    if slot_exist:
        mdm_slot_id = slot_exist[0]["id"]
        sb.table("mdm_slots").update({
            "day_of_week": 3, # Wednesday
            "start_time": "15:00:00",
            "end_time": "17:00:00",
            "status": "locked"
        }).eq("id", mdm_slot_id).execute()
    else:
        slot_res = sb.table("mdm_slots").insert({
            "academic_year_id": ty_year_id,
            "day_of_week": 3, # Wednesday
            "start_time": "15:00:00",
            "end_time": "17:00:00",
            "status": "locked"
        }).execute()
        mdm_slot_id = slot_res.data[0]["id"]

    # 3. MDM Slot Options
    for mc in mdm_courses_def:
        cid = mdm_course_map[mc["code"]]
        fid = faculty_id_by_name.get(mc["teacher"])
        rid = room_by_name.get(mc["room"])
        if cid and fid and rid:
            sb.table("mdm_slot_options").upsert({
                "mdm_slot_id": mdm_slot_id,
                "course_id": cid,
                "faculty_id": fid,
                "room_id": rid
            }, on_conflict="mdm_slot_id, course_id").execute()

    print("Central MDM Locked Slot & Options configured for Wednesday 15:00-17:00.")

    print("\n==========================================")
    print("SUCCESS: Comprehensive dummy seed complete!")
    print("All departments, rooms (5XXX, 6XXX, 3XXX), faculty, courses, divisions, and MDM slots are ready for generation testing.")
    print("==========================================")

if __name__ == "__main__":
    seed()
