from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.core.config import INPUT_DIR
from app.core.logging import get_logger

logger = get_logger(__name__)


def save_upload_file(upload_file: UploadFile) -> tuple[str, Path]:
    INPUT_DIR.mkdir(parents=True, exist_ok=True)

    safe_name = upload_file.filename or "uploaded.csv"
    unique_filename = f"{uuid4().hex}_{safe_name}"
    destination = INPUT_DIR / unique_filename

    with destination.open("wb") as file_object:
        file_object.write(upload_file.file.read())

    logger.info(
        "Uploaded file saved",
        extra={
            "original_filename": upload_file.filename,
            "saved_filename": unique_filename,
            "destination": str(destination),
        },
    )

    return unique_filename, destination