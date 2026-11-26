from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timezone
import logging
from fastapi import APIRouter, HTTPException, Depends, status, Query
from app.database.connection import get_database
from app.core.dependencies import get_current_user
from app.schemas.applications import ApplicationSubmitRequest
from app.services.cloudinary_service import delete_image_from_cloudinary

router = APIRouter(prefix="/applications", tags=["Applications"])
logger = logging.getLogger("conferly.applications")


def format_app_doc(doc: dict) -> dict:
    return {
        "id": str(doc.get("_id") or doc.get("id")),
        "conferenceId": str(doc.get("conferenceId", "")),
        "studentId": str(doc.get("studentId", "")),
        "rollNumber": doc.get("rollNumber", ""),
        "studentName": doc.get("studentName", ""),
        "section": doc.get("section", ""),
        "status": doc.get("status", "Applied"),
        "appliedAt": doc.get("appliedAt", ""),
        "screenshotProof": doc.get("screenshotProof", ""),
        "proofFileName": doc.get("proofFileName", ""),
        "cloudinaryPublicId": doc.get("cloudinaryPublicId"),
    }


@router.get("", response_model=List[dict])
async def get_applications(
    conferenceId: Optional[str] = Query(None),
    rollNumber: Optional[str] = Query(None),
    studentId: Optional[str] = Query(None),
):
    db = get_database()
    query = {}
    if conferenceId:
        query["conferenceId"] = conferenceId
    if rollNumber:
        query["rollNumber"] = rollNumber
    if studentId:
        query["studentId"] = studentId

    cursor = db.applications.find(query)
    results = []
    async for doc in cursor:
        results.append(format_app_doc(doc))
    return results


@router.post("/submit")
async def submit_application_proof(
    req: ApplicationSubmitRequest,
    current_user: dict = Depends(get_current_user),
):
    if not req.screenshotProof or not req.screenshotProof.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Screenshot proof is mandatory to mark conference application as applied.",
        )

    db = get_database()

    # Verify student section status if current user is student or from request
    roll = req.rollNumber or current_user.get("rollNumber")
    student_doc = await db.students.find_one({"rollNumber": roll})

    if student_doc:
        student_section = student_doc.get("section")
        if student_section:
            sec_doc = await db.sections.find_one({"sectionName": student_section})
            if sec_doc and sec_doc.get("status") == "Inactive":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Section '{student_section}' is deactivated. Application submissions are disabled.",
                )

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Find existing application for conference and student
    match_query = {
        "conferenceId": req.conferenceId,
        "$or": [
            {"rollNumber": roll},
            {"studentId": str(student_doc.get("_id")) if student_doc else req.studentId},
        ],
    }

    update_payload = {
        "conferenceId": req.conferenceId,
        "studentId": str(student_doc.get("_id")) if student_doc else (req.studentId or ""),
        "rollNumber": roll,
        "studentName": (student_doc.get("name") if student_doc else req.studentName)
        or current_user.get("name", ""),
        "section": (student_doc.get("section") if student_doc else req.section)
        or current_user.get("section", ""),
        "status": "Applied",
        "appliedAt": today_str,
        "screenshotProof": req.screenshotProof.strip(),
        "proofFileName": req.proofFileName or "proof_screenshot.png",
        "cloudinaryPublicId": req.cloudinaryPublicId,
    }

    existing_app = await db.applications.find_one(match_query)
    if existing_app:
        old_public_id = existing_app.get("cloudinaryPublicId")
        # If image was replaced with a new one, remove the old Cloudinary image
        if old_public_id and old_public_id != req.cloudinaryPublicId:
            try:
                await delete_image_from_cloudinary(old_public_id)
                logger.info("Deleted replaced Cloudinary asset: %s", old_public_id)
            except Exception as e:
                logger.warning("Could not delete previous Cloudinary asset %s: %s", old_public_id, e)

        await db.applications.update_one({"_id": existing_app["_id"]}, {"$set": update_payload})
        saved_doc = await db.applications.find_one({"_id": existing_app["_id"]})
    else:
        res = await db.applications.insert_one(update_payload)
        saved_doc = await db.applications.find_one({"_id": res.inserted_id})

    return format_app_doc(saved_doc)


@router.delete("/{application_id}")
async def delete_application(
    application_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    try:
        query = {"_id": ObjectId(application_id)}
    except Exception:
        query = {"_id": application_id}

    app_doc = await db.applications.find_one(query)
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")

    # If student, verify ownership
    if current_user.get("role") == "student":
        if app_doc.get("rollNumber") != current_user.get("rollNumber"):
            raise HTTPException(status_code=403, detail="Not authorized to delete this application")

    # Remove Cloudinary asset if present
    public_id = app_doc.get("cloudinaryPublicId")
    if public_id:
        await delete_image_from_cloudinary(public_id)

    await db.applications.delete_one(query)
    return {"message": "Application deleted successfully and image removed"}
