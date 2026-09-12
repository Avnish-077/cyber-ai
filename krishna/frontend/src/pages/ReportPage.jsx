import React, { useState, useEffect } from 'react'
import {
  FileText,
  Download,
  RefreshCw,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Lock,
  Scale,
  Copy,
  Check,
  ExternalLink,
  Share2,
  ArrowRight,
  Flame,
  FileSpreadsheet,
  Building2,
  Phone,
  Smartphone,
  CreditCard,
  Globe,
  Radio,
  Clock,
  Printer,
} from 'lucide-react'

// Color configuration for node types
const TYPE_COLORS = {
  phone: { bg: '#0284c7', light: '#e0f2fe', text: '#0369a1', label: 'Phone' },
  imei: { bg: '#9333ea', light: '#f3e8ff', text: '#7e22ce', label: 'IMEI' },
  imsi: { bg: '#a855f7', light: '#faf5ff', text: '#6b21a8', label: 'IMSI' },
  upi: { bg: '#16a34a', light: '#dcfce7', text: '#15803d', label: 'UPI VPA' },
  ip: { bg: '#ea580c', light: '#ffedd5', text: '#c2410c', label: 'IP Address' },
  account: { bg: '#dc2626', light: '#fee2e2', text: '#b91c1c', label: 'Account' },
}

export default function ReportPage({ setActiveTab, storeSummary }) {
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [copiedTarget, setCopiedTarget] = useState(null)
  const [activeClusterTab, setActiveClusterTab] = useState(0)

  // Generate / fetch investigative report from backend
  const handleGenerateReport = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const response = await fetch('http://localhost:8000/api/report', {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error(`Failed to generate brief with status ${response.status}`)
      }
      const data = await response.json()
      setReportData(data)
    } catch (err) {
      setErrorMessage(
        err.message || 'Failed to generate investigative brief. Ensure the backend server is running.'
      )
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch existing report on mount if available
  useEffect(() => {
    const fetchExistingReport = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/report')
        if (response.ok) {
          const data = await response.json()
          if (data && data.case_id) {
            setReportData(data)
          }
        }
      } catch {
        // Silently wait for user to click Generate
      }
    }
    fetchExistingReport()
  }, [])

  // Download PDF brief from backend
  const handleDownloadPDF = async () => {
    setDownloading(true)
    setErrorMessage(null)
    try {
      const response = await fetch('http://localhost:8000/api/report/download')
      if (!response.ok) {
        throw new Error(`PDF download failed with status ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      // Extract filename from header or fallback
      const contentDisposition = response.headers.get('content-disposition')
      let filename = 'Investigative_Intelligence_Brief.pdf'
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match && match[1]) {
          filename = match[1]
        }
      } else if (reportData?.case_id) {
        filename = `Investigative_Brief_${reportData.case_id}.pdf`
      }

      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setErrorMessage(err.message || 'Failed to download PDF dossier.')
    } finally {
      setDownloading(false)
    }
  }

  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedTarget(id)
    setTimeout(() => setCopiedTarget(null), 2000)
  }

  const totalStoreRecords = storeSummary
    ? (storeSummary.telecom_cdr || 0) +
      (storeSummary.bank_upi || 0) +
      (storeSummary.unknown || 0)
    : 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Action Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
            <Scale className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Investigative Intelligence Dossier
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                Court-Ready Brief
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated suspect profiling, multi-hop mule routing evidence, and immediate statutory seizure orders.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Synthesizing Brief...' : 'Generate Investigative Brief'}
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={downloading || (!reportData && totalStoreRecords === 0)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 shadow-xs transition disabled:opacity-40"
          >
            <Download className={`h-3.5 w-3.5 text-cyan-600 ${downloading ? 'animate-bounce' : ''}`} />
            {downloading ? 'Preparing PDF...' : 'Download PDF Dossier'}
          </button>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Error Generating Report: </span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Empty State: No evidence uploaded or no report generated yet */}
      {!reportData && !loading && (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-2xl mx-auto my-6">
          <div className="h-16 w-16 rounded-2xl bg-cyan-50 border border-cyan-100 text-cyan-600 flex items-center justify-center mx-auto">
            <FileText className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              No Investigative Brief Generated Yet
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
              Click <strong>Generate Investigative Brief</strong> above to analyze current ingested evidence records, detect prime suspects, map syndicate clusters, and draft immediate statutory seizure directives.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            {totalStoreRecords === 0 && (
              <button
                onClick={() => setActiveTab('upload')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Upload Evidence First <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Run Generation Now
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="h-12 w-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin mx-auto"></div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800">
              Synthesizing Cross-Entity Incident Intelligence...
            </p>
            <p className="text-xs text-slate-500">
              Computing NetworkX connected components, ranking prime suspects, and compiling Section 91/102 CrPC seizure orders.
            </p>
          </div>
        </div>
      )}

      {/* Render Full Investigative Intelligence Dossier */}
      {reportData && !loading && (
        <div className="space-y-6">
          {/* Official Law Enforcement Document Header Banner */}
          <div className="bg-slate-950 text-white rounded-2xl p-6 border border-slate-800 shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-1/3 bg-linear-to-l from-cyan-500/10 to-transparent pointer-events-none"></div>

            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 relative z-10">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 tracking-wider">
                    {reportData.classification || 'CONFIDENTIAL'}
                  </span>
                  <span className="text-xs font-mono text-cyan-400 font-semibold">
                    {reportData.case_id}
                  </span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  {reportData.title}
                </h1>
                <p className="text-xs text-slate-400">
                  {reportData.subtitle} &bull; Generated: {reportData.generated_at}
                </p>
              </div>

              {/* Evidence Sources Badge Pill */}
              <div className="text-left md:text-right space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Ingested Evidence Sources
                </span>
                <div className="flex flex-wrap md:justify-end gap-1.5">
                  {(reportData.evidence_files || []).map((file, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[10px]"
                    >
                      {file}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80 text-xs">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                  Analyzed Identifiers
                </span>
                <span className="text-lg font-bold text-white font-mono">
                  {reportData.metrics?.total_entities_analyzed || 0}
                </span>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-rose-400 font-semibold uppercase block">
                  High-Risk Suspects
                </span>
                <span className="text-lg font-bold text-rose-400 font-mono">
                  {reportData.metrics?.high_risk_suspects || 0}
                </span>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-amber-400 font-semibold uppercase block">
                  Fraud Syndicates
                </span>
                <span className="text-lg font-bold text-amber-400 font-mono">
                  {reportData.metrics?.syndicate_clusters_count || 0} Rings
                </span>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-cyan-400 font-semibold uppercase block">
                  Seizure Orders
                </span>
                <span className="text-lg font-bold text-cyan-400 font-mono">
                  {reportData.metrics?.immediate_seizure_actions || 0} Directives
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Immediate Statutory Seizure & Preservation Directives */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Immediate Seizure &amp; Preservation Directives
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Statutory actions recommended for investigating officers under Section 91 &amp; 102 CrPC
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                {reportData.seizure_recommendations?.length || 0} Action Items
              </span>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {(reportData.seizure_recommendations || []).map((rec, idx) => {
                const isHigh = rec.priority === 'HIGH'
                const isCopied = copiedTarget === rec.target

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                      isHigh
                        ? 'bg-rose-50/30 border-rose-200 hover:border-rose-300'
                        : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isHigh
                                ? 'bg-rose-600 text-white'
                                : 'bg-cyan-700 text-white'
                            }`}
                          >
                            {rec.action}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {rec.target}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400">
                          #{idx + 1}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed font-sans">
                        {rec.directive}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">
                        {rec.statutory_provision}
                      </span>
                      <button
                        onClick={() => handleCopyText(rec.directive, rec.target)}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-600 hover:text-cyan-700"
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy Notice
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Section 2: Prime Suspects Ranking Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <Flame className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Prime Suspects &amp; Heuristic Risk Assessment
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Highest-threat actors based on velocity, multi-hop routing, and cross-file nexus
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('graph')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 hover:text-cyan-700"
              >
                Inspect in 2D Graph <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-4 w-12 text-center">Rank</th>
                    <th className="py-2.5 px-4">Entity Identifier</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-center">Threat Score</th>
                    <th className="py-2.5 px-4">Evidence Rationale / Heuristic Vector</th>
                    <th className="py-2.5 px-3">Evidence Files</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(reportData.prime_suspects || []).map((suspect, idx) => {
                    const score = suspect.risk_score || 0
                    const isHigh = score >= 67
                    const isMed = score >= 34

                    return (
                      <tr key={suspect.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {suspect.label || suspect.id}
                            </span>
                            {suspect.cross_file && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                                ★ Cross-File
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className="px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px]"
                            style={{
                              backgroundColor: TYPE_COLORS[suspect.type]?.light || '#f1f5f9',
                              color: TYPE_COLORS[suspect.type]?.text || '#475569',
                            }}
                          >
                            {suspect.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full border ${
                              isHigh
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : isMed
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {score}/100 ({suspect.risk_level?.toUpperCase()})
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 max-w-md">
                          <p className="line-clamp-2 leading-relaxed">
                            {suspect.primary_reason}
                          </p>
                        </td>
                        <td className="py-3 px-3 text-[10px] text-slate-500 font-mono">
                          {(suspect.files || []).join(', ')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Identified Fraud Syndicate Clusters (Connected Components) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Identified Fraud Syndicate Clusters
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Network-isolated subgraphs linking suspect devices, phones, and mule bank accounts
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {reportData.clusters?.length || 0} Network Rings Discovered
              </span>
            </div>

            <div className="p-5 space-y-4">
              {/* Cluster Selector Pills */}
              <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-100">
                {(reportData.clusters || []).map((cluster, cIdx) => (
                  <button
                    key={cIdx}
                    onClick={() => setActiveClusterTab(cIdx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      activeClusterTab === cIdx
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cluster.cluster_id} ({cluster.total_nodes} entities)
                  </button>
                ))}
              </div>

              {/* Active Cluster Details Card */}
              {reportData.clusters && reportData.clusters[activeClusterTab] && (
                <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        {reportData.clusters[activeClusterTab].title}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {reportData.clusters[activeClusterTab].synopsis}
                      </p>
                    </div>

                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-800 self-start sm:self-auto font-mono">
                      Max Risk: {reportData.clusters[activeClusterTab].max_risk_score}/100
                    </span>
                  </div>

                  {/* Member Nodes Badge Cloud */}
                  <div className="pt-2 border-t border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                      Syndicate Members ({reportData.clusters[activeClusterTab].members?.length || 0}):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(reportData.clusters[activeClusterTab].members || []).map((member, mIdx) => (
                        <div
                          key={mIdx}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs text-xs"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: TYPE_COLORS[member.type]?.bg || '#94a3b8' }}
                          ></span>
                          <span className="font-mono font-bold text-slate-800">
                            {member.label || member.id}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({member.risk_score})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
