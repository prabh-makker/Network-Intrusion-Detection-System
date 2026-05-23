"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Ban,
  Info,
  AlertTriangle,
  Skull,
  Radar,
  Lock,
  Download,
  Zap,
  Clock,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { fetchWithAuth, getToken } from "@/lib/auth";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useTheme } from "@/context/ThemeContext";

type Alert = {
  id: string;
  timestamp: string;
  src_ip: string;
  dst_ip: string;
  protocol: string;
  label: string;
  confidence: number;
  is_blocked: boolean;
};

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

const THREAT_COLORS: Record<string, string> = {
  DoS: "#06b6d4",
  DDoS: "#a855f7",
  "DDoS (Ping of Death)": "#ec4899",
  Probe: "#f59e0b",
  "U2R (Root Access)": "#ef4444",
  "R2L (Unauthorized Access)": "#f97316",
};

const THREAT_ICONS: Record<string, React.ReactNode> = {
  DoS: <Zap size={20} />,
  DDoS: <Skull size={20} />,
  "DDoS (Ping of Death)": <Skull size={20} />,
  Probe: <Radar size={20} />,
  "U2R (Root Access)": <Lock size={20} />,
  "R2L (Unauthorized Access)": <Lock size={20} />,
};

// Animated counter — counts up to value over ~800 ms
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

// Short display names for truncation-prone labels
const SHORT_LABEL: Record<string, string> = {
  "DDoS (Ping of Death)": "Ping of Death",
  "R2L (Unauthorized Access)": "R2L",
  "U2R (Root Access)": "U2R",
};

// Per-label accent colors — dark: rich gradient; light: soft tinted card
const LABEL_STYLE: Record<string, { border: string; glow: string; text: string; bg: string; darkBg: string }> = {
  DDoS:                        { border: "border-violet-500/50",  glow: "shadow-violet-500/25",  text: "text-violet-400",  bg: "bg-violet-50",      darkBg: "bg-gradient-to-br from-violet-900/50 to-violet-800/30" },
  "DDoS (Ping of Death)":      { border: "border-pink-500/50",    glow: "shadow-pink-500/25",    text: "text-pink-400",    bg: "bg-pink-50",        darkBg: "bg-gradient-to-br from-pink-900/50 to-pink-800/30" },
  DoS:                         { border: "border-cyan-500/50",    glow: "shadow-cyan-500/25",    text: "text-cyan-400",    bg: "bg-cyan-50",        darkBg: "bg-gradient-to-br from-cyan-900/50 to-cyan-800/30" },
  Probe:                       { border: "border-blue-500/50",    glow: "shadow-blue-500/25",    text: "text-blue-400",    bg: "bg-blue-50",        darkBg: "bg-gradient-to-br from-blue-900/50 to-blue-800/30" },
  "R2L (Unauthorized Access)": { border: "border-orange-500/50", glow: "shadow-orange-500/25",  text: "text-orange-400",  bg: "bg-orange-50",      darkBg: "bg-gradient-to-br from-orange-900/50 to-orange-800/30" },
  "U2R (Root Access)":         { border: "border-rose-500/50",    glow: "shadow-rose-500/25",    text: "text-rose-400",    bg: "bg-rose-50",        darkBg: "bg-gradient-to-br from-rose-900/50 to-rose-800/30" },
  Benign:                      { border: "border-emerald-500/50", glow: "shadow-emerald-500/25", text: "text-emerald-400", bg: "bg-emerald-50",     darkBg: "bg-gradient-to-br from-emerald-900/50 to-emerald-800/30" },
  Malware:                     { border: "border-red-500/50",     glow: "shadow-red-500/25",     text: "text-red-400",     bg: "bg-red-50",         darkBg: "bg-gradient-to-br from-red-900/50 to-red-800/30" },
  "Port Scan":                 { border: "border-teal-500/50",    glow: "shadow-teal-500/25",    text: "text-teal-400",    bg: "bg-teal-50",        darkBg: "bg-gradient-to-br from-teal-900/50 to-teal-800/30" },
  "Brute Force":               { border: "border-amber-500/50",   glow: "shadow-amber-500/25",   text: "text-amber-400",   bg: "bg-amber-50",       darkBg: "bg-gradient-to-br from-amber-900/50 to-amber-800/30" },
  "SQL Injection":             { border: "border-purple-500/50",  glow: "shadow-purple-500/25",  text: "text-purple-400",  bg: "bg-purple-50",      darkBg: "bg-gradient-to-br from-purple-900/50 to-purple-800/30" },
};
const DEFAULT_STYLE = { border: "border-indigo-500/50", glow: "shadow-indigo-500/25", text: "text-indigo-400", bg: "bg-indigo-50", darkBg: "bg-gradient-to-br from-indigo-900/50 to-indigo-800/30" };

const LABEL_EMOJI: Record<string, string> = {
  Benign: "✅", "Brute Force": "🔓", DDoS: "💥", "DDoS (Ping of Death)": "💀",
  DoS: "⚡", Malware: "🦠", "Port Scan": "🔍", Probe: "📡",
  "R2L (Unauthorized Access)": "🚪", "SQL Injection": "💉", "U2R (Root Access)": "👑",
};

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  CRITICAL: { color: "#ef4444", bg: "#ef444420", label: "CRITICAL" },
  HIGH: { color: "#f59e0b", bg: "#f59e0b20", label: "HIGH" },
  MEDIUM: { color: "#3b82f6", bg: "#3b82f620", label: "MEDIUM" },
};

export default function AlertsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats>({ total_threats: 0, by_label: {}, top_sources: [] });
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active">("all");
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const apiUrl = getApiUrl();

  useEffect(() => {
    if (!getToken()) router.push("/login");
  }, [router]);

  // Fetch alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const url = selectedLabel
          ? `${apiUrl}/api/v1/alerts/recent?limit=100&label=${encodeURIComponent(selectedLabel)}`
          : `${apiUrl}/api/v1/alerts/recent?limit=100`;
        const res = await fetchWithAuth(url);
        const data = await res.json();
        setAlerts(data);
      } catch (e) {
        console.error("fetchAlerts failed:", e);
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 3000);
    return () => clearInterval(interval);
  }, [selectedLabel, apiUrl]);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/stats`);
        const data = await res.json();
        setStats(data);
      } catch (e) {
        console.error("fetchStats failed:", e);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const fetchExplanation = async (label: string) => {
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/explain/${encodeURIComponent(label)}`);
      const data = await res.json();
      setExplanation(data);
    } catch {
      toast("error", "Failed to load explanation");
    }
  };

  const handleBlock = async (alertId: string) => {
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/${alertId}/block`, { method: "POST" });
      const data = await res.json();
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, is_blocked: true } : a)));

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
        toast("success", "PDF Exported", "Threat report downloaded");
      }
    } catch {
      toast("error", "Export Failed");
    }
  };

  const filteredAlerts = alerts
    .filter((a) => statusFilter === "active" ? !a.is_blocked : true)
    .filter((a) =>
      a.src_ip.includes(searchTerm) ||
      a.dst_ip.includes(searchTerm) ||
      a.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className={`min-h-screen w-full flex flex-col ${isDark ? "bg-[#0d0d1f]" : "bg-transparent"}`}>
      {/* Header */}
      <div className={`border-b backdrop-blur-xl px-6 py-6 ${isDark ? "border-purple-500/20 bg-gradient-to-r from-purple-900/10 via-transparent to-blue-900/10" : "border-purple-400/20 bg-purple-950/5"}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-start">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-300"
            >
              Threat Alerts
            </motion.h1>
            <p className={`mt-2 text-sm ${isDark ? "text-purple-200" : "text-purple-800"}`}>AI-powered threat analysis and explainability</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportPDF}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-medium transition-all flex items-center gap-2"
          >
            <Download size={18} /> Export PDF
          </motion.button>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="flex-1 px-6 py-6 w-full overflow-auto">
        <div className="max-w-7xl mx-auto w-full">
          {/* Stat Cards — sticky, real-time (refreshes every 5 s) */}
          <div className={`sticky top-0 z-50 mb-6 pb-3 ${isDark ? "bg-[#0d0d1f]/95" : "bg-white/95"} backdrop-blur-xl`}>
            {/* Live indicator */}
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className={`text-xs font-semibold ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                Live · updates every 5s
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {/* Total All-Time Threats — click to show all */}
              <motion.button
                whileHover={{ scale: 1.04, y: -3 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                onClick={() => { setStatusFilter("all"); setSelectedLabel(null); }}
                className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl p-4 text-left
                  ${statusFilter === "all" && !selectedLabel
                    ? isDark
                      ? "bg-gradient-to-br from-purple-900/40 to-purple-800/20 border-purple-400/60 shadow-lg shadow-purple-500/20 ring-2 ring-purple-500/30"
                      : "bg-purple-100 border-purple-400/70 shadow-md ring-2 ring-purple-400/40"
                    : isDark
                      ? "bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-500/40 shadow-lg shadow-purple-500/10"
                      : "bg-purple-50 border-purple-300/60 shadow-md shadow-purple-200/50"}`}
              >
                <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-purple-500/10 blur-xl pointer-events-none" />
                <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? "text-purple-300" : "text-purple-700"}`}>
                  📊 Total
                </p>
                <p className={`text-3xl font-black tabular-nums ${isDark ? "text-white" : "text-purple-950"}`}>
                  <AnimatedNumber value={stats.total_threats} />
                </p>
                <p className={`text-xs mt-1 ${isDark ? "text-purple-400" : "text-purple-600"}`}>
                  {statusFilter === "all" && !selectedLabel ? "● showing all" : "click to show all"}
                </p>
              </motion.button>

              {/* Active Threats — click to filter active only */}
              <motion.button
                whileHover={{ scale: 1.04, y: -3 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                onClick={() => { setStatusFilter("active"); setSelectedLabel(null); }}
                className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl p-4 text-left
                  ${statusFilter === "active"
                    ? isDark
                      ? "bg-gradient-to-br from-red-900/40 to-red-800/20 border-red-400/60 shadow-lg shadow-red-500/20 ring-2 ring-red-500/30"
                      : "bg-red-100 border-red-400/70 shadow-md ring-2 ring-red-400/40"
                    : isDark
                      ? "bg-gradient-to-br from-red-900/20 to-red-800/10 border-red-500/40 shadow-lg shadow-red-500/10"
                      : "bg-red-50 border-red-300/60 shadow-md shadow-red-200/50"}`}
              >
                <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-red-500/10 blur-xl pointer-events-none" />
                <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? "text-red-300" : "text-red-600"}`}>
                  🚨 Active
                </p>
                <p className={`text-3xl font-black tabular-nums ${isDark ? "text-white" : "text-red-950"}`}>
                  <AnimatedNumber value={stats.active_threats ?? stats.total_threats} />
                </p>
                <p className={`text-xs mt-1 ${isDark ? "text-red-400" : "text-red-500"}`}>
                  {statusFilter === "active" ? "● filtering active" : stats.blocked_threats !== undefined
                    ? `${stats.blocked_threats.toLocaleString()} blocked`
                    : "click to filter"}
                </p>
              </motion.button>

              {/* Per-label cards — uses active counts so numbers drop on SECURE NOW */}
              {Object.entries(stats.by_label_active ?? stats.by_label).map(([label, count]) => {
                const s = LABEL_STYLE[label] ?? DEFAULT_STYLE;
                const emoji = LABEL_EMOJI[label] ?? "❓";
                const displayName = SHORT_LABEL[label] ?? label;
                const isActive = selectedLabel === label;
                const totalForLabel = stats.by_label?.[label] ?? count;
                const blockedForLabel = Math.max(0, totalForLabel - count);

                return (
                  <motion.button
                    key={label}
                    whileHover={{ scale: 1.04, y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    onClick={() => {
                      setSelectedLabel(isActive ? null : label);
                      setStatusFilter("all");
                      fetchExplanation(label);
                    }}
                    className={`relative overflow-hidden rounded-2xl border p-4 text-left
                      transition-all duration-200 cursor-pointer
                      ${isDark ? s.darkBg : s.bg} ${s.border}
                      ${isActive
                        ? `ring-2 ring-offset-1 ${isDark ? "ring-offset-[#0d0d1f]" : "ring-offset-white"} ${s.border.replace("border-", "ring-")}`
                        : ""}
                      shadow-lg ${s.glow}`}
                  >
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-xl pointer-events-none" />
                    <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${s.text}`}>
                      {emoji} {displayName}
                    </p>
                    <p className={`text-3xl font-black tabular-nums ${isDark ? "text-white" : "text-gray-900"}`}>
                      <AnimatedNumber value={count} />
                    </p>
                    {isActive ? (
                      <p className={`text-xs mt-1 font-semibold ${s.text}`}>● filtering</p>
                    ) : blockedForLabel > 0 ? (
                      <p className={`text-xs mt-1 ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                        ✓ {blockedForLabel.toLocaleString()} secured
                      </p>
                    ) : null}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Alert List */}
            <div className="lg:col-span-2 space-y-4">
              {/* Search Bar */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative rounded-xl border backdrop-blur-xl ${isDark ? "border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10" : "border-purple-300 bg-white shadow-sm"}`}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <Search size={18} className="text-purple-400" />
                  <input
                    type="text"
                    placeholder="Search by IP or threat type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`bg-transparent border-none outline-none flex-1 ${isDark ? "text-white placeholder-purple-400" : "text-purple-950 placeholder-purple-400"}`}
                  />
                  {selectedLabel && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => setSelectedLabel(null)}
                      className="px-3 py-1 rounded-lg bg-purple-600/40 text-purple-300 hover:text-purple-100 text-xs font-medium transition-colors"
                    >
                      ✕ {selectedLabel}
                    </motion.button>
                  )}
                </div>
              </motion.div>

              {/* Alert Cards */}
              <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
                <AnimatePresence>
                  {filteredAlerts.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`text-center py-16 rounded-xl border ${isDark ? "border-purple-500/20 bg-gradient-to-br from-purple-900/10 to-blue-900/5" : "border-purple-400/20 bg-purple-950/10"}`}
                    >
                      <ShieldCheck size={48} className="mx-auto text-emerald-400 opacity-50 mb-3" />
                      <p className={isDark ? "text-purple-300" : "text-purple-800"}>No threats detected</p>
                    </motion.div>
                  ) : (
                    filteredAlerts.map((alert, i) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className={`rounded-xl border backdrop-blur-xl p-4 transition-all group ${isDark ? "border-purple-500/30 bg-gradient-to-r from-purple-900/20 to-blue-900/10 hover:border-purple-500/50" : "border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-purple-200"} ${
                          alert.is_blocked ? "opacity-50" : ""
                        }`}
                        style={isDark ? {} : { borderLeft: `3px solid ${THREAT_COLORS[alert.label] || "#8b5cf6"}` }}
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div
                            className="p-3 rounded-lg shrink-0"
                            style={{
                              background: `${THREAT_COLORS[alert.label] || "#8b5cf6"}20`,
                              color: THREAT_COLORS[alert.label] || "#8b5cf6",
                            }}
                          >
                            {THREAT_ICONS[alert.label] || <AlertTriangle />}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className={`font-bold ${isDark ? "text-white" : "text-purple-950"}`}>{alert.label}</span>
                              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${isDark ? "bg-purple-500/30 text-purple-200" : "bg-purple-100 text-purple-700"}`}>
                                {alert.confidence}%
                              </span>
                              {alert.is_blocked && (
                                <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 font-semibold ${isDark ? "bg-emerald-500/30 text-emerald-300" : "bg-emerald-100 text-emerald-700"}`}>
                                  <Ban size={12} /> BLOCKED
                                </span>
                              )}
                            </div>
                            <div className={`text-sm font-mono mb-2 ${isDark ? "text-purple-300" : "text-purple-800"}`}>
                              {alert.src_ip} → {alert.dst_ip}
                            </div>
                            <div className={`flex items-center gap-4 text-xs ${isDark ? "text-purple-400" : "text-purple-600"}`}>
                              <span>{alert.protocol}</span>
                              <span className="flex items-center gap-1">
                                <Clock size={12} /> {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : "—"}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => fetchExplanation(alert.label)}
                              className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 transition-colors"
                              title="Show explanation"
                            >
                              <Info size={16} />
                            </motion.button>
                            {!alert.is_blocked && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleBlock(alert.id)}
                                className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-colors"
                                title="Block IP"
                              >
                                <Ban size={16} />
                              </motion.button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* AI Explainability Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border backdrop-blur-xl p-6 h-fit sticky top-6 ${isDark ? "border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10" : "border-purple-200 bg-white shadow-md"}`}
            >
              <h3 className={`text-lg font-bold flex items-center gap-2 mb-4 ${isDark ? "text-white" : "text-purple-950"}`}>
                <FileText size={20} className="text-cyan-400" />
                Threat Analysis
              </h3>

              {explanation ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {/* Header */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`font-semibold ${isDark ? "text-white" : "text-purple-950"}`}>{explanation.label}</h4>
                      <span
                        className="text-xs px-2 py-1 rounded-lg font-bold"
                        style={{
                          color: SEVERITY_CONFIG[explanation.severity]?.color,
                          background: SEVERITY_CONFIG[explanation.severity]?.bg,
                        }}
                      >
                        {explanation.severity}
                      </span>
                    </div>
                    <p className={`text-sm ${isDark ? "text-purple-300" : "text-purple-800"}`}>{explanation.description}</p>
                  </div>

                  {/* Key Indicators */}
                  <div className="space-y-2">
                    <h5 className={`text-sm font-semibold ${isDark ? "text-purple-200" : "text-purple-900"}`}>Key Indicators</h5>
                    {explanation?.key_indicators?.map((ind, i) => (
                      <div key={i} className={`rounded-lg p-2 border ${isDark ? "bg-purple-900/40 border-purple-500/20" : "bg-purple-50 border-purple-200"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-mono ${isDark ? "text-cyan-300" : "text-cyan-700"}`}>{ind.feature}</span>
                          <span
                            className="text-xs font-bold px-1.5 py-0.5 rounded"
                            style={{
                              color: ind.impact === "CRITICAL" ? "#ef4444" : ind.impact === "HIGH" ? "#f59e0b" : "#3b82f6",
                              background:
                                ind.impact === "CRITICAL"
                                  ? "#ef444420"
                                  : ind.impact === "HIGH"
                                    ? "#f59e0b20"
                                    : "#3b82f620",
                            }}
                          >
                            {ind.impact}
                          </span>
                        </div>
                        <p className={`text-xs ${isDark ? "text-purple-300" : "text-purple-800"}`}>{ind.detail}</p>
                      </div>
                    ))}
                  </div>

                  {/* Mitigation */}
                  <div>
                    <h5 className={`text-sm font-semibold mb-2 ${isDark ? "text-purple-200" : "text-purple-900"}`}>Recommended Action</h5>
                    <p className={`text-xs p-3 rounded-lg border ${isDark ? "text-purple-300 bg-purple-900/40 border-purple-500/20" : "text-slate-500 bg-slate-50 border-slate-200"}`}>
                      {explanation.mitigation}
                    </p>
                  </div>
                </motion.div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle size={32} className="mx-auto text-purple-400 opacity-30 mb-2" />
                  <p className={`text-sm ${isDark ? "text-purple-300" : "text-purple-800"}`}>Select a threat type to view analysis</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
