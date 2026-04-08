from datetime import datetime
from decimal import Decimal
from typing import Dict


def transform_row(row: Dict[str, str]) -> Dict[str, str]:
    customer_id = (row.get("customer_id") or "").strip().upper()
    email = (row.get("email") or "").strip().lower()
    country = (row.get("country") or "").strip().upper()

    signup_date_raw = (row.get("signup_date") or "").strip()
    signup_date = datetime.strptime(signup_date_raw, "%Y-%m-%d").strftime("%Y-%m-%d")

    order_amount_raw = (row.get("order_amount") or "").strip()
    order_amount = f"{Decimal(order_amount_raw):.2f}"

    return {
        "customer_id": customer_id,
        "email": email,
        "country": country,
        "signup_date": signup_date,
        "order_amount": order_amount,
    }