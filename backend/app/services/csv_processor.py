import csv
import re
from pathlib import Path
from typing import Dict, List, Tuple

from app.core.config import OUTPUT_DIR
from app.core.logging import get_logger
from app.services.analyzer import analyze_processed_data
from app.services.report_generator import write_cleaned_csv, write_error_csv
from app.services.transformer import transform_row
from app.services.validator import (
    REQUIRED_COLUMNS,
    get_error_category,
    validate_csv_columns,
    validate_row,
)

logger = get_logger(__name__)


def add_errors_to_breakdown(error_breakdown: Dict[str, int], errors: List[str]) -> None:
    for error in errors:
        category = get_error_category(error)
        error_breakdown[category] = error_breakdown.get(category, 0) + 1


def strip_saved_file_prefix(input_path: Path) -> str:
    """
    Uploaded files are stored with a UUID prefix, for example:
    6a6cba5543aa49ecac565829aa86269e_normal_demo.csv

    For output files, we want user-friendly names:
    normal_demo_clean.csv
    normal_demo_errors.csv
    """
    stem = input_path.stem

    parts = stem.split("_", 1)

    if len(parts) == 2:
        possible_uuid, original_stem = parts

        if re.fullmatch(r"[a-fA-F0-9]{32}", possible_uuid):
            return original_stem

    return stem


def sanitize_filename_stem(value: str) -> str:
    sanitized = re.sub(r"[^a-zA-Z0-9_-]+", "_", value.strip())
    sanitized = sanitized.strip("_")

    return sanitized or "processed_file"


def build_output_paths(input_path: Path) -> Tuple[str, Path, str, Path]:
    # The input's UUID identifies this upload; no check-then-write allocation.
    stem = sanitize_filename_stem(input_path.stem)
    clean = OUTPUT_DIR / f"{stem}_clean.csv"
    errors = OUTPUT_DIR / f"{stem}_errors.csv"
    return clean.name, clean, errors.name, errors


def process_csv_file(input_path: Path) -> Dict[str, object]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    logger.info(
        "Starting CSV processing",
        extra={"input_path": str(input_path)},
    )

    missing_cells = 0
    seen_records: set[tuple] = set()
    duplicate_records = 0
    source_rows: list[int] = []
    valid_rows: List[Dict[str, str]] = []
    error_rows: List[Dict[str, str]] = []
    error_breakdown: Dict[str, int] = {}

    cleaned_filename, cleaned_path, error_filename, error_path = build_output_paths(
        input_path
    )

    with input_path.open("r", newline="", encoding="utf-8-sig") as csvfile:
        reader = csv.DictReader(csvfile, strict=True)

        columns_valid, column_errors = validate_csv_columns(reader.fieldnames)

        if not columns_valid:
            add_errors_to_breakdown(error_breakdown, column_errors)

            header_error_rows = [
                {
                    "row_number": "0",
                    "customer_id": "",
                    "email": "",
                    "country": "",
                    "signup_date": "",
                    "order_amount": "",
                    "currency": "",
                    "payment_method": "",
                    "order_status": "",
                    "product_category": "",
                    "quantity": "",
                    "discount_percent": "",
                    "last_login_date": "",
                    "errors": "; ".join(column_errors),
                }
            ]

            write_error_csv(error_path, header_error_rows)

            analysis = analyze_processed_data(
                valid_rows=[],
                error_rows=[],
                error_breakdown=error_breakdown,
            )

            analysis["validation_issue_count"] = len(column_errors)
            analysis["error_preview"] = header_error_rows

            logger.warning(
                "CSV header validation failed",
                extra={
                    "input_path": str(input_path),
                    "errors": column_errors,
                    "error_file": str(error_path),
                },
            )

            return {
                "status": "failed",
                "error_message": "; ".join(column_errors),
                "total_rows": 0,
                "valid_rows": 0,
                "invalid_rows": 0,
                "cleaned_filename": "",
                "error_filename": error_filename,
                "cleaned_path": "",
                "error_path": str(error_path),
                "error_breakdown": error_breakdown,
                "analysis": analysis,
            }

        for row_number, row in enumerate(reader, start=2):
            errors = validate_row(row, row_number)
            missing_cells += sum(
                not (row.get(key) or "").strip() for key in REQUIRED_COLUMNS
            )
            if None in row or any(row.get(key) is None for key in REQUIRED_COLUMNS):
                errors.append("CSV column count does not match header")
            fingerprint = tuple(
                (row.get(key) or "").strip().casefold() for key in REQUIRED_COLUMNS
            )
            if fingerprint in seen_records:
                duplicate_records += 1
                errors.append("duplicate record: identical required field values")
            seen_records.add(fingerprint)

            if errors:
                add_errors_to_breakdown(error_breakdown, errors)

                error_rows.append(
                    {
                        "row_number": str(row_number),
                        "customer_id": row.get("customer_id", ""),
                        "email": row.get("email", ""),
                        "country": row.get("country", ""),
                        "signup_date": row.get("signup_date", ""),
                        "order_amount": row.get("order_amount", ""),
                        "currency": row.get("currency", ""),
                        "payment_method": row.get("payment_method", ""),
                        "order_status": row.get("order_status", ""),
                        "product_category": row.get("product_category", ""),
                        "quantity": row.get("quantity", ""),
                        "discount_percent": row.get("discount_percent", ""),
                        "last_login_date": row.get("last_login_date", ""),
                        "errors": "; ".join(errors),
                    }
                )
            else:
                valid_rows.append(transform_row(row))
                source_rows.append(row_number)

    write_cleaned_csv(cleaned_path, valid_rows)
    write_error_csv(error_path, error_rows)

    total_rows = len(valid_rows) + len(error_rows)

    analysis = analyze_processed_data(
        valid_rows=valid_rows,
        error_rows=error_rows,
        error_breakdown=error_breakdown,
    )

    from app.services.quality import calculate_quality

    for anomaly in analysis["anomalies"]:
        anomaly["row"] = source_rows[anomaly["row"] - 1]
    analysis["quality"] = calculate_quality(
        total_rows,
        len(valid_rows),
        missing_cells,
        len(REQUIRED_COLUMNS),
        duplicate_records,
        len({item["row"] for item in analysis["anomalies"]}),
    )
    analysis["error_preview"] = error_rows[:100]
    analysis["anomaly_count"] = len(analysis["anomalies"])
    analysis["anomalies"] = analysis["anomalies"][:100]
    analysis["validation_issue_count"] = sum(error_breakdown.values())
    analysis["duplicate_records"] = duplicate_records
    analysis["missing_cells"] = missing_cells
    analysis["error_patterns"] = analysis["error_patterns"][:20]

    logger.info(
        "CSV processing completed",
        extra={
            "input_path": str(input_path),
            "total_rows": total_rows,
            "valid_rows": len(valid_rows),
            "invalid_rows": len(error_rows),
            "cleaned_file": str(cleaned_path),
            "error_file": str(error_path),
            "error_breakdown": error_breakdown,
        },
    )

    return {
        "status": "completed" if total_rows else "failed",
        "error_message": None if total_rows else "CSV contains no data records.",
        "total_rows": total_rows,
        "valid_rows": len(valid_rows),
        "invalid_rows": len(error_rows),
        "cleaned_filename": cleaned_filename,
        "error_filename": error_filename,
        "cleaned_path": str(cleaned_path),
        "error_path": str(error_path),
        "error_breakdown": error_breakdown,
        "analysis": analysis,
    }
