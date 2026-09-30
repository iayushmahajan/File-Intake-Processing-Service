import re
from pathlib import Path
from uuid import uuid4

from app.core.config import INPUT_DIR, MAX_UPLOAD_BYTES
from fastapi import HTTPException, UploadFile


def save_upload_file(upload_file: UploadFile) -> tuple[str, Path]:
    INPUT_DIR.mkdir(parents=True, exist_ok=True)
    original = (
        (upload_file.filename or "uploaded.csv").replace("\\", "/").split("/")[-1]
    )
    safe_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", original)[:150] or "uploaded.csv"
    unique_filename = f"{uuid4().hex}_{safe_name}"
    destination = INPUT_DIR / unique_filename
    try:
        with destination.open("xb") as output:
            size = 0
            while chunk := upload_file.file.read(64 * 1024):
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        413, "File exceeds the configured upload size limit."
                    )
                output.write(chunk)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    return unique_filename, destination
