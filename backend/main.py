import io
import re
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from correlation_engine import correlate_entities

app = FastAPI(
    title="Cyber Fraud Correlator API",
    description="Backend API for Cyber Fraud Analysis, Evidence Ingestion, and Correlation",
    version="0.2.0",
)

# Enable CORS for frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for ingested evidence records
IN_MEMORY_STORE: Dict[str, Any] = {
    "files": [],
    "records": {
        "telecom_cdr": [],
        "bank_upi": [],
        "unknown": [],
    },
}

# Schema definitions & synonym aliases for auto-detection and normalization
SCHEMA_DEFINITIONS = {
    "telecom_cdr": {
        "label": "Telecom / CDR",
        "key_fields": ["phone_number", "imei", "imsi", "tower_id", "call_type"],
        "columns": {
            "phone_number": [
                "phone_number", "phone", "calling_number", "msisdn",
                "mobile_number", "caller", "phone_no", "originating_number",
                "calling_num", "subscriber_number", "mobile", "target_number",
            ],
            "imei": [
                "imei", "imei_number", "device_imei", "imei_no",
                "handset_imei", "terminal_imei",
            ],
            "imsi": [
                "imsi", "imsi_number", "subscriber_id", "imsi_no",
                "sim_imsi", "sim_number",
            ],
            "tower_id": [
                "tower_id", "cell_id", "tower", "location_id", "cell_tower",
                "cell_tower_id", "cgi", "site_id", "cell_site",
            ],
            "call_type": [
                "call_type", "type", "calltype", "direction",
                "communication_type", "event_type", "service_type",
            ],
            "timestamp": [
                "timestamp", "date_time", "datetime", "call_time", "time",
                "call_date", "date", "event_time", "start_time",
            ],
            "duration": [
                "duration", "call_duration", "duration_sec", "duration_seconds",
                "duration_s", "duration_in_sec", "sec",
            ],
            "ip_address": [
                "ip_address", "ip", "client_ip", "device_ip", "source_ip",
            ],
        },
    },
    "bank_upi": {
        "label": "Bank / UPI Transaction",
        "key_fields": ["sender_account", "receiver_account", "upi_handle", "amount", "ip_address"],
        "columns": {
            "sender_account": [
                "sender_account", "from_account", "sender_acc", "remitter_account",
                "source_account", "account_no", "sender_account_no", "debit_account",
                "payer_account", "remitter_acc",
            ],
            "receiver_account": [
                "receiver_account", "to_account", "receiver_acc",
                "beneficiary_account", "destination_account", "recipient_account",
                "credit_account", "payee_account", "beneficiary_acc",
            ],
            "upi_handle": [
                "upi_handle", "upi_id", "vpa", "payer_upi", "payee_upi",
                "upi", "virtual_address", "upi_address", "payer_vpa", "payee_vpa",
            ],
            "phone_number": [
                "phone_number", "phone", "mobile", "remitter_mobile", "payer_phone",
            ],
            "amount": [
                "amount", "txn_amount", "transaction_amount", "transfer_amount",
                "value", "amount_inr", "sum", "amt",
            ],
            "timestamp": [
                "timestamp", "txn_time", "transaction_time", "txn_date",
                "date_time", "datetime", "time", "date", "transfer_date",
            ],
            "ip_address": [
                "ip_address", "ip", "client_ip", "device_ip", "source_ip",
                "user_ip", "terminal_ip", "origin_ip",
            ],
        },
    },
}


def sanitize_column_name(col_name: str) -> str:
    """Normalize column header into standardized snake_case format."""
    s = str(col_name).strip().lower()
    s = re.sub(r"[^\w\s]", "", s)
    s = re.sub(r"\s+", "_", s)
    return s


def detect_and_normalize_schema(df: pd.DataFrame) -> tuple[str, pd.DataFrame, Dict[str, str], List[str]]:
    """
    Detects whether DataFrame matches telecom_cdr, bank_upi, or unknown schema.
    Normalizes matching columns and produces any warnings.
    """
    original_cols = list(df.columns)
    col_mapping = {col: sanitize_column_name(col) for col in original_cols}
    sanitized_to_orig = {v: k for k, v in col_mapping.items()}
    sanitized_cols = set(col_mapping.values())

    best_match_type = "unknown"
    best_score = 0
    best_rename_map: Dict[str, str] = {}
    best_missing_keys: List[str] = []

    for schema_key, schema_info in SCHEMA_DEFINITIONS.items():
        matched_canonical_cols: Dict[str, str] = {}
        matched_key_count = 0

        for canonical_col, aliases in schema_info["columns"].items():
            matched_orig = None
            for alias in aliases:
                sanitized_alias = sanitize_column_name(alias)
                if sanitized_alias in sanitized_cols:
                    matched_orig = sanitized_to_orig[sanitized_alias]
                    break
            if matched_orig:
                matched_canonical_cols[matched_orig] = canonical_col
                if canonical_col in schema_info["key_fields"]:
                    matched_key_count += 1

        total_matches = len(matched_canonical_cols)
        # Weighted score giving higher weight to key identifying columns
        score = (matched_key_count * 2) + total_matches

        # Requirement: At least 2 key identifying fields or at least 3 total canonical matches
        if (matched_key_count >= 2 or total_matches >= 3) and score > best_score:
            best_score = score
            best_match_type = schema_key
            best_rename_map = matched_canonical_cols
            missing_recommended = [
                k for k in schema_info["columns"].keys()
                if k not in matched_canonical_cols.values()
            ]
            best_missing_keys = missing_recommended

    warnings: List[str] = []
    normalized_df = df.copy()

    if best_match_type != "unknown":
        normalized_df = normalized_df.rename(columns=best_rename_map)
        if best_missing_keys:
            warnings.append(f"Missing recommended columns for {best_match_type}: {', '.join(best_missing_keys)}")
    else:
        warnings.append("Could not confidently match Telecom or Bank/UPI schema. Stored as unknown schema.")

    return best_match_type, normalized_df, best_rename_map, warnings


def read_uploaded_file(filename: str, content: bytes) -> pd.DataFrame:
    """Reads CSV or XLSX bytes into a pandas DataFrame, preserving text string formats."""
    lower_filename = filename.lower()
    if lower_filename.endswith(".csv"):
        # Try UTF-8 first, fallback to Latin-1
        try:
            return pd.read_csv(io.BytesIO(content), dtype=str, keep_default_na=False)
        except UnicodeDecodeError:
            return pd.read_csv(io.BytesIO(content), encoding="latin1", dtype=str, keep_default_na=False)
    elif lower_filename.endswith((".xlsx", ".xls")):
        return pd.read_excel(io.BytesIO(content), dtype=str).fillna("")
    else:
        raise ValueError(f"Unsupported file format for '{filename}'. Allowed types are .csv, .xlsx, .xls")


@app.get("/api/health")
def get_health():
    return {
        "status": "ok",
        "message": "Backend is running",
        "version": "0.2.0",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/api/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    """
    Accepts one or more evidence files (CSV or XLSX), auto-detects schema,
    normalizes columns, and stores records into in-memory storage.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    file_results = []
    total_new_rows = 0

    for file in files:
        filename = file.filename or "unnamed_file"
        file_id = str(uuid.uuid4())
        warnings: List[str] = []

        try:
            content = await file.read()
            if not content:
                file_results.append({
                    "file_id": file_id,
                    "filename": filename,
                    "detected_type": "unknown",
                    "row_count": 0,
                    "status": "warning",
                    "normalized_columns": [],
                    "warnings": ["File is empty."],
                })
                continue

            df = read_uploaded_file(filename, content)
            row_count = len(df)

            if row_count == 0:
                warnings.append("File contains 0 data rows.")
                status = "warning"
                detected_type = "unknown"
                normalized_columns = []
            else:
                detected_type, normalized_df, rename_map, schema_warnings = detect_and_normalize_schema(df)
                warnings.extend(schema_warnings)
                status = "warning" if warnings else "success"
                normalized_columns = list(rename_map.values())

                # Convert DataFrame to clean dictionary records
                clean_records = normalized_df.to_dict(orient="records")
                for r in clean_records:
                    # Sanitize any NaN / float na values
                    for k, v in r.items():
                        if pd.isna(v):
                            r[k] = ""
                    r["_file_id"] = file_id
                    r["_filename"] = filename
                    r["_detected_type"] = detected_type
                    r["_ingested_at"] = datetime.utcnow().isoformat()

                # Store into in-memory structure
                IN_MEMORY_STORE["records"][detected_type].extend(clean_records)
                total_new_rows += row_count

            # Record file metadata
            file_meta = {
                "file_id": file_id,
                "filename": filename,
                "detected_type": detected_type,
                "row_count": row_count,
                "status": status,
                "normalized_columns": normalized_columns,
                "warnings": warnings,
                "uploaded_at": datetime.utcnow().isoformat(),
            }
            IN_MEMORY_STORE["files"].append(file_meta)
            file_results.append(file_meta)

        except ValueError as ve:
            file_results.append({
                "file_id": file_id,
                "filename": filename,
                "detected_type": "unknown",
                "row_count": 0,
                "status": "error",
                "normalized_columns": [],
                "warnings": [str(ve)],
            })
        except Exception as e:
            file_results.append({
                "file_id": file_id,
                "filename": filename,
                "detected_type": "unknown",
                "row_count": 0,
                "status": "error",
                "normalized_columns": [],
                "warnings": [f"Parsing error: {str(e)}"],
            })

    # Calculate overall summary breakdown
    summary_counts = {
        "telecom_cdr": len(IN_MEMORY_STORE["records"]["telecom_cdr"]),
        "bank_upi": len(IN_MEMORY_STORE["records"]["bank_upi"]),
        "unknown": len(IN_MEMORY_STORE["records"]["unknown"]),
        "total_files_stored": len(IN_MEMORY_STORE["files"]),
    }

    return {
        "status": "success",
        "files_processed": len(files),
        "total_rows_ingested": total_new_rows,
        "files": file_results,
        "store_summary": summary_counts,
    }


@app.get("/api/records/summary")
def get_records_summary():
    """Returns summary of all ingested files and record counts."""
    return {
        "total_files": len(IN_MEMORY_STORE["files"]),
        "files": IN_MEMORY_STORE["files"],
        "counts": {
            "telecom_cdr": len(IN_MEMORY_STORE["records"]["telecom_cdr"]),
            "bank_upi": len(IN_MEMORY_STORE["records"]["bank_upi"]),
            "unknown": len(IN_MEMORY_STORE["records"]["unknown"]),
            "total_records": sum(len(v) for v in IN_MEMORY_STORE["records"].values()),
        },
    }


@app.get("/api/records")
def get_records(
    record_type: Optional[str] = Query(None, description="telecom_cdr, bank_upi, or unknown"),
    limit: int = Query(50, ge=1, le=500),
):
    """Inspect ingested records for debugging and UI preview."""
    if record_type:
        if record_type not in IN_MEMORY_STORE["records"]:
            raise HTTPException(status_code=400, detail=f"Invalid record type '{record_type}'.")
        records = IN_MEMORY_STORE["records"][record_type][:limit]
        return {"record_type": record_type, "count": len(records), "records": records}

    all_records = []
    for r_type, r_list in IN_MEMORY_STORE["records"].items():
        for item in r_list[:limit]:
            all_records.append(item)

    return {"count": len(all_records), "records": all_records[:limit]}


@app.delete("/api/records")
def clear_records():
    """Resets in-memory storage for fresh ingestion testing."""
    IN_MEMORY_STORE["files"].clear()
    IN_MEMORY_STORE["records"]["telecom_cdr"].clear()
    IN_MEMORY_STORE["records"]["bank_upi"].clear()
    IN_MEMORY_STORE["records"]["unknown"].clear()
    return {"status": "cleared", "message": "In-memory records cleared successfully"}


@app.post("/api/correlate")
def correlate():
    """
    Executes cross-entity correlation across all currently stored evidence records.
    Extracts identifiers, constructs NetworkX graph, and identifies cross-file entity links.
    """
    return correlate_entities(IN_MEMORY_STORE["records"])


@app.get("/api/correlate")
def correlate_get():
    """Convenience GET endpoint to view current correlation results."""
    return correlate_entities(IN_MEMORY_STORE["records"])

