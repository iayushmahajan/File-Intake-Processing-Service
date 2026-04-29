from fastapi.testclient import TestClient

from app.main import app


VALID_CSV = (
    b"customer_id,email,country,signup_date,order_amount,currency,payment_method,order_status,product_category,quantity,discount_percent,last_login_date\n"
    b"CUST-001,alice@example.com,DE,2026-04-01,125.50,EUR,card,completed,electronics,2,10,2026-04-10\n"
)

INVALID_CSV = (
    b"customer_id,email,country,signup_date,order_amount,currency,payment_method,order_status,product_category,quantity,discount_percent,last_login_date\n"
    b",wrong-email,ZZ,01-04-2026,-20,BTC,cash,shipped,,0,150,wrong-date\n"
)


def create_job(client: TestClient, filename: str = "sample.csv") -> int:
    response = client.post(
        "/api/v1/uploads",
        files={"file": (filename, VALID_CSV, "text/csv")},
    )

    assert response.status_code == 200
    return response.json()["job_id"]


def create_invalid_job(client: TestClient, filename: str = "invalid.csv") -> int:
    response = client.post(
        "/api/v1/uploads",
        files={"file": (filename, INVALID_CSV, "text/csv")},
    )

    assert response.status_code == 200
    return response.json()["job_id"]


def test_list_jobs_empty() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/jobs")

    assert response.status_code == 200
    assert response.json() == {"jobs": []}


def test_get_job_by_id() -> None:
    with TestClient(app) as client:
        job_id = create_job(client, filename="single_job.csv")

        response = client.get(f"/api/v1/jobs/{job_id}")

    assert response.status_code == 200
    data = response.json()

    assert data["id"] == job_id
    assert data["filename_original"] == "single_job.csv"
    assert data["status"] == "completed"
    assert data["total_rows"] == 1
    assert data["valid_rows"] == 1
    assert data["invalid_rows"] == 0


def test_get_job_by_id_not_found() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/jobs/999999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Job not found."}


def test_download_cleaned_file() -> None:
    with TestClient(app) as client:
        job_id = create_job(client, filename="clean_download.csv")

        response = client.get(f"/api/v1/jobs/{job_id}/download/clean")

    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "customer_id,email,country,signup_date,order_amount,currency" in response.text
    assert "CUST-001,alice@example.com,DE,2026-04-01,125.50,EUR" in response.text


def test_download_error_file() -> None:
    with TestClient(app) as client:
        job_id = create_invalid_job(client, filename="error_download.csv")

        response = client.get(f"/api/v1/jobs/{job_id}/download/errors")

    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "customer_id is required" in response.text
    assert "email must be valid" in response.text
    assert "invalid country" in response.text
    assert "invalid currency" in response.text
    assert "invalid payment_method" in response.text


def test_download_cleaned_file_job_not_found() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/jobs/999999/download/clean")

    assert response.status_code == 404
    assert response.json() == {"detail": "Job not found."}


def test_download_error_file_job_not_found() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/jobs/999999/download/errors")

    assert response.status_code == 404
    assert response.json() == {"detail": "Job not found."}