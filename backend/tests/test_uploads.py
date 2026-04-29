from fastapi.testclient import TestClient

from app.main import app


VALID_CSV = (
    b"customer_id,email,country,signup_date,order_amount,currency,payment_method,order_status,product_category,quantity,discount_percent,last_login_date\n"
    b"CUST-001,alice@example.com,DE,2026-04-01,125.50,EUR,card,completed,electronics,2,10,2026-04-10\n"
    b"CUST-002,bob@example.com,IN,2026-04-03,89.99,INR,paypal,pending,clothing,1,5,2026-04-09\n"
)

INVALID_CSV = (
    b"customer_id,email,country,signup_date,order_amount,currency,payment_method,order_status,product_category,quantity,discount_percent,last_login_date\n"
    b"CUST-001,alice@example.com,DE,2026-04-01,125.50,EUR,card,completed,electronics,2,10,2026-04-10\n"
    b",wrong-email,ZZ,01-04-2026,-20,BTC,cash,shipped,,0,150,wrong-date\n"
    b"CUST-003,charlie@example.com,US,2026-04-05,50.00,USD,card,completed,home,1,0,2026-04-12\n"
)


def test_upload_csv_success() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/uploads",
            files={"file": ("sample.csv", VALID_CSV, "text/csv")},
        )

    assert response.status_code == 200
    data = response.json()

    assert data["message"] == "File uploaded and processed successfully."
    assert data["original_filename"] == "sample.csv"
    assert data["saved_filename"].endswith("_sample.csv")
    assert data["processing_summary"]["total_rows"] == 2
    assert data["processing_summary"]["valid_rows"] == 2
    assert data["processing_summary"]["invalid_rows"] == 0
    assert data["processing_summary"]["cleaned_filename"].startswith("cleaned_")
    assert data["processing_summary"]["error_filename"].startswith("errors_")
    assert isinstance(data["job_id"], int)


def test_upload_csv_reject_non_csv() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/uploads",
            files={"file": ("sample.txt", b"hello", "text/plain")},
        )

    assert response.status_code == 400
    assert response.json() == {"detail": "Only CSV files are allowed."}


def test_upload_csv_with_invalid_rows() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/uploads",
            files={"file": ("invalid_sample.csv", INVALID_CSV, "text/csv")},
        )

    assert response.status_code == 200
    data = response.json()

    assert data["processing_summary"]["total_rows"] == 3
    assert data["processing_summary"]["valid_rows"] == 2
    assert data["processing_summary"]["invalid_rows"] == 1
    assert isinstance(data["job_id"], int)