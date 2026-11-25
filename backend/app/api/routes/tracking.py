from typing import Optional
import re
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, Query, status
from app.database.connection import get_database
from app.core.dependencies import require_coordinator_or_admin
from app.core.date_utils import normalize_date, is_past_deadline
from app.api.routes.conferences import format_conf_doc, get_conference_tracking

router = APIRouter(prefix="/tracking", tags=["Tracking"])

@router.get("/student")
async def get_student_tracking(
    q: Optional[str] = Query(None),
    current_user: dict = Depends(require_coordinator_or_admin)
):
    if not q or not q.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query parameter 'q' is required for student tracking."
        )

    search_query = q.strip()
    db = get_database()
    regex_pattern = re.compile(re.escape(search_query), re.IGNORECASE)

    student_query = {
        "$or": [
            {"rollNumber": {"$regex": regex_pattern}},
            {"name": {"$regex": regex_pattern}},
            {"phoneNumber": {"$regex": regex_pattern}},
            {"email": {"$regex": regex_pattern}},
        ]
    }

    student_doc = await db.students.find_one(student_query)
    if not student_doc:
        return None

    student_data = {
        "id": str(student_doc.get("_id") or student_doc.get("id")),
        "name": student_doc.get("name", ""),
        "rollNumber": student_doc.get("rollNumber", ""),
        "phoneNumber": student_doc.get("phoneNumber", ""),
        "email": student_doc.get("email", ""),
        "section": student_doc.get("section", ""),
        "academicYear": student_doc.get("academicYear", ""),
        "status": student_doc.get("status", "Active"),
    }

    # Fetch eligible conferences
    conf_cursor = db.conferences.find()
    eligible_confs = []
    async for c in conf_cursor:
        c_obj = format_conf_doc(c)
        is_global = c_obj["scope"] == "global"
        in_section = student_data["section"] in (c_obj.get("targetSections") or [])
        in_students = (student_data["rollNumber"] in (c_obj.get("targetStudents") or [])) or (student_data["id"] in (c_obj.get("targetStudents") or []))
        if is_global or in_section or in_students:
            eligible_confs.append(c_obj)

    # Fetch all applications for this student
    app_cursor = db.applications.find({
        "$or": [
            {"rollNumber": student_data["rollNumber"]},
            {"studentId": student_data["id"]}
        ]
    })
    apps_by_conf = {}
    async for a in app_cursor:
        apps_by_conf[str(a.get("conferenceId"))] = a

    conferences_list = []
    for c in eligible_confs:
        app = apps_by_conf.get(c["id"])
        is_conf_expired = is_past_deadline(c["deadline"]) or c["status"] == "Expired"
        
        if app and app.get("status") == "Applied":
            applied_status = "Applied"
        elif is_conf_expired:
            applied_status = "Expired Not Applied"
        else:
            applied_status = "Pending"

        conferences_list.append({
            **c,
            "appliedStatus": applied_status,
            "appliedAt": app.get("appliedAt") if app else None,
            "screenshotProof": app.get("screenshotProof") if app else None,
            "proofFileName": app.get("proofFileName") if app else None,
        })

    return {
        "student": student_data,
        "conferences": conferences_list
    }

@router.get("/conference/{conf_id}")
async def get_conf_tracking(
    conf_id: str,
    current_user: dict = Depends(require_coordinator_or_admin)
):
    return await get_conference_tracking(conf_id=conf_id, current_user=current_user)
