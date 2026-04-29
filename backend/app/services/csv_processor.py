import csv
from pathlib import Path
from typing import Dict, List
from uuid import uuid4

from app.core.config import OUTPUT_DIR
from app.core.logging import get_logger
from app.services.analyzer import analyze_processed_data
from app.services.report_generator import write_cleaned_csv, write_error_csv
from app.services.transformer import transform_row
from app.services.validator import (
    get_error_category,
    validate_csv_columns,
    validate_row,
)

logger = get_logger(__name__)


def add_errors_to_breakdown(error_breakdown: Dict[str, int], errors: List[str]) -> None:
    for error in errors:
        category = get_error_category(error)
        error_breakdown[category] = error_breakdown.get(category, 0) + 1


def process_csv_file(input_path: Path) -> Dict[str, object]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    logger.info(
        "Starting CSV processing",
        extra={"input_path": str(input_path)},
    )

    valid_rows: List[Dict[str, str]] = []
    error_rows: List[Dict[str, str]] = []
    error_breakdown: Dict[str, int] = {}

    with input_path.open("r", newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)

        columns_valid, column_errors = validate_csv_columns(reader.fieldnames)

        if not columns_valid:
            add_errors_to_breakdown(error_breakdown, column_errors)

            error_filename = f"errors_{uuid4().hex}.csv"
            error_path = OUTPUT_DIR / error_filename

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
                error_rows=header_error_rows,
                error_breakdown=error_breakdown,
            )

            logger.warning(
                "CSV header validation failed",
                extra={
                    "input_path": str(input_path),
                    "errors": column_errors,
                    "error_file": str(error_path),
                },
            )

            return {
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

    cleaned_filename = f"cleaned_{uuid4().hex}.csv"
    error_filename = f"errors_{uuid4().hex}.csv"

    cleaned_path = OUTPUT_DIR / cleaned_filename
    error_path = OUTPUT_DIR / error_filename

    write_cleaned_csv(cleaned_path, valid_rows)
    write_error_csv(error_path, error_rows)

    total_rows = len(valid_rows) + len(error_rows)

    analysis = analyze_processed_data(
        valid_rows=valid_rows,
        error_rows=error_rows,
        error_breakdown=error_breakdown,
    )

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