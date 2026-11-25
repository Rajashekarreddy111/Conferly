# Conferly Backend Integration Specification & Contract Guide
## Conference Management Application (FastAPI + MongoDB)

This document specifies the exact API contracts, database schemas, security validation rules, and lifecycle logic required by the **Conferly** frontend application.

---

## 1. System Overview & Technology Stack

* **Product Name:** Conferly
* **Backend Framework:** FastAPI (Python 3.10+)
* **Database:** MongoDB (Motor async driver / Beanie ODM)
* **Authentication:** OAuth2 with JWT Bearer tokens
* **File Storage:** Local uploads directory (`/uploads/proofs/`) or Cloud Object Storage (S3 / MinIO) for student submission screenshot receipts
* **Frontend Integration:** React (Vite, Axios, Tailwind CSS)

---

## 2. Roles & Authorization Model

Conferly defines three primary roles:

| Role Name | Synonyms / Aliases | Scope & Capabilities |
|---|---|---|
| `admin` | Administrator | Full institution-wide read and write permissions across sections, coordinators, students, conferences, settings, and reports. |
| `coordinator` | `mentor` | Faculty coordinator. Read and write permissions strictly scoped to authorized class sections (`assignedSections: string[]`). |
| `student` | Scholar | Student portal. Access scoped to eligible conferences (global institutional events or conferences targeting the student's section/roll number). |

> [!IMPORTANT]
> **Coordinator / Mentor Role Synonymy:**
> The backend authentication layer, JWT payload generator, and security dependencies (`get_current_user`, `get_current_coordinator`) must treat `"coordinator"` and `"mentor"` as synonymous. If a JWT contains `role: "mentor"`, authorization checks for coordinator privileges must evaluate to `True`.

---

## 3. Critical Business Rules & Data Semantics

### 3.1 Deadline Specification & Expiration Semantics
* **Date Storage:** Stored strictly as a date string in `YYYY-MM-DD` format (no time component).
* **Display Format:** Always presented as `DD-MM-YYYY` (e.g., `25-11-2026`).
* **Active Window:** A conference remains active throughout its entire deadline date until **23:59:59.999** in the institution's local timezone.
* **Expiration Transition:** A conference becomes `Expired` at `00:00:00` of the day immediately following the deadline date.
* **Urgent / Approaching Deadline Formula:**
  A conference triggers an approaching deadline alert when:
  $$0 < \text{deadlineEndOfDay} - \text{current\_timestamp} \le 24 \text{ hours}$$
  *(Do not notify students who have already submitted verified application proof).*

### 3.2 Student Conference Eligibility & Deduplication
* A student is eligible for a conference if:
  1. `conference.scope === "global"`, OR
  2. `conference.targetSections` contains `student.section`, OR
  3. `conference.targetStudents` contains `student.rollNumber` or `student.id`.
* **Deduplication:** When querying eligible conferences, the backend must return unique conference records deduplicated by `conference.id`, even if a student matches both section and individual targeting.

### 3.3 Four-State Conference Filtering for Students
The `GET /api/conferences` or student conference query endpoint must support four filtering criteria:

1. **`ALL`:** Returns all eligible conferences (active, approaching, and expired).
2. **`Not Applied`:** Returns **only active** conferences that the student has not applied to (`!isExpired && !isApplied`).
3. **`Applied`:** Returns all conferences for which the student's submission proof has been confirmed (`isApplied`), regardless of expiry.
4. **`Expired`:** Returns conferences whose deadlines have passed (`isExpired`), preserving whether the student applied prior to expiry.

> [!NOTE]
> Expired unapplied conferences **must never be counted as pending**. When a deadline passes, unapplied conferences automatically transfer from the *Not Applied / Pending* cohort into the *Expired* cohort.

### 3.4 Report Reconciliation Formula
All aggregate reports (Conference-wise, Section-wise, and Coordinator-wise) must strictly reconcile according to:

$$\mathbf{Total\ Eligible} = \mathbf{Applied} + \mathbf{Pending\ Active} + \mathbf{Expired\ Not\ Applied}$$

* **Verified Submission Rate (%):**
  $$\text{Submission Rate} = \left( \frac{\text{Applied}}{\text{Total Eligible}} \right) \times 100$$

### 3.5 Section & Academic Year Deactivation
* **Server-Side Enforcement:** When a section is marked `Inactive`, students belonging to that section must be rejected at the FastAPI authentication/middleware level with `HTTP 403 Forbidden` (`{"detail": "Your section has been deactivated by administration"}`).
* **Cascading Year Deactivation:** Deactivating an academic year must set all class sections belonging to that year to `Inactive`.
* **Restoration:** Reactivating a section restores permissions without overriding individually suspended student accounts.

### 3.6 Permanent Deletion Constraints
* **Section Deletion:** `DELETE /api/sections/{id}`. May include a `cascade_students=true|false` parameter. If students exist and cascade is false, return `HTTP 409 Conflict`.
* **Coordinator Deletion:** `DELETE /api/coordinators/{id}`. Deletes coordinator credentials; does not delete the sections they were assigned to.
* **Student Deletion:** `DELETE /api/students/{id}`. Permanently deletes student credentials and roster record; historical confirmed applications are archived or anonymized.

---

## 4. FastAPI REST Endpoints Specification

### 4.1 Authentication (`/api/auth`)

#### `POST /api/auth/login`
* **Request:**
  ```json
  {
    "username": "23C524", // rollNumber, email, or admin username
    "password": "SecurePassword123"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": "664fa1b2e4b0a12345678901",
      "name": "Bala Rajashekar",
      "email": "23c524@college.edu",
      "phoneNumber": "9876543210",
      "role": "student", // "admin" | "coordinator" | "mentor" | "student"
      "rollNumber": "23C524",
      "section": "CSE-A",
      "academicYear": "2025-2026",
      "status": "Active"
    }
  }
  ```

#### `POST /api/auth/forgot-password`
* **Request:** `{ "email": "user@college.edu" }`
* **Response (200 OK):** `{ "message": "Password reset instructions dispatched." }`

#### `POST /api/auth/reset-password`
* **Request:** `{ "token": "string", "newPassword": "string" }`
* **Response (200 OK):** `{ "message": "Password successfully updated." }`

#### `POST /api/auth/change-password`
* **Headers:** `Authorization: Bearer <token>`
* **Request:** `{ "currentPassword": "string", "newPassword": "string" }`
* **Response (200 OK):** `{ "message": "Password changed successfully." }`

---

### 4.2 Class Sections & Academic Years

#### `GET /api/sections`
* **Query Params:** `academicYear` (optional), `status` (optional)
* **Response (200 OK):**
  ```json
  [
    {
      "id": "sec-01",
      "sectionName": "CSE-A",
      "academicYear": "2025-2026",
      "status": "Active",
      "studentCount": 64,
      "coordinatorCount": 2,
      "createdAt": "2025-06-01T10:00:00Z"
    }
  ]
  ```

#### `POST /api/sections`
* **Request:** `{ "sectionName": "CSE-C", "academicYear": "2025-2026" }`
* **Response (201 Created):** Created Section object.

#### `PUT /api/sections/{id}`
* **Request:** `{ "sectionName": "CSE-A", "academicYear": "2025-2026" }`
* **Response (200 OK):** Updated Section object.

#### `PATCH /api/sections/{id}/status`
* **Request:** `{ "status": "Active" | "Inactive" }`
* **Response (200 OK):** `{ "id": "...", "status": "Inactive" }`

#### `DELETE /api/sections/{id}`
* **Query Params:** `cascade_students=false`
* **Response (200 OK):** `{ "message": "Section deleted successfully." }`
* **Error (409 Conflict):** When students are assigned and `cascade_students=false`.

#### `GET /api/academic-years`
* **Response (200 OK):**
  ```json
  [
    {
      "academicYear": "2025-2026",
      "status": "Active",
      "sectionCount": 6,
      "studentCount": 380
    }
  ]
  ```

#### `POST /api/academic-years`
* **Request:** `{ "academicYear": "2027-2028" }`
* **Validation:** Must match regex `^\d{4}-\d{4}$` (e.g., `2027-2028`).
* **Response (201 Created):** `{ "academicYear": "2027-2028", "status": "Active" }`

---

### 4.3 Coordinators (`/api/coordinators`)

#### `GET /api/coordinators`
* **Response (200 OK):**
  ```json
  [
    {
      "id": "coord-01",
      "name": "Dr. Sarah Jenkins",
      "email": "sarah.jenkins@college.edu",
      "phoneNumber": "9876543211",
      "role": "coordinator",
      "assignedSections": ["CSE-A", "CSE-B"],
      "status": "Active",
      "createdAt": "2025-06-15T09:00:00Z"
    }
  ]
  ```

#### `POST /api/coordinators`
* **Request:**
  ```json
  {
    "name": "Dr. Alan Turing",
    "email": "alan.turing@college.edu",
    "phoneNumber": "9876543212",
    "assignedSections": ["CSE-A"],
    "initialPassword": "TempPassword123"
  }
  ```
* **Response (201 Created):** Created Coordinator object.

#### `DELETE /api/coordinators/{id}`
* **Response (200 OK):** `{ "message": "Coordinator deleted successfully." }`

---

### 4.4 Students (`/api/students`)

#### `GET /api/students`
* **Query Params:** `section` (optional), `academicYear` (optional), `status` (optional)
* **Access Control:** If requested by a coordinator, automatically restrict output to students enrolled in `user.assignedSections`.
* **Response (200 OK):**
  ```json
  [
    {
      "id": "stu-01",
      "rollNumber": "23C524",
      "name": "Bala Rajashekar",
      "email": "23c524@college.edu",
      "phoneNumber": "9876543210",
      "section": "CSE-A",
      "academicYear": "2025-2026",
      "status": "Active"
    }
  ]
  ```

#### `POST /api/students`
* **Request:**
  ```json
  {
    "rollNumber": "23C525",
    "name": "Ananya Sharma",
    "email": "23c525@college.edu",
    "phoneNumber": "9876543213",
    "section": "CSE-A",
    "academicYear": "2025-2026",
    "initialPassword": "AutoPassword123"
  }
  ```

#### `DELETE /api/students/{id}`
* **Response (200 OK):** `{ "message": "Student deleted successfully." }`

---

### 4.5 Conferences (`/api/conferences`)

#### `GET /api/conferences`
* **Query Params:**
  * `scope`: `"student" | "coordinator" | "admin"`
  * `status`: `"Active" | "Expired" | "ALL"`
* **Response (200 OK):**
  ```json
  [
    {
      "id": "conf-01",
      "shortName": "ICCV 2026",
      "fullName": "International Conference on Computer Vision",
      "applicationLink": "https://cmt3.research.microsoft.com/ICCV2026",
      "deadline": "2026-11-25", // YYYY-MM-DD
      "scope": "global", // "global" | "targeted"
      "targetSections": ["CSE-A", "CSE-B"],
      "status": "Active"
    }
  ]
  ```

#### `POST /api/conferences`
* **Request:**
  ```json
  {
    "shortName": "ICML 2026",
    "fullName": "International Conference on Machine Learning",
    "applicationLink": "https://cmt3.research.microsoft.com/ICML2026",
    "deadline": "2026-12-10",
    "scope": "targeted",
    "targetSections": ["CSE-A"]
  }
  ```

#### `POST /api/conferences/check-duplicate`
* **Duplicate Detection Rule:**
  ```python
  def is_duplicate(name1: str, short1: str, name2: str, short2: str) -> bool:
      return name1.strip().lower() == name2.strip().lower() and \
             short1.strip().lower() == short2.strip().lower()
  ```
* **Request:** `{ "fullName": "...", "shortName": "..." }`
* **Response (200 OK):** `{ "isDuplicate": boolean, "existingConference": object | null }`

---

### 4.6 Applications, Proof Uploads & Tracking

#### `POST /api/upload/screenshot`
* **Content-Type:** `multipart/form-data`
* **Payload:** `file` (PNG, JPG, JPEG, or PDF $\le 5$ MB)
* **Response (200 OK):**
  ```json
  {
    "fileUrl": "https://storage.conferly.edu/proofs/proof-23C524-conf01.png",
    "fileName": "proof-23C524-conf01.png"
  }
  ```

#### `POST /api/applications/submit`
* **Request:**
  ```json
  {
    "conferenceId": "conf-01",
    "studentId": "stu-01",
    "rollNumber": "23C524",
    "screenshotProof": "https://storage.conferly.edu/proofs/proof-23C524-conf01.png"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "id": "app-01",
    "conferenceId": "conf-01",
    "studentId": "stu-01",
    "rollNumber": "23C524",
    "screenshotProof": "https://storage.conferly.edu/proofs/proof-23C524-conf01.png",
    "status": "Applied",
    "appliedAt": "2026-10-23T18:00:00Z"
  }
  ```

#### `GET /api/conferences/{id}/tracking`
* **Access:** Coordinator & Admin
* **Response (200 OK):**
  ```json
  {
    "conferenceId": "conf-01",
    "shortName": "ICCV 2026",
    "deadline": "2026-11-25",
    "eligibleCount": 64,
    "appliedCount": 48,
    "pendingCount": 16,
    "expiredNotAppliedCount": 0,
    "completionRate": 75.0,
    "students": [
      {
        "id": "stu-01",
        "rollNumber": "23C524",
        "name": "Bala Rajashekar",
        "phoneNumber": "9876543210",
        "section": "CSE-A",
        "academicYear": "2025-2026",
        "status": "Applied",
        "appliedAt": "2026-10-23T18:00:00Z",
        "screenshotProof": "https://storage.conferly.edu/proofs/proof-23C524-conf01.png"
      }
    ]
  }
  ```

#### `GET /api/tracking/student?q={query}`
* **Query:** Student Roll Number, Name, or Phone Number
* **Response (200 OK):**
  ```json
  {
    "student": {
      "id": "stu-01",
      "rollNumber": "23C524",
      "name": "Bala Rajashekar",
      "email": "23c524@college.edu",
      "phoneNumber": "9876543210",
      "section": "CSE-A",
      "academicYear": "2025-2026",
      "status": "Active"
    },
    "conferences": [
      {
        "id": "conf-01",
        "shortName": "ICCV 2026",
        "fullName": "International Conference on Computer Vision",
        "deadline": "2026-11-25",
        "appliedStatus": "Applied", // "Applied" | "Not Applied" | "Expired"
        "appliedAt": "2026-10-23T18:00:00Z",
        "screenshotProof": "https://storage.conferly.edu/proofs/proof-23C524-conf01.png"
      }
    ]
  }
  ```

---

### 4.7 Application Reports (`/api/reports`)

#### `GET /api/reports/conferences`
* **Response (200 OK):**
  ```json
  [
    {
      "conferenceId": "conf-01",
      "shortName": "ICCV 2026",
      "fullName": "International Conference on Computer Vision",
      "deadline": "2026-11-25",
      "totalEligible": 128,
      "applied": 96,
      "pendingActive": 32,
      "expiredNotApplied": 0,
      "submissionRate": 75.0
    }
  ]
  ```

#### `GET /api/reports/sections`
* **Response (200 OK):**
  ```json
  [
    {
      "section": "CSE-A",
      "academicYear": "2025-2026",
      "totalStudents": 64,
      "totalEligible": 192,
      "applied": 144,
      "pendingActive": 48,
      "expiredNotApplied": 0,
      "submissionRate": 75.0
    }
  ]
  ```

#### `GET /api/reports/coordinators`
* **Response (200 OK):**
  ```json
  [
    {
      "coordinatorId": "coord-01",
      "coordinatorName": "Dr. Sarah Jenkins",
      "assignedSections": ["CSE-A", "CSE-B"],
      "totalStudents": 128,
      "totalEligible": 384,
      "applied": 288,
      "pendingActive": 96,
      "expiredNotApplied": 0,
      "submissionRate": 75.0
    }
  ]
  ```

---

### 4.8 Urgent Deadline Notifications (`/api/notifications/deadlines`)
* **Headers:** `Authorization: Bearer <token>`
* **Logic:** Evaluates approaching conferences ($\le 24$ hours to deadline) matching authenticated role:
  * **Student:** Alerts only for conferences the student has not yet submitted proof for.
  * **Coordinator / Mentor:** Alerts for conferences matching their assigned sections with count of pending students.
  * **Admin:** Alerts across all active conferences.
* **Response (200 OK):**
  ```json
  [
    {
      "id": "alert-conf-01",
      "conferenceId": "conf-01",
      "conferenceName": "ICCV 2026",
      "fullName": "International Conference on Computer Vision",
      "deadline": "2026-11-25",
      "remainingTime": "14h 22m left",
      "eligibleCount": 64,
      "unappliedCount": 16,
      "message": "ICCV 2026 deadline closes in 14h 22m! 16 student(s) still pending."
    }
  ]
  ```

---

## 5. Security & Verification Checklist

1. [ ] **JWT Role Verification:** Accept `"mentor"` as a valid coordinator role.
2. [ ] **Section Deactivation Middleware:** Block deactivated sections with HTTP 403.
3. [ ] **Proof Verification:** Mark applications as `Applied` strictly after receipt image is stored.
4. [ ] **Mathematical Integrity:** Ensure all reports satisfy $\text{Total Eligible} = \text{Applied} + \text{Pending Active} + \text{Expired Not Applied}$.
5. [ ] **Phone Number Integrity:** Validate phone numbers as 10-digit numeric strings.
