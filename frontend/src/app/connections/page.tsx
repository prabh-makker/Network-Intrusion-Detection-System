"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Radio,
  Activity,
  Wifi,
  Server,
  RefreshCw,
  Filter,
  ArrowLeft,
  Search,
  Ban,
  Info,
  AlertTriangle,
  Skull,
  Radar,
  Lock,
  Zap,
  FileText,
  Download,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { getApiUrl } from "@/lib/api";
import { fetchWithAuth, getToken } from "@/lib/auth";
import { useToast } from "@/components/Toast";

interface Connection {
  id: string;
  src_ip: string;
  dst_ip: string;
  protocol: string;
  label: string;
  confidence: number;
  timestamp: string;
  is_blocked: boolean;
}

type AlertStats = {
  total_threats: number;
  active_threats?: number;
  blocked_threats?: number;
  by_label: Record<string, number>;
  by_label_active?: Record<string, number>;
  top_sources: { ip: string; count: number }[];
};

type Explanation = {
  label: string;
  description: string;
  key_indicators: { feature: string; impact: string; detail: string }[];
  severity: string;
  mitigation: string;
};

// ── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return;
    let current = from;
    const step = Math.max(1, Math.ceil(Math.abs(value - from) / 50));
    const dir = value > from ? 1 : -1;
    const timer = setInterval(() => {
      current += step * dir;
      if ((dir > 0 && current >= value) || (dir < 0 && current <= value)) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(current);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

// ── Label metadata ────────────────────────────────────────────────────────────
const THREAT_COLORS: Record<string, string> = {
  DoS: "#06b6d4",
  DDoS: "#a855f7",
  "DDoS (Ping of Death)": "#ec4899",
  Probe: "#f59e0b",
  "U2R (Root Access)": "#ef4444",
  "R2L (Unauthorized Access)": "#f97316",
};

const THREAT_ICONS: Record<string, React.ReactNode> = {
  DoS: <Zap size={16} />,
  DDoS: <Skull size={16} />,
  "DDoS (Ping of Death)": <Skull size={16} />,
  Probe: <Radar size={16} />,
  "U2R (Root Access)": <Lock size={16} />,
  "R2L (Unauthorized Access)": <Lock size={16} />,
};

const SHORT_LABEL: Record<string, string> = {
  "DDoS (Ping of Death)": "Ping of Death",
  "R2L (Unauthorized Access)": "R2L",
  "U2R (Root Access)": "U2R",
};

const LABEL_STYLE: Record<string, { border: string; glow: string; text: string; bg: string; darkBg: string }> = {
  DDoS:                        { border: "border-violet-500/50",  glow: "shadow-violet-500/20",  text: "text-violet-400",  bg: "bg-violet-50",  darkBg: "bg-gradient-to-br from-violet-900/40 to-violet-800/20" },
  "DDoS (Ping of Death)":      { border: "border-pink-500/50",    glow: "shadow-pink-500/20",    text: "text-pink-400",    bg: "bg-pink-50",    darkBg: "bg-gradient-to-br from-pink-900/40 to-pink-800/20" },
  DoS:                         { border: "border-cyan-500/50",    glow: "shadow-cyan-500/20",    text: "text-cyan-400",    bg: "bg-cyan-50",    darkBg: "bg-gradient-to-br from-cyan-900/40 to-cyan-800/20" },
  Probe:                       { border: "border-blue-500/50",    glow: "shadow-blue-500/20",    text: "text-blue-400",    bg: "bg-blue-50",    darkBg: "bg-gradient-to-br from-blue-900/40 to-blue-800/20" },
  "R2L (Unauthorized Access)": { border: "border-orange-500/50", glow: "shadow-orange-500/20",  text: "text-orange-400",  bg: "bg-orange-50",  darkBg: "bg-gradient-to-br from-orange-900/40 to-orange-800/20" },
  "U2R (Root Access)":         { border: "border-rose-500/50",    glow: "shadow-rose-500/20",    text: "text-rose-400",    bg: "bg-rose-50",    darkBg: "bg-gradient-to-br from-rose-900/40 to-rose-800/20" },
  Malware:                     { border: "border-red-500/50",     glow: "shadow-red-500/20",     text: "text-red-400",     bg: "bg-red-50",     darkBg: "bg-gradient-to-br from-red-900/40 to-red-800/20" },
  "Port Scan":                 { border: "border-teal-500/50",    glow: "shadow-teal-500/20",    text: "text-teal-400",    bg: "bg-teal-50",    darkBg: "bg-gradient-to-br from-teal-900/40 to-teal-800/20" },
  "Brute Force":               { border: "border-amber-500/50",   glow: "shadow-amber-500/20",   text: "text-amber-400",   bg: "bg-amber-50",   darkBg: "bg-gradient-to-br from-amber-900/40 to-amber-800/20" },
  "SQL Injection":             { border: "border-purple-500/50",  glow: "shadow-purple-500/20",  text: "text-purple-400",  bg: "bg-purple-50",  darkBg: "bg-gradient-to-br from-purple-900/40 to-purple-800/20" },
};
const DEFAULT_STYLE = { border: "border-indigo-500/50", glow: "shadow-indigo-500/20", text: "text-indigo-400", bg: "bg-indigo-50", darkBg: "bg-gradient-to-br from-indigo-900/40 to-indigo-800/20" };
const LABEL_EMOJI: Record<string, string> = {
  "Brute Force": "🔓", DDoS: "💥", "DDoS (Ping of Death)": "💀",
  DoS: "⚡", Malware: "🦠", "Port Scan": "🔍", Probe: "📡",
  "R2L (Unauthorized Access)": "🚪", "SQL Injection": "💉", "U2R (Root Access)": "👑",
};

const SEVERITY_CONFIG: Record<string, { color: string; bg: string }> = {
  CRITICAL: { color: "#ef4444", bg: "#ef444420" },
  HIGH:     { color: "#f59e0b", bg: "#f59e0b20" },
  MEDIUM:   { color: "#3b82f6", bg: "#3b82f620" },
};

// ─────────────────────────────────────────────────────────────────────────────

export default function ActiveConnectionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const apiUrl = getApiUrl();

  const [connections, setConnections] = useState<Connection[]>([]);
  const [stats, setStats] = useState<AlertStats>({ total_threats: 0, by_label: {}, top_sources: [] });
  const [loading, setLoading] = useState(true);
  const [protocolFilter, setProtocolFilter] = useState<string>("all");
  const [connectionFilter, setConnectionFilter] = useState<"active" | "quarantined">("active");
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (!getToken()) router.push("/login");
    else setAuthenticated(true);
  }, [router]);

  // Fetch connections (with optional label filter)
  const fetchConnections = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedLabel
        ? `${apiUrl}/api/v1/alerts/recent?limit=100&label=${encodeURIComponent(selectedLabel)}`
        : `${apiUrl}/api/v1/alerts/recent?limit=100`;
      const res = await fetchWithAuth(url);
      if (res.ok) {
        const data = await res.json();
        setConnections(data);
      }
    } catch (e) {
      console.error("fetchConnections failed:", e);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, selectedLabel]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error("fetchStats failed:", e);
    }
  }, [apiUrl]);

  useEffect(() => {
    if (!authenticated) return;
    fetchConnections();
    const i = setInterval(fetchConnections, 5000);
    return () => clearInterval(i);
  }, [authenticated, fetchConnections]);

  useEffect(() => {
    if (!authenticated) return;
    fetchStats();
    const i = setInterval(fetchStats, 5000);
    return () => clearInterval(i);
  }, [authenticated, fetchStats]);

  const fetchExplanation = async (label: string) => {
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/explain/${encodeURIComponent(label)}`);
      const data = await res.json();
      setExplanation(data);
    } catch {
      toast("error", "Failed to load explanation");
    }
  };

  const handleBlock = async (connId: string) => {
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/${connId}/block`, { method: "POST" });
      const data = await res.json();
      setConnections((prev) => prev.map((c) => (c.id === connId ? { ...c, is_blocked: true } : c)));
      if (data.firewall_active) {
        toast("success", "IP Blocked", `${data.ip} has been banned via firewall`);
      } else {
        toast("info", "Threat Marked Blocked", `${data.ip} flagged in database`);
      }
    } catch {
      toast("error", "Block Failed", "Could not block IP");
    }
  };

  const handleExportPDF = async () => {
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/export`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "nids-threat-report.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast("success", "PDF Exported", "Report downloaded");
      }
    } catch {
      toast("error", "Export Failed");
    }
  };

  const protocols = Array.from(new Set(connections.map((c) => c.protocol.toUpperCase())));

  const filteredConnections = connections
    .filter((c) => {
      if (connectionFilter === "active") return !c.is_blocked;
      if (connectionFilter === "quarantined") return c.is_blocked === true;
      return true;
    })
    .filter((c) => protocolFilter === "all" || c.protocol.toUpperCase() === protocolFilter)
    .filter((c) =>
      c.src_ip.includes(searchTerm) ||
      c.dst_ip.includes(searchTerm) ||
      c.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      <div className="relative z-10 p-6 max-w-7xl mx-auto">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <button
              onClick={() => router.push("/dashboard")}
              className={`flex items-center gap-2 mb-3 text-sm ${isDark ? "text-purple-300 hover:text-purple-200" : "text-purple-700 hover:text-purple-900"}`}
            >
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-400 to-blue-400 flex items-center gap-3">
              <Radio size={32} />
              Active Connections
            </h1>
            <p className={`mt-2 text-sm ${isDark ? "text-purple-200" : "text-purple-800"}`}>
              Real-time network connection monitoring · Updates every 5 seconds
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Active Now / Quarantined toggle */}
            <div className={`flex rounded-lg overflow-hidden border ${isDark ? "border-purple-500/30" : "border-purple-300/40"}`}>
              {([
                { key: "active",      label: "Active Now"   },
                { key: "quarantined", label: "Quarantined"  },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setConnectionFilter(key)}
                  className={`px-4 py-2 text-sm font-semibold transition-all ${
                    connectionFilter === key
                      ? key === "quarantined"
                        ? isDark ? "bg-emerald-500/30 text-emerald-300" : "bg-emerald-100 text-emerald-800"
                        : isDark ? "bg-cyan-500/30 text-cyan-300" : "bg-cyan-100 text-cyan-800"
                      : isDark ? "bg-transparent text-purple-300 hover:bg-purple-500/10" : "bg-white text-purple-600 hover:bg-purple-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExportPDF}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-medium text-sm transition-all flex items-center gap-2"
            >
              <Download size={15} /> Export PDF
            </motion.button>

            <button
              onClick={() => window.location.reload()}
              className="p-2.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/40 hover:to-blue-500/40 border border-cyan-500/30 text-cyan-400 transition-all"
              title="Refresh page"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* ── TOP SECTION: Stat cards + AI panel side by side ────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

          {/* LEFT: stat cards + per-label chips */}
          <div className="lg:col-span-2 space-y-4">
            {/* 3 main stat cards */}
            <div className="grid grid-cols-3 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl ${isDark ? "border border-cyan-500/30 bg-gradient-to-br from-cyan-900/20 to-blue-900/10" : "border border-cyan-400/20 bg-cyan-50/30"} backdrop-blur-xl`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Wifi size={18} className="text-cyan-400" />
                  <span className="text-xs text-cyan-400 font-mono">LIVE</span>
                </div>
                <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-purple-950"}`}>
                  <AnimatedNumber value={stats.total_threats} />
                </p>
                <p className={`text-xs ${isDark ? "text-cyan-300" : "text-cyan-700"}`}>Total Connections</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className={`p-4 rounded-xl ${isDark ? "border border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 to-green-900/10" : "border border-emerald-400/20 bg-emerald-50/30"} backdrop-blur-xl`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Activity size={18} className="text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-mono">ACTIVE</span>
                </div>
                <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-purple-950"}`}>
                  <AnimatedNumber value={stats.active_threats ?? 0} />
                </p>
                <p className={`text-xs ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>Active Now</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className={`p-4 rounded-xl ${isDark ? "border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10" : "border border-purple-400/20 bg-purple-50/30"} backdrop-blur-xl`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Server size={18} className="text-purple-400" />
                  <span className="text-xs text-purple-400 font-mono">BLOCKED</span>
                </div>
                <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-purple-950"}`}>
                  <AnimatedNumber value={stats.blocked_threats ?? 0} />
                </p>
                <p className={`text-xs ${isDark ? "text-purple-300" : "text-purple-700"}`}>Quarantined</p>
              </motion.div>
            </div>

            {/* Per-label chips — all visible, wrapping */}
            {Object.keys(stats.by_label_active ?? stats.by_label).length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {Object.entries(stats.by_label_active ?? stats.by_label).map(([label, count]) => {
                  const s = LABEL_STYLE[label] ?? DEFAULT_STYLE;
                  const emoji = LABEL_EMOJI[label] ?? "❓";
                  const displayName = SHORT_LABEL[label] ?? label;
                  const isActive = selectedLabel === label;
                  return (
                    <motion.button
                      key={label}
                      whileHover={{ scale: 1.04, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setSelectedLabel(isActive ? null : label);
                        if (!isActive) fetchExplanation(label);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left
                        transition-all duration-200 cursor-pointer
                        ${isDark ? s.darkBg : s.bg} ${s.border}
                        ${isActive ? `ring-2 ring-offset-1 ${isDark ? "ring-offset-[#0d0d1f]" : "ring-offset-white"} ${s.border.replace("border-", "ring-")}` : ""}
                        shadow-md ${s.glow}`}
                    >
                      <span className={s.text}>{THREAT_ICONS[label] ?? <AlertTriangle size={14} />}</span>
                      <span className={`text-xs font-bold ${s.text} whitespace-nowrap`}>{emoji} {displayName}</span>
                      <span className={`text-sm font-black tabular-nums ml-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                        <AnimatedNumber value={count} />
                      </span>
                      {isActive && <span className={`text-xs ml-1 ${s.text}`}>●</span>}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: Threat Analysis panel — always visible, sticky */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={`rounded-2xl border backdrop-blur-xl p-5 lg:sticky lg:top-4 self-start ${
              isDark
                ? "border-cyan-500/30 bg-gradient-to-br from-cyan-900/10 to-purple-900/20"
                : "border-purple-200 bg-white shadow-md"
            }`}
          >
            <h3 className={`text-sm font-bold flex items-center gap-2 mb-3 ${isDark ? "text-white" : "text-purple-950"}`}>
              <FileText size={16} className="text-cyan-400" />
              Threat Analysis
              {explanation && (
                <button
                  onClick={() => { setExplanation(null); setSelectedLabel(null); }}
                  className={`ml-auto text-xs px-2 py-0.5 rounded transition-colors ${isDark ? "text-purple-400 hover:text-purple-200" : "text-purple-500 hover:text-purple-700"}`}
                >
                  ✕
                </button>
              )}
            </h3>

            {/* Scrollable content — max height so it never pushes table down */}
            <div className="max-h-[320px] overflow-y-auto pr-1">
            <AnimatePresence mode="wait">
              {explanation ? (
                <motion.div
                  key="has-explanation"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold text-sm ${isDark ? "text-white" : "text-purple-950"}`}>{explanation.label}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-lg font-bold"
                      style={{
                        color: SEVERITY_CONFIG[explanation.severity]?.color ?? "#8b5cf6",
                        background: SEVERITY_CONFIG[explanation.severity]?.bg ?? "#8b5cf620",
                      }}
                    >
                      {explanation.severity}
                    </span>
                  </div>

                  <p className={`text-xs leading-relaxed ${isDark ? "text-purple-300" : "text-purple-700"}`}>
                    {explanation.description}
                  </p>

                  <div className="space-y-1.5">
                    <p className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-purple-400" : "text-purple-600"}`}>Key Indicators</p>
                    {explanation.key_indicators?.map((ind, i) => (
                      <div key={i} className={`rounded-lg p-2 border ${isDark ? "bg-purple-900/40 border-purple-500/20" : "bg-purple-50 border-purple-200"}`}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-xs font-mono ${isDark ? "text-cyan-300" : "text-cyan-700"}`}>{ind.feature}</span>
                          <span
                            className="text-xs font-bold px-1.5 py-0.5 rounded"
                            style={{
                              color: ind.impact === "CRITICAL" ? "#ef4444" : ind.impact === "HIGH" ? "#f59e0b" : "#3b82f6",
                              background: ind.impact === "CRITICAL" ? "#ef444420" : ind.impact === "HIGH" ? "#f59e0b20" : "#3b82f620",
                            }}
                          >
                            {ind.impact}
                          </span>
                        </div>
                        <p className={`text-xs ${isDark ? "text-purple-300" : "text-purple-700"}`}>{ind.detail}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? "text-purple-400" : "text-purple-600"}`}>Recommended Action</p>
                    <p className={`text-xs p-2.5 rounded-lg border leading-relaxed ${isDark ? "text-purple-300 bg-purple-900/40 border-purple-500/20" : "text-slate-600 bg-slate-50 border-slate-200"}`}>
                      {explanation.mitigation}
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="no-explanation"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-10 text-center"
                >
                  <AlertTriangle size={28} className="text-purple-400 opacity-20 mb-3" />
                  <p className={`text-xs ${isDark ? "text-purple-400" : "text-purple-500"}`}>
                    Click a threat chip above<br />or tap <Info size={11} className="inline" /> on a row<br />to load AI analysis
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* ── Search + Protocol filter ────────────────────────────────────── */}
        <div className="mb-4 space-y-2">
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border backdrop-blur-xl ${isDark ? "border-purple-500/30 bg-purple-900/20" : "border-purple-300 bg-white shadow-sm"}`}>
            <Search size={16} className="text-purple-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by IP or threat type…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`bg-transparent border-none outline-none flex-1 text-sm ${isDark ? "text-white placeholder-purple-400" : "text-purple-950 placeholder-purple-400"}`}
            />
            {selectedLabel && (
              <button
                onClick={() => setSelectedLabel(null)}
                className="px-2.5 py-1 rounded-lg bg-purple-600/40 text-purple-300 hover:text-purple-100 text-xs font-medium transition-colors shrink-0"
              >
                ✕ {selectedLabel}
              </button>
            )}
          </div>
          {protocols.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={14} className={isDark ? "text-purple-300" : "text-purple-700"} />
              <span className={`text-xs font-semibold ${isDark ? "text-purple-200" : "text-purple-800"}`}>Protocol:</span>
              <button
                onClick={() => setProtocolFilter("all")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  protocolFilter === "all"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30"
                    : isDark
                      ? "border border-purple-500/30 text-purple-300 hover:border-purple-500/60"
                      : "border border-purple-400/30 text-purple-700 hover:bg-purple-100"
                }`}
              >
                All
              </button>
              {protocols.map((p) => (
                <button
                  key={p}
                  onClick={() => setProtocolFilter(protocolFilter === p ? "all" : p)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    protocolFilter === p
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30"
                      : isDark
                        ? "border border-purple-500/30 text-purple-300 hover:border-purple-500/60"
                        : "border border-purple-400/30 text-purple-700 hover:bg-purple-100"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Full-width Table ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl overflow-hidden ${isDark ? "border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10" : "border border-purple-400/20 bg-purple-950/10"} backdrop-blur-xl`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${isDark ? "border-purple-500/20" : "border-purple-400/20"}`}>
                  {["Time", "Source IP", "Destination", "Protocol", "Type", "Confidence", "Status", "Actions"].map((h) => (
                    <th key={h} className={`text-left py-3 px-4 font-medium ${isDark ? "text-purple-300" : "text-purple-800"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredConnections.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={`py-10 text-center ${isDark ? "text-purple-300" : "text-purple-700"}`}>
                      {loading ? "Loading connections…" : "No connections match current filters"}
                    </td>
                  </tr>
                ) : (
                  filteredConnections.map((conn) => (
                    <tr
                      key={conn.id}
                      className={`border-b transition-colors group ${isDark ? "border-purple-500/10 hover:bg-purple-500/10" : "border-purple-400/10 hover:bg-purple-500/5"} ${conn.is_blocked ? "opacity-60" : ""}`}
                    >
                      <td className={`py-3 px-4 font-mono text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {conn.timestamp ? new Date(conn.timestamp).toLocaleTimeString() : "—"}
                        </span>
                      </td>
                      <td className={`py-3 px-4 font-mono text-xs ${isDark ? "text-cyan-300" : "text-cyan-700"}`}>{conn.src_ip}</td>
                      <td className={`py-3 px-4 font-mono text-xs ${isDark ? "text-purple-300" : "text-purple-700"}`}>{conn.dst_ip}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono ${isDark ? "bg-cyan-500/20 text-cyan-300" : "bg-cyan-100 text-cyan-800"}`}>
                          {conn.protocol}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-semibold" style={{ color: THREAT_COLORS[conn.label] || (conn.label === "Normal" || conn.label === "Benign" ? "#10b981" : "#8b5cf6") }}>
                          {conn.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-16 h-1.5 rounded-full overflow-hidden ${isDark ? "bg-purple-900/50" : "bg-purple-200"}`}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${conn.confidence}%`,
                                background: conn.confidence >= 90 ? "#ef4444" : conn.confidence >= 70 ? "#f59e0b" : "#10b981",
                              }}
                            />
                          </div>
                          <span className={`text-xs tabular-nums ${isDark ? "text-white" : "text-purple-900"}`}>{Math.round(conn.confidence)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {conn.is_blocked ? (
                          <span className="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-300 font-medium">Blocked</span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-medium flex items-center gap-1 w-fit">
                            <motion.span className="w-1.5 h-1.5 rounded-full bg-emerald-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                          <motion.button
                            whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                            onClick={() => fetchExplanation(conn.label)}
                            className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 transition-colors"
                            title="AI analysis"
                          >
                            <Info size={13} />
                          </motion.button>
                          {!conn.is_blocked && (
                            <motion.button
                              whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                              onClick={() => handleBlock(conn.id)}
                              className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-colors"
                              title="Block IP"
                            >
                              <Ban size={13} />
                            </motion.button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
