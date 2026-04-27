from fastapi.testclient import TestClient

from app.main import app


def test_upload_csv_success() -> None:
    file_content = (
        b"customer_id,email,country,signup_date,order_amount\n"
        b"CUST-001,alice@example.com,DE,2026-04-01,125.50\n"
        b"CUST-002,bob@example.com,IN,2026-04-03,89.99\n"
    )

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/uploads",
            files={"file": ("sample.csv", file_content, "text/csv")},
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
    file_content = (
        b"customer_id,email,country,signup_date,order_amount\n"
        b"CUST-001,alice@example.com,DE,2026-04-01,125.50\n"
        b",wrong-email,ZZ,01-04-2026,-20\n"
        b"CUST-003,charlie@example.com,US,2026-04-05,50.00\n"
    )

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/uploads",
            files={"file": ("invalid_sample.csv", file_content, "text/csv")},
        )

    assert response.status_code == 200
    data = response.json()

    assert data["processing_summary"]["total_rows"] == 3
    assert data["processing_summary"]["valid_rows"] == 2
    assert data["processing_summary"]["invalid_rows"] == 1
    assert isinstance(data["job_id"], int)