import React, { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import UploadPage from './pages/UploadPage'
import GraphPage from './pages/GraphPage'
import ReportPage from './pages/ReportPage'
import {
  UploadCloud,
  GitMerge,
  Share2,
  FileText,
  ShieldCheck,
  ArrowRight,
  Database,
  Layers,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Flame,
  Network,
  Zap,
} from 'lucide-react'

export default function App() {
  const [activeTab, setActiveTab] = useState('upload')
  const [backendOnline, setBackendOnline] = useState(false)
  const [storeSummary, setStoreSummary] = useState(null)
  const [loadingHealth, setLoadingHealth] = useState(true)
  const [correlatingFromApp, setCorrelatingFromApp] = useState(false)

  const fetchStatus = async () => {
    try {
      const healthRes = await fetch('http://localhost:8000/api/health')
      if (healthRes.ok) {
        setBackendOnline(true)
        const summaryRes = await fetch('http://localhost:8000/api/records/summary')
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json()
          setStoreSummary({
            telecom_cdr: summaryData.counts?.telecom_cdr || 0,
            bank_upi: summaryData.counts?.bank_upi || 0,
            unknown: summaryData.counts?.unknown || 0,
            total_files_stored: summaryData.total_files || 0,
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
    const interval = setInterval(fetchStatus, 8000)
    return () => clearInterval(interval)
  }, [])

  const handleUploadComplete = (newSummary) => {
    if (newSummary) {
      setStoreSummary(newSummary)
    } else {
      fetchStatus()
    }
  }

  const totalRecords = storeSummary
    ? (storeSummary.telecom_cdr || 0) + (storeSummary.bank_upi || 0) + (storeSummary.unknown || 0)
    : 0

  const hasEvidence = totalRecords > 0

  // 4-Stage Workflow Stepper Configuration
  const workflowStages = [
    {
      id: 'upload',
      step: 1,
      title: 'Upload Evidence',
      shortTitle: 'Upload',
      desc: 'Ingest CDR & Bank UPI',
      icon: UploadCloud,
      badge: storeSummary?.total_files_stored ? `${storeSummary.total_files_stored} files` : 'Staged',
      isComplete: hasEvidence,
    },
    {
      id: 'correlate',
      step: 2,
      title: 'Correlate Entities',
      shortTitle: 'Correlate',
      desc: 'Link Cross-File Anchors',
      icon: GitMerge,
      badge: hasEvidence ? `${totalRecords} rows` : 'Pending',
      isComplete: hasEvidence,
    },
    {
      id: 'graph',
      step: 3,
      title: 'Assess Threat Graph',
      shortTitle: 'Threat Graph',
      desc: 'Heuristic Risk Scoring',
      icon: Share2,
      badge: hasEvidence ? 'Risk Engine' : 'Pending',
      isComplete: hasEvidence,
    },
    {
      id: 'report',
      step: 4,
      title: 'Court Dossier',
      shortTitle: 'Dossier',
      desc: 'Generate Brief & PDF',
      icon: FileText,
      badge: 'Export PDF',
      isComplete: false,
    },
  ]

  // Trigger correlation and navigate to Graph
  const handleLaunchCorrelation = async () => {
    setCorrelatingFromApp(true)
    try {
      await fetch('http://localhost:8000/api/correlate', { method: 'POST' })
      setActiveTab('graph')
    } catch (e) {
      console.error('Correlation trigger failed', e)
      setActiveTab('graph')
    } finally {
      setCorrelatingFromApp(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-100/70 font-sans text-slate-900 antialiased selection:bg-cyan-500 selection:text-white">
      {/* Dark Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendOnline={backendOnline}
        storeSummary={storeSummary}
      />

      {/* Clean White Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 min-h-screen">
        {/* Top Header Bar */}
        <header className="border-b border-slate-200/80 bg-white sticky top-0 z-10 shadow-xs">
          {/* Upper Utility Header */}
          <div className="h-14 px-6 lg:px-8 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                INVESTIGATION CONSOLE
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-500"></span>
                {activeTab === 'upload' && 'Stage 1: Evidence Ingestion & Schema Normalization'}
                {activeTab === 'correlate' && 'Stage 2: Cross-Entity Linkage Engine'}
                {activeTab === 'graph' && 'Stage 3: Interactive Threat Network & Risk Matrix'}
                {activeTab === 'report' && 'Stage 4: Law Enforcement Forensic Brief & Seizure Dossier'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchStatus}
                title="Refresh connection & stats"
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition active:scale-95"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingHealth ? 'animate-spin text-cyan-600' : ''}`} />
              </button>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 text-[11px] font-medium hidden sm:inline">Engine API:</span>
                <span
                  className={`font-mono font-semibold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 ${
                    backendOnline
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${backendOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  {backendOnline ? 'Online (v0.2.0)' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Top-Level 4-Stage Workflow Stepper for Judges & First-time Viewers */}
          <div className="px-6 lg:px-8 py-2.5 bg-slate-50/70 overflow-x-auto">
            <div className="flex items-center justify-between min-w-[720px] max-w-6xl mx-auto">
              {workflowStages.map((stage, idx) => {
                const isActive = activeTab === stage.id
                const isPast = stage.isComplete && !isActive
                const Icon = stage.icon

                return (
                  <React.Fragment key={stage.id}>
                    <button
                      onClick={() => setActiveTab(stage.id)}
                      className={`flex items-center gap-3 px-3 py-1.5 rounded-xl text-left transition-all group ${
                        isActive
                          ? 'bg-white text-slate-900 border border-cyan-500/40 shadow-sm ring-2 ring-cyan-500/10'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-white/80 border border-transparent'
                      }`}
                    >
                      {/* Step Indicator Circle */}
                      <div
                        className={`h-7 w-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold transition-all shrink-0 ${
                          isActive
                            ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-500/30'
                            : isPast
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200/80 text-slate-500 group-hover:bg-slate-300'
                        }`}
                      >
                        {isPast ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : stage.step}
                      </div>

                      {/* Step Text Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-bold leading-none ${
                              isActive ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'
                            }`}
                          >
                            {stage.title}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5 max-w-[140px]">
                          {stage.desc}
                        </p>
                      </div>
                    </button>

                    {/* Step Connector Arrow */}
                    {idx < workflowStages.length - 1 && (
                      <div className="flex items-center px-2 text-slate-300">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        </header>

        {/* Dynamic Main Workspace Body */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'upload' && (
            <UploadPage
              onUploadComplete={handleUploadComplete}
              initialSummary={storeSummary}
            />
          )}

          {activeTab === 'correlate' && (
            <div className="max-w-4xl mx-auto py-8 space-y-8">
              {/* Header Hero */}
              <div className="text-center space-y-3">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center shadow-xs">
                  <GitMerge className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    Cross-Entity Linkage &amp; Heuristic Correlation Engine
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto mt-2 leading-relaxed">
                    Automatically bridges disconnected telecom call detail records (CDR) with banking / UPI transaction logs using graph heuristics and shared identity anchors.
                  </p>
                </div>
              </div>

              {/* Live Store Status Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-cyan-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Evidence Inventory Ready For Correlation
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-200">
                    {totalRecords} Total Records Loaded
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 block text-[11px] font-semibold uppercase tracking-wider">
                      Telecom CDR Records
                    </span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-2xl font-bold text-slate-900 font-mono">
                        {storeSummary?.telecom_cdr || 0}
                      </span>
                      <span className="text-xs text-slate-500">
                        Calls, SMS, IMEI, IMSI, Cell Towers
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 block text-[11px] font-semibold uppercase tracking-wider">
                      Bank &amp; UPI Records
                    </span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-2xl font-bold text-slate-900 font-mono">
                        {storeSummary?.bank_upi || 0}
                      </span>
                      <span className="text-xs text-slate-500">
                        Senders, Receivers, VPAs, IP Addresses
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action CTA */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="text-xs text-slate-500 hover:text-slate-800 font-medium transition"
                  >
                    &larr; Ingest more files or reload sample
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleLaunchCorrelation}
                      disabled={!hasEvidence || correlatingFromApp}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 shadow-sm hover:shadow-cyan-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                      {correlatingFromApp ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Correlating Network...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 fill-current" />
                          Run Correlation &amp; View Graph &rarr;
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 Algorithmic Heuristics Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Active Forensic Correlation Heuristics
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <Flame className="h-4 w-4 text-rose-500" />
                      Multi-Hop Mule Routing (+35 pts)
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Detects intermediary accounts / UPI handles that both receive and forward funds within short timeframes to obscure paper trails.
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <Zap className="h-4 w-4 text-amber-500" />
                      SIM / IMEI Hopping (+25 pts)
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Flags physical handset IMEIs operating multiple disposable SIM cards or phone numbers switching handsets rapidly.
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <Network className="h-4 w-4 text-cyan-600" />
                      Cross-File Anchor Linkage (+20 pts)
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Directly correlates phone numbers, UPI VPA handles, and shared ISP IP addresses observed across both telecom and banking logs.
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <Share2 className="h-4 w-4 text-purple-600" />
                      Syndicate Hub Centrality (Up to +20 pts)
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Graph degree centrality scoring identifies focal points, master orchestrators, and cash-out endpoints.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'graph' && (
            <GraphPage
              setActiveTab={setActiveTab}
              storeSummary={storeSummary}
            />
          )}

          {activeTab === 'report' && (
            <ReportPage
              setActiveTab={setActiveTab}
              storeSummary={storeSummary}
            />
          )}
        </main>
      </div>
    </div>
  )
}

