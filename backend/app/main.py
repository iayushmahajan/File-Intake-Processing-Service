from contextlib import asynccontextmanager


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.health import router as health_router
from app.api.routes.jobs import router as jobs_router
from app.api.routes.uploads import router as uploads_router
from app.core.config import APP_DESCRIPTION, APP_NAME, APP_VERSION
from app.core.db import create_db_and_tables
from app.core.logging import configure_logging, get_logger
from app.models.processing_job import ProcessingJob

configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application startup initiated")
    create_db_and_tables()
    logger.info("Database tables ensured")
    yield
    logger.info("Application shutdown complete")


app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description=APP_DESCRIPTION,
    lifespan=lifespan,
)

app.include_router(health_router)
app.include_router(uploads_router)
app.include_router(jobs_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["root"])
def root() -> dict[str, str]:
    return {"message": "File Intake & Processing Service is running"}