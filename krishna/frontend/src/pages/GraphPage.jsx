import React, { useState, useEffect, useRef, useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import {
  GitMerge,
  Share2,
  RefreshCw,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  ShieldAlert,
  Layers,
  ArrowRight,
  Database,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Flame,
  ChevronRight,
  Shield,
  Activity,
  List,
  Table as TableIcon,
} from 'lucide-react'

// Color configuration for node types
const TYPE_COLORS = {
  phone: { bg: '#0284c7', light: '#e0f2fe', text: '#0369a1', label: 'Phone Number' },
  imei: { bg: '#9333ea', light: '#f3e8ff', text: '#7e22ce', label: 'IMEI Device' },
  imsi: { bg: '#a855f7', light: '#faf5ff', text: '#6b21a8', label: 'IMSI SIM' },
  upi: { bg: '#16a34a', light: '#dcfce7', text: '#15803d', label: 'UPI Handle' },
  ip: { bg: '#ea580c', light: '#ffedd5', text: '#c2410c', label: 'IP Address' },
  account: { bg: '#dc2626', light: '#fee2e2', text: '#b91c1c', label: 'Bank Account' },
}

// Risk level badge styles
const getRiskBadge = (level, score) => {
  if (level === 'high' || score >= 67) {
    return {
      bg: 'bg-rose-500/15',
      border: 'border-rose-500/40',
      text: 'text-rose-400',
      label: 'HIGH RISK',
      color: '#ef4444',
    }
  } else if (level === 'medium' || score >= 34) {
    return {
      bg: 'bg-amber-500/15',
      border: 'border-amber-500/40',
      text: 'text-amber-400',
      label: 'MED RISK',
      color: '#f59e0b',
    }
  }
  return {
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/40',
    text: 'text-emerald-400',
    label: 'LOW RISK',
    color: '#10b981',
  }
}

export default function GraphPage({ setActiveTab, storeSummary }) {
  const [loading, setLoading] = useState(false)
  const [graphData, setGraphData] = useState(null)
  const [summary, setSummary] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [hoverNode, setHoverNode] = useState(null)
  const [copiedId, setCopiedId] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [viewMode, setViewMode] = useState('table') // 'table' or 'cards'

  const containerRef = useRef(null)
  const fgRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 750, height: 620 })

  // Measure container dimensions responsively
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current
        if (clientWidth > 0 && clientHeight > 0) {
          setDimensions({ width: clientWidth, height: clientHeight })
        }
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    const timer = setTimeout(updateDimensions, 200)

    return () => {
      window.removeEventListener('resize', updateDimensions)
      clearTimeout(timer)
    }
  }, [])

  // Call POST /api/correlate
  const runCorrelation = async () => {
    setLoading(true)
    setSelectedNode(null)
    try {
      const response = await fetch('http://localhost:8000/api/correlate', {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error(`Correlation failed with status ${response.status}`)
      }
      const data = await response.json()
      setSummary(data.summary)

      // Transform backend nodes & edges for react-force-graph-2d
      const formattedNodes = (data.nodes || []).map((n) => {
        const score = n.risk_score || 0
        let nodeSize = 4.5
        if (score >= 67) nodeSize = 9
        else if (score >= 34) nodeSize = 6.5

        return {
          ...n,
          color: TYPE_COLORS[n.type]?.bg || '#64748b',
          val: nodeSize,
          radius: nodeSize,
        }
      })

      const formattedLinks = (data.edges || []).map((e, idx) => ({
        id: `link-${idx}`,
        source: e.source,
        target: e.target,
        relationship_type: e.relationship_type,
        evidence: e.evidence,
        weight: e.weight || 1,
        isCrossFile: e.relationship_type === 'cross-file link',
      }))

      setGraphData({
        nodes: formattedNodes,
        links: formattedLinks,
      })

      // Auto-fit view after physics settles
      setTimeout(() => {
        if (fgRef.current) {
          fgRef.current.zoomToFit(400, 50)
        }
      }, 600)
    } catch (err) {
      console.error('Failed to run correlation:', err)
    } finally {
      setLoading(false)
    }
  }

  // Auto-run correlation on initial mount if evidence records exist
  useEffect(() => {
    runCorrelation()
  }, [])

  // Filtered graph data based on search and type selector
  const filteredData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] }

    const term = searchTerm.toLowerCase().trim()
    const activeNodes = graphData.nodes.filter((n) => {
      const matchesSearch =
        !term ||
        n.id.toLowerCase().includes(term) ||
        (n.label && n.label.toLowerCase().includes(term))
      const matchesType = filterType === 'all' || n.type === filterType
      return matchesSearch && matchesType
    })

    const nodeIds = new Set(activeNodes.map((n) => n.id))

    const activeLinks = graphData.links.filter((l) => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target
      return nodeIds.has(srcId) && nodeIds.has(tgtId)
    })

    return {
      nodes: activeNodes,
      links: activeLinks,
    }
  }, [graphData, searchTerm, filterType])

  // Focus and select node from Top Risk list
  const handleSelectRiskEntity = (entityId) => {
    if (!graphData) return
    const node = graphData.nodes.find((n) => n.id === entityId)
    if (node) {
      setSelectedNode(node)
      if (fgRef.current && node.x !== undefined && node.y !== undefined) {
        fgRef.current.centerAt(node.x, node.y, 500)
        fgRef.current.zoom(2.8, 500)
      }
    }
  }

  // Copy node identifier helper
  const handleCopyId = (text) => {
    navigator.clipboard.writeText(text)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  // Zoom controls
  const handleZoomIn = () => {
    if (fgRef.current) {
      fgRef.current.zoom(fgRef.current.zoom() * 1.3, 300)
    }
  }

  const handleZoomOut = () => {
    if (fgRef.current) {
      fgRef.current.zoom(fgRef.current.zoom() / 1.3, 300)
    }
  }

  const handleResetZoom = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 40)
    }
  }

  // Connected neighbors for selected node
  const selectedNodeNeighbors = useMemo(() => {
    if (!selectedNode || !graphData) return []
    const neighbors = []
    const nodeId = selectedNode.id

    graphData.links.forEach((l) => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target

      if (srcId === nodeId && tgtId !== nodeId) {
        const neighbor = graphData.nodes.find((n) => n.id === tgtId)
        if (neighbor)
          neighbors.push({
            node: neighbor,
            relationship: l.relationship_type,
            evidence: l.evidence,
          })
      } else if (tgtId === nodeId && srcId !== nodeId) {
        const neighbor = graphData.nodes.find((n) => n.id === srcId)
        if (neighbor)
          neighbors.push({
            node: neighbor,
            relationship: l.relationship_type,
            evidence: l.evidence,
          })
      }
    })
    return neighbors
  }, [selectedNode, graphData])

  const totalStoreRecords = storeSummary
    ? (storeSummary.telecom_cdr || 0) +
      (storeSummary.bank_upi || 0) +
      (storeSummary.unknown || 0)
    : 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto flex flex-col h-[calc(100vh-7.5rem)]">
      {/* Top Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 flex items-center justify-center">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Network Link Analysis &amp; Risk Scoring
              </h2>
              {summary && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  {summary.risk_levels?.high || 0} High Risk Suspects
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Heuristic risk detection for multi-hop fund routing, SIM hopping, and cross-file nexus.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative min-w-[190px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search phone, IP, UPI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Entity Types</option>
            <option value="phone">Phones</option>
            <option value="imei">IMEIs</option>
            <option value="imsi">IMSIs</option>
            <option value="upi">UPI Handles</option>
            <option value="ip">IPs</option>
            <option value="account">Accounts</option>
          </select>

          {/* Run Correlation Button */}
          <button
            onClick={runCorrelation}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analyzing...' : 'Run Correlation'}
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left Canvas + Right Top Risk Panel */}
      <div className="flex-1 flex gap-5 min-h-0">
        {/* Left: Force Graph Canvas Area */}
        <div
          ref={containerRef}
          className="relative flex-1 bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden"
        >
          {/* Empty State: No evidence uploaded yet */}
          {!loading && (!graphData || graphData.nodes.length === 0) && totalStoreRecords === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-slate-950">
              <div className="h-16 w-16 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mb-4">
                <Layers className="h-8 w-8 text-cyan-400" />
              </div>
              <h3 className="text-base font-bold text-white">No Evidence Ingested Yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Please upload Call Detail Records (CDR) and Bank / UPI transaction files before running correlation.
              </p>
              <button
                onClick={() => setActiveTab('upload')}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition shadow-sm"
              >
                Upload Evidence First <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 text-white">
              <div className="relative flex items-center justify-center mb-4">
                <div className="h-12 w-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin"></div>
                <GitMerge className="h-5 w-5 text-cyan-400 absolute" />
              </div>
              <p className="text-sm font-semibold text-slate-200">
                Running Entity Correlation &amp; Heuristic Risk Scoring...
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Evaluating multi-hop routing, SIM switching velocity, and cross-file anchors
              </p>
            </div>
          )}

          {/* Force Graph Canvas */}
          {filteredData && filteredData.nodes.length > 0 && (
            <ForceGraph2D
              ref={fgRef}
              width={dimensions.width}
              height={dimensions.height}
              graphData={filteredData}
              backgroundColor="#020617"
              nodeRelSize={6}
              nodeVal={(node) => {
                const s = node.risk_score || 0
                return 4.5 + (s / 100) * 8.5
              }}
              // Tooltip: visible only on hover as requested
              nodeLabel={(node) => {
                const badge = getRiskBadge(node.risk_level, node.risk_score)
                return `
                  <div style="background:#0f172a; color:#f8fafc; padding:8px 12px; border-radius:10px; border:1px solid #334155; font-family:monospace; font-size:11px; box-shadow:0 6px 16px rgba(0,0,0,0.6);">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:4px;">
                      <span style="font-weight:700; color:${TYPE_COLORS[node.type]?.bg || '#38bdf8'}; text-transform:uppercase;">${node.type}</span>
                      <span style="font-weight:700; color:${badge.color}; font-size:10px;">${node.risk_score || 0}/100 (${badge.label})</span>
                    </div>
                    <div style="font-weight:600; font-size:12px; color:#ffffff;">${node.label || node.id}</div>
                    ${node.primary_reason ? `<div style="margin-top:4px; font-size:10px; color:#cbd5e1; font-family:sans-serif;">${node.primary_reason}</div>` : ''}
                    ${node.cross_file ? '<div style="margin-top:4px; font-size:10px; color:#eab308; font-weight:600;">★ Cross-File Match</div>' : ''}
                  </div>
                `
              }}
              // Custom Node Canvas Drawing: node size & border thickness reflect risk_score
              nodeCanvasObject={(node, ctx, globalScale) => {
                const label = node.label || node.id
                const isSelected = selectedNode && selectedNode.id === node.id
                const isHovered = hoverNode && hoverNode.id === node.id
                const isCrossFile = node.cross_file
                const color = TYPE_COLORS[node.type]?.bg || '#64748b'
                const score = node.risk_score || 0

                // Continuous size & border thickness dynamically scaling with risk score
                const radius = 4.5 + (score / 100) * 7.5
                const borderWidth = 1.2 + (score / 100) * 2.8
                let borderColor = '#334155'

                if (score >= 67) {
                  borderColor = '#ef4444' // Red alert border
                } else if (score >= 34) {
                  borderColor = '#f59e0b' // Amber border
                }

                // 1. Draw glowing outer halo for High Risk entities or Cross-File links
                if (score >= 67) {
                  ctx.beginPath()
                  ctx.arc(node.x, node.y, radius + 5, 0, 2 * Math.PI)
                  ctx.fillStyle = 'rgba(239, 68, 68, 0.18)'
                  ctx.fill()
                } else if (isCrossFile) {
                  ctx.beginPath()
                  ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI)
                  ctx.fillStyle = 'rgba(234, 179, 8, 0.15)'
                  ctx.fill()
                }

                // 2. Selection Ring
                if (isSelected) {
                  ctx.beginPath()
                  ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI)
                  ctx.strokeStyle = '#38bdf8'
                  ctx.lineWidth = 2.5
                  ctx.stroke()
                }

                // 3. Node Core Circle
                ctx.beginPath()
                ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
                ctx.fillStyle = isSelected ? '#ffffff' : color
                ctx.fill()
                ctx.strokeStyle = borderColor
                ctx.lineWidth = borderWidth
                ctx.stroke()

                // 4. Hover Label Badge (Visible on hover or selection only)
                if (isHovered || isSelected) {
                  const badgeText = `${score >= 67 ? '🔴' : score >= 34 ? '🟡' : '🟢'} ${label} (${score})`
                  const fontSize = Math.max(10 / globalScale, 3)
                  ctx.font = `600 ${fontSize}px sans-serif`
                  const textWidth = ctx.measureText(badgeText).width
                  const pad = 4

                  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'
                  ctx.fillRect(
                    node.x - textWidth / 2 - pad,
                    node.y - radius - fontSize - pad - 3,
                    textWidth + pad * 2,
                    fontSize + pad
                  )
                  ctx.strokeStyle = borderColor
                  ctx.lineWidth = 1
                  ctx.strokeRect(
                    node.x - textWidth / 2 - pad,
                    node.y - radius - fontSize - pad - 3,
                    textWidth + pad * 2,
                    fontSize + pad
                  )

                  ctx.textAlign = 'center'
                  ctx.textBaseline = 'middle'
                  ctx.fillStyle = '#ffffff'
                  ctx.fillText(badgeText, node.x, node.y - radius - fontSize / 2 - 3)
                }
              }}
              // Edge Styling: Cross-file links are thicker, golden, and dashed
              linkWidth={(link) => (link.isCrossFile ? 3 : 1.2)}
              linkColor={(link) => (link.isCrossFile ? '#eab308' : '#334155')}
              linkLineDash={(link) => (link.isCrossFile ? [5, 3] : null)}
              linkDirectionalParticles={(link) => (link.isCrossFile ? 4 : 0)}
              linkDirectionalParticleSpeed={0.008}
              linkDirectionalParticleWidth={2.5}
              linkDirectionalParticleColor={() => '#eab308'}
              onNodeClick={(node) => setSelectedNode(node)}
              onNodeHover={(node) => setHoverNode(node)}
              cooldownTicks={120}
              enableNodeDrag={true}
              enableZoomInteraction={true}
              enablePanInteraction={true}
            />
          )}

          {/* Floating Graph Controls */}
          <div className="absolute right-4 top-4 flex flex-col gap-1.5 z-10">
            <button
              onClick={handleZoomIn}
              title="Zoom In"
              className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 backdrop-blur-sm transition shadow-md"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={handleZoomOut}
              title="Zoom Out"
              className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 backdrop-blur-sm transition shadow-md"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={handleResetZoom}
              title="Fit to Screen"
              className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 backdrop-blur-sm transition shadow-md"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>

          {/* Floating Legend (Explaining Types, Size & Borders) */}
          <div className="absolute left-4 bottom-4 p-3.5 rounded-xl bg-slate-900/95 border border-slate-800 backdrop-blur-md z-10 text-xs shadow-xl max-w-xs">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2 flex items-center justify-between">
              <span>Graph Legend &amp; Risk Metrics</span>
            </div>

            {/* Node Entity Types */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-300 pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#0284c7]"></span>
                <span>Phone</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#9333ea]"></span>
                <span>IMEI / SIM</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#16a34a]"></span>
                <span>UPI Handle</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ea580c]"></span>
                <span>IP Address</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#dc2626]"></span>
                <span>Account</span>
              </div>
            </div>

            {/* Risk Size & Border Explanation */}
            <div className="py-2 space-y-1.5 border-b border-slate-800/80 text-[10px] text-slate-300">
              <div className="text-[9px] uppercase font-semibold text-slate-400">
                Node Size / Border = Risk Score
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-rose-500 bg-rose-500/20 shrink-0"></span>
                <span>
                  <strong className="text-rose-400">High Risk (67-100)</strong>: Large, thick red ring
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full border border-amber-500 bg-amber-500/20 shrink-0"></span>
                <span>
                  <strong className="text-amber-400">Medium Risk (34-66)</strong>: Medium amber ring
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full border border-slate-600 bg-slate-700 shrink-0"></span>
                <span>
                  <strong className="text-slate-400">Low Risk (0-33)</strong>: Small standard node
                </span>
              </div>
            </div>

            {/* Edge Styles */}
            <div className="pt-2 space-y-1 text-[10px] text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 border-t-2 border-dashed border-amber-400"></span>
                <span className="text-amber-300 font-medium">Cross-File Link</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 bg-slate-600"></span>
                <span className="text-slate-400">Co-occurrence</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Top Risk Entities Panel / Side Drawer */}
        <div className="w-88 xl:w-96 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col shrink-0 overflow-hidden">
          {/* Panel Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                <Flame className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Top Risk Entities
                </h3>
                <p className="text-[11px] text-slate-500">Heuristic threat ranking</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* View Mode Toggle: Table vs Cards */}
              <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300/60">
                <button
                  onClick={() => setViewMode('table')}
                  title="Table View"
                  className={`p-1 rounded-md transition ${
                    viewMode === 'table'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  title="Cards View"
                  className={`p-1 rounded-md transition ${
                    viewMode === 'cards'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>

              {summary && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white font-mono">
                  {summary.top_risk_entities?.length || 0}
                </span>
              )}
            </div>
          </div>

          {/* Risk Level Mini Counters */}
          {summary && summary.risk_levels && (
            <div className="grid grid-cols-3 gap-2 p-3 border-b border-slate-100 bg-slate-50/30 text-center text-xs">
              <div className="bg-rose-50 border border-rose-200/80 rounded-lg p-1.5">
                <span className="text-[10px] uppercase font-bold text-rose-700 block">High</span>
                <span className="text-sm font-bold text-rose-900 font-mono">
                  {summary.risk_levels.high || 0}
                </span>
              </div>
              <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-1.5">
                <span className="text-[10px] uppercase font-bold text-amber-700 block">Med</span>
                <span className="text-sm font-bold text-amber-900 font-mono">
                  {summary.risk_levels.medium || 0}
                </span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-lg p-1.5">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">Low</span>
                <span className="text-sm font-bold text-emerald-900 font-mono">
                  {summary.risk_levels.low || 0}
                </span>
              </div>
            </div>
          )}

          {/* Top Risk Entities List / Table */}
          <div className="flex-1 overflow-y-auto p-3">
            {!summary || !summary.top_risk_entities || summary.top_risk_entities.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Run correlation to analyze risk heuristics.
              </div>
            ) : viewMode === 'table' ? (
              /* Structured Table View */
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-2 px-2 text-center w-8">#</th>
                      <th className="py-2 px-2.5">Entity / Type</th>
                      <th className="py-2 px-2 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {summary.top_risk_entities.map((entity, idx) => {
                      const badge = getRiskBadge(entity.risk_level, entity.risk_score)
                      const isSelected = selectedNode && selectedNode.id === entity.id

                      return (
                        <tr
                          key={entity.id || idx}
                          onClick={() => handleSelectRiskEntity(entity.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-cyan-50/80'
                              : 'hover:bg-slate-50/90'
                          }`}
                        >
                          <td className="py-2.5 px-2 text-center font-mono text-[10px] font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-2.5 min-w-0">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-mono text-xs font-bold text-slate-900 truncate">
                                {entity.label || entity.id}
                              </span>
                              {entity.cross_file && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold shrink-0">
                                  ★
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider"
                                style={{
                                  backgroundColor: TYPE_COLORS[entity.type]?.light || '#f1f5f9',
                                  color: TYPE_COLORS[entity.type]?.text || '#475569',
                                }}
                              >
                                {entity.type}
                              </span>
                              <span className="text-[10px] text-slate-500 truncate max-w-[150px]">
                                {entity.primary_reason}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-right shrink-0 whitespace-nowrap">
                            <span
                              className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${badge.bg} ${badge.border} ${badge.text}`}
                            >
                              {entity.risk_score}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Rich Card View */
              <div className="space-y-2">
                {summary.top_risk_entities.map((entity, idx) => {
                  const badge = getRiskBadge(entity.risk_level, entity.risk_score)
                  const isSelected = selectedNode && selectedNode.id === entity.id

                  return (
                    <button
                      key={entity.id || idx}
                      onClick={() => handleSelectRiskEntity(entity.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1.5 group ${
                        isSelected
                          ? 'bg-cyan-50/80 border-cyan-400 shadow-sm'
                          : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-5 w-5 rounded-full bg-slate-100 text-slate-600 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-900 truncate">
                            {entity.label || entity.id}
                          </span>
                        </div>
                        {/* Score Badge */}
                        <span
                          className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border shrink-0 ${badge.bg} ${badge.border} ${badge.text}`}
                        >
                          {entity.risk_score}/100
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px]">
                        <span
                          className="px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider"
                          style={{
                            backgroundColor: TYPE_COLORS[entity.type]?.light || '#f1f5f9',
                            color: TYPE_COLORS[entity.type]?.text || '#475569',
                          }}
                        >
                          {entity.type}
                        </span>
                        {entity.cross_file && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                            Cross-File
                          </span>
                        )}
                      </div>

                      {/* Plain English Reason */}
                      <p className="text-[11px] text-slate-600 group-hover:text-slate-900 leading-snug">
                        {entity.primary_reason || 'Identified in transaction records'}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Selected Node Details Drawer within Right Panel */}
          {selectedNode && (
            <div className="p-4 border-t border-slate-200 bg-slate-50/90 text-xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Selected Entity Details
                  </span>
                  <div className="font-mono font-bold text-slate-900 text-xs break-all">
                    {selectedNode.label || selectedNode.id}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Risk Score:</span>
                <span
                  className={`font-mono font-bold px-2 py-0.5 rounded ${
                    selectedNode.risk_score >= 67
                      ? 'bg-rose-100 text-rose-800'
                      : selectedNode.risk_score >= 34
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {selectedNode.risk_score || 0} / 100 ({selectedNode.risk_level?.toUpperCase()})
                </span>
              </div>

              {selectedNode.risk_reasons && selectedNode.risk_reasons.length > 0 && (
                <div className="space-y-1 text-[10px]">
                  <span className="font-semibold text-slate-700">Detected Heuristics:</span>
                  {selectedNode.risk_reasons.map((r, rIdx) => (
                    <p key={rIdx} className="text-slate-600 flex items-start gap-1.5">
                      <span className="text-rose-500 mt-0.5">&bull;</span>
                      <span>{r}</span>
                    </p>
                  ))}
                </div>
              )}

              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                Files: {(selectedNode.files || []).join(', ')} &bull; {selectedNodeNeighbors.length} direct links
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
