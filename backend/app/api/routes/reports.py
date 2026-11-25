from typing import List
from fastapi import APIRouter, Depends
from app.database.connection import get_database
from app.core.dependencies import require_coordinator_or_admin
from app.core.date_utils import is_past_deadline
from app.api.routes.conferences import format_conf_doc

router = APIRouter(prefix="/reports", tags=["Reports"])

def is_student_eligible(student: dict, conf: dict) -> bool:
    if conf.get("scope") == "global":
        return True
    target_sections = conf.get("targetSections") or []
    if student.get("section") in target_sections:
        return True
    target_students = conf.get("targetStudents") or []
    if student.get("rollNumber") in target_students or student.get("id") in target_students:
        return True
    return False

@router.get("/admin")
async def get_admin_reports(current_user: dict = Depends(require_coordinator_or_admin)):
    db = get_database()

    # 1. Fetch active entities
    student_cursor = db.students.find({"status": "Active"})
    students = []
    async for s in student_cursor:
        students.append({
            "id": str(s.get("_id") or s.get("id")),
            "name": s.get("name", ""),
            "rollNumber": s.get("rollNumber", ""),
            "section": s.get("section", ""),
            "academicYear": s.get("academicYear", ""),
        })

    coord_cursor = db.coordinators.find({"status": "Active"})
    coordinators = []
    async for c in coord_cursor:
        coordinators.append({
            "id": str(c.get("_id") or c.get("id")),
            "name": c.get("name", ""),
            "email": c.get("email", ""),
            "assignedSections": c.get("assignedSections", [])
        })

    sec_cursor = db.sections.find({"status": "Active"})
    sections = []
    async for sec in sec_cursor:
        sections.append({
            "id": str(sec.get("_id") or sec.get("id")),
            "sectionName": sec.get("sectionName", ""),
            "academicYear": sec.get("academicYear", ""),
        })

    conf_cursor = db.conferences.find()
    conferences = []
    async for conf in conf_cursor:
        conferences.append(format_conf_doc(conf))

    app_cursor = db.applications.find({"status": "Applied"})
    # Map applications by (conferenceId, rollNumber) and (conferenceId, studentId)
    applied_keys = set()
    async for a in app_cursor:
        conf_id = str(a.get("conferenceId", ""))
        roll = a.get("rollNumber", "")
        s_id = str(a.get("studentId", ""))
        if roll:
            applied_keys.add((conf_id, roll))
        if s_id:
            applied_keys.add((conf_id, s_id))

    def has_applied(student: dict, conf: dict) -> bool:
        c_id = conf["id"]
        return (c_id, student["rollNumber"]) in applied_keys or (c_id, student["id"]) in applied_keys

    # --- 1. Conference-Wise Report ---
    conference_wise = []
    for idx, conf in enumerate(conferences):
        is_expired = is_past_deadline(conf["deadline"]) or conf["status"] == "Expired"
        eligible_students = [s for s in students if is_student_eligible(s, conf)]
        total_eligible = len(eligible_students)

        applied_count = 0
        pending_count = 0
        expired_not_applied_count = 0

        for s in eligible_students:
            if has_applied(s, conf):
                applied_count += 1
            elif is_expired:
                expired_not_applied_count += 1
            else:
                pending_count += 1

        rate = f"{(applied_count / total_eligible * 100):.1f}%" if total_eligible > 0 else "0%"

        conference_wise.append({
            "id": conf["id"],
            "sno": idx + 1,
            "fullName": conf["fullName"],
            "shortName": conf["shortName"],
            "status": "Expired" if is_expired else "Active",
            "deadline": conf["deadline"],
            "eligibleCount": total_eligible,
            "appliedCount": applied_count,
            "pendingCount": pending_count,
            "expiredNotAppliedCount": expired_not_applied_count,
            "participationRate": rate,
        })

    # --- 2. Section-Wise Report ---
    section_wise = []
    for idx, sec in enumerate(sections):
        section_students = [s for s in students if s["section"] == sec["sectionName"]]
        enrollment = len(section_students)

        total_eligible_submissions = 0
        applied_submissions = 0
        pending_submissions = 0
        expired_not_applied_submissions = 0

        for s in section_students:
            for conf in conferences:
                if is_student_eligible(s, conf):
                    total_eligible_submissions += 1
                    is_expired = is_past_deadline(conf["deadline"]) or conf["status"] == "Expired"
                    if has_applied(s, conf):
                        applied_submissions += 1
                    elif is_expired:
                        expired_not_applied_submissions += 1
                    else:
                        pending_submissions += 1

        rate = f"{(applied_submissions / total_eligible_submissions * 100):.1f}%" if total_eligible_submissions > 0 else "0%"

        section_wise.append({
            "id": sec["id"],
            "sno": idx + 1,
            "sectionName": sec["sectionName"],
            "academicYear": sec["academicYear"],
            "studentEnrollment": enrollment,
            "totalEligibleSubmissions": total_eligible_submissions,
            "appliedSubmissions": applied_submissions,
            "pendingSubmissions": pending_submissions,
            "expiredNotAppliedSubmissions": expired_not_applied_submissions,
            "participationRate": rate,
        })

    # --- 3. Coordinator-Wise Report ---
    coordinator_wise = []
    for idx, coord in enumerate(coordinators):
        assigned_secs = coord.get("assignedSections") or []
        coord_students = [s for s in students if s["section"] in assigned_secs]
        strength = len(coord_students)

        total_eligible_submissions = 0
        applied_submissions = 0
        pending_submissions = 0
        expired_not_applied_submissions = 0

        for s in coord_students:
            for conf in conferences:
                if is_student_eligible(s, conf):
                    total_eligible_submissions += 1
                    is_expired = is_past_deadline(conf["deadline"]) or conf["status"] == "Expired"
                    if has_applied(s, conf):
                        applied_submissions += 1
                    elif is_expired:
                        expired_not_applied_submissions += 1
                    else:
                        pending_submissions += 1

        rate = f"{(applied_submissions / total_eligible_submissions * 100):.1f}%" if total_eligible_submissions > 0 else "0%"

        coordinator_wise.append({
            "id": coord["id"],
            "sno": idx + 1,
            "coordinatorName": coord["name"],
            "email": coord["email"],
            "sections": ", ".join(assigned_secs) if assigned_secs else "None",
            "studentStrength": strength,
            "totalEligibleSubmissions": total_eligible_submissions,
            "appliedSubmissions": applied_submissions,
            "pendingSubmissions": pending_submissions,
            "expiredNotAppliedSubmissions": expired_not_applied_submissions,
            "participationRate": rate,
        })

    # --- Global Summary Totals ---
    global_eligible = 0
    global_applied = 0
    global_pending = 0

    for s in students:
        for conf in conferences:
            if is_student_eligible(s, conf):
                global_eligible += 1
                is_expired = is_past_deadline(conf["deadline"]) or conf["status"] == "Expired"
                if has_applied(s, conf):
                    global_applied += 1
                elif not is_expired:
                    global_pending += 1

    overall_rate = round((global_applied / global_eligible) * 100) if global_eligible > 0 else 0

    return {
        "summary": {
            "totalStudents": len(students),
            "totalCoordinators": len(coordinators),
            "totalSections": len(sections),
            "totalConferences": len(conferences),
            "totalApplied": global_applied,
            "totalNotApplied": global_pending,
            "overallParticipationRate": overall_rate,
        },
        "conferenceWise": conference_wise,
        "sectionWise": section_wise,
        "coordinatorWise": coordinator_wise,
    }
