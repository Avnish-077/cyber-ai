import React, { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import UploadPage from './pages/UploadPage'
import GraphPage from './pages/GraphPage'
import {
  GitMerge,
  Share2,
  FileText,
  ShieldCheck,
  ArrowRight,
  Database,
  Layers,
  Cpu,
  RefreshCw,
} from 'lucide-react'

export default function App() {
  const [activeTab, setActiveTab] = useState('upload')
  const [backendOnline, setBackendOnline] = useState(false)
  const [storeSummary, setStoreSummary] = useState(null)
  const [loadingHealth, setLoadingHealth] = useState(true)

  const fetchStatus = async () => {
    try {
      const healthRes = await fetch('http://localhost:8000/api/health')
      if (healthRes.ok) {
        setBackendOnline(true)
        const summaryRes = await fetch('http://localhost:8000/api/records/summary')
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json()
          setStoreSummary({
            telecom_cdr: summaryData.counts.telecom_cdr,
            bank_upi: summaryData.counts.bank_upi,
            unknown: summaryData.counts.unknown,
            total_files_stored: summaryData.total_files,
          })
        }
      } else {
        setBackendOnline(false)
      }
    } catch {
      setBackendOnline(false)
    } finally {
      setLoadingHealth(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 6000)
    return () => clearInterval(interval)
  }, [])

  const handleUploadComplete = (newSummary) => {
    if (newSummary) {
      setStoreSummary(newSummary)
    } else {
      fetchStatus()
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-100/60 font-sans text-slate-900 antialiased">
      {/* Dark Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendOnline={backendOnline}
        storeSummary={storeSummary}
      />

      {/* Clean White Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 bg-white min-h-screen">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-200 px-8 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Workspace
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-semibold text-slate-800 capitalize">
              {activeTab === 'upload' && 'Evidence Ingestion'}
              {activeTab === 'correlate' && 'Cross-Entity Correlation'}
              {activeTab === 'graph' && 'Fraud Network Graph'}
              {activeTab === 'report' && 'Forensic Intelligence Dossier'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={fetchStatus}
              title="Refresh connection & stats"
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              <RefreshCw className={`h-4 w-4 ${loadingHealth ? 'animate-spin text-cyan-600' : ''}`} />
            </button>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">FastAPI Backend:</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                  backendOnline
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {backendOnline ? 'Connected (v0.2.0)' : 'Offline'}
              </span>
            </div>
          </div>
        </header>

        {/* Dynamic Main Workspace Body */}
        <main className="flex-1 p-8 lg:p-10 max-w-7xl w-full mx-auto">
          {activeTab === 'upload' && (
            <UploadPage
              onUploadComplete={handleUploadComplete}
              initialSummary={storeSummary}
            />
          )}

          {activeTab === 'correlate' && (
            <div className="max-w-4xl mx-auto py-12 text-center space-y-6">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-cyan-50 border border-cyan-100 text-cyan-600 flex items-center justify-center shadow-inner">
                <GitMerge className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  Cross-Entity Correlation Engine
                </h3>
                <p className="text-sm text-slate-500 max-w-lg mx-auto mt-2 leading-relaxed">
                  Automated linkage across suspect phone numbers, IMEIs, IMSIs, UPI VPAs, and shared IP addresses.
                  This module connects telecom CDR call bursts with suspicious banking transfers.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-left max-w-lg mx-auto text-xs text-slate-600 space-y-3">
                <div className="font-semibold text-slate-800 flex items-center gap-2">
                  <Database className="h-4 w-4 text-cyan-600" />
                  Available Evidence In Store
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase">CDR Records</span>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {storeSummary?.telecom_cdr || 0}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase">Bank / UPI Records</span>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {storeSummary?.bank_upi || 0}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('upload')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition"
              >
                Go to Evidence Ingestion <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {activeTab === 'graph' && (
            <GraphPage
              setActiveTab={setActiveTab}
              storeSummary={storeSummary}
            />
          )}

          {activeTab === 'report' && (
            <div className="max-w-4xl mx-auto py-12 text-center space-y-6">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                <FileText className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  Forensic Intelligence Dossier
                </h3>
                <p className="text-sm text-slate-500 max-w-lg mx-auto mt-2 leading-relaxed">
                  Generate court-ready cyber fraud investigation reports summarizing suspects, timeline of calls vs UPI transfers, and tower geolocation evidence.
                </p>
              </div>

              <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 max-w-xl mx-auto">
                <p className="text-xs text-slate-400 font-medium">
                  PDF generation via ReportLab will export from this view.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('upload')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition"
              >
                Return to Uploads <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
