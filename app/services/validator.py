from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Dict, List, Tuple

REQUIRED_COLUMNS = [
    "customer_id",
    "email",
    "country",
    "signup_date",
    "order_amount",
]

ALLOWED_COUNTRIES = {"DE", "FR", "IN", "US", "GB"}


def validate_csv_columns(fieldnames: List[str] | None) -> Tuple[bool, List[str]]:
    if fieldnames is None:
        return False, ["CSV file is missing a header row."]

    missing_columns = [column for column in REQUIRED_COLUMNS if column not in fieldnames]

    if missing_columns:
        return False, [f"Missing required columns: {', '.join(missing_columns)}"]

    return True, []


def validate_row(row: Dict[str, str], row_number: int) -> List[str]:
    errors: List[str] = []

    customer_id = (row.get("customer_id") or "").strip()
    email = (row.get("email") or "").strip()
    country = (row.get("country") or "").strip().upper()
    signup_date = (row.get("signup_date") or "").strip()
    order_amount_raw = (row.get("order_amount") or "").strip()

    if not customer_id:
        errors.append("customer_id is required")

    if not email:
        errors.append("email is required")
    elif "@" not in email or "." not in email.split("@")[-1]:
        errors.append("email must be a valid email address")

    if not country:
        errors.append("country is required")
    elif country not in ALLOWED_COUNTRIES:
        errors.append(f"country must be one of: {', '.join(sorted(ALLOWED_COUNTRIES))}")

    if not signup_date:
        errors.append("signup_date is required")
    else:
        try:
            datetime.strptime(signup_date, "%Y-%m-%d")
        except ValueError:
            errors.append("signup_date must be in YYYY-MM-DD format")

    if not order_amount_raw:
        errors.append("order_amount is required")
    else:
        try:
            amount = Decimal(order_amount_raw)
            if amount < 0:
                errors.append("order_amount must be non-negative")
        except InvalidOperation:
            errors.append("order_amount must be a valid number")

    return errors