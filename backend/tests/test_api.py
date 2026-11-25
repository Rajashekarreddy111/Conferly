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
async def setup_test_db():
    await connect_to_mongo()
    db = get_database()
    # Seed single admin user
    mounika_hash = hash_password("Cse@1234")
    await db.users.delete_many({"email": {"$ne": "medurimounika4@gmail.com"}})
    await db.users.update_one(
        {"email": "medurimounika4@gmail.com"},
        {"$set": {
            "username": "medurimounika4",
            "email": "medurimounika4@gmail.com",
            "name": "Mounika Meduri",
            "role": "admin",
            "passwordHash": mounika_hash,
            "status": "Active"
        }},
        upsert=True
    )

@pytest.mark.anyio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy", "service": "Conferly"}

@pytest.mark.anyio
async def test_login_and_auth_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Login with bad password
        res_bad = await client.post("/api/auth/login", json={
            "identifier": "medurimounika4@gmail.com",
            "password": "wrongpassword"
        })
        assert res_bad.status_code == 401

        # 2. Login with correct password
        res_ok = await client.post("/api/auth/login", json={
            "identifier": "medurimounika4@gmail.com",
            "password": "Cse@1234"
        })
        assert res_ok.status_code == 200
        data = res_ok.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == "medurimounika4@gmail.com"
        token = data["token"]

        # 3. Access me endpoint
        headers = {"Authorization": f"Bearer {token}"}
        me_res = await client.get("/api/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["email"] == "medurimounika4@gmail.com"

@pytest.mark.anyio
async def test_duplicate_conference_matching():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login_res = await client.post("/api/auth/login", json={
            "identifier": "medurimounika4@gmail.com",
            "password": "Cse@1234"
        })
        token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create conference
        create_payload = {
            "fullName": "International AI Conference 2026",
            "shortName": "IAIC-2026",
            "applicationLink": "https://iaic2026.org",
            "deadline": "2026-12-31",
            "scope": "global",
            "targetSections": [],
            "targetStudents": []
        }
        res1 = await client.post("/api/conferences", json=create_payload, headers=headers)
        assert res1.status_code == 201
        conf_id = res1.json()["id"]

        # Check duplicate
        dup_res = await client.post("/api/conferences/check-duplicate", json={
            "fullName": "   international ai conference 2026  ",
            "shortName": "  iaic-2026 "
        })
        assert dup_res.status_code == 200
        assert dup_res.json()["isDuplicate"] is True

        # Check duplicate with excludeId
        dup_res2 = await client.post("/api/conferences/check-duplicate", json={
            "fullName": "international ai conference 2026",
            "shortName": "iaic-2026",
            "excludeId": conf_id
        })
        assert dup_res2.status_code == 200
        assert dup_res2.json()["isDuplicate"] is False

        # Attempt to create exact duplicate should be rejected (HTTP 400)
        res_dup = await client.post("/api/conferences", json=create_payload, headers=headers)
        assert res_dup.status_code == 400

@pytest.mark.anyio
async def test_section_and_reports_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login_res = await client.post("/api/auth/login", json={
            "identifier": "medurimounika4@gmail.com",
            "password": "Cse@1234"
        })
        token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create Academic Year
        ay_res = await client.post("/api/academic-years", json={"year": "2025-2026"}, headers=headers)
        assert ay_res.status_code in (200, 201)

        # Create Section
        sec_res = await client.post("/api/sections", json={"academicYear": "2025-2026", "sectionName": "AI-A"}, headers=headers)
        assert sec_res.status_code in (200, 201)

        # Create Student in section
        student_payload = {
            "rollNumber": "25AI01",
            "name": "Alice Smith",
            "email": "alice.smith@college.edu",
            "phoneNumber": "+1 555-0100",
            "section": "AI-A",
            "academicYear": "2025-2026"
        }
        st_res = await client.post("/api/students", json=student_payload, headers=headers)
        assert st_res.status_code in (200, 201)

        # Verify student is in section
        sec_students_res = await client.get("/api/sections/AI-A/students", headers=headers)
        assert sec_students_res.status_code == 200
        assert len(sec_students_res.json()) >= 1

        # Verify reports endpoint returns consistent structure
        rep_res = await client.get("/api/reports/admin", headers=headers)
        assert rep_res.status_code == 200
        rep_data = rep_res.json()
        assert "summary" in rep_data
        assert "conferenceWise" in rep_data
        assert "sectionWise" in rep_data
        assert "coordinatorWise" in rep_data
