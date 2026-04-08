import csv
from pathlib import Path
from typing import Dict, List


CLEANED_FIELDNAMES = [
    "customer_id",
    "email",
    "country",
    "signup_date",
    "order_amount",
]

ERROR_FIELDNAMES = [
    "row_number",
    "customer_id",
    "email",
    "country",
    "signup_date",
    "order_amount",
    "errors",
]


def write_cleaned_csv(output_path: Path, rows: List[Dict[str, str]]) -> None:
    with output_path.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=CLEANED_FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def write_error_csv(output_path: Path, rows: List[Dict[str, str]]) -> None:
    with output_path.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=ERROR_FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)