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

## 🔑 Default Seed Credentials

| Role | Username / Identifier | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Admin** | `medurimounika4@gmail.com` | `Cse@1234` | Mounika Meduri (Primary Administrator) |
| **Admin** | `admin@college.edu` | `admin123` | Dr. Alexander Wright (Superuser) |
| **Coordinator** | `sarah.jenkins@college.edu` | `coord123` | Prof. Sarah Jenkins (Assigned: `CSE-A`, `CSE-B`) |
| **Coordinator** | `marcus.vance@college.edu` | `coord123` | Prof. Marcus Vance (Assigned: `CSE-C`) |
| **Student** | `23C524` (or `devon.lane@college.edu`) | `student123` | Devon Lane (Section `CSE-A`) |
| **Student** | `23C525` (or `kathryn.murphy@college.edu`) | `student123` | Kathryn Murphy (Section `CSE-A`) |
| **Student** | `23C526` (or `eleanor.pena@college.edu`) | `student123` | Eleanor Pena (Section `CSE-B`) |

---

## ⚙️ Environment Variables (.env)

### Frontend (`frontend/.env`)
```ini
BACKEND_URL=http://localhost:8000/api
```

### Backend (`backend/.env`)
```ini
APP_ENV=development
MONGODB_URI=mongodb+srv://rajashekharreddyyerruva_db_user:yUA3W3vFty3PaP91@conferenceproject.ueaqfnw.mongodb.net/
MONGODB_DATABASE=conference_management
JWT_SECRET_KEY=conferly-super-secret-jwt-key-2026-production-grade
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
TIMEZONE=UTC
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8000/api
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173","http://localhost:3000"]
```
