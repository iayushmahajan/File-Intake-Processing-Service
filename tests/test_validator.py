from app.services.validator import validate_csv_columns, validate_row


def test_validate_csv_columns_success() -> None:
    is_valid, errors = validate_csv_columns(
        ["customer_id", "email", "country", "signup_date", "order_amount"]
    )
    assert is_valid is True
    assert errors == []


def test_validate_csv_columns_missing_order_amount() -> None:
    is_valid, errors = validate_csv_columns(
        ["customer_id", "email", "country", "signup_date"]
    )
    assert is_valid is False
    assert errors == ["Missing required columns: order_amount"]


def test_validate_row_success() -> None:
    errors = validate_row(
        {
            "customer_id": "CUST-001",
            "email": "alice@example.com",
            "country": "DE",
            "signup_date": "2026-04-01",
            "order_amount": "125.50",
        },
        row_number=2,
    )
    assert errors == []


def test_validate_row_invalid_values() -> None:
    errors = validate_row(
        {
            "customer_id": "",
            "email": "not-an-email",
            "country": "ZZ",
            "signup_date": "01-04-2026",
            "order_amount": "-20",
        },
        row_number=3,
    )

    assert "customer_id is required" in errors
    assert "email must be a valid email address" in errors
    assert "country must be one of: DE, FR, GB, IN, US" in errors
    assert "signup_date must be in YYYY-MM-DD format" in errors
    assert "order_amount must be non-negative" in errors