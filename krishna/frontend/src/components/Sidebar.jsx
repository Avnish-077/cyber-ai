import React from 'react'
import {
  UploadCloud,
  GitMerge,
  Share2,
  FileText,
  ShieldAlert,
  Activity,
  CheckCircle2,
  AlertCircle,
  Database,
  Radio,
  Sparkles,
  Zap,
} from 'lucide-react'

/**
 * App Branding Candidates evaluated:
 * 1. [SELECTED] SENTINEL AI - Cyber Fraud Intelligence & Incident Correlator
 *    (Authoritative, modern, instantly communicates AI-driven threat surveillance)
 * 2. NEXUS FRAUD OPS - Cross-Entity Linkage Engine
 * 3. AEGIS FORENSICS - Telecom & Financial Crime Intelligence
 */

export default function Sidebar({
  activeTab,
  setActiveTab,
  backendOnline,
  storeSummary,
}) {
  const totalRecords = storeSummary
    ? (storeSummary.telecom_cdr || 0) + (storeSummary.bank_upi || 0) + (storeSummary.unknown || 0)
    : 0

  const hasEvidence = totalRecords > 0

  const navItems = [
    {
      id: 'upload',
      step: '01',
      name: 'Evidence Ingestion',
      icon: UploadCloud,
      badge: storeSummary?.total_files_stored ? `${storeSummary.total_files_stored} files` : null,
      desc: 'Ingest CDR & Bank UPI files',
    },
    {
      id: 'correlate',
      step: '02',
      name: 'Entity Correlation',
      icon: GitMerge,
      badge: hasEvidence ? `${totalRecords} records` : null,
      desc: 'Cross-file suspect link engine',
    },
    {
      id: 'graph',
      step: '03',
      name: 'Threat Network Map',
      icon: Share2,
      badge: hasEvidence ? 'Live Graph' : null,
      desc: 'Interactive risk scoring & nodes',
    },
    {
      id: 'report',
      step: '04',
      name: 'Forensic Dossier',
      icon: FileText,
      badge: 'Court-Ready',
      desc: 'Export case report & PDF',
    },
  ]

  return (
    <aside className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col justify-between select-none shrink-0 h-screen sticky top-0 z-20 text-slate-200">
      {/* App Header & Brand */}
      <div>
        <div className="p-5 border-b border-slate-800/80 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-500 via-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-400/30">
                <ShieldAlert className="h-6 w-6 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-extrabold text-white tracking-wider font-mono uppercase">
                  SENTINEL<span className="text-cyan-400 font-sans font-black">AI</span>
                </h1>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  v0.2
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                Cyber Fraud &amp; Mule Correlator
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="p-3 space-y-1.5">
          <div className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center justify-between">
            <span>Investigation Pipeline</span>
            <span className="text-[9px] text-cyan-400/80 font-mono">4 STAGES</span>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full group flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 relative ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/90 border border-transparent active:scale-[0.99]'
                }`}
              >
                {/* Active Indicator Bar on Left */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-cyan-400 rounded-r-full shadow-sm shadow-cyan-400"></span>
                )}

                <div
                  className={`mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'bg-slate-900 text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs font-semibold truncate ${
                        isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
                      }`}
                    >
                      <span className="font-mono text-[10px] text-cyan-500/70 mr-1.5 font-bold">
                        {item.step}
                      </span>
                      {item.name}
                    </span>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-medium font-mono px-1.5 py-0.2 rounded-full border shrink-0 ${
                          isActive
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Footer Info & Health Monitor */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/60 space-y-2.5">
        {/* Ingested Evidence Mini-Stats */}
        {storeSummary && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-xs shadow-inner">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5 font-semibold text-slate-300 text-[11px]">
                <Database className="h-3 w-3 text-cyan-400" />
                Evidence Store
              </span>
              <span className="font-mono text-cyan-400 font-bold text-[11px]">
                {totalRecords} rows
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/60 font-mono">
              <div className="flex justify-between bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800/50">
                <span>CDR:</span>
                <span className="text-slate-200 font-bold">{storeSummary.telecom_cdr || 0}</span>
              </div>
              <div className="flex justify-between bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800/50">
                <span>UPI:</span>
                <span className="text-slate-200 font-bold">{storeSummary.bank_upi || 0}</span>
              </div>
            </div>
          </div>
        )}

        {/* Backend Connection Status */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {backendOnline ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              )}
            </span>
            <span className="text-[11px] font-medium text-slate-300">
              {backendOnline ? 'Engine Online' : 'Connecting...'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
            :8000
          </span>
        </div>
      </div>
    </aside>
  )
}

