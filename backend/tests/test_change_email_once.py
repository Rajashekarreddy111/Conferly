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
from app.core.security import hash_password, create_access_token


@pytest.fixture(scope="function")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="function", autouse=True)
async def setup_test_db():
    await connect_to_mongo()
    await init_indexes()


@pytest.mark.anyio
async def test_admin_and_coordinator_change_email_once():
    """
    Tests:
    1. Admin can change email once with correct password.
    2. Admin cannot change email a 2nd time (400 Bad Request).
    3. Coordinator can change email once with correct password.
    4. Coordinator cannot change email a 2nd time (400 Bad Request).
    5. Student is forbidden from changing email (403 Forbidden).
    6. Invalid password fails with 401 Unauthorized.
    7. Duplicate email fails with 409 Conflict.
    8. Same email fails with 400 Bad Request.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        db = get_database()

        # 1. Seed an Admin User
        admin_id = str(uuid.uuid4().hex)
        admin_pwd = "AdminSecurePass123"
        admin_email = f"admin_{uuid.uuid4().hex[:4]}@college.edu"
        await db.users.insert_one({
            "_id": admin_id,
            "id": admin_id,
            "name": "Super Admin",
            "email": admin_email,
            "role": "admin",
            "passwordHash": hash_password(admin_pwd),
            "status": "Active",
            "emailChangedOnce": False,
        })

        admin_token = create_access_token(admin_email, "admin", admin_id)
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # Check /auth/me returns emailChangedOnce = False
        res_me = await client.get("/api/auth/me", headers=admin_headers)
        assert res_me.status_code == 200
        assert res_me.json()["emailChangedOnce"] is False

        # Attempt 1: Same email fails
        res_same = await client.post(
            "/api/auth/change-email-once",
            json={"newEmail": admin_email, "currentPassword": admin_pwd},
            headers=admin_headers,
        )
        assert res_same.status_code == 400
        assert "different" in res_same.json()["detail"]

        # Attempt 2: Wrong password fails
        res_wrong_pwd = await client.post(
            "/api/auth/change-email-once",
            json={"newEmail": f"new_{uuid.uuid4().hex[:4]}@college.edu", "currentPassword": "WrongPassword!"},
            headers=admin_headers,
        )
        assert res_wrong_pwd.status_code == 401
        assert "Incorrect" in res_wrong_pwd.json()["detail"]

        # Attempt 3: Valid change
        new_admin_email = f"updated_admin_{uuid.uuid4().hex[:4]}@college.edu"
        res_ok = await client.post(
            "/api/auth/change-email-once",
            json={"newEmail": new_admin_email, "currentPassword": admin_pwd},
            headers=admin_headers,
        )
        assert res_ok.status_code == 200
        data_ok = res_ok.json()
        assert data_ok["success"] is True
        assert data_ok["user"]["email"] == new_admin_email
        assert data_ok["user"]["emailChangedOnce"] is True
        assert "token" in data_ok

        new_admin_token = data_ok["token"]
        new_admin_headers = {"Authorization": f"Bearer {new_admin_token}"}

        # Check DB reflects updated email and emailChangedOnce = True
        admin_in_db = await db.users.find_one({"_id": admin_id})
        assert admin_in_db["email"] == new_admin_email
        assert admin_in_db["emailChangedOnce"] is True

        # Attempt 4: Admin tries to change a 2nd time -> MUST BE REJECTED
        res_second = await client.post(
            "/api/auth/change-email-once",
            json={"newEmail": f"third_admin_{uuid.uuid4().hex[:4]}@college.edu", "currentPassword": admin_pwd},
            headers=new_admin_headers,
        )
        assert res_second.status_code == 400
        assert "already changed your email" in res_second.json()["detail"]

        # 2. Coordinator Test
        coord_id = str(uuid.uuid4().hex)
        coord_pwd = "CoordSecurePass123"
        coord_email = f"coord_init_{uuid.uuid4().hex[:4]}@college.edu"
        coord_doc = {
            "_id": coord_id,
            "id": coord_id,
            "name": "Dr. Coordinator",
            "email": coord_email,
            "role": "coordinator",
            "passwordHash": hash_password(coord_pwd),
            "assignedSections": ["SEC-A"],
            "status": "Active",
            "emailChangedOnce": False,
        }
        await db.coordinators.insert_one(coord_doc)
        await db.users.insert_one(dict(coord_doc))

        coord_token = create_access_token(coord_email, "coordinator", coord_id)
        coord_headers = {"Authorization": f"Bearer {coord_token}"}

        # Coordinator Attempt 1: Duplicate email (try using new_admin_email) -> Fails 409
        res_dup = await client.post(
            "/api/auth/change-email-once",
            json={"newEmail": new_admin_email, "currentPassword": coord_pwd},
            headers=coord_headers,
        )
        assert res_dup.status_code == 409
        assert "already registered" in res_dup.json()["detail"]

        # Coordinator Attempt 2: Valid change
        new_coord_email = f"coord_new_{uuid.uuid4().hex[:4]}@college.edu"
        res_coord_ok = await client.post(
            "/api/auth/change-email-once",
            json={"newEmail": new_coord_email, "currentPassword": coord_pwd},
            headers=coord_headers,
        )
        assert res_coord_ok.status_code == 200
        assert res_coord_ok.json()["user"]["email"] == new_coord_email
        assert res_coord_ok.json()["user"]["emailChangedOnce"] is True

        new_coord_headers = {"Authorization": f"Bearer {res_coord_ok.json()['token']}"}

        # Coordinator Attempt 3: 2nd change -> MUST BE REJECTED
        res_coord_second = await client.post(
            "/api/auth/change-email-once",
            json={"newEmail": f"coord_another_{uuid.uuid4().hex[:4]}@college.edu", "currentPassword": coord_pwd},
            headers=new_coord_headers,
        )
        assert res_coord_second.status_code == 400
        assert "already changed your email" in res_coord_second.json()["detail"]

        # 3. Student Test (Forbidden)
        student_id = str(uuid.uuid4().hex)
        student_email = f"student_{uuid.uuid4().hex[:4]}@college.edu"
        await db.students.insert_one({
            "_id": student_id,
            "id": student_id,
            "rollNumber": f"R_{uuid.uuid4().hex[:4]}",
            "name": "Student X",
            "email": student_email,
            "role": "student",
            "section": "SEC-A",
            "status": "Active",
        })

        student_token = create_access_token("R101", "student", student_id)
        res_student = await client.post(
            "/api/auth/change-email-once",
            json={"newEmail": f"st_new_{uuid.uuid4().hex[:4]}@college.edu", "currentPassword": "any"},
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert res_student.status_code == 403
        assert "Only administrators and faculty coordinators" in res_student.json()["detail"]
