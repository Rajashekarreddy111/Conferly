from typing import List
from fastapi import APIRouter, Depends
from app.database.connection import get_database
from app.core.dependencies import get_current_user
from app.core.date_utils import is_approaching_deadline, get_time_remaining
from app.api.routes.conferences import format_conf_doc

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/deadlines", response_model=List[dict])
async def get_deadline_notifications(
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    role = (current_user.get("role") or "").lower()

    # Active conferences
    cursor = db.conferences.find({"status": {"$ne": "Archived"}})
    conferences = []
    async for c in cursor:
        conf = format_conf_doc(c)
        if conf["status"] == "Active" and is_approaching_deadline(conf["deadline"]):
            conferences.append(conf)

    alerts = []

    if role in ("coordinator", "mentor"):
        coord_sections = current_user.get("assignedSections") or []
        for conf in conferences:
            # Check relevance
            is_relevant = (conf["scope"] == "global") or any(sec in coord_sections for sec in (conf.get("targetSections") or []))
            if not is_relevant:
                continue

            # Eligible students in coordinator's sections
            eligible_cursor = db.students.find({
                "status": "Active",
                "section": {"$in": coord_sections}
            })
            eligible_students = []
            async for s in eligible_cursor:
                eligible_students.append(s)

            # Check applications
            app_cursor = db.applications.find({"conferenceId": conf["id"], "status": "Applied"})
            applied_ids = set()
            async for a in app_cursor:
                if a.get("rollNumber"):
                    applied_ids.add(a["rollNumber"])
                if a.get("studentId"):
                    applied_ids.add(str(a["studentId"]))

            unapplied_count = sum(1 for s in eligible_students if s.get("rollNumber") not in applied_ids and str(s.get("_id")) not in applied_ids)
            remaining = get_time_remaining(conf["deadline"])

            alerts.append({
                "id": f"alert-{conf['id']}",
                "conferenceId": conf["id"],
                "conferenceName": conf["shortName"],
                "fullName": conf["fullName"],
                "deadline": conf["deadline"],
                "remainingTime": remaining["text"],
                "eligibleCount": len(eligible_students),
                "unappliedCount": unapplied_count,
                "message": f"{conf['shortName']} deadline closes in {remaining['text']}! {unapplied_count} student(s) still pending."
            })

    elif role == "student":
        roll = current_user.get("rollNumber")
        s_id = str(current_user.get("_id") or current_user.get("id"))
        sec = current_user.get("section")

        # Exclude conferences already applied to
        app_cursor = db.applications.find({
            "$or": [{"rollNumber": roll}, {"studentId": s_id}],
            "status": "Applied"
        })
        applied_conf_ids = set()
        async for a in app_cursor:
            applied_conf_ids.add(str(a.get("conferenceId")))

        for conf in conferences:
            if conf["id"] in applied_conf_ids:
                continue

            is_eligible = (conf["scope"] == "global") or (sec and sec in (conf.get("targetSections") or [])) or (roll and roll in (conf.get("targetStudents") or []))
            if is_eligible:
                remaining = get_time_remaining(conf["deadline"])
                alerts.append({
                    "id": f"alert-{conf['id']}",
                    "conferenceId": conf["id"],
                    "conferenceName": conf["shortName"],
                    "fullName": conf["fullName"],
                    "deadline": conf["deadline"],
                    "remainingTime": remaining["text"],
                    "applicationLink": conf.get("applicationLink"),
                    "message": f"URGENT: {conf['shortName']} application closes in {remaining['text']}! Please apply and upload proof."
                })

    else:
        # Admin: see all approaching deadlines
        for conf in conferences:
            remaining = get_time_remaining(conf["deadline"])
            alerts.append({
                "id": f"alert-{conf['id']}",
                "conferenceId": conf["id"],
                "conferenceName": conf["shortName"],
                "fullName": conf["fullName"],
                "deadline": conf["deadline"],
                "remainingTime": remaining["text"],
                "message": f'Conference "{conf["shortName"]}" deadline is in {remaining["text"]}.'
            })

    return alerts
