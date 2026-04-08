from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
INPUT_DIR = DATA_DIR / "input"
OUTPUT_DIR = DATA_DIR / "output"
DB_PATH = BASE_DIR / "file_processing.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

APP_NAME = "File Intake & Processing Service"
APP_VERSION = "0.1.0"
APP_DESCRIPTION = (
    "Backend API for customer CSV upload, validation, transformation, and job tracking."
)