import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.database import init_db
from app.core.exceptions import TaskFlowException
from app.core.redis import redis_service
from app.utils.seed_data import seed_database

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("taskflow.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}...")
    try:
        await init_db()
    except Exception as e:
        logger.error(f"Error during database initialization: {e}")
    
    await redis_service.connect()

    # Seed initial demo data
    try:
        from app.core import database as db_module
        async with db_module.AsyncSessionLocal() as session:
            await seed_database(session)
    except Exception as e:
        logger.warning(f"Could not auto-seed database: {e}")

    yield

    # Shutdown
    logger.info("Shutting down TaskFlow service...")
    await redis_service.disconnect()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(TaskFlowException)
async def taskflow_exception_handler(request: Request, exc: TaskFlowException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for Docker container probes."""
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "redis_connected": redis_service.is_available
    }


@app.get("/", tags=["Health"])
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "docs": f"{settings.API_V1_STR}/docs",
        "health": "/health"
    }


# Include API v1 Router
app.include_router(api_v1_router, prefix=settings.API_V1_STR)
