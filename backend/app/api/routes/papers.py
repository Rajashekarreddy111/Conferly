import re
import uuid
from typing import Optional, List, Dict
from datetime import datetime, timezone
from bson import ObjectId
from pymongo.errors import DuplicateKeyError
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database.connection import get_database
from app.core.dependencies import get_current_user, require_coordinator_or_admin
from app.schemas.papers import (
    BasePaperSubmit,
    BasePaperResponse,
    MyPaperResponse,
    PaperTrackingStudentItem,
    PaperTrackingSummary,
    PaperTrackingResponse,
    FindRelatedPapersRequest,
    RelatedPaperResult,
    FindRelatedPapersResponse,
)
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/papers", tags=["Base Papers"])

STOP_WORDS = {
    "using", "for", "of", "the", "a", "an", "in", "on", "and", "with", "based",
    "to", "from", "by", "at", "is", "are", "was", "were", "via", "through",
    "into", "over", "under", "after", "before", "between", "about", "against",
    "as", "during", "without", "within", "because", "such", "each", "all",
    "both", "few", "more", "most", "other", "some", "it", "its", "or", "be",
    "been", "being", "have", "has", "had", "do", "does", "did", "but", "if",
    "then", "than", "so", "can", "could", "will", "would", "shall", "should",
    "may", "might", "must"
}

def normalize_title(title: str) -> str:
    """Collapses multiple spaces into a single space and converts to lowercase."""
    return " ".join(title.strip().split()).lower()

def format_title_display(title: str) -> str:
    """Collapses multiple spaces into a single space, preserving casing."""
    return " ".join(title.strip().split())

async def get_student_record(user: dict, db) -> dict:
    """Fetches the complete student document associated with the logged-in user."""
    student_id = str(user.get("_id") or user.get("id"))
    roll = user.get("rollNumber")
    email = user.get("email")

    query = []
    if roll:
        query.append({"rollNumber": roll})
    if email:
        query.append({"email": email})
    if ObjectId.is_valid(student_id):
        query.append({"_id": ObjectId(student_id)})
    query.append({"id": student_id})

    student = await db["students"].find_one({"$or": query})
    if not student:
        # Fallback to current_user fields
        return {
            "id": student_id,
            "rollNumber": roll or "",
            "name": user.get("name", ""),
            "section": user.get("section", ""),
            "academicYear": user.get("academicYear", ""),
        }
    return {
        "id": str(student.get("_id") or student.get("id")),
        "rollNumber": student.get("rollNumber", ""),
        "name": student.get("name", ""),
        "section": student.get("section", ""),
        "academicYear": student.get("academicYear", ""),
    }

# =========================================================================
# FEATURE 1: Student Endpoints - Base Paper Title
# =========================================================================

@router.get("/my-paper", response_model=MyPaperResponse)
async def get_my_paper(current_user: dict = Depends(get_current_user)):
    """Retrieves the base paper title for the currently authenticated student."""
    role = (current_user.get("role") or "").lower()
    if role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students have an assigned base paper title."
        )

    db = get_database()
    student = await get_student_record(current_user, db)
    roll = student["rollNumber"]

    paper = await db["base_papers"].find_one({"rollNumber": roll})
    if not paper:
        return MyPaperResponse(hasPaper=False, paper=None)

    return MyPaperResponse(
        hasPaper=True,
        paper=BasePaperResponse(
            id=str(paper.get("_id") or paper.get("id") or paper.get("paperId")),
            paperId=paper.get("paperId", ""),
            title=paper.get("title", ""),
            rollNumber=paper.get("rollNumber", ""),
            studentName=paper.get("studentName", ""),
            section=paper.get("section", ""),
            academicYear=paper.get("academicYear", ""),
            createdAt=paper.get("createdAt"),
            updatedAt=paper.get("updatedAt")
        )
    )

@router.post("/my-paper", status_code=status.HTTP_201_CREATED)
async def submit_my_paper(req: BasePaperSubmit, current_user: dict = Depends(get_current_user)):
    """
    Submits or updates a student's base paper title.
    Enforces normalized case-insensitive duplicate check across all other students.
    """
    role = (current_user.get("role") or "").lower()
    if role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can submit a base paper title."
        )

    db = get_database()
    student = await get_student_record(current_user, db)
    roll = student["rollNumber"]
    if not roll:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student profile is missing a valid roll number."
        )

    clean_title = format_title_display(req.title)
    if len(clean_title) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Base paper title must be at least 3 characters long."
        )
    if len(clean_title) > 400:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Base paper title cannot exceed 400 characters."
        )

    norm_title = normalize_title(clean_title)

    # 1. Pre-check if title is taken by another student
    existing_other = await db["base_papers"].find_one({
        "normalizedTitle": norm_title,
        "rollNumber": {"$ne": roll}
    })
    if existing_other:
        owner_name = existing_other.get("studentName") or "another student"
        owner_roll = existing_other.get("rollNumber") or "N/A"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This paper title is already taken by {owner_name} (Roll No: {owner_roll})."
        )

    now = datetime.now(timezone.utc)
    existing_my_paper = await db["base_papers"].find_one({"rollNumber": roll})

    try:
        if existing_my_paper:
            # Update existing paper title
            paper_id = existing_my_paper.get("paperId")
            await db["base_papers"].update_one(
                {"rollNumber": roll},
                {
                    "$set": {
                        "title": clean_title,
                        "normalizedTitle": norm_title,
                        "studentName": student["name"],
                        "section": student["section"],
                        "academicYear": student["academicYear"],
                        "updatedAt": now
                    }
                }
            )
            # Synchronize with students collection
            await db["students"].update_one(
                {"rollNumber": roll},
                {
                    "$set": {
                        "paperId": paper_id,
                        "paperTitle": clean_title,
                        "normalizedTitle": norm_title,
                        "paperUpdatedAt": now
                    }
                }
            )
            return {
                "message": "Base paper title updated successfully.",
                "paper": {
                    "id": str(existing_my_paper.get("_id") or paper_id),
                    "paperId": paper_id,
                    "title": clean_title,
                    "rollNumber": roll,
                    "studentName": student["name"],
                    "section": student["section"],
                    "academicYear": student["academicYear"],
                    "updatedAt": now
                }
            }
        else:
            # Generate new unique Paper ID
            paper_id = f"PID-{uuid.uuid4().hex[:6].upper()}"
            doc = {
                "paperId": paper_id,
                "studentId": student["id"],
                "rollNumber": roll,
                "studentName": student["name"],
                "section": student["section"],
                "academicYear": student["academicYear"],
                "title": clean_title,
                "normalizedTitle": norm_title,
                "createdAt": now,
                "updatedAt": now
            }
            res = await db["base_papers"].insert_one(doc)

            # Synchronize with students collection
            await db["students"].update_one(
                {"rollNumber": roll},
                {
                    "$set": {
                        "paperId": paper_id,
                        "paperTitle": clean_title,
                        "normalizedTitle": norm_title,
                        "paperSubmittedAt": now,
                        "paperUpdatedAt": now
                    }
                }
            )

            return {
                "message": "Base paper title added successfully.",
                "paper": {
                    "id": str(res.inserted_id),
                    "paperId": paper_id,
                    "title": clean_title,
                    "rollNumber": roll,
                    "studentName": student["name"],
                    "section": student["section"],
                    "academicYear": student["academicYear"],
                    "createdAt": now,
                    "updatedAt": now
                }
            }

    except DuplicateKeyError:
        # Handle concurrent race condition when two students submit simultaneously
        conflict = await db["base_papers"].find_one({
            "normalizedTitle": norm_title,
            "rollNumber": {"$ne": roll}
        })
        if conflict:
            owner_name = conflict.get("studentName") or "another student"
            owner_roll = conflict.get("rollNumber") or "N/A"
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"This paper title is already taken by {owner_name} (Roll No: {owner_roll})."
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A conflict occurred while registering this base paper title. Please try again."
        )

@router.put("/my-paper")
async def update_my_paper(req: BasePaperSubmit, current_user: dict = Depends(get_current_user)):
    """Explicit PUT endpoint matching POST update logic."""
    return await submit_my_paper(req, current_user)

# =========================================================================
# FEATURE 2: Super Admin & Coordinator - Paper Title Tracking
# =========================================================================

@router.get("/tracking", response_model=PaperTrackingResponse)
async def get_paper_tracking(
    section: Optional[str] = None,
    academicYear: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None, alias="q"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(require_coordinator_or_admin)
):
    """
    Returns student paper tracking list with server-enforced role scope,
    composite filters, search, and dynamic summary counts.
    """
    db = get_database()
    user_role = (current_user.get("role") or "").lower()

    # Determine scope of sections
    if user_role in ["coordinator", "mentor"]:
        allowed_sections = current_user.get("assignedSections", [])
    else:
        # Admin / Super Admin: check if admin has specific assignedSections; otherwise all
        admin_sections = current_user.get("assignedSections")
        allowed_sections = admin_sections if (admin_sections and len(admin_sections) > 0) else None

    # Base scope query
    base_query = {}
    if allowed_sections is not None:
        base_query["section"] = {"$in": allowed_sections}

    # Available sections and academic years for dropdowns within user scope
    all_scoped_students = await db["students"].find(base_query, {"section": 1, "academicYear": 1}).to_list(5000)
    avail_sections = sorted(list(set(s.get("section") for s in all_scoped_students if s.get("section"))))
    avail_years = sorted(list(set(s.get("academicYear") for s in all_scoped_students if s.get("academicYear"))), reverse=True)

    # Apply Section Filter
    filtered_query = dict(base_query)
    if section and section.strip() and section != "all":
        sec_clean = section.strip()
        if allowed_sections is not None and sec_clean not in allowed_sections:
            return PaperTrackingResponse(
                summary=PaperTrackingSummary(totalStudents=0, selectedCount=0, notSelectedCount=0),
                students=[],
                availableSections=avail_sections,
                availableAcademicYears=avail_years,
                total=0,
                page=page,
                limit=limit,
                totalPages=1
            )
        filtered_query["section"] = sec_clean

    # Apply Academic Year Filter
    if academicYear and academicYear.strip() and academicYear != "all":
        filtered_query["academicYear"] = academicYear.strip()

    # Fetch all students matching section & academic year to compute accurate summary cards
    students_in_filter = await db["students"].find(filtered_query).to_list(10000)
    total_students = len(students_in_filter)

    # Fetch paper records for roll numbers in this set to ensure real-time accuracy
    rolls = [s.get("rollNumber") for s in students_in_filter if s.get("rollNumber")]
    paper_map = {}
    if rolls:
        papers_cursor = db["base_papers"].find({"rollNumber": {"$in": rolls}})
        async for p in papers_cursor:
            paper_map[p.get("rollNumber")] = p

    selected_count = 0
    not_selected_count = 0
    for s in students_in_filter:
        r = s.get("rollNumber")
        has_paper = (r in paper_map) or bool(s.get("paperTitle") or s.get("paperId"))
        if has_paper:
            selected_count += 1
        else:
            not_selected_count += 1

    # Filter by Selection Status
    filtered_list = []
    status_lower = (status_filter or "all").lower().strip()
    for s in students_in_filter:
        r = s.get("rollNumber")
        p = paper_map.get(r)
        has_paper = (p is not None) or bool(s.get("paperTitle") or s.get("paperId"))

        if status_lower == "selected" and not has_paper:
            continue
        if status_lower in ["not_selected", "not selected", "pending"] and has_paper:
            continue

        p_title = p.get("title") if p else s.get("paperTitle")
        p_id = p.get("paperId") if p else s.get("paperId")
        submitted_at_dt = (p.get("createdAt") or p.get("updatedAt")) if p else s.get("paperSubmittedAt")
        submitted_at_str = submitted_at_dt.isoformat() if isinstance(submitted_at_dt, datetime) else str(submitted_at_dt or "")

        filtered_list.append(
            PaperTrackingStudentItem(
                id=str(s.get("_id") or s.get("id")),
                rollNumber=s.get("rollNumber", ""),
                name=s.get("name", ""),
                section=s.get("section", ""),
                academicYear=s.get("academicYear", ""),
                status="Selected" if has_paper else "Not Selected",
                paperId=p_id if has_paper else None,
                paperTitle=p_title if has_paper else None,
                submittedAt=submitted_at_str if has_paper else None
            )
        )

    # Search by Name or Roll Number
    if search and search.strip():
        q_norm = search.strip().lower()
        filtered_list = [
            item for item in filtered_list
            if q_norm in item.name.lower() or q_norm in item.rollNumber.lower() or (item.paperTitle and q_norm in item.paperTitle.lower())
        ]

    # Sort students by rollNumber
    filtered_list.sort(key=lambda x: x.rollNumber)

    total_results = len(filtered_list)
    total_pages = max(1, (total_results + limit - 1) // limit)
    start_idx = (page - 1) * limit
    paginated_items = filtered_list[start_idx : start_idx + limit]

    return PaperTrackingResponse(
        summary=PaperTrackingSummary(
            totalStudents=total_students,
            selectedCount=selected_count,
            notSelectedCount=not_selected_count
        ),
        students=paginated_items,
        availableSections=avail_sections,
        availableAcademicYears=avail_years,
        total=total_results,
        page=page,
        limit=limit,
        totalPages=total_pages
    )

# =========================================================================
# FEATURE 3: Super Admin & Coordinator - Find Related Papers
# =========================================================================

@router.post("/find-related", response_model=FindRelatedPapersResponse)
async def find_related_papers(
    req: FindRelatedPapersRequest,
    current_user: dict = Depends(require_coordinator_or_admin)
):
    """
    Finds existing base papers related to the input title within user's role scope.
    Performs keyword extraction, whole-word matching, frequency counting,
    and calculates match score % = (matched keywords / total keywords) * 100.
    """
    raw_query = req.title.strip()
    if not raw_query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a paper title to search."
        )

    db = get_database()
    user_role = (current_user.get("role") or "").lower()

    # Determine scope
    if user_role in ["coordinator", "mentor"]:
        allowed_sections = current_user.get("assignedSections", [])
        scope_query = {"section": {"$in": allowed_sections}}
    else:
        admin_sections = current_user.get("assignedSections")
        if admin_sections and len(admin_sections) > 0:
            scope_query = {"section": {"$in": admin_sections}}
        else:
            scope_query = {}

    # 1. Normalize input and extract keywords
    clean_input = re.sub(r"[^\w\s-]", " ", raw_query.lower())
    raw_words = [w.strip() for w in clean_input.split() if w.strip()]

    # Filter stop words and single characters, preserve input order without duplicates
    keywords = []
    seen = set()
    for w in raw_words:
        if len(w) > 1 and w not in STOP_WORDS and w not in seen:
            seen.add(w)
            keywords.append(w)

    if not keywords:
        return FindRelatedPapersResponse(
            totalInputKeywords=0,
            keywords=[],
            keywordCounts={},
            results=[]
        )

    total_keywords_count = len(keywords)

    # 2. Compile whole-word regex patterns for each keyword
    regex_map = {
        kw: re.compile(rf"\b{re.escape(kw)}\b", re.IGNORECASE)
        for kw in keywords
    }
    keyword_counts: Dict[str, int] = {kw: 0 for kw in keywords}

    # 3. Retrieve all base papers within the user's scope
    papers_cursor = db["base_papers"].find(scope_query)
    papers = await papers_cursor.to_list(5000)

    matched_results: List[dict] = []

    for p in papers:
        paper_title = p.get("title", "")
        matched_kws = []

        for kw, pattern in regex_map.items():
            if pattern.search(paper_title):
                matched_kws.append(kw)
                keyword_counts[kw] += 1

        if matched_kws:
            score = round((len(matched_kws) / total_keywords_count) * 100, 1)
            submitted_at = p.get("createdAt") or p.get("updatedAt")
            submitted_at_str = submitted_at.isoformat() if isinstance(submitted_at, datetime) else str(submitted_at or "")

            matched_results.append({
                "paperId": p.get("paperId", ""),
                "paperTitle": paper_title,
                "rollNumber": p.get("rollNumber", ""),
                "studentName": p.get("studentName", ""),
                "section": p.get("section", ""),
                "academicYear": p.get("academicYear", ""),
                "matchedKeywords": matched_kws,
                "matchScore": score,
                "submittedAt": submitted_at_str
            })

    # 4. Sort results by match score descending, then by number of matched keywords, then alphabetically
    matched_results.sort(
        key=lambda x: (-x["matchScore"], -len(x["matchedKeywords"]), x["paperTitle"].lower(), x["studentName"].lower())
    )

    # 5. Assign 1-based ranks
    results = []
    for idx, item in enumerate(matched_results):
        results.append(
            RelatedPaperResult(
                rank=idx + 1,
                paperId=item["paperId"],
                paperTitle=item["paperTitle"],
                rollNumber=item["rollNumber"],
                studentName=item["studentName"],
                section=item["section"],
                academicYear=item["academicYear"],
                matchedKeywords=item["matchedKeywords"],
                matchScore=item["matchScore"],
                submittedAt=item["submittedAt"]
            )
        )

    return FindRelatedPapersResponse(
        totalInputKeywords=total_keywords_count,
        keywords=keywords,
        keywordCounts=keyword_counts,
        results=results
    )
