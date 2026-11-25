# Conferly — Conference Management Application

Conferly is a modern, high-performance Conference Management System built with a **FastAPI** Python backend, **MongoDB** database, and a responsive **React (Vite)** frontend.

---

## 🌟 Architecture & Features

- **Backend:** FastAPI with asynchronous Motor MongoDB client, bcrypt password hashing, and JWT (Bearer) authorization.
- **Persistent Data:** MongoDB storing Academic Years, Class Sections, Coordinators, Students, Conferences, Applications, and Audit Records.
- **GridFS & Storage:** Uploaded student proof screenshots are securely stored in MongoDB GridFS with local streaming fallback.
- **Three Core Roles:**
  - **Admin:** Full access to Conferences, Academic Years, Sections (with cascade deletion), Coordinators, Students, and Global Reconciliation Reports.
  - **Coordinator / Mentor:** Section-scoped management, conference creation/monitoring, phone number rosters, and approaching deadline alerts.
  - **Student:** 4-tab conference discovery (`ALL`, `Not Applied`, `Applied`, `Expired`), proof upload, and approaching deadline notifications.
- **Business Logic Enforcements:**
  - Exact duplicate conference matching: Duplicate iff normalized `fullName` AND normalized `shortName` match.
  - Section deactivation enforcement: Inactive class section blocks student logins and application submissions with `HTTP 403 Forbidden`.
  - Date-only deadline model (`YYYY-MM-DD` stored, `DD-MM-YYYY` displayed) active until 23:59:59.999 UTC of deadline date.
  - Report formula reconciliation: $\text{Total Eligible} = \text{Applied} + \text{Pending Active} + \text{Expired Not Applied}$.

---

## 🚀 Quick Start (Windows PowerShell)

### 1. Prerequisites
- **Python 3.10+** (Python 3.12 verified)
- **Node.js 18+** & **npm**
- **MongoDB** running on `mongodb://127.0.0.1:27017` *(If local MongoDB service is stopped, the backend automatically activates an in-memory fallback for zero-setup local development & testing)*

---

### 2. Backend Setup & Run

Open a Windows PowerShell terminal in the project root:

```powershell
# Navigate to backend
cd backend

# Install dependencies
pip install -r requirements.txt

# Seed the database with initial admin, coordinators, sections, students, and conferences
python seed.py

# Start FastAPI server (runs on http://127.0.0.1:8000)
python main.py
```

*Interactive API documentation is available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).*

---

### 3. Frontend Setup & Run

Open a second Windows PowerShell terminal in the project root:

```powershell
# Navigate to frontend
cd frontend

# Install npm dependencies (if not already installed)
npm install

# Start Vite development server (runs on http://localhost:5173)
npm run dev
```

To build the frontend for production:
```powershell
npm run build
```

---

### 4. Running Backend Tests

In a PowerShell terminal inside the `backend` directory:
```powershell
python -m pytest tests/test_api.py -v
```

---
