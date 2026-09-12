import io
import os
import sys
import pandas as pd

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app, IN_MEMORY_STORE
from fastapi.testclient import TestClient

client = TestClient(app)

def run_tests():
    print("=== Testing Cyber Fraud Ingestion API ===")
    project_root = os.path.abspath(os.path.join(backend_dir, ".."))
    cdr_path = os.path.join(project_root, "sample-data", "cdr_sample.csv")
    bank_path = os.path.join(project_root, "sample-data", "bank_upi_sample.csv")

    # 1. Test Health endpoint
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[PASS] Health endpoint OK:", res.json()["status"])

    # 2. Test uploading cdr_sample.csv and bank_upi_sample.csv
    with open(cdr_path, "rb") as cdr_f, open(bank_path, "rb") as bank_f:
        files = [
            ("files", ("cdr_sample.csv", cdr_f, "text/csv")),
            ("files", ("bank_upi_sample.csv", bank_f, "text/csv")),
        ]
        res = client.post("/api/upload", files=files)
        assert res.status_code == 200, f"Upload failed: {res.text}"
        data = res.json()

        print("[PASS] Upload Response Status:", data["status"])
        print("[PASS] Files processed:", data["files_processed"])
        print("[PASS] Total rows ingested:", data["total_rows_ingested"])

        assert data["files_processed"] == 2
        assert data["total_rows_ingested"] == 36

        cdr_res = next(f for f in data["files"] if f["filename"] == "cdr_sample.csv")
        bank_res = next(f for f in data["files"] if f["filename"] == "bank_upi_sample.csv")

        assert cdr_res["detected_type"] == "telecom_cdr", f"Expected telecom_cdr, got {cdr_res['detected_type']}"
        assert cdr_res["row_count"] == 18
        assert "phone_number" in cdr_res["normalized_columns"]
        print(f"[PASS] CDR parsed successfully: {cdr_res['row_count']} rows, type={cdr_res['detected_type']}")

        assert bank_res["detected_type"] == "bank_upi", f"Expected bank_upi, got {bank_res['detected_type']}"
        assert bank_res["row_count"] == 18
        assert "upi_handle" in bank_res["normalized_columns"]
        print(f"[PASS] Bank parsed successfully: {bank_res['row_count']} rows, type={bank_res['detected_type']}")

    # 3. Test Unknown CSV handling (should not crash, return status 'warning', type 'unknown')
    unknown_csv = b"item_id,category,warehouse_location,stock_qty\n101,Electronics,W-4,50\n102,Apparel,W-2,120\n"
    files = [
        ("files", ("inventory_report.csv", io.BytesIO(unknown_csv), "text/csv"))
    ]
    res = client.post("/api/upload", files=files)
    assert res.status_code == 200, f"Unknown CSV upload crashed: {res.text}"
    unk_data = res.json()
    unk_file = unk_data["files"][0]
    assert unk_file["detected_type"] == "unknown", f"Expected unknown, got {unk_file['detected_type']}"
    assert unk_file["row_count"] == 2
    print(f"[PASS] Unknown file handled safely: type={unk_file['detected_type']}, row_count={unk_file['row_count']}")

    # 4. Test XLSX generation and upload
    df_excel = pd.DataFrame({
        "Phone No": ["+919876543210", "+919123456789"],
        "IMEI Number": ["864209041234567", "860123049876543"],
        "Tower ID": ["TOW-DL-0104", "TOW-JH-0033"],
        "Call Duration": ["120", "45"],
    })
    excel_buffer = io.BytesIO()
    df_excel.to_excel(excel_buffer, index=False)
    excel_buffer.seek(0)

    files = [
        ("files", ("telecom_records.xlsx", excel_buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
    ]
    res = client.post("/api/upload", files=files)
    assert res.status_code == 200, f"XLSX upload failed: {res.text}"
    xlsx_res = res.json()["files"][0]
    assert xlsx_res["detected_type"] == "telecom_cdr", f"Expected telecom_cdr from xlsx, got {xlsx_res['detected_type']}"
    assert xlsx_res["row_count"] == 2
    print(f"[PASS] XLSX auto-detected and normalized: type={xlsx_res['detected_type']}, rows={xlsx_res['row_count']}")

    # 5. Test GET /api/records/summary
    res = client.get("/api/records/summary")
    assert res.status_code == 200
    summary = res.json()
    print("[PASS] In-memory store summary:", summary["counts"])
    assert summary["counts"]["telecom_cdr"] == 20
    assert summary["counts"]["bank_upi"] == 18
    assert summary["counts"]["unknown"] == 2

    # 6. Test GET /api/records
    res = client.get("/api/records?record_type=telecom_cdr&limit=5")
    assert res.status_code == 200
    records_data = res.json()
    assert len(records_data["records"]) == 5
    assert "_filename" in records_data["records"][0]
    print("[PASS] Records retrieval OK. Sample record:", records_data["records"][0])

    # 7. Test POST /api/correlate
    res = client.post("/api/correlate")
    assert res.status_code == 200, f"Correlate endpoint failed: {res.text}"
    correlate_data = res.json()
    assert "nodes" in correlate_data
    assert "edges" in correlate_data
    assert "summary" in correlate_data
    assert correlate_data["summary"]["total_nodes"] > 0
    assert correlate_data["summary"]["number_of_cross_file_links"] > 0
    print("[PASS] Correlate endpoint OK. Nodes:", correlate_data["summary"]["total_nodes"],
          "Edges:", correlate_data["summary"]["total_edges"],
          "Cross-file links:", correlate_data["summary"]["number_of_cross_file_links"])

    print("\nALL INGESTION & CORRELATION BACKEND TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
