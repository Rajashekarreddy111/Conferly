import re
from typing import List, Optional
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, status, Query
from app.database.connection import get_database
from app.core.dependencies import get_current_user, require_admin, require_coordinator_or_admin
from app.core.date_utils import normalize_date, is_past_deadline
from app.schemas.conferences import (
    ConferenceCreate,
    ConferenceUpdate,
    DuplicateCheckRequest,
    DuplicateCheckResponse,
    BulkConferenceImportRequest
)

router = APIRouter(prefix="/conferences", tags=["Conferences"])

def normalize_str(s: Optional[str]) -> str:
    return str(s or "").strip().lower()

def format_conf_doc(doc: dict) -> dict:
    conf_id = str(doc.get("_id") or doc.get("id"))
    deadline = normalize_date(doc.get("deadline", ""))
    
    # Status calculation
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
        "createdAt": doc.get("createdAt", ""),
        "scope": doc.get("scope", "global"),
        "targetSections": doc.get("targetSections", []),
        "targetStudents": doc.get("targetStudents", []),
        "status": final_status,
    }

@router.get("", response_model=List[dict])
async def get_conferences(
    status_filter: Optional[str] = Query(None, alias="status")
):
    db = get_database()
    cursor = db.conferences.find()
    conferences = []
    async for doc in cursor:
        conf = format_conf_doc(doc)
        if status_filter:
            if conf["status"].lower() == status_filter.lower():
                conferences.append(conf)
        else:
            conferences.append(conf)
    return conferences

@router.post("/check-duplicate", response_model=DuplicateCheckResponse)
async def check_duplicate(payload: DuplicateCheckRequest):
    db = get_database()
    norm_full = normalize_str(payload.fullName)
    norm_short = normalize_str(payload.shortName)
    
    query = {}
    if payload.excludeId:
        try:
            query["_id"] = {"$ne": ObjectId(payload.excludeId)}
        except Exception:
            query["_id"] = {"$ne": payload.excludeId}
            
    cursor = db.conferences.find(query)
    async for doc in cursor:
        doc_full = normalize_str(doc.get("fullName"))
        doc_short = normalize_str(doc.get("shortName"))
        if doc_full == norm_full and doc_short == norm_short:
            existing = format_conf_doc(doc)
            return DuplicateCheckResponse(
                isDuplicate=True,
                existingConference=existing,
                message=f'A conference matching both full name and short name already exists: "{existing["fullName"]}" ({existing["shortName"]}), created by {existing["createdBy"]}.'
            )
            
    return DuplicateCheckResponse(isDuplicate=False, existingConference=None, message=None)

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_conference(
    conf_in: ConferenceCreate,
    current_user: dict = Depends(require_coordinator_or_admin)
):
    db = get_database()
    norm_full = normalize_str(conf_in.fullName)
    norm_short = normalize_str(conf_in.shortName)

    # Check duplicate
    cursor = db.conferences.find()
    async for doc in cursor:
        if normalize_str(doc.get("fullName")) == norm_full and normalize_str(doc.get("shortName")) == norm_short:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'A conference matching both full name and short name already exists: "{doc.get("fullName")}" ({doc.get("shortName")}).'
            )

    clean_deadline = normalize_date(conf_in.deadline)
    from datetime import datetime, timezone
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    new_doc = {
        "fullName": conf_in.fullName.strip(),
        "shortName": conf_in.shortName.strip(),
        "applicationLink": conf_in.applicationLink.strip(),
        "deadline": clean_deadline,
        "createdBy": current_user.get("name") or conf_in.creatorName or "Admin",
        "creatorRole": current_user.get("role") or conf_in.creatorRole or "admin",
        "createdAt": today_str,
        "scope": conf_in.scope,
        "targetSections": conf_in.targetSections if conf_in.scope == "targeted" else [],
        "targetStudents": conf_in.targetStudents or [],
        "status": "Expired" if is_past_deadline(clean_deadline) else "Active"
    }

    result = await db.conferences.insert_one(new_doc)
    new_doc["_id"] = result.inserted_id
    return format_conf_doc(new_doc)

@router.put("/{conf_id}")
async def update_conference(
    conf_id: str,
    conf_in: ConferenceUpdate,
    current_user: dict = Depends(require_coordinator_or_admin)
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

    norm_full = normalize_str(conf_in.fullName)
    norm_short = normalize_str(conf_in.shortName)

    # Check duplicate excluding current
    cursor = db.conferences.find({"_id": {"$ne": existing["_id"]}})
    async for doc in cursor:
        if normalize_str(doc.get("fullName")) == norm_full and normalize_str(doc.get("shortName")) == norm_short:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'A conference matching both full name and short name already exists: "{doc.get("fullName")}" ({doc.get("shortName")}).'
            )

    clean_deadline = normalize_date(conf_in.deadline)
    update_data = {
        "fullName": conf_in.fullName.strip(),
        "shortName": conf_in.shortName.strip(),
        "applicationLink": conf_in.applicationLink.strip(),
        "deadline": clean_deadline,
        "scope": conf_in.scope,
        "targetSections": conf_in.targetSections if conf_in.scope == "targeted" else [],
        "targetStudents": conf_in.targetStudents or [],
    }

    if existing.get("status") != "Archived":
        update_data["status"] = "Expired" if is_past_deadline(clean_deadline) else "Active"

    await db.conferences.update_one(query, {"$set": update_data})
    updated_doc = await db.conferences.find_one(query)
    return format_conf_doc(updated_doc)

@router.patch("/{conf_id}/archive")
async def archive_conference(
    conf_id: str,
    current_user: dict = Depends(require_admin)
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
    current_user: dict = Depends(require_coordinator_or_admin)
):
    db = get_database()
    from datetime import datetime, timezone
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Fetch existing conferences for fast duplicate matching
    existing_cursor = db.conferences.find()
    existing_pairs = set()
    async for c in existing_cursor:
        existing_pairs.add((normalize_str(c.get("fullName")), normalize_str(c.get("shortName"))))

    imported_count = 0
    to_insert = []

    for row in payload.conferences:
        fn = str(row.get("fullName") or "").strip()
        sn = str(row.get("shortName") or "").strip()
        pair = (normalize_str(fn), normalize_str(sn))
        if not fn or not sn or pair in existing_pairs:
            continue
            
        clean_deadline = normalize_date(row.get("deadline", ""))
        new_doc = {
            "fullName": fn,
            "shortName": sn,
            "applicationLink": str(row.get("applicationLink") or "").strip(),
            "deadline": clean_deadline,
            "createdBy": current_user.get("name", "Admin"),
            "creatorRole": current_user.get("role", "admin"),
            "createdAt": today_str,
            "scope": row.get("scope", "global"),
            "targetSections": row.get("targetSections", []),
            "targetStudents": row.get("targetStudents", []),
            "status": "Expired" if is_past_deadline(clean_deadline) else "Active"
        }
        to_insert.append(new_doc)
        existing_pairs.add(pair)
        imported_count += 1

    if to_insert:
        await db.conferences.insert_many(to_insert)

    return {
        "success": True,
        "importedCount": imported_count,
        "totalSubmitted": len(payload.conferences)
    }

@router.get("/{conf_id}/tracking")
async def get_conference_tracking(
    conf_id: str,
    current_user: dict = Depends(require_coordinator_or_admin)
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
        eligible_students.append({
            "id": str(s.get("_id") or s.get("id")),
            "name": s.get("name", ""),
            "rollNumber": s.get("rollNumber", ""),
            "phoneNumber": s.get("phoneNumber", ""),
            "email": s.get("email", ""),
            "section": s.get("section", ""),
            "academicYear": s.get("academicYear", "")
        })

    # Fetch applications for this conference
    app_cursor = db.applications.find({"conferenceId": conf["id"]})
    apps_by_roll = {}
    apps_by_id = {}
    async for a in app_cursor:
        app_item = {
            "appliedAt": a.get("appliedAt"),
            "screenshotProof": a.get("screenshotProof"),
            "proofFileName": a.get("proofFileName")
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

        student_roster.append({
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
            "proofFileName": app["proofFileName"] if app else None
        })

    eligible_count = len(student_roster)
    completion_pct = round((applied_count / eligible_count) * 100, 1) if eligible_count > 0 else 0.0

    return {
        "conference": conf,
        "eligibleCount": eligible_count,
        "appliedCount": applied_count,
        "pendingCount": pending_count,
        "expiredNotAppliedCount": expired_not_applied_count,
        "completionPercentage": completion_pct,
        "students": student_roster
    }
