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

    currency = (row.get("currency") or "").strip().upper()
    payment_method = (row.get("payment_method") or "").strip().lower()
    order_status = (row.get("order_status") or "").strip().lower()
    product_category = (row.get("product_category") or "").strip()

    quantity_raw = (row.get("quantity") or "").strip()
    quantity = str(int(quantity_raw))

    discount_raw = (row.get("discount_percent") or "").strip()
    discount_percent = f"{Decimal(discount_raw):.2f}"

    last_login_date_raw = (row.get("last_login_date") or "").strip()
    last_login_date = datetime.strptime(
        last_login_date_raw, "%Y-%m-%d"
    ).strftime("%Y-%m-%d")

    return {
        "customer_id": customer_id,
        "email": email,
        "country": country,
        "signup_date": signup_date,
        "order_amount": order_amount,
        "currency": currency,
        "payment_method": payment_method,
        "order_status": order_status,
        "product_category": product_category,
        "quantity": quantity,
        "discount_percent": discount_percent,
        "last_login_date": last_login_date,
    }