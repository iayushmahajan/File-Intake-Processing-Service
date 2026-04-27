from app.services.transformer import transform_row


def test_transform_row() -> None:
    transformed = transform_row(
        {
            "customer_id": " cust-001 ",
            "email": "  ALICE@EXAMPLE.COM ",
            "country": " de ",
            "signup_date": "2026-04-01",
            "order_amount": "125.5",
        }
    )

    assert transformed == {
        "customer_id": "CUST-001",
        "email": "alice@example.com",
        "country": "DE",
        "signup_date": "2026-04-01",
        "order_amount": "125.50",
    }