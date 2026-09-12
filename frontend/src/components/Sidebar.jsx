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
} from 'lucide-react'

export default function Sidebar({
  activeTab,
  setActiveTab,
  backendOnline,
  storeSummary,
}) {
  const navItems = [
    {
      id: 'upload',
      name: 'Upload Evidence',
      icon: UploadCloud,
      badge: storeSummary?.total_files_stored ? `${storeSummary.total_files_stored} files` : null,
      desc: 'Ingest CDR & Bank UPI files',
    },
    {
      id: 'correlate',
      name: 'Entity Correlation',
      icon: GitMerge,
      desc: 'Cross-file suspect link engine',
      placeholder: true,
    },
    {
      id: 'graph',
      name: 'Network Graph',
      icon: Share2,
      desc: 'Interactive entity node map',
    },
    {
      id: 'report',
      name: 'Forensic Dossier',
      icon: FileText,
      desc: 'Export case report & PDF',
      placeholder: true,
    },
  ]

  const totalRecords = storeSummary
    ? (storeSummary.telecom_cdr || 0) + (storeSummary.bank_upi || 0) + (storeSummary.unknown || 0)
    : 0

  return (
    <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col justify-between select-none shrink-0 h-screen sticky top-0">
      {/* App Header & Brand */}
      <div>
        <div className="p-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide uppercase">
                Fraud Correlator
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Cyber Intelligence Unit
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="p-4 space-y-1.5">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Evidence Pipeline
          </div>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full group flex items-start gap-3.5 px-3.5 py-3 rounded-xl text-left transition-all duration-150 ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon
                  className={`h-5 w-5 mt-0.5 shrink-0 transition-colors ${
                    isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-300'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${isActive ? 'text-white font-semibold' : ''}`}>
                      {item.name}
                    </span>
                    {item.badge && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {item.badge}
                      </span>
                    )}
                    {item.placeholder && (
                      <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                        Soon
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Footer Info & Health Monitor */}
      <div className="p-4 border-t border-slate-800/80 space-y-3">
        {/* Ingested Evidence Mini-Stats */}
        {storeSummary && (
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Database className="h-3.5 w-3.5 text-cyan-400" />
                Evidence Store
              </span>
              <span className="font-mono text-cyan-400 font-semibold">{totalRecords} rows</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
              <div>CDR: <span className="text-slate-200 font-medium">{storeSummary.telecom_cdr || 0}</span></div>
              <div>UPI: <span className="text-slate-200 font-medium">{storeSummary.bank_upi || 0}</span></div>
            </div>
          </div>
        )}

        {/* Backend Connection Status */}
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {backendOnline ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              )}
            </span>
            <span className="text-xs font-medium text-slate-300">
              {backendOnline ? 'Backend Online' : 'Connecting...'}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            :8000
          </span>
        </div>
      </div>
    </aside>
  )
}
