"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Clock,
  ArrowLeft,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Target,
  Download,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts";
import { useTheme } from "@/context/ThemeContext";
import { getApiUrl } from "@/lib/api";
import { fetchWithAuth, getToken } from "@/lib/auth";

interface TimelinePoint {
  time: string;
  traffic?: number;
  threats?: number;
  [key: string]: any;
}

const TIME_RANGES = [
  { value: "1h", label: "1 Hour" },
  { value: "6h", label: "6 Hours" },
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "custom", label: "Custom" },
];

const COLORS = ["#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#10b981"];

export default function AnalyticsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const apiUrl = getApiUrl();
  const [timeRange, setTimeRange] = useState("24h");
  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const [timelineData, setTimelineData] = useState<TimelinePoint[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [authenticated, setAuthenticated] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState<TimelinePoint[]>([]);

  useEffect(() => {
    if (!getToken()) router.push("/login");
    else setAuthenticated(true);
  }, [router]);

  const fetchTimelineData = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${apiUrl}/api/v1/alerts/timeline?time_range=${timeRange}`;
      if (timeRange === "custom" && customStart && customEnd) {
        url = `${apiUrl}/api/v1/alerts/timeline?time_range=custom&start_date=${customStart}&end_date=${customEnd}`;
      }
      const res = await fetchWithAuth(url);
      if (res.ok) {
        const data = await res.json();
        setTimelineData(data);
      }

      let statsUrl = `${apiUrl}/api/v1/alerts/stats?time_range=${timeRange}`;
      if (timeRange === "custom" && customStart && customEnd) {
        statsUrl = `${apiUrl}/api/v1/alerts/stats?time_range=custom&start_date=${customStart}&end_date=${customEnd}`;
      }
      const statsRes = await fetchWithAuth(statsUrl);
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      setLastRefreshed(new Date());
    } catch (e) {
      console.error("fetchAnalytics failed:", e);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, timeRange, customStart, customEnd]);

  useEffect(() => {
    if (!authenticated) return;
    fetchTimelineData();
    const interval = setInterval(fetchTimelineData, 5000);
    return () => clearInterval(interval);
  }, [authenticated, fetchTimelineData]);

  const fetchComparisonData = useCallback(async () => {
    if (!showComparison || timeRange === "custom") { setComparisonData([]); return; }
    try {
      const periodMs: Record<string, number> = {
        "1h": 3600000, "6h": 21600000, "24h": 86400000,
        "7d": 604800000, "30d": 2592000000,
      };
      const ms = periodMs[timeRange] ?? 86400000;
      const now = new Date();
      const end = new Date(now.getTime() - ms);
      const start = new Date(now.getTime() - 2 * ms);
      const fmt = (d: Date) => d.toISOString().split("T")[0];
      const url = `${apiUrl}/api/v1/alerts/timeline?time_range=custom&start_date=${fmt(start)}&end_date=${fmt(end)}`;
      const res = await fetchWithAuth(url);
      if (res.ok) setComparisonData(await res.json());
    } catch (e) { console.error("fetchComparison failed:", e); }
  }, [apiUrl, timeRange, showComparison]);

  useEffect(() => {
    if (!authenticated) return;
    fetchComparisonData();
  }, [authenticated, fetchComparisonData]);

  const pieData = stats?.by_label
    ? Object.entries(stats.by_label)
        .map(([name, value]) => ({ name, value: value as number }))
        .filter((d) => d.value > 0)
    : [];

  const totalThreats = stats?.total_threats ?? pieData.reduce((sum, item) => sum + item.value, 0);
  const totalBlocked = stats?.blocked_threats ?? 0;
  const totalActive = stats?.active_threats ?? 0;
  const blockRate = totalThreats > 0 ? Math.round((totalBlocked / totalThreats) * 100) : 0;
  const peakThreats = Math.max(...timelineData.map((d) => d.threats || 0), 0);
  const avgThreats = timelineData.length > 0
    ? Math.round(timelineData.reduce((sum, d) => sum + (d.threats || 0), 0) / timelineData.length)
    : 0;

  // Period comparison merged data (align by index)
  const mergedData = timelineData.map((d, i) => ({
    ...d,
    prevThreats: comparisonData[i]?.threats ?? undefined,
  }));

  // Peak point for anomaly marker
  const peakPoint = timelineData.reduce(
    (max, d) => ((d.threats || 0) > (max.threats || 0) ? d : max),
    timelineData[0] ?? { time: "" }
  );

  // Hour-of-day aggregation from timeline
  const hourBuckets = Array.from({ length: 24 }, (_, i) => ({ hour: i, threats: 0 }));
  timelineData.forEach((d) => {
    const raw = (d.time ?? "").toString();
    const match = raw.match(/(\d{1,2}):/);
    const h = match ? parseInt(match[1]) : -1;
    if (h >= 0 && h < 24) hourBuckets[h].threats += (d.threats || 0);
  });
  const maxHour = Math.max(...hourBuckets.map((b) => b.threats), 1);

  const handleExportCSV = () => {
    if (!timelineData.length) return;
    const headers = Object.keys(timelineData[0]).join(",");
    const rows = timelineData.map((r) => Object.values(r).map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([`${headers}\n${rows}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `nids-analytics-${timeRange}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <button
              onClick={() => router.push("/dashboard")}
              className={`flex items-center gap-2 mb-3 text-sm ${isDark ? "text-purple-300 hover:text-purple-200" : "text-purple-700 hover:text-purple-900"}`}
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-300 flex items-center gap-3">
              <TrendingUp size={32} />
              Threat Analytics
            </h1>
            <p className={`mt-2 text-sm ${isDark ? "text-purple-200" : "text-purple-800"}`}>
              Professional time-filtered analytics · Deep dive into threat patterns
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={!timelineData.length}
              className="p-3 rounded-lg bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/40 hover:to-teal-500/40 border border-emerald-500/30 text-emerald-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Export CSV"
            >
              <Download size={18} />
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="p-3 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/40 hover:to-blue-500/40 border border-cyan-500/30 text-cyan-400 transition-all"
              title="Refresh page"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Time Range Selector */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 p-4 rounded-xl ${isDark ? "border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10" : "border border-purple-400/20 bg-purple-50/30"} backdrop-blur-xl`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Clock size={18} className={isDark ? "text-purple-300" : "text-purple-700"} />
              <span className={`font-semibold ${isDark ? "text-purple-200" : "text-purple-800"}`}>Time Range:</span>
            </div>
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  timeRange === range.value
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30"
                    : isDark
                      ? "border border-purple-500/30 text-purple-300 hover:border-purple-500/60"
                      : "border border-purple-400/30 text-purple-700 hover:bg-purple-100"
                }`}
              >
                {range.label}
              </button>
            ))}
            {/* Custom date range inputs */}
            {timeRange === "custom" && (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${isDark ? "bg-purple-900/30 border-purple-500/40 text-purple-200" : "bg-white border-purple-300 text-purple-900"}`}
                />
                <span className={`text-sm ${isDark ? "text-purple-400" : "text-purple-600"}`}>to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${isDark ? "bg-purple-900/30 border-purple-500/40 text-purple-200" : "bg-white border-purple-300 text-purple-900"}`}
                />
                <button
                  onClick={fetchTimelineData}
                  disabled={!customStart || !customEnd}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            )}
            {/* Compare previous period toggle */}
            <button
              onClick={() => setShowComparison(!showComparison)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                showComparison
                  ? "bg-purple-500/30 text-purple-200 border border-purple-500/60"
                  : isDark ? "border border-purple-500/30 text-purple-400 hover:border-purple-500/60" : "border border-purple-400/30 text-purple-600 hover:bg-purple-100"
              }`}
            >
              <span className={`w-8 h-4 rounded-full relative transition-colors ${showComparison ? "bg-purple-500" : isDark ? "bg-purple-800" : "bg-purple-200"}`}>
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform shadow ${showComparison ? "translate-x-4" : "translate-x-0.5"}`} />
              </span>
              Compare prev period
            </button>

            <div className="ml-auto flex items-center gap-2">
              <span className={`text-sm ${isDark ? "text-purple-300" : "text-purple-700"}`}>Chart:</span>
              <button
                onClick={() => setChartType("area")}
                className={`p-2 rounded-lg ${chartType === "area" ? "bg-cyan-500 text-white" : isDark ? "text-purple-300 border border-purple-500/30" : "text-purple-700 border border-purple-400/30"}`}
              >
                <Activity size={16} />
              </button>
              <button
                onClick={() => setChartType("bar")}
                className={`p-2 rounded-lg ${chartType === "bar" ? "bg-cyan-500 text-white" : isDark ? "text-purple-300 border border-purple-500/30" : "text-purple-700 border border-purple-400/30"}`}
              >
                <BarChart3 size={16} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl ${isDark ? "border border-red-500/30 bg-gradient-to-br from-red-900/20 to-pink-900/10" : "border border-red-400/20 bg-red-50"} backdrop-blur-xl`}
          >
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert size={14} className={isDark ? "text-red-400" : "text-red-600"} />
              <p className={`text-xs font-semibold ${isDark ? "text-red-300" : "text-red-700"}`}>Total Detected</p>
            </div>
            <p className={`text-3xl font-black ${isDark ? "text-white" : "text-red-950"}`}>
              {totalThreats.toLocaleString()}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className={`p-4 rounded-xl ${isDark ? "border border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 to-teal-900/10" : "border border-emerald-400/20 bg-emerald-50"} backdrop-blur-xl`}
          >
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={14} className={isDark ? "text-emerald-400" : "text-emerald-600"} />
              <p className={`text-xs font-semibold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>Total Blocked</p>
            </div>
            <p className={`text-3xl font-black ${isDark ? "text-white" : "text-emerald-950"}`}>
              {totalBlocked.toLocaleString()}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`p-4 rounded-xl ${isDark ? "border border-orange-500/30 bg-gradient-to-br from-orange-900/20 to-red-900/10" : "border border-orange-400/20 bg-orange-50"} backdrop-blur-xl`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Target size={14} className={isDark ? "text-orange-400" : "text-orange-600"} />
              <p className={`text-xs font-semibold ${isDark ? "text-orange-300" : "text-orange-700"}`}>Still Active</p>
            </div>
            <p className={`text-3xl font-black ${isDark ? "text-white" : "text-orange-950"}`}>
              {totalActive.toLocaleString()}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={`p-4 rounded-xl ${isDark ? "border border-cyan-500/30 bg-gradient-to-br from-cyan-900/20 to-blue-900/10" : "border border-cyan-400/20 bg-cyan-50"} backdrop-blur-xl`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Activity size={14} className={isDark ? "text-cyan-400" : "text-cyan-600"} />
              <p className={`text-xs font-semibold ${isDark ? "text-cyan-300" : "text-cyan-700"}`}>Block Rate</p>
            </div>
            <p className={`text-3xl font-black ${isDark ? "text-white" : "text-cyan-950"}`}>
              {blockRate}%
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`p-4 rounded-xl ${isDark ? "border border-amber-500/30 bg-gradient-to-br from-amber-900/20 to-orange-900/10" : "border border-amber-400/20 bg-amber-50"} backdrop-blur-xl`}
          >
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={14} className={isDark ? "text-amber-400" : "text-amber-600"} />
              <p className={`text-xs font-semibold ${isDark ? "text-amber-300" : "text-amber-700"}`}>Peak / Period</p>
            </div>
            <p className={`text-3xl font-black ${isDark ? "text-white" : "text-amber-950"}`}>
              {peakThreats.toLocaleString()}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className={`p-4 rounded-xl ${isDark ? "border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10" : "border border-purple-400/20 bg-purple-50"} backdrop-blur-xl`}
          >
            <div className="flex items-center gap-2 mb-1">
              <PieChartIcon size={14} className={isDark ? "text-purple-400" : "text-purple-600"} />
              <p className={`text-xs font-semibold ${isDark ? "text-purple-300" : "text-purple-700"}`}>Categories</p>
            </div>
            <p className={`text-3xl font-black ${isDark ? "text-white" : "text-purple-950"}`}>
              {pieData.length}
            </p>
          </motion.div>
        </div>

        {/* Main Time Series Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 rounded-2xl ${isDark ? "border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10" : "border border-purple-400/20 bg-purple-50/10"} backdrop-blur-xl p-6`}
        >
          <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-purple-950"}`}>
            <Activity size={20} className="text-cyan-400" />
            Traffic & Threats Over Time ({TIME_RANGES.find((t) => t.value === timeRange)?.label})
          </h2>
          {timelineData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center">
              <p className={isDark ? "text-purple-300" : "text-purple-700"}>
                {loading ? "Loading data..." : "No data available for this time range"}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              {chartType === "area" ? (
                <AreaChart data={mergedData}>
                  <defs>
                    <linearGradient id="anaTraffic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="anaThreats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="anaBlocked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(148,163,184,0.1)" : "rgba(148,163,184,0.3)"} vertical={false} />
                  <XAxis dataKey="time" stroke={isDark ? "#9ca3af" : "#475569"} fontSize={12} />
                  <YAxis stroke={isDark ? "#9ca3af" : "#475569"} fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "rgba(15,10,26,0.95)" : "rgba(255,255,255,0.95)",
                      border: `1px solid ${isDark ? "rgba(168,85,247,0.3)" : "rgba(168,85,247,0.5)"}`,
                      borderRadius: "10px",
                    }}
                    itemStyle={{ color: isDark ? "#f1f5f9" : "#1e293b" }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="traffic" stroke="#06b6d4" strokeWidth={2} fill="url(#anaTraffic)" name="Traffic" />
                  <Area type="monotone" dataKey="threats" stroke="#ef4444" strokeWidth={2} fill="url(#anaThreats)" name="Detected" />
                  <Area type="monotone" dataKey="blocked" stroke="#10b981" strokeWidth={2} fill="url(#anaBlocked)" name="Blocked" />
                  {showComparison && (
                    <Area type="monotone" dataKey="prevThreats" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="5 3" fill="none" name="Prev Period" dot={false} />
                  )}
                  {peakPoint?.time && peakThreats > 0 && (
                    <ReferenceLine
                      x={peakPoint.time}
                      stroke="#ef4444"
                      strokeDasharray="4 2"
                      strokeWidth={1.5}
                      label={{ value: "⚠ Peak", fill: "#ef4444", fontSize: 10, position: "insideTopLeft" }}
                    />
                  )}
                </AreaChart>
              ) : (
                <BarChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(148,163,184,0.1)" : "rgba(148,163,184,0.3)"} vertical={false} />
                  <XAxis dataKey="time" stroke={isDark ? "#9ca3af" : "#475569"} fontSize={12} />
                  <YAxis stroke={isDark ? "#9ca3af" : "#475569"} fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "rgba(15,10,26,0.95)" : "rgba(255,255,255,0.95)",
                      border: `1px solid ${isDark ? "rgba(168,85,247,0.3)" : "rgba(168,85,247,0.5)"}`,
                      borderRadius: "10px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="traffic" fill="#06b6d4" name="Traffic" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="threats" fill="#ef4444" name="Detected" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="blocked" fill="#10b981" name="Blocked" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* ── Hour-of-Day Heatmap ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={`mb-6 rounded-2xl ${isDark ? "border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10" : "border border-purple-400/20 bg-purple-50/10"} backdrop-blur-xl p-6`}
        >
          <h2 className={`text-xl font-bold mb-1 flex items-center gap-2 ${isDark ? "text-white" : "text-purple-950"}`}>
            <Clock size={20} className="text-amber-400" />
            Attack Hour-of-Day Heatmap
          </h2>
          <p className={`text-xs mb-4 ${isDark ? "text-purple-400" : "text-purple-600"}`}>
            Threat detections aggregated by hour across the selected time range — darker = more attacks
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(24, minmax(0, 1fr))", gap: "4px" }}>
            {hourBuckets.map((b) => {
              const intensity = b.threats > 0 ? 0.15 + (b.threats / maxHour) * 0.85 : 0.07;
              return (
                <div key={b.hour} className="flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded"
                    style={{ height: 36, background: `rgba(239,68,68,${intensity.toFixed(2)})`, border: "1px solid rgba(239,68,68,0.2)" }}
                    title={`${b.hour}:00 — ${b.threats} threats`}
                  />
                  <span className={`text-[10px] tabular-nums ${isDark ? "text-purple-400" : "text-purple-600"}`}>{b.hour}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className={`text-xs ${isDark ? "text-purple-400" : "text-purple-600"}`}>Low</span>
            <div className="flex gap-0.5">
              {[0.07, 0.2, 0.4, 0.6, 0.8, 1.0].map((v, i) => (
                <div key={i} className="w-6 h-3 rounded-sm" style={{ background: `rgba(239,68,68,${v})` }} />
              ))}
            </div>
            <span className={`text-xs ${isDark ? "text-purple-400" : "text-purple-600"}`}>High</span>
          </div>
        </motion.div>

        {/* Two-column: Distribution + Top Sources */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Threat Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`rounded-2xl ${isDark ? "border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10" : "border border-purple-400/20 bg-purple-50/10"} backdrop-blur-xl p-6`}
          >
            <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-purple-950"}`}>
              <PieChartIcon size={20} className="text-pink-400" />
              Threat Distribution
            </h2>
            {pieData.length > 0 ? (
              <div>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                    >
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "rgba(15,10,26,0.95)" : "rgba(255,255,255,0.95)",
                        border: `1px solid ${isDark ? "rgba(168,85,247,0.3)" : "rgba(168,85,247,0.5)"}`,
                        borderRadius: "10px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 justify-center">
                  {pieData.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        {entry.name}: <span className="font-bold">{entry.value}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className={isDark ? "text-purple-300" : "text-purple-700"}>No data</p>
              </div>
            )}
          </motion.div>

          {/* Top Sources */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`rounded-2xl ${isDark ? "border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10" : "border border-purple-400/20 bg-purple-50/10"} backdrop-blur-xl p-6`}
          >
            <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-purple-950"}`}>
              <BarChart3 size={20} className="text-amber-400" />
              Top Threat Sources
            </h2>
            {stats?.top_sources && stats.top_sources.length > 0 ? (
              <div className="space-y-3">
                {stats.top_sources.slice(0, 10).map((source: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className={`text-xs font-mono ${isDark ? "text-purple-400" : "text-purple-700"}`}>
                      #{idx + 1}
                    </span>
                    <span className={`font-mono text-xs flex-1 truncate ${isDark ? "text-white" : "text-purple-950"}`}>
                      {source.ip}
                    </span>
                    <div className={`flex-1 h-2 rounded-full overflow-hidden max-w-[150px] ${isDark ? "bg-purple-900/50" : "bg-purple-200"}`}>
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-red-500"
                        style={{
                          width: `${(source.count / stats.top_sources[0].count) * 100}%`,
                        }}
                      />
                    </div>
                    <span className={`text-sm font-bold ${isDark ? "text-white" : "text-purple-950"}`}>
                      {source.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className={isDark ? "text-purple-300" : "text-purple-700"}>No top sources</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
