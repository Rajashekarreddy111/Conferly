import logging
from pymongo import ASCENDING, IndexModel
from app.database.connection import get_database

logger = logging.getLogger("conferly.indexes")

async def init_indexes():
    """Initializes unique and query indexes for all MongoDB collections."""
    db = get_database()
    
    try:
        # Users Collection
        await db["users"].create_indexes([
            IndexModel([("email", ASCENDING)], unique=True, sparse=True),
            IndexModel([("username", ASCENDING)], unique=True, sparse=True),
            IndexModel([("rollNumber", ASCENDING)], unique=True, sparse=True),
            IndexModel([("role", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
        ])
        
        # Academic Years
        await db["academic_years"].create_indexes([
            IndexModel([("year", ASCENDING)], unique=True),
            IndexModel([("status", ASCENDING)]),
        ])
        
        # Class Sections
        await db["sections"].create_indexes([
            IndexModel([("academicYear", ASCENDING), ("sectionName", ASCENDING)], unique=True),
            IndexModel([("sectionName", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
        ])
        
        # Coordinators
        await db["coordinators"].create_indexes([
            IndexModel([("email", ASCENDING)], unique=True),
            IndexModel([("assignedSections", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
        ])
        
        # Students
        await db["students"].create_indexes([
            IndexModel([("rollNumber", ASCENDING)], unique=True),
            IndexModel([("email", ASCENDING)], unique=True),
            IndexModel([("section", ASCENDING)]),
            IndexModel([("academicYear", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
        ])
        
        # Conferences
        await db["conferences"].create_indexes([
            IndexModel([("fullName", ASCENDING), ("shortName", ASCENDING)], unique=True),
            IndexModel([("deadline", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
            IndexModel([("scope", ASCENDING)]),
            IndexModel([("targetSections", ASCENDING)]),
        ])
        
        # Applications (Unique student-conference pair)
        await db["applications"].create_indexes([
            IndexModel([("conferenceId", ASCENDING), ("rollNumber", ASCENDING)], unique=True),
            IndexModel([("conferenceId", ASCENDING)]),
            IndexModel([("studentId", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
        ])
        
        # Notifications
        await db["notifications"].create_indexes([
            IndexModel([("userId", ASCENDING)]),
            IndexModel([("conferenceId", ASCENDING)]),
            IndexModel([("createdAt", ASCENDING)]),
        ])
        
        # Base Papers Collection (Unique normalizedTitle to prevent duplicate titles)
        await db["base_papers"].create_indexes([
            IndexModel([("normalizedTitle", ASCENDING)], unique=True),
            IndexModel([("rollNumber", ASCENDING)], unique=True),
            IndexModel([("paperId", ASCENDING)], unique=True),
            IndexModel([("studentId", ASCENDING)]),
            IndexModel([("section", ASCENDING)]),
            IndexModel([("academicYear", ASCENDING)]),
        ])

        # OTPs (with TTL auto-expiry)
        await db["otps"].create_indexes([
            IndexModel([("email", ASCENDING), ("purpose", ASCENDING)]),
            IndexModel([("createdAt", ASCENDING)]),
            IndexModel([("expiresAt", ASCENDING)], expireAfterSeconds=0),
        ])

        # Password Reset Tokens (Single-use, short-lived)
        await db["password_reset_tokens"].create_indexes([
            IndexModel([("resetToken", ASCENDING)], unique=True),
            IndexModel([("email", ASCENDING)]),
            IndexModel([("expiresAt", ASCENDING)], expireAfterSeconds=0),
        ])
        
        logger.info("Successfully verified and created all MongoDB collection indexes")
    except Exception as e:
        logger.warning(f"Note on index creation: {e}")
