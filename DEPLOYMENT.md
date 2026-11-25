# Conferly — Production Deployment Guide

This repository is fully configured and ready for production deployment across all major cloud providers and container environments.

---

## 1. Quick Git Setup & Repository Push

To push this codebase to GitHub, GitLab, or your Git remote:

```bash
# 1. Initialize and check status (sensitive .env files are automatically excluded)
git add .
git commit -m "feat: complete Conferly application with paper tracking and deployment configs"

# 2. Add your remote repository and push
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git branch -M main
git push -u origin main
```

> **Security Note:** All private `.env` credential files, `node_modules/`, `dist/`, and Python `__pycache__` directories are securely excluded via `.gitignore`. Only `.env.example` template files are committed.

---

## 2. Deployment Options

### Option A: Cloud PaaS (Recommended: Render / Railway for Backend + Vercel / Netlify for Frontend)

#### **1. Deploy Backend (e.g. Render / Railway):**
- **Root Directory:** `backend`
- **Environment:** `Python 3.12`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT` (or use the included `Procfile`)
- **Environment Variables to Set in Cloud Dashboard:**
  ```env
  APP_ENV=production
  MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
  MONGODB_DATABASE=conference_management
  JWT_SECRET_KEY=<generate-a-strong-random-secret-key>
  JWT_ALGORITHM=HS256
  ACCESS_TOKEN_EXPIRE_MINUTES=1440
  FRONTEND_URL=https://your-frontend-domain.vercel.app
  BACKEND_URL=https://your-backend-domain.onrender.com/api
  CORS_ORIGINS=["https://your-frontend-domain.vercel.app"]
  ```

#### **2. Deploy Frontend (e.g. Vercel / Netlify):**
- **Root Directory:** `frontend`
- **Framework Preset:** `Vite`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variables to Set in Cloud Dashboard:**
  ```env
  BACKEND_URL=https://your-backend-domain.onrender.com/api
  ```
- **SPA Routing:** `frontend/vercel.json` and `frontend/public/_redirects` are already configured so sub-routes (e.g. `/student/base-paper`, `/admin/paper-tracking`) will never return 404 on page refresh.

---

### Option B: Docker / Docker Compose (Single VPS, AWS EC2, or DigitalOcean)

The project includes production-ready Dockerfiles for both services and a top-level `docker-compose.yml`.

1. Copy `.env.example` to `.env` in the root directory and fill in your MongoDB Atlas URI:
   ```bash
   cp backend/.env.example .env
   ```
2. Build and run all services in the background:
   ```bash
   docker compose up -d --build
   ```
3. Check container logs:
   ```bash
   docker compose logs -f
   ```
- Frontend will be available at: `http://<your-server-ip>:5173`
- Backend API will be available at: `http://<your-server-ip>:8000/api`

---

## 3. Important MongoDB Atlas Production Configuration

To ensure your production servers can connect to your MongoDB Atlas cluster:
1. Go to **MongoDB Atlas** -> **Security** -> **Network Access**.
2. Click **Add IP Address**.
3. Add your production server's static IP address (or `0.0.0.0/0` to allow connections from dynamic serverless hosts like Vercel or Render).
4. Verify your database username and password in the `MONGODB_URI` connection string.
