import os
import sys
import pytest
from httpx import AsyncClient, ASGITransport

# Set test environment
os.environ["APP_ENV"] = "test"
os.environ["MONGODB_URI"] = "mongodb+mock://localhost:27017"
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.security import hash_password
from app.database.connection import get_database, connect_to_mongo

@pytest.fixture(scope="function")
def anyio_backend():
    return 'asyncio'

@pytest.fixture(scope="function", autouse=True)
async def setup_test_papers_db():
    await connect_to_mongo()
    db = get_database()

    # Clear test collections
    await db.users.delete_many({})
    await db.students.delete_many({})
    await db.coordinators.delete_many({})
    await db.base_papers.delete_many({})
    await db.sections.delete_many({})
    await db.academic_years.delete_many({})

    # 1. Admin
    admin_hash = hash_password("Cse@1234")
    await db.users.insert_one({
        "username": "medurimounika4",
        "email": "medurimounika4@gmail.com",
        "name": "Mounika Meduri",
        "role": "admin",
        "passwordHash": admin_hash,
        "status": "Active"
    })

    # 2. Coordinator (Assigned to CSE-A)
    coord_hash = hash_password("CoordPass123")
    await db.coordinators.insert_one({
        "id": "coord-01",
        "email": "coord.csea@college.edu",
        "name": "Prof. Alan Turing",
        "role": "coordinator",
        "assignedSections": ["CSE-A"],
        "passwordHash": coord_hash,
        "status": "Active"
    })
    await db.users.insert_one({
        "email": "coord.csea@college.edu",
        "name": "Prof. Alan Turing",
        "role": "coordinator",
        "assignedSections": ["CSE-A"],
        "passwordHash": coord_hash,
        "status": "Active"
    })

    # 3. Student 1 in CSE-A
    stu1_hash = hash_password("StudentPass1")
    await db.students.insert_one({
        "rollNumber": "23C501",
        "name": "Alice Johnson",
        "email": "23c501@college.edu",
        "section": "CSE-A",
        "academicYear": "2025-2026",
        "passwordHash": stu1_hash,
        "status": "Active"
    })

    # 4. Student 2 in CSE-A
    stu2_hash = hash_password("StudentPass2")
    await db.students.insert_one({
        "rollNumber": "23C502",
        "name": "Bob Smith",
        "email": "23c502@college.edu",
        "section": "CSE-A",
        "academicYear": "2025-2026",
        "passwordHash": stu2_hash,
        "status": "Active"
    })

    # 5. Student 3 in CSE-B (Outside Alan's scope)
    stu3_hash = hash_password("StudentPass3")
    await db.students.insert_one({
        "rollNumber": "23C503",
        "name": "Charlie Brown",
        "email": "23c503@college.edu",
        "section": "CSE-B",
        "academicYear": "2025-2026",
        "passwordHash": stu3_hash,
        "status": "Active"
    })

@pytest.mark.anyio
async def test_feature_1_student_base_paper_submission_and_duplicate_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Login Student 1
        login1 = await client.post("/api/auth/login", json={
            "identifier": "23C501",
            "password": "StudentPass1",
            "role": "student"
        })
        assert login1.status_code == 200
        token1 = login1.json()["token"]
        headers1 = {"Authorization": f"Bearer {token1}"}

        # Check initial: no paper
        my_paper = await client.get("/api/papers/my-paper", headers=headers1)
        assert my_paper.status_code == 200
        assert my_paper.json()["hasPaper"] is False

        # Add title with multiple inner & edge spaces: "  Breast Cancer   Detection Using   Federated Learning  "
        submit_res = await client.post("/api/papers/my-paper", json={
            "title": "  Breast Cancer   Detection Using   Federated Learning  "
        }, headers=headers1)
        assert submit_res.status_code == 201
        p_data = submit_res.json()["paper"]
        assert p_data["title"] == "Breast Cancer Detection Using Federated Learning"
        assert p_data["paperId"].startswith("PID-")
        assert p_data["rollNumber"] == "23C501"

        # Verify get my-paper now has paper
        my_paper_after = await client.get("/api/papers/my-paper", headers=headers1)
        assert my_paper_after.status_code == 200
        assert my_paper_after.json()["hasPaper"] is True
        assert my_paper_after.json()["paper"]["title"] == "Breast Cancer Detection Using Federated Learning"

        # Student 2 logs in
        login2 = await client.post("/api/auth/login", json={
            "identifier": "23C502",
            "password": "StudentPass2",
            "role": "student"
        })
        assert login2.status_code == 200
        token2 = login2.json()["token"]
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Student 2 tries same title with different casing & spacing: "breast   cancer detection using federated   learning"
        dup_res = await client.post("/api/papers/my-paper", json={
            "title": "breast   cancer detection using federated   learning"
        }, headers=headers2)
        assert dup_res.status_code == 409
        err_detail = dup_res.json()["detail"]
        assert "This paper title is already taken by Alice Johnson (Roll No: 23C501)." in err_detail

        # Student 2 submits a unique title: "Quantum Computing for Optimization"
        sub2_res = await client.post("/api/papers/my-paper", json={
            "title": "Quantum Computing for Optimization"
        }, headers=headers2)
        assert sub2_res.status_code == 201

        # Student 1 edits their own title to slightly modified version
        edit_res = await client.post("/api/papers/my-paper", json={
            "title": "Breast Cancer Detection in Healthcare Using Federated Learning"
        }, headers=headers1)
        assert edit_res.status_code in (200, 201)
        assert edit_res.json()["paper"]["title"] == "Breast Cancer Detection in Healthcare Using Federated Learning"

@pytest.mark.anyio
async def test_feature_2_paper_title_tracking_scope_and_filters():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Alice (23C501, CSE-A) has paper, Bob (23C502, CSE-A) has paper, Charlie (23C503, CSE-B) has NO paper
        login1 = await client.post("/api/auth/login", json={"identifier": "23C501", "password": "StudentPass1", "role": "student"})
        await client.post("/api/papers/my-paper", json={"title": "Autonomous Drone Navigation"}, headers={"Authorization": f"Bearer {login1.json()['token']}"})

        # Coordinator (assigned only to CSE-A) logs in
        coord_login = await client.post("/api/auth/login", json={"identifier": "coord.csea@college.edu", "password": "CoordPass123", "role": "coordinator"})
        assert coord_login.status_code == 200
        coord_token = coord_login.json()["token"]
        coord_headers = {"Authorization": f"Bearer {coord_token}"}

        # Coordinator fetches tracking
        track_res = await client.get("/api/papers/tracking", headers=coord_headers)
        assert track_res.status_code == 200
        data = track_res.json()
        summary = data["summary"]
        # In CSE-A: 2 students total (Alice and Bob)
        assert summary["totalStudents"] == 2
        assert summary["selectedCount"] == 1
        assert summary["notSelectedCount"] == 1
        # Coordinator should NOT see Charlie (CSE-B)
        rolls = [s["rollNumber"] for s in data["students"]]
        assert "23C501" in rolls
        assert "23C502" in rolls
        assert "23C503" not in rolls

        # Filter by status "selected"
        selected_res = await client.get("/api/papers/tracking?status=selected", headers=coord_headers)
        assert selected_res.status_code == 200
        sel_students = selected_res.json()["students"]
        assert len(sel_students) == 1
        assert sel_students[0]["rollNumber"] == "23C501"
        assert sel_students[0]["paperTitle"] == "Autonomous Drone Navigation"

        # Admin logs in (Super Admin sees all students across CSE-A and CSE-B)
        admin_login = await client.post("/api/auth/login", json={"identifier": "medurimounika4@gmail.com", "password": "Cse@1234", "role": "admin"})
        assert admin_login.status_code == 200
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['token']}"}

        admin_track = await client.get("/api/papers/tracking", headers=admin_headers)
        assert admin_track.status_code == 200
        admin_data = admin_track.json()
        # Admin sees all 3 students
        assert admin_data["summary"]["totalStudents"] == 3
        admin_rolls = [s["rollNumber"] for s in admin_data["students"]]
        assert "23C503" in admin_rolls

@pytest.mark.anyio
async def test_feature_3_find_related_papers_scoring_and_ranking():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Seed 2 papers
        # Paper 1: "Breast Cancer Detection Using Federated Learning" (Alice, 23C501)
        login1 = await client.post("/api/auth/login", json={"identifier": "23C501", "password": "StudentPass1", "role": "student"})
        await client.post("/api/papers/my-paper", json={
            "title": "Breast Cancer Detection Using Federated Learning"
        }, headers={"Authorization": f"Bearer {login1.json()['token']}"})

        # Paper 2: "Deep Learning For Lung Cancer Detection" (Bob, 23C502)
        login2 = await client.post("/api/auth/login", json={"identifier": "23C502", "password": "StudentPass2", "role": "student"})
        await client.post("/api/papers/my-paper", json={
            "title": "Deep Learning For Lung Cancer Detection"
        }, headers={"Authorization": f"Bearer {login2.json()['token']}"})

        # Admin searches with: "breast cancer detection using federated learning"
        # Input words after stop words (using): breast, cancer, detection, federated, learning -> 5 keywords!
        admin_login = await client.post("/api/auth/login", json={"identifier": "medurimounika4@gmail.com", "password": "Cse@1234", "role": "admin"})
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['token']}"}

        search_res = await client.post("/api/papers/find-related", json={
            "title": "breast cancer detection using federated learning"
        }, headers=admin_headers)

        assert search_res.status_code == 200
        search_data = search_res.json()
        assert search_data["totalInputKeywords"] == 5
        assert set(search_data["keywords"]) == {"breast", "cancer", "detection", "federated", "learning"}

        # Keyword counts:
        # breast: 1 (Paper 1)
        # cancer: 2 (Paper 1 & Paper 2)
        # detection: 2 (Paper 1 & Paper 2)
        # federated: 1 (Paper 1)
        # learning: 2 (Paper 1 & Paper 2)
        counts = search_data["keywordCounts"]
        assert counts["breast"] == 1
        assert counts["cancer"] == 2
        assert counts["detection"] == 2
        assert counts["federated"] == 1
        assert counts["learning"] == 2

        # Results ranking:
        # Paper 1 matches 5 out of 5 keywords -> 100.0% Match Score
        # Paper 2 matches 3 keywords (cancer, detection, learning) -> (3/5)*100 = 60.0% Match Score
        results = search_data["results"]
        assert len(results) == 2
        assert results[0]["rank"] == 1
        assert results[0]["rollNumber"] == "23C501"
        assert results[0]["matchScore"] == 100.0
        assert set(results[0]["matchedKeywords"]) == {"breast", "cancer", "detection", "federated", "learning"}

        assert results[1]["rank"] == 2
        assert results[1]["rollNumber"] == "23C502"
        assert results[1]["matchScore"] == 60.0
        assert set(results[1]["matchedKeywords"]) == {"cancer", "detection", "learning"}
