import React, { useState, useRef } from 'react'
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  RefreshCw,
  Eye,
  FileText,
  AlertCircle,
  Database,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'

export default function UploadPage({ onUploadComplete, initialSummary }) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [activePreviewType, setActivePreviewType] = useState(null)
  const [previewRecords, setPreviewRecords] = useState([])
  const [loadingPreview, setLoadingPreview] = useState(false)
  const fileInputRef = useRef(null)

  // Handle Drag events
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  // Handle Drop event
  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files))
    }
  }

  // File picker handler
  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files))
    }
  }

  const addFiles = (newFiles) => {
    setErrorMessage(null)
    const validExtensions = ['.csv', '.xlsx', '.xls']
    const validFiles = []
    const invalidNames = []

    newFiles.forEach((file) => {
      const lower = file.name.toLowerCase()
      const isValid = validExtensions.some((ext) => lower.endsWith(ext))
      if (isValid) {
        validFiles.push(file)
      } else {
        invalidNames.push(file.name)
      }
    })

    if (invalidNames.length > 0) {
      setErrorMessage(
        `Unsupported file type for: ${invalidNames.join(', ')}. Please upload only .csv or .xlsx files.`
      )
    }

    // Deduplicate by filename
    setSelectedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name))
      const uniqueNew = validFiles.filter((f) => !existingNames.has(f.name))
      return [...prev, ...uniqueNew]
    })
  }

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const clearSelectedFiles = () => {
    setSelectedFiles([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Format file size
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Upload files to FastAPI backend
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setUploading(true)
    setErrorMessage(null)

    const formData = new FormData()
    selectedFiles.forEach((file) => {
      formData.append('files', file)
    })

    try {
      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || `Server responded with HTTP status ${response.status}`)
      }

      const data = await response.json()
      setUploadResults(data)
      setSelectedFiles([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (onUploadComplete) {
        onUploadComplete(data.store_summary)
      }
    } catch (err) {
      setErrorMessage(
        err.message || 'Failed to upload and ingest evidence files. Please check if backend is running.'
      )
    } finally {
      setUploading(false)
    }
  }

  // Quick load sample data helper
  const handleLoadSampleFiles = async () => {
    try {
      setUploading(true)
      setErrorMessage(null)

      // Raw sample data defined for instant preview upload
      const cdrCsvContent = `phone_number,imei,imsi,tower_id,call_type,timestamp,duration
+919876543210,864209041234567,404450123456789,TOW-DL-0104,VOICE_OUT,2026-03-10 09:45:12,185
+919876543210,864209041234567,404450123456789,TOW-DL-0104,SMS_OUT,2026-03-10 10:02:45,0
+919876543210,864209041234567,404450123456789,TOW-DL-0104,VOICE_IN,2026-03-10 10:14:30,420
+919123456789,860123049876543,404450987654321,TOW-JH-0033,VOICE_OUT,2026-03-10 10:20:10,310
+919876543210,864209041234567,404450123456789,TOW-DL-0104,VOICE_OUT,2026-03-10 10:55:00,95
+919988776655,867890123456789,404450554433221,TOW-DL-0104,VOICE_IN,2026-03-10 11:00:15,60
+919988776655,867890123456789,404450554433221,TOW-DL-0104,SMS_OUT,2026-03-10 11:08:22,0
+919123456789,860123049876543,404450987654321,TOW-JH-0033,VOICE_IN,2026-03-10 11:22:45,145
+919876543210,864209041234567,404450123456789,TOW-DL-0219,VOICE_OUT,2026-03-10 12:05:18,210
+919411223344,863344556677889,404450667788990,TOW-DL-0219,VOICE_IN,2026-03-10 12:15:30,45
+919988776655,867890123456789,404450554433221,TOW-DL-0104,VOICE_OUT,2026-03-10 13:30:00,120
+919123456789,860123049876543,404450987654321,TOW-JH-0033,SMS_OUT,2026-03-10 14:10:05,0
+919876543210,864209041234567,404450123456789,TOW-DL-0219,VOICE_OUT,2026-03-10 14:45:50,540
+919555001122,869988112233445,404450889900112,TOW-MH-0512,VOICE_IN,2026-03-10 15:00:10,75
+919988776655,867890123456789,404450554433221,TOW-DL-0104,VOICE_IN,2026-03-10 15:20:40,300
+919123456789,860123049876543,404450987654321,TOW-JH-0033,VOICE_OUT,2026-03-10 16:05:12,180
+919876543210,864209041234567,404450123456789,TOW-DL-0219,SMS_OUT,2026-03-10 16:30:25,0
+919333445566,861122334455667,404450223344556,TOW-MH-0512,VOICE_OUT,2026-03-10 17:15:00,90`

      const bankCsvContent = `sender_account,receiver_account,upi_handle,amount,timestamp,ip_address
501002348911,918800112233,9876543210@paytm,45000.00,2026-03-10 10:05:15,103.21.144.68
602201948271,918800112233,9876543210@paytm,28500.00,2026-03-10 10:18:22,103.21.144.68
918800112233,401928374650,9123456789@ybl,70000.00,2026-03-10 10:35:40,103.21.144.68
771109283411,332211445566,victim.singh@icici,1200.00,2026-03-10 10:50:00,157.34.22.19
918800112233,887766554433,9988776655@ibl,3500.00,2026-03-10 11:05:12,103.21.144.68
102938475610,918800112233,9876543210@paytm,95000.00,2026-03-10 11:12:44,103.21.144.68
918800112233,401928374650,9123456789@ybl,90000.00,2026-03-10 11:30:19,103.21.144.68
887766554433,401928374650,9123456789@ybl,15000.00,2026-03-10 11:45:00,103.21.144.68
209182736455,887766554433,9988776655@ibl,52000.00,2026-03-10 12:10:05,103.21.144.68
401928374650,119922883377,crypto.escrow@axisbank,150000.00,2026-03-10 12:45:30,49.36.120.45
301928475612,918800112233,9876543210@paytm,18000.00,2026-03-10 13:15:20,103.21.144.68
887766554433,401928374650,9123456789@ybl,48000.00,2026-03-10 13:40:11,103.21.144.68
556677889900,223344556677,merchant.store@oksbi,450.00,2026-03-10 14:02:18,182.72.90.14
112233445566,918800112233,9876543210@paytm,62000.00,2026-03-10 14:50:22,103.21.144.68
918800112233,401928374650,9123456789@ybl,60000.00,2026-03-10 15:10:05,103.21.144.68
401928374650,990011223344,offshore.payout@yesbank,200000.00,2026-03-10 15:45:50,49.36.120.45
778899001122,887766554433,9988776655@ibl,31000.00,2026-03-10 16:12:00,103.21.144.68
887766554433,401928374650,9123456789@ybl,30000.00,2026-03-10 16:35:10,103.21.144.68`

      const cdrFile = new File([cdrCsvContent], 'cdr_sample.csv', { type: 'text/csv' })
      const bankFile = new File([bankCsvContent], 'bank_upi_sample.csv', { type: 'text/csv' })

      const formData = new FormData()
      formData.append('files', cdrFile)
      formData.append('files', bankFile)

      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`)
      }

      const data = await response.json()
      setUploadResults(data)
      setSelectedFiles([])
      if (onUploadComplete) {
        onUploadComplete(data.store_summary)
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to auto-load sample evidence.')
    } finally {
      setUploading(false)
    }
  }

  // Fetch preview records from backend
  const fetchRecords = async (recordType) => {
    setActivePreviewType(recordType)
    setLoadingPreview(true)
    try {
      const response = await fetch(
        `http://localhost:8000/api/records?record_type=${recordType}&limit=15`
      )
      if (response.ok) {
        const data = await response.json()
        setPreviewRecords(data.records || [])
      }
    } catch (e) {
      console.error('Error fetching records preview:', e)
    } finally {
      setLoadingPreview(false)
    }
  }

  const getTypeBadge = (type) => {
    switch (type) {
      case 'telecom_cdr':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
            Telecom / CDR
          </span>
        )
      case 'bank_upi':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Bank / UPI
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            Unknown Schema
          </span>
        )
    }
  }

  const getStatusBadge = (status) => {
    if (status === 'success') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          Success
        </span>
      )
    } else if (status === 'warning') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          Warning
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle className="h-3.5 w-3.5 text-rose-600" />
        Failed
      </span>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Evidence Ingestion Pipeline
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Upload Call Detail Records (CDR) and Bank / UPI transaction files. Columns are auto-detected and normalized for entity linkage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLoadSampleFiles}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
          >
            <Database className="h-3.5 w-3.5 text-cyan-600" />
            Load Sample Evidence
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-rose-900">Upload Issue</h4>
                <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-600 hover:text-rose-800 p-1 rounded-md hover:bg-rose-100 text-xs font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <form
          onDragEnter={handleDrag}
          onSubmit={(e) => e.preventDefault()}
          className="relative"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv, .xlsx, .xls"
            onChange={handleFileInput}
            className="hidden"
            id="evidence-file-input"
          />

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-200 flex flex-col items-center justify-center ${
              dragActive
                ? 'border-cyan-500 bg-cyan-50/50 scale-[0.99]'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
            }`}
          >
            <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 flex items-center justify-center mb-4 shadow-inner">
              <UploadCloud className="h-8 w-8" />
            </div>

            <h3 className="text-base font-semibold text-slate-900">
              Drag and drop evidence files here
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Accepts multiple <span className="font-semibold text-slate-700">.csv</span> or{' '}
              <span className="font-semibold text-slate-700">.xlsx</span> files.
            </p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-sm hover:shadow transition-all"
            >
              <FileSpreadsheet className="h-4 w-4 text-cyan-400" />
              Browse Files from Computer
            </button>

            {/* Schema Hint Pills */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500">
              <span className="px-2.5 py-1 rounded-full bg-white border border-slate-200 font-medium">
                📞 Telecom CDR (phone, imei, imsi, tower_id)
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white border border-slate-200 font-medium">
                💳 Bank / UPI (sender_account, upi_handle, amount, ip)
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white border border-slate-200 font-medium">
                🛡️ Auto-Normalized
              </span>
            </div>
          </div>
        </form>

        {/* Selected Files Staging Tray */}
        {selectedFiles.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Staged Evidence Files ({selectedFiles.length})
              </span>
              <button
                type="button"
                onClick={clearSelectedFiles}
                className="text-xs text-slate-500 hover:text-rose-600 transition"
              >
                Clear all
              </button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {selectedFiles.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                      <FileText className="h-4 w-4 text-cyan-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{file.name}</p>
                      <p className="text-[11px] text-slate-500">{formatBytes(file.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-white transition"
                    title="Remove file"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Ingestion Submit Button */}
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 shadow-sm hover:shadow-cyan-500/20 transition-all disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Processing Evidence...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    Ingest {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Results & Summary Table */}
      {uploadResults && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <h3 className="text-base font-bold text-slate-900">
                  Ingestion Summary Report
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Processed {uploadResults.files_processed} file(s) &bull; Ingested{' '}
                <span className="font-semibold text-slate-800">
                  {uploadResults.total_rows_ingested}
                </span>{' '}
                records
              </p>
            </div>

            {/* Quick Preview Tabs */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchRecords('telecom_cdr')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  activePreviewType === 'telecom_cdr'
                    ? 'bg-sky-50 border-sky-300 text-sky-800 font-semibold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Inspect CDR Records
              </button>
              <button
                onClick={() => fetchRecords('bank_upi')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  activePreviewType === 'bank_upi'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Inspect Bank UPI Records
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-6">File Name</th>
                  <th className="py-3 px-6">Detected Schema</th>
                  <th className="py-3 px-6 text-right">Rows</th>
                  <th className="py-3 px-6">Normalized Attributes</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Warnings / Diagnostics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {uploadResults.files.map((file, i) => (
                  <tr key={file.file_id || i} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 px-6 font-semibold text-slate-900 flex items-center gap-2.5">
                      <FileSpreadsheet className="h-4 w-4 text-cyan-600 shrink-0" />
                      <span className="truncate max-w-xs">{file.filename}</span>
                    </td>
                    <td className="py-4 px-6">{getTypeBadge(file.detected_type)}</td>
                    <td className="py-4 px-6 text-right font-mono font-bold text-slate-900">
                      {file.row_count}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {file.normalized_columns && file.normalized_columns.length > 0 ? (
                          file.normalized_columns.slice(0, 4).map((col) => (
                            <span
                              key={col}
                              className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] border border-slate-200"
                            >
                              {col}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">None</span>
                        )}
                        {file.normalized_columns && file.normalized_columns.length > 4 && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono text-[10px]">
                            +{file.normalized_columns.length - 4} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">{getStatusBadge(file.status)}</td>
                    <td className="py-4 px-6">
                      {file.warnings && file.warnings.length > 0 ? (
                        <div className="space-y-1">
                          {file.warnings.map((w, wIdx) => (
                            <p key={wIdx} className="text-[11px] text-amber-700 font-medium">
                              &bull; {w}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-medium">
                          Schema matches fully
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ingested Records Preview Panel */}
      {activePreviewType && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-cyan-600" />
              <h4 className="text-sm font-bold text-slate-900 capitalize">
                Normalized Records View &mdash; {activePreviewType.replace('_', ' ')}
              </h4>
            </div>
            <button
              onClick={() => setActivePreviewType(null)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Close Preview
            </button>
          </div>

          {loadingPreview ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Loading records...
            </div>
          ) : previewRecords.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No records found for this category yet.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-72 border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse font-mono text-[11px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <tr>
                    {Object.keys(previewRecords[0])
                      .filter((k) => !k.startsWith('_'))
                      .map((key) => (
                        <th key={key} className="py-2.5 px-3 whitespace-nowrap">
                          {key}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewRecords.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50/60">
                      {Object.entries(row)
                        .filter(([k]) => !k.startsWith('_'))
                        .map(([k, val], cIdx) => (
                          <td key={cIdx} className="py-2 px-3 whitespace-nowrap text-slate-800">
                            {String(val || '')}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
