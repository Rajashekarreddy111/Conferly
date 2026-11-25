import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.database.connection import connect_to_mongo, close_mongo_connection
from app.database.indexes import init_indexes

from app.api.routes.auth import router as auth_router
from app.api.routes.academic_years import router as academic_years_router
from app.api.routes.sections import router as sections_router
from app.api.routes.coordinators import router as coordinators_router
from app.api.routes.students import router as students_router
from app.api.routes.conferences import router as conferences_router
from app.api.routes.applications import router as applications_router
from app.api.routes.tracking import router as tracking_router
from app.api.routes.reports import router as reports_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.upload import router as upload_router
from app.api.routes.papers import router as papers_router

# Setup logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("conferly")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up Conferly FastAPI backend...")
    try:
        await connect_to_mongo()
        await init_indexes()

        # Auto-seed if users collection is empty (e.g. in-memory fallback or fresh database)
        from app.database.connection import get_database
        db = get_database()
        user_count = await db.users.count_documents({})
        if user_count == 0:
            logger.info("Database has no users on startup. Automatically seeding default admin, coordinators, and students...")
            from seed import seed_records
            await seed_records(db)

        logger.info("Conferly backend started successfully with MongoDB.")
    except Exception as e:
        logger.error(f"Error during backend startup: {e}")
    yield
    # Shutdown
    logger.info("Shutting down Conferly backend...")
    await close_mongo_connection()

app = FastAPI(
    title="Conferly API",
    description="Backend API for Conferly Conference Management System with MongoDB & JWT Authentication",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware using origins strictly configured from .env
origins = settings.FRONTEND_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uploads directory
UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Include all API routes under /api and root fallback
all_routers = [
    auth_router,
    academic_years_router,
    sections_router,
    coordinators_router,
    students_router,
    conferences_router,
    applications_router,
    tracking_router,
    reports_router,
    notifications_router,
    upload_router,
    papers_router,
]

for r in all_routers:
    app.include_router(r, prefix="/api")
    # Also support direct path without /api (e.g. /auth/login as well as /api/auth/login)
    app.include_router(r, prefix="")

@app.api_route("/", methods=["GET", "HEAD"])
def root():
    return {
        "status": "online",
        "service": "Conferly Conference Management API",
        "version": "1.0.0",
        "documentation": "/docs"
    }

@app.api_route("/api/health", methods=["GET", "HEAD"])
def health_check():
    return {"status": "healthy", "service": "Conferly"}
