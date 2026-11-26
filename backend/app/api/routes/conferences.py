import re
from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timezone
import logging
from fastapi import APIRouter, HTTPException, Depends, status, Query
from app.database.connection import get_database
from app.core.dependencies import (
    get_current_user,
    get_current_user_optional,
    require_admin,
    require_coordinator_or_admin,
)
from app.core.date_utils import normalize_date, is_past_deadline
from app.schemas.conferences import (
    ConferenceCreate,
    ConferenceUpdate,
    DuplicateCheckRequest,
    DuplicateCheckResponse,
    BulkConferenceImportRequest,
    BatchSuggestionActionRequest,
)

router = APIRouter(prefix="/conferences", tags=["Conferences"])
logger = logging.getLogger("conferly.conferences")


def normalize_str(s: Optional[str]) -> str:
    return str(s or "").strip().lower()


def normalize_url(url: Optional[str]) -> str:
    if not url:
        return ""
    u = str(url).strip().lower()
    u = re.sub(r"^https?:\/\/", "", u)
    u = re.sub(r"^www\.", "", u)
    return u.rstrip("/")


def format_conf_doc(doc: dict) -> dict:
    conf_id = str(doc.get("_id") or doc.get("id"))
    deadline = normalize_date(doc.get("deadline", ""))

    saved_status = doc.get("status", "Active")
    if saved_status == "Archived":
        final_status = "Archived"
    elif is_past_deadline(deadline):
        final_status = "Expired"
    else:
        final_status = "Active"

    return {
        "id": conf_id,
        "fullName": doc.get("fullName", ""),
        "shortName": doc.get("shortName", ""),
        "applicationLink": doc.get("applicationLink", ""),
        "deadline": deadline,
        "createdBy": doc.get("createdBy", "Admin"),
        "creatorRole": doc.get("creatorRole", "admin"),
        "creatorId": str(doc.get("creatorId", "")) if doc.get("creatorId") else None,
        "creatorEmail": doc.get("creatorEmail"),
        "createdAt": doc.get("createdAt", ""),
        "scope": doc.get("scope", "global"),
        "targetSections": doc.get("targetSections", []),
        "targetStudents": doc.get("targetStudents", []),
        "status": final_status,
        "venue": doc.get("venue"),
        "dates": doc.get("dates"),
        "acceptedCoordinators": [str(c) for c in doc.get("acceptedCoordinators", [])],
        "declinedCoordinators": [str(c) for c in doc.get("declinedCoordinators", [])],
        "editHistory": doc.get("editHistory", []),
    }


def is_duplicate_conference(
    doc: dict,
    full_name: str,
    short_name: str,
    app_link: Optional[str] = None,
    venue: Optional[str] = None,
    dates: Optional[str] = None,
) -> bool:
    """
    Checks whether a conference matches by:
    1. Same official URL (applicationLink)
    2. Same full title + dates + venue
    3. Same full title + short name
    """
    doc_url = normalize_url(doc.get("applicationLink"))
    new_url = normalize_url(app_link)
    # Check by official URL (exclude empty or bare generic domain root)
    if new_url and doc_url and len(new_url) > 8 and new_url == doc_url:
        return True

    doc_full = normalize_str(doc.get("fullName"))
    new_full = normalize_str(full_name)
    doc_short = normalize_str(doc.get("shortName"))
    new_short = normalize_str(short_name)

    # Check by title + shortName
    if new_full and doc_full == new_full and new_short and doc_short == new_short:
        return True

    # Check by title + dates + venue
    doc_venue = normalize_str(doc.get("venue"))
    new_venue = normalize_str(venue)
    doc_dates = normalize_str(doc.get("dates"))
    new_dates = normalize_str(dates)
    if (
        new_full
        and doc_full == new_full
        and new_venue
        and doc_venue == new_venue
        and new_dates
        and doc_dates == new_dates
    ):
        return True

    return False


@router.get("", response_model=List[dict])
async def get_conferences(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    db = get_database()
    cursor = db.conferences.find()
    conferences = []

    user_role = (current_user.get("role") or "").lower() if current_user else None
    user_section = current_user.get("section") if current_user else None
    user_roll = current_user.get("rollNumber") if current_user else None

    async for doc in cursor:
        conf = format_conf_doc(doc)

        # Status filter check
        if status_filter and conf["status"].lower() != status_filter.lower():
            continue

        # Strict Student Visibility Filtering on Backend
        if user_role == "student":
            # Students never see archived conferences
            if conf["status"] == "Archived":
                continue

            # Must match scope == 'global' OR student section in targetSections OR student roll in targetStudents
            is_global = conf["scope"] == "global"
            is_section_targeted = bool(
                user_section and conf.get("targetSections") and user_section in conf["targetSections"]
            )
            is_student_targeted = bool(
                user_roll and conf.get("targetStudents") and user_roll in conf["targetStudents"]
            )

            if not (is_global or is_section_targeted or is_student_targeted):
                continue

        conferences.append(conf)

    return conferences


@router.get("/suggestions")
async def get_conference_suggestions(
    current_user: dict = Depends(require_coordinator_or_admin),
):
    """
    Returns pending conference suggestions shared by other coordinators.
    Shows only active conferences not already given to this coordinator's students,
    and not previously accepted or declined by this coordinator.
    """
    db = get_database()
    user_id = str(current_user.get("_id") or current_user.get("id"))
    user_sections = current_user.get("assignedSections", [])

    cursor = db.conferences.find({"status": {"$ne": "Archived"}})
    suggestions = []

    async for doc in cursor:
        conf = format_conf_doc(doc)

        # Do not suggest expired conferences
        if conf["status"] == "Expired":
            continue

        creator_id = str(doc.get("creatorId") or "")
        # Skip if created by this coordinator
        if creator_id and creator_id == user_id:
            continue

        # Skip if already accepted by this coordinator
        if user_id in conf.get("acceptedCoordinators", []):
            continue

        # Skip if already declined by this coordinator
        if user_id in conf.get("declinedCoordinators", []):
            continue

        # Check if already given to this coordinator's students (section overlap)
        conf_sections = set(conf.get("targetSections", []))
        if user_sections and any(sec in conf_sections for sec in user_sections):
            # Already active for their students
            continue

        suggestions.append(conf)

    return suggestions


@router.post("/check-duplicate", response_model=DuplicateCheckResponse)
async def check_duplicate(payload: DuplicateCheckRequest):
    db = get_database()
    query = {}
    if payload.excludeId:
        try:
            query["_id"] = {"$ne": ObjectId(payload.excludeId)}
        except Exception:
            query["_id"] = {"$ne": payload.excludeId}

    cursor = db.conferences.find(query)
    async for doc in cursor:
        if is_duplicate_conference(
            doc,
            payload.fullName,
            payload.shortName,
            payload.applicationLink,
            payload.venue,
            payload.dates,
        ):
            existing = format_conf_doc(doc)
            return DuplicateCheckResponse(
                isDuplicate=True,
                existingConference=existing,
                message=(
                    f'A matching conference already exists: "{existing["fullName"]}" ({existing["shortName"]}), '
                    f'created by {existing["createdBy"]}.'
                ),
            )

    return DuplicateCheckResponse(isDuplicate=False, existingConference=None, message=None)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_conference(
    conf_in: ConferenceCreate,
    current_user: dict = Depends(require_coordinator_or_admin),
):
    db = get_database()
    user_id = str(current_user.get("_id") or current_user.get("id"))
    user_role = (current_user.get("role") or "").lower()
    user_sections = current_user.get("assignedSections", [])

    # Check for duplicate
    cursor = db.conferences.find({"status": {"$ne": "Archived"}})
    async for doc in cursor:
        if is_duplicate_conference(
            doc,
            conf_in.fullName,
            conf_in.shortName,
            conf_in.applicationLink,
            conf_in.venue,
            conf_in.dates,
        ):
            existing_conf = format_conf_doc(doc)
            # Rule: If a coordinator posts a conference that is already pending for them,
            # treat it as accepted and don't duplicate.
            if user_role in ["coordinator", "mentor"]:
                if user_id not in existing_conf.get("acceptedCoordinators", []):
                    # Auto-accept this conference for the coordinator!
                    await db.conferences.update_one(
                        {"_id": doc["_id"]},
                        {
                            "$addToSet": {
                                "acceptedCoordinators": user_id,
                                "targetSections": {"$each": user_sections},
                            },
                            "$pull": {"declinedCoordinators": user_id},
                        },
                    )
                    updated_doc = await db.conferences.find_one({"_id": doc["_id"]})
                    logger.info(
                        "Coordinator %s posted conference '%s' which matched existing ID %s; treated as accepted.",
                        user_id,
                        conf_in.shortName,
                        str(doc["_id"]),
                    )
                    return format_conf_doc(updated_doc)

            # If already accepted or created by user or admin, raise duplicate error
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'A conference matching "{existing_conf["fullName"]}" ({existing_conf["shortName"]}) already exists in the system.',
            )

    clean_deadline = normalize_date(conf_in.deadline)
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Determine targeted sections
    target_sections = conf_in.targetSections or []
    if user_role in ["coordinator", "mentor"] and not target_sections:
        target_sections = list(user_sections)

    new_doc = {
        "fullName": conf_in.fullName.strip(),
        "shortName": conf_in.shortName.strip(),
        "applicationLink": conf_in.applicationLink.strip(),
        "deadline": clean_deadline,
        "venue": conf_in.venue.strip() if conf_in.venue else None,
        "dates": conf_in.dates.strip() if conf_in.dates else None,
        "createdBy": current_user.get("name") or conf_in.creatorName or "Admin",
        "creatorRole": user_role or conf_in.creatorRole or "admin",
        "creatorId": user_id,
        "creatorEmail": current_user.get("email"),
        "createdAt": today_str,
        "scope": "targeted" if target_sections else conf_in.scope,
        "targetSections": target_sections,
        "targetStudents": conf_in.targetStudents or [],
        "acceptedCoordinators": [user_id] if user_role in ["coordinator", "mentor"] else [],
        "declinedCoordinators": [],
        "editHistory": [],
        "status": "Expired" if is_past_deadline(clean_deadline) else "Active",
    }

    result = await db.conferences.insert_one(new_doc)
    new_doc["_id"] = result.inserted_id
    return format_conf_doc(new_doc)


@router.post("/{conf_id}/accept")
async def accept_conference_suggestion(
    conf_id: str,
    current_user: dict = Depends(require_coordinator_or_admin),
):
    """
    Coordinator accepts a conference suggestion.
    Adds coordinator's assigned sections to targetSections and grants their students access.
    """
    db = get_database()
    try:
        query = {"_id": ObjectId(conf_id)}
    except Exception:
        query = {"id": conf_id}

    conf = await db.conferences.find_one(query)
    if not conf:
        raise HTTPException(status_code=404, detail="Conference not found")

    user_id = str(current_user.get("_id") or current_user.get("id"))
    user_sections = current_user.get("assignedSections", [])

    await db.conferences.update_one(
        query,
        {
            "$addToSet": {
                "acceptedCoordinators": user_id,
                "targetSections": {"$each": user_sections},
            },
            "$pull": {"declinedCoordinators": user_id},
        },
    )

    updated_doc = await db.conferences.find_one(query)
    return {
        "success": True,
        "message": f'Conference "{conf.get("shortName")}" accepted and assigned to your student sections.',
        "conference": format_conf_doc(updated_doc),
    }


@router.post("/{conf_id}/decline")
async def decline_conference_suggestion(
    conf_id: str,
    current_user: dict = Depends(require_coordinator_or_admin),
):
    """
    Coordinator declines a conference suggestion.
    Ensures the suggestion will not show up again for this coordinator.
    """
    db = get_database()
    try:
        query = {"_id": ObjectId(conf_id)}
    except Exception:
        query = {"id": conf_id}

    conf = await db.conferences.find_one(query)
    if not conf:
        raise HTTPException(status_code=404, detail="Conference not found")

    user_id = str(current_user.get("_id") or current_user.get("id"))

    await db.conferences.update_one(
        query,
        {
            "$addToSet": {"declinedCoordinators": user_id},
            "$pull": {"acceptedCoordinators": user_id},
        },
    )

    return {
        "success": True,
        "message": f'Conference "{conf.get("shortName")}" declined.',
    }


@router.post("/suggestions/batch")
async def batch_suggestion_action(
    payload: BatchSuggestionActionRequest,
    current_user: dict = Depends(require_coordinator_or_admin),
):
    """
    Processes batch Accept or Decline for multiple conference suggestions.
    """
    action = payload.action.lower().strip()
    if action not in ["accept", "decline"]:
        raise HTTPException(status_code=400, detail="Action must be 'accept' or 'decline'")

    db = get_database()
    user_id = str(current_user.get("_id") or current_user.get("id"))
    user_sections = current_user.get("assignedSections", [])

    processed_count = 0
    for cid in payload.conferenceIds:
        try:
            q = {"_id": ObjectId(cid)}
        except Exception:
            q = {"id": cid}

        conf = await db.conferences.find_one(q)
        if not conf:
            continue

        if action == "accept":
            await db.conferences.update_one(
                q,
                {
                    "$addToSet": {
                        "acceptedCoordinators": user_id,
                        "targetSections": {"$each": user_sections},
                    },
                    "$pull": {"declinedCoordinators": user_id},
                },
            )
        else:
            await db.conferences.update_one(
                q,
                {
                    "$addToSet": {"declinedCoordinators": user_id},
                    "$pull": {"acceptedCoordinators": user_id},
                },
            )
        processed_count += 1

    return {
        "success": True,
        "action": action,
        "processedCount": processed_count,
        "message": f"Successfully {action}ed {processed_count} conference suggestion(s).",
    }


@router.put("/{conf_id}")
async def update_conference(
    conf_id: str,
    conf_in: ConferenceUpdate,
    current_user: dict = Depends(require_coordinator_or_admin),
):
    db = get_database()
    try:
        obj_id = ObjectId(conf_id)
        query = {"_id": obj_id}
    except Exception:
        query = {"id": conf_id}

    existing = await db.conferences.find_one(query)
    if not existing:
        raise HTTPException(status_code=404, detail="Conference not found")

    # Duplicate check excluding current
    cursor = db.conferences.find({"_id": {"$ne": existing["_id"]}, "status": {"$ne": "Archived"}})
    async for doc in cursor:
        if is_duplicate_conference(
            doc,
            conf_in.fullName,
            conf_in.shortName,
            conf_in.applicationLink,
            conf_in.venue,
            conf_in.dates,
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'A conference matching "{doc.get("fullName")}" ({doc.get("shortName")}) already exists.',
            )

    clean_deadline = normalize_date(conf_in.deadline)
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    # Create audit record
    edit_record = {
        "editedBy": current_user.get("name", "User"),
        "editorRole": current_user.get("role", "admin"),
        "editorEmail": current_user.get("email"),
        "editedAt": today_str,
    }

    update_data = {
        "fullName": conf_in.fullName.strip(),
        "shortName": conf_in.shortName.strip(),
        "applicationLink": conf_in.applicationLink.strip(),
        "deadline": clean_deadline,
        "venue": conf_in.venue.strip() if conf_in.venue else None,
        "dates": conf_in.dates.strip() if conf_in.dates else None,
        "scope": conf_in.scope,
        "targetSections": conf_in.targetSections if conf_in.scope == "targeted" else [],
        "targetStudents": conf_in.targetStudents or [],
    }

    if existing.get("status") != "Archived":
        update_data["status"] = "Expired" if is_past_deadline(clean_deadline) else "Active"

    await db.conferences.update_one(
        query,
        {
            "$set": update_data,
            "$push": {"editHistory": edit_record},
        },
    )

    updated_doc = await db.conferences.find_one(query)
    return format_conf_doc(updated_doc)


@router.delete("/{conf_id}")
async def delete_conference(
    conf_id: str,
    current_user: dict = Depends(require_coordinator_or_admin),
):
    """
    Unlink/Withdraw deletion model:
    - If non-creator coordinator deletes: removes their sections and unlinks from their students,
      keeping it intact for other coordinators and existing applicants.
    - If creator deletes: checks if other coordinators accepted or students applied.
      If others accepted/applied, only unlinks creator's sections.
      If nobody else accepted and no applications, permanently deletes from DB.
    - If admin deletes: permanently deletes or archives.
    """
    db = get_database()
    try:
        obj_id = ObjectId(conf_id)
        query = {"_id": obj_id}
    except Exception:
        query = {"id": conf_id}

    existing = await db.conferences.find_one(query)
    if not existing:
        raise HTTPException(status_code=404, detail="Conference not found")

    user_id = str(current_user.get("_id") or current_user.get("id"))
    user_role = (current_user.get("role") or "").lower()
    user_sections = set(current_user.get("assignedSections", []))

    creator_id = str(existing.get("creatorId") or "")
    is_creator = creator_id == user_id
    is_admin = user_role == "admin"

    # Count existing applications for this conference
    apps_count = await db.applications.count_documents(
        {"conferenceId": str(existing.get("_id") or existing.get("id"))}
    )

    accepted_coords = [str(c) for c in existing.get("acceptedCoordinators", []) if str(c) != user_id]

    # Non-creator coordinator OR creator where others accepted/applied -> Unlink/Withdraw
    if not is_admin and (not is_creator or (len(accepted_coords) > 0 or apps_count > 0)):
        # Remove user's assigned sections from targetSections
        current_target_secs = existing.get("targetSections", [])
        new_target_secs = [s for s in current_target_secs if s not in user_sections]

        await db.conferences.update_one(
            query,
            {
                "$set": {"targetSections": new_target_secs},
                "$pull": {"acceptedCoordinators": user_id},
                "$addToSet": {"declinedCoordinators": user_id},
            },
        )
        return {
            "success": True,
            "unlinked": True,
            "message": f'Conference "{existing.get("shortName")}" unlinked from your students. Other cohorts remain unaffected.',
        }

    # Otherwise (Admin or creator with 0 other coordinators and 0 applications) -> Permanent deletion
    await db.conferences.delete_one(query)
    return {
        "success": True,
        "unlinked": False,
        "message": f'Conference "{existing.get("shortName")}" has been permanently removed.',
    }


@router.patch("/{conf_id}/archive")
async def archive_conference(
    conf_id: str,
    current_user: dict = Depends(require_admin),
):
    db = get_database()
    try:
        obj_id = ObjectId(conf_id)
        query = {"_id": obj_id}
    except Exception:
        query = {"id": conf_id}

    existing = await db.conferences.find_one(query)
    if not existing:
        raise HTTPException(status_code=404, detail="Conference not found")

    await db.conferences.update_one(query, {"$set": {"status": "Archived"}})
    return {"success": True, "message": f'Conference "{existing.get("shortName")}" has been archived.'}


@router.post("/import-bulk")
async def import_conferences_bulk(
    payload: BulkConferenceImportRequest,
    current_user: dict = Depends(require_coordinator_or_admin),
):
    db = get_database()
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    user_id = str(current_user.get("_id") or current_user.get("id"))
    user_role = (current_user.get("role") or "admin").lower()

    existing_cursor = db.conferences.find({"status": {"$ne": "Archived"}})
    existing_conferences = []
    async for c in existing_cursor:
        existing_conferences.append(c)

    imported_count = 0
    to_insert = []

    for row in payload.conferences:
        fn = str(row.get("fullName") or "").strip()
        sn = str(row.get("shortName") or "").strip()
        link = str(row.get("applicationLink") or "").strip()
        venue = str(row.get("venue") or "").strip() or None
        dates = str(row.get("dates") or "").strip() or None

        if not fn or not sn:
            continue

        # Check duplicate
        if any(is_duplicate_conference(ec, fn, sn, link, venue, dates) for ec in existing_conferences):
            continue

        clean_deadline = normalize_date(row.get("deadline", ""))
        new_doc = {
            "fullName": fn,
            "shortName": sn,
            "applicationLink": link,
            "deadline": clean_deadline,
            "venue": venue,
            "dates": dates,
            "createdBy": current_user.get("name", "Admin"),
            "creatorRole": user_role,
            "creatorId": user_id,
            "creatorEmail": current_user.get("email"),
            "createdAt": today_str,
            "scope": row.get("scope", "global"),
            "targetSections": row.get("targetSections", []),
            "targetStudents": row.get("targetStudents", []),
            "acceptedCoordinators": [user_id] if user_role in ["coordinator", "mentor"] else [],
            "declinedCoordinators": [],
            "editHistory": [],
            "status": "Expired" if is_past_deadline(clean_deadline) else "Active",
        }
        to_insert.append(new_doc)
        existing_conferences.append(new_doc)
        imported_count += 1

    if to_insert:
        await db.conferences.insert_many(to_insert)

    return {
        "success": True,
        "importedCount": imported_count,
        "totalSubmitted": len(payload.conferences),
    }


@router.get("/{conf_id}/tracking")
async def get_conference_tracking(
    conf_id: str,
    current_user: dict = Depends(require_coordinator_or_admin),
):
    db = get_database()
    try:
        obj_id = ObjectId(conf_id)
        query = {"_id": obj_id}
    except Exception:
        query = {"id": conf_id}

    conf_doc = await db.conferences.find_one(query)
    if not conf_doc:
        raise HTTPException(status_code=404, detail="Conference not found")

    conf = format_conf_doc(conf_doc)
    is_conf_expired = is_past_deadline(conf["deadline"]) or conf["status"] == "Expired"

    # Eligible active students
    student_query = {"status": "Active"}
    if conf["scope"] == "targeted" and conf.get("targetSections"):
        student_query["section"] = {"$in": conf["targetSections"]}

    eligible_cursor = db.students.find(student_query)
    eligible_students = []
    async for s in eligible_cursor:
        eligible_students.append(
            {
                "id": str(s.get("_id") or s.get("id")),
                "name": s.get("name", ""),
                "rollNumber": s.get("rollNumber", ""),
                "phoneNumber": s.get("phoneNumber", ""),
                "email": s.get("email", ""),
                "section": s.get("section", ""),
                "academicYear": s.get("academicYear", ""),
            }
        )

    # Fetch applications for this conference
    app_cursor = db.applications.find({"conferenceId": conf["id"]})
    apps_by_roll = {}
    apps_by_id = {}
    async for a in app_cursor:
        app_item = {
            "appliedAt": a.get("appliedAt"),
            "screenshotProof": a.get("screenshotProof"),
            "proofFileName": a.get("proofFileName"),
            "cloudinaryPublicId": a.get("cloudinaryPublicId"),
        }
        if a.get("rollNumber"):
            apps_by_roll[a["rollNumber"]] = app_item
        if a.get("studentId"):
            apps_by_id[a["studentId"]] = app_item

    student_roster = []
    applied_count = 0
    pending_count = 0
    expired_not_applied_count = 0

    for s in eligible_students:
        app = apps_by_roll.get(s["rollNumber"]) or apps_by_id.get(s["id"])
        if app:
            status_val = "Applied"
            applied_count += 1
        elif is_conf_expired:
            status_val = "Expired Not Applied"
            expired_not_applied_count += 1
        else:
            status_val = "Pending"
            pending_count += 1

        student_roster.append(
            {
                "id": s["id"],
                "name": s["name"],
                "rollNumber": s["rollNumber"],
                "phoneNumber": s["phoneNumber"],
                "email": s["email"],
                "section": s["section"],
                "academicYear": s["academicYear"],
                "status": status_val,
                "appliedAt": app["appliedAt"] if app else None,
                "screenshotProof": app["screenshotProof"] if app else None,
                "proofFileName": app["proofFileName"] if app else None,
                "cloudinaryPublicId": app.get("cloudinaryPublicId") if app else None,
            }
        )

    eligible_count = len(student_roster)
    completion_pct = round((applied_count / eligible_count) * 100, 1) if eligible_count > 0 else 0.0

    return {
        "conference": conf,
        "eligibleCount": eligible_count,
        "appliedCount": applied_count,
        "pendingCount": pending_count,
        "expiredNotAppliedCount": expired_not_applied_count,
        "completionPercentage": completion_pct,
        "students": student_roster,
    }
