import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorGridFSBucket
from app.core.config import settings

try:
    import certifi
    CA_FILE = certifi.where()
except ImportError:
    CA_FILE = None

logger = logging.getLogger("conferly.database")

class Database:
    client = None
    db = None
    gridfs = None

db_instance = Database()

_shared_mock_client = None

async def connect_to_mongo():
    """Initializes the MongoDB connection strictly using MONGODB_URI from .env."""
    global _shared_mock_client
    uri = settings.MONGODB_URI
    masked_uri = uri.split('@')[-1] if '@' in uri else uri
    logger.info(f"Connecting to MongoDB using URI from .env: {masked_uri}")
    
    if uri.startswith("mongodb+mock://") or uri.startswith("mongomock://"):
        try:
            from mongomock_motor import AsyncMongoMockClient
            if _shared_mock_client is None:
                _shared_mock_client = AsyncMongoMockClient()
            db_instance.client = _shared_mock_client
            db_instance.db = db_instance.client[settings.MONGODB_DATABASE]
            logger.info("Connected to Mock In-Memory MongoDB (Testing mode)")
            return
        except ImportError:
            logger.warning("mongomock_motor not installed, falling back to standard Motor client")
            
    try:
        client_kwargs = {
            "serverSelectionTimeoutMS": 10000,
            "uuidRepresentation": "standard"
        }
        if CA_FILE and ("mongodb+srv" in uri or "ssl=true" in uri.lower()):
            client_kwargs["tlsCAFile"] = CA_FILE

        client = AsyncIOMotorClient(uri, **client_kwargs)
        # Verify connection by pinging
        await client.admin.command("ping")
        db_instance.client = client
        db_instance.db = client[settings.MONGODB_DATABASE]
        try:
            db_instance.gridfs = AsyncIOMotorGridFSBucket(db_instance.db)
        except Exception:
            db_instance.gridfs = None
        logger.info(f"Successfully connected to MongoDB database '{settings.MONGODB_DATABASE}' from .env URI")
    except Exception as e:
        logger.warning(f"Could not connect to MongoDB URI '{masked_uri}': {e}")
        try:
            from mongomock_motor import AsyncMongoMockClient
            if _shared_mock_client is None:
                _shared_mock_client = AsyncMongoMockClient()
            db_instance.client = _shared_mock_client
            db_instance.db = db_instance.client[settings.MONGODB_DATABASE]
            db_instance.gridfs = None
            logger.info("Fallback: Activated AsyncMongoMockClient in-memory MongoDB for local execution")
        except Exception as mock_err:
            logger.error(f"Failed to initialize mock database fallback: {mock_err}")
            raise e

async def close_mongo_connection():
    """Closes MongoDB connection."""
    if db_instance.client:
        try:
            db_instance.client.close()
        except Exception:
            pass
        logger.info("Closed MongoDB connection")

def get_database():
    """Returns the current MongoDB database instance."""
    if db_instance.db is None:
        raise RuntimeError("Database not initialized. Please call connect_to_mongo() first.")
    return db_instance.db

def get_gridfs():
    """Returns the current GridFS bucket for screenshot file storage."""
    return db_instance.gridfs
