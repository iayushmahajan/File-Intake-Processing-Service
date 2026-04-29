from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Dict, List, Tuple

REQUIRED_COLUMNS = [
    "customer_id",
    "email",
    "country",
    "signup_date",
    "order_amount",
    "currency",
    "payment_method",
    "order_status",
    "product_category",
    "quantity",
    "discount_percent",
    "last_login_date",
]

ALLOWED_COUNTRIES = {"DE", "FR", "IN", "US", "GB"}
ALLOWED_CURRENCIES = {"EUR", "USD", "INR"}
ALLOWED_PAYMENT_METHODS = {"card", "paypal", "bank_transfer"}
ALLOWED_ORDER_STATUS = {"completed", "pending", "cancelled"}


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

    currency = (row.get("currency") or "").strip().upper()
    payment_method = (row.get("payment_method") or "").strip().lower()
    order_status = (row.get("order_status") or "").strip().lower()
    product_category = (row.get("product_category") or "").strip()

    quantity_raw = (row.get("quantity") or "").strip()
    discount_raw = (row.get("discount_percent") or "").strip()
    last_login_date = (row.get("last_login_date") or "").strip()

    amount: Decimal | None = None

    if not customer_id:
        errors.append("customer_id is required")

    if not email:
        errors.append("email is required")
    elif "@" not in email or "." not in email.split("@")[-1]:
        errors.append("email must be valid")

    if not country:
        errors.append("country is required")
    elif country not in ALLOWED_COUNTRIES:
        errors.append("invalid country")

    if not signup_date:
        errors.append("signup_date is required")
    else:
        try:
            datetime.strptime(signup_date, "%Y-%m-%d")
        except ValueError:
            errors.append("invalid signup_date")

    if not order_amount_raw:
        errors.append("order_amount is required")
    else:
        try:
            amount = Decimal(order_amount_raw)
            if amount < 0:
                errors.append("negative order_amount")
        except InvalidOperation:
            errors.append("invalid order_amount")

    if not currency:
        errors.append("currency is required")
    elif currency not in ALLOWED_CURRENCIES:
        errors.append("invalid currency")

    if not payment_method:
        errors.append("payment_method is required")
    elif payment_method not in ALLOWED_PAYMENT_METHODS:
        errors.append("invalid payment_method")

    if not order_status:
        errors.append("order_status is required")
    elif order_status not in ALLOWED_ORDER_STATUS:
        errors.append("invalid order_status")

    if not product_category:
        errors.append("product_category required")

    if not quantity_raw:
        errors.append("quantity is required")
    else:
        try:
            quantity = int(quantity_raw)
            if quantity <= 0:
                errors.append("quantity must be > 0")
        except ValueError:
            errors.append("invalid quantity")

    if not discount_raw:
        errors.append("discount_percent is required")
    else:
        try:
            discount = Decimal(discount_raw)
            if discount < 0 or discount > 100:
                errors.append("invalid discount_percent")
        except InvalidOperation:
            errors.append("invalid discount_percent")

    if not last_login_date:
        errors.append("last_login_date is required")
    else:
        try:
            datetime.strptime(last_login_date, "%Y-%m-%d")
        except ValueError:
            errors.append("invalid last_login_date")

    # Cross-field business rules
    if country == "DE" and currency and currency != "EUR":
        errors.append("currency mismatch for country")

    if order_status == "completed" and amount is not None and amount == 0:
        errors.append("completed order with zero amount")

    return errors


def get_error_category(error: str) -> str:
    if "customer_id" in error:
        return "Customer ID"

    if "email" in error:
        return "Email"

    if "country" in error or "currency mismatch" in error:
        return "Country / Currency"

    if "signup_date" in error:
        return "Signup Date"

    if "order_amount" in error or "zero amount" in error:
        return "Order Amount"

    if "currency" in error:
        return "Currency"

    if "payment_method" in error:
        return "Payment Method"

    if "order_status" in error:
        return "Order Status"

    if "product_category" in error:
        return "Product Category"

    if "quantity" in error:
        return "Quantity"

    if "discount_percent" in error:
        return "Discount"

    if "last_login_date" in error:
        return "Last Login Date"

    if "Missing required columns" in error or "header row" in error:
        return "CSV Header"

    return "Other"