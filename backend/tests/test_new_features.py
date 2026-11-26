import os
import sys
import uuid
import pytest
from httpx import AsyncClient, ASGITransport

# Set test environment
os.environ["APP_ENV"] = "test"
os.environ["MONGODB_URI"] = "mongodb+mock://localhost:27017"
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.database.connection import get_database, connect_to_mongo
from app.database.indexes import init_indexes
from app.services.otp_service import (
    request_otp,
    verify_otp,
    consume_reset_token,
    hash_otp,
)
from app.services.cloudinary_service import validate_image_file


@pytest.fixture(scope="function")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="function", autouse=True)
async def setup_test_db():
    await connect_to_mongo()
    await init_indexes()


@pytest.mark.anyio
async def test_otp_security_rules_and_lifecycle():
    """
    Tests:
    1. 6-digit OTP generation and secure hashing
    2. 60-second resend cooldown
    3. Wrong attempts counter (5 maximum) and invalidation
    4. Successful verification returns single-use resetToken
    5. Single-use resetToken consumption
    """
    db = get_database()
    test_email = f"student_{uuid.uuid4().hex[:6]}@college.edu"

    # Step 1: Request OTP
    success, msg, cooldown = await request_otp(test_email, purpose="forgot_password", user_name="Test Student")
    assert success is True
    assert cooldown == 60

    # Retrieve stored record to test exact hash comparison
    otp_doc = await db["otps"].find_one({"email": test_email, "purpose": "forgot_password"})
    assert otp_doc is not None
    assert "otpHash" in otp_doc
    assert otp_doc["attempts"] == 0

    # Step 2: Attempt immediate resend (cooldown should reject)
    with pytest.raises(Exception) as excinfo:
        await request_otp(test_email, purpose="forgot_password", user_name="Test Student")
    assert "Please wait" in str(excinfo.value) or "cooldown" in str(excinfo.value)

    # Step 3: Test wrong attempts counter with a different purpose / email
    test_email_wrong = f"wrong_{uuid.uuid4().hex[:6]}@college.edu"
    await request_otp(test_email_wrong, purpose="change_password")

    # 4 wrong attempts
    for attempt in range(1, 5):
        with pytest.raises(Exception) as exc:
            await verify_otp(test_email_wrong, "999999", purpose="change_password")
        assert "attempt(s) remaining" in str(exc.value)

    # 5th wrong attempt should exceed limit and invalidate
    with pytest.raises(Exception) as exc5:
        await verify_otp(test_email_wrong, "999999", purpose="change_password")
    assert "invalidated" in str(exc5.value) or "Too many incorrect attempts" in str(exc5.value)

    # Step 4: Successful verification on the first email yields resetToken
    # Store a known code to test verification
    raw_code = "654321"
    await db["otps"].update_one(
        {"email": test_email, "purpose": "forgot_password"},
        {"$set": {"otpHash": hash_otp(raw_code, test_email)}}
    )

    reset_token = await verify_otp(test_email, raw_code, purpose="forgot_password")
    assert reset_token is not None
    assert len(reset_token) > 16

    # OTP doc should be deleted immediately upon successful verification
    assert await db["otps"].find_one({"email": test_email, "purpose": "forgot_password"}) is None

    # Step 5: Consume single-use resetToken
    consumed_email = await consume_reset_token(reset_token)
    assert consumed_email == test_email

    # Attempting to reuse the consumed token must fail
    with pytest.raises(Exception) as exc_reuse:
        await consume_reset_token(reset_token)
    assert "already used" in str(exc_reuse.value) or "Invalid" in str(exc_reuse.value)


@pytest.mark.anyio
async def test_cloudinary_file_validation():
    """
    Tests file format and file size institutional threshold validation.
    """
    # Valid PNG (1KB)
    validate_image_file("screenshot.png", 1024)

    # Valid JPEG (500KB)
    validate_image_file("receipt.jpg", 500 * 1024)

    # Invalid extension (.exe)
    with pytest.raises(Exception) as exc_ext:
        validate_image_file("virus.exe", 1024)
    assert "Invalid file format" in str(exc_ext.value)

    # Oversized file (> 5MB)
    with pytest.raises(Exception) as exc_size:
        validate_image_file("huge.png", 6 * 1024 * 1024)
    assert "exceeds maximum allowed size" in str(exc_size.value)


@pytest.mark.anyio
async def test_conference_sharing_cross_coordinator_flow():
    """
    Tests Feature 4 end-to-end:
    1. Coordinator A posts a conference targeted to Section A.
    2. Coordinator B queries /conferences/suggestions -> Sees Coordinator A's conference.
    3. Coordinator B accepts the suggestion -> Section B is added to targetSections.
    4. Student from Section A and Section B see the conference; Student from Section C does NOT.
    5. Unlink/Withdraw model: Coordinator B withdraws -> Section B removed, Section A remains intact.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        db = get_database()

        # Seed 2 Coordinators
        coord_a_id = str(uuid.uuid4().hex)
        coord_b_id = str(uuid.uuid4().hex)

        coord_a = {
            "_id": coord_a_id,
            "id": coord_a_id,
            "email": f"coord_a_{uuid.uuid4().hex[:4]}@college.edu",
            "name": "Dr. Coordinator A",
            "role": "coordinator",
            "assignedSections": ["SEC-ALPHA"],
            "status": "Active",
        }
        coord_b = {
            "_id": coord_b_id,
            "id": coord_b_id,
            "email": f"coord_b_{uuid.uuid4().hex[:4]}@college.edu",
            "name": "Dr. Coordinator B",
            "role": "coordinator",
            "assignedSections": ["SEC-BETA"],
            "status": "Active",
        }
        await db.coordinators.insert_many([coord_a, coord_b])

        from app.core.security import create_access_token
        token_coord_a = create_access_token(coord_a["email"], "coordinator", coord_a_id)
        token_coord_b = create_access_token(coord_b["email"], "coordinator", coord_b_id)

        headers_a = {"Authorization": f"Bearer {token_coord_a}"}
        headers_b = {"Authorization": f"Bearer {token_coord_b}"}

        # Step 1: Coordinator A posts a conference
        conf_short = f"TCONF_{uuid.uuid4().hex[:4].upper()}"
        conf_payload = {
            "fullName": f"International Conference on Distributed Systems {conf_short}",
            "shortName": conf_short,
            "applicationLink": f"https://cmt3.research.microsoft.com/{conf_short.lower()}",
            "deadline": "2026-12-31",
            "venue": "Campus Auditorium",
            "dates": "Dec 20-22, 2026",
            "scope": "targeted",
            "targetSections": ["SEC-ALPHA"],
        }
        res_create = await client.post("/api/conferences", json=conf_payload, headers=headers_a)
        assert res_create.status_code == 201
        conf_id = res_create.json()["id"]

        # Step 2: Coordinator B checks suggestions
        res_sugg = await client.get("/api/conferences/suggestions", headers=headers_b)
        assert res_sugg.status_code == 200
        sugg_list = res_sugg.json()
        matching = [s for s in sugg_list if s["id"] == conf_id]
        assert len(matching) == 1
        assert matching[0]["createdBy"] == "Dr. Coordinator A"

        # Step 3: Coordinator B accepts the suggestion
        res_accept = await client.post(f"/api/conferences/{conf_id}/accept", headers=headers_b)
        assert res_accept.status_code == 200
        assert res_accept.json()["success"] is True

        # Now suggestions for Coordinator B should no longer contain this conference
        res_sugg_after = await client.get("/api/conferences/suggestions", headers=headers_b)
        assert not any(s["id"] == conf_id for s in res_sugg_after.json())

        # Step 4: Verify Student Visibility Filtering on backend
        student_alpha_id = str(uuid.uuid4().hex)
        student_beta_id = str(uuid.uuid4().hex)
        student_gamma_id = str(uuid.uuid4().hex)

        await db.students.insert_many([
            {"_id": student_alpha_id, "id": student_alpha_id, "email": f"a_{uuid.uuid4().hex[:4]}@college.edu", "rollNumber": f"A_{uuid.uuid4().hex[:4]}", "name": "Student A", "section": "SEC-ALPHA", "status": "Active"},
            {"_id": student_beta_id, "id": student_beta_id, "email": f"b_{uuid.uuid4().hex[:4]}@college.edu", "rollNumber": f"B_{uuid.uuid4().hex[:4]}", "name": "Student B", "section": "SEC-BETA", "status": "Active"},
            {"_id": student_gamma_id, "id": student_gamma_id, "email": f"c_{uuid.uuid4().hex[:4]}@college.edu", "rollNumber": f"C_{uuid.uuid4().hex[:4]}", "name": "Student C", "section": "SEC-GAMMA", "status": "Active"},
        ])

        token_student_a = create_access_token("A101", "student", student_alpha_id)
        token_student_b = create_access_token("B101", "student", student_beta_id)
        token_student_c = create_access_token("C101", "student", student_gamma_id)

        # Student A sees it
        res_st_a = await client.get("/api/conferences", headers={"Authorization": f"Bearer {token_student_a}"})
        assert any(c["id"] == conf_id for c in res_st_a.json())

        # Student B sees it (accepted by Coordinator B)
        res_st_b = await client.get("/api/conferences", headers={"Authorization": f"Bearer {token_student_b}"})
        assert any(c["id"] == conf_id for c in res_st_b.json())

        # Student C from SEC-GAMMA does NOT see it
        res_st_c = await client.get("/api/conferences", headers={"Authorization": f"Bearer {token_student_c}"})
        assert not any(c["id"] == conf_id for c in res_st_c.json())

        # Step 5: Unlink/Withdraw Model
        # Coordinator B withdraws the conference
        res_withdraw = await client.delete(f"/api/conferences/{conf_id}", headers=headers_b)
        assert res_withdraw.status_code == 200
        assert res_withdraw.json()["unlinked"] is True

        # Now Student B can no longer see it
        res_st_b_after = await client.get("/api/conferences", headers={"Authorization": f"Bearer {token_student_b}"})
        assert not any(c["id"] == conf_id for c in res_st_b_after.json())

        # But Student A STILL sees it!
        res_st_a_after = await client.get("/api/conferences", headers={"Authorization": f"Bearer {token_student_a}"})
        assert any(c["id"] == conf_id for c in res_st_a_after.json())
