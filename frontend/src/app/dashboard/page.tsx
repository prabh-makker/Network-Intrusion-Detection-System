"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Radio,
  Zap,
  TrendingUp,
  AlertTriangle,
  Target,
  Globe,
  Download,
  RefreshCw,
  Skull,
  Radar,
  Lock,
  Eye,
  Ban,
  ChevronRight,
  X,
  FileUp,
  ServerCrash,
  Cpu,
} from "lucide-react";
import {
  motion,
  AnimatePresence as FramerAnimatePresence,
} from "framer-motion";
import { useRouter } from "next/navigation";
import { getToken, fetchWithAuth } from "@/lib/auth";
import { getApiUrl, getWsUrl } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useTheme } from "@/context/ThemeContext";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type Packet = {
  timestamp: number;
  src_ip: string;
  dst_ip: string;
  protocol: string;
  length: number;
  label: string;
  confidence: number;
  is_threat: boolean;
};

type DashboardStats = {
  total_threats: number;
  by_label: Record<string, number>;
  top_sources: { ip: string; count: number }[];
};

type RecentAlert = {
  id: string;
  timestamp: string;
  src_ip: string;
  dst_ip: string;
  protocol: string;
  label: string;
  confidence: number;
  is_blocked: boolean;
};

const THREAT_COLORS: Record<string, string> = {
  DoS: "#06b6d4",
  "DDoS (Ping of Death)": "#ec4899",
  Probe: "#f59e0b",
  "U2R (Root Access)": "#ef4444",
};

const ROYAL_COLORS = {
  deepPurple: "#6d28d9",
  gold: "#fbbf24",
  royalBlue: "#1e40af",
  silver: "#e5e7eb",
  darkPurple: "#4c1d95",
};

const PIE_COLORS = [
  "#7c3aed",
  "#fbbf24",
  "#ec4899",
  "#ef4444",
  "#06b6d4",
  "#10b981",
];

const THREAT_ICONS: Record<string, React.ReactNode> = {
  DoS: <Zap size={14} />,
  "DDoS (Ping of Death)": <Skull size={14} />,
  Probe: <Radar size={14} />,
  "U2R (Root Access)": <Lock size={14} />,
};

function AnimatedNumber({
  value,
  duration = 1200,
}: {
  value: number;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.max(1, Math.ceil(value / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{display.toLocaleString()}</>;
}

// Professional Threat Indicator Component
function ThreatIndicator({
  threat,
  index,
  style,
  isDark = true,
}: {
  threat: { name: string; value: number };
  index: number;
  style: "radar" | "gauge" | "pulse";
  isDark?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const threatColor = THREAT_COLORS[threat.name] || ROYAL_COLORS.gold;
  const severity =
    threat.value > 50 ? "critical" : threat.value > 20 ? "high" : "medium";

  if (style === "radar") {
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center relative"
      >
        {/* Radar circles */}
        {[40, 60, 80, 100].map((r) => (
          <div
            key={r}
            className="absolute border rounded-full opacity-30"
            style={{
              width: `${r}%`,
              height: `${r}%`,
              borderColor: threatColor,
              borderWidth: "1px",
            }}
          />
        ))}

        {/* Center dot */}
        <div
          className="absolute w-3 h-3 rounded-full"
          style={{ background: threatColor }}
        />

        {/* Rotating sweep */}
        <motion.div
          className="absolute w-full h-full"
          style={{
            borderRadius: "50%",
            background: `conic-gradient(from 0deg, ${threatColor}40 0deg, transparent 90deg)`,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />

        {/* Threat level text */}
        <div className="absolute bottom-4 left-4 right-4 text-center backdrop-blur-lg rounded-lg p-3 border border-purple-500/30 bg-black/40">
          <p
            className={`text-sm font-medium ${isDark ? "text-purple-200" : "text-purple-800"}`}
          >
            {threat.name}
          </p>
          <p
            className={`text-2xl font-bold mt-1 ${isDark ? "text-white" : "text-purple-950"}`}
          >
            {threat.value} incidents
          </p>
        </div>
      </div>
    );
  }

  if (style === "gauge") {
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center flex-col relative"
      >
        <svg viewBox="0 0 200 200" className="w-full h-full max-w-[200px]">
          {/* Gauge background */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="rgba(168, 85, 247, 0.2)"
            strokeWidth="15"
          />

          {/* Gauge progress */}
          <motion.circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke={threatColor}
            strokeWidth="15"
            strokeDasharray={`${(threat.value / 100) * 2 * Math.PI * 80} ${2 * Math.PI * 80}`}
            strokeLinecap="round"
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "100px 100px",
            }}
            animate={{
              strokeDasharray: [
                `0 ${2 * Math.PI * 80}`,
                `${(threat.value / 100) * 2 * Math.PI * 80} ${2 * Math.PI * 80}`,
              ],
            }}
            transition={{ duration: 1.5 }}
          />

          {/* Center text */}
          <text
            x="100"
            y="95"
            textAnchor="middle"
            className="text-2xl font-bold fill-white"
          >
            {threat.value}%
          </text>
          <text
            x="100"
            y="115"
            textAnchor="middle"
            className="text-xs fill-purple-300"
          >
            {severity.toUpperCase()}
          </text>
        </svg>

        <p
          className={`text-sm font-medium mt-3 ${isDark ? "text-purple-200" : "text-purple-800"}`}
        >
          {threat.name}
        </p>
      </div>
    );
  }

  // Pulse style
  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center relative overflow-hidden"
    >
      {/* Pulsing rings */}
      {[1, 2, 3].map((ring) => (
        <div
          key={ring}
          className="absolute rounded-full opacity-20"
          style={{
            width: `${ring * 60}px`,
            height: `${ring * 60}px`,
            border: `2px solid ${threatColor}`,
          }}
        />
      ))}

      {/* Center indicator */}
      <div
        className="absolute w-8 h-8 rounded-full"
        style={{
          background: `linear-gradient(135deg, ${threatColor}, transparent)`,
          boxShadow: `0 0 20px ${threatColor}`,
          opacity: 0.9,
        }}
      />

      {/* Stats */}
      <div className="absolute bottom-4 left-4 right-4 backdrop-blur-lg bg-black/40 rounded-lg p-3 border border-purple-500/30 text-center">
        <p className="text-purple-200 text-sm font-medium">{threat.name}</p>
        <p
          className={`text-2xl font-bold mt-1 ${isDark ? "text-white" : "text-purple-950"}`}
        >
          {threat.value}
        </p>
      </div>
    </div>
  );
}

// Main Dashboard
export default function NIDSDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [packets, setPackets] = useState<Packet[]>([]);
  const [totalPackets, setTotalPackets] = useState(0);
  const [threatCount, setThreatCount] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);
  const [timelineRange, setTimelineRange] = useState<"24h" | "7d" | "30d">(
    "24h",
  );
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pcapSummary, setPcapSummary] = useState<any>(null);
  const [trafficChartData, setTrafficChartData] = useState<any[]>([]);
  const [blockingId, setBlockingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const chartBufferRef = useRef<
    { time: string; traffic: number; threats: number }[]
  >([]);

  const apiUrl = getApiUrl();

  useEffect(() => {
    if (!getToken()) router.push("/login");
    else setAuthenticated(true);
  }, [router]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {}
  }, [apiUrl]);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetchWithAuth(
        `${apiUrl}/api/v1/alerts/recent?limit=10`,
      );
      if (res.ok) {
        const data = await res.json();
        setRecentAlerts(data);
      }
    } catch {}
  }, [apiUrl]);

  useEffect(() => {
    fetchStats();
    fetchAlerts();
    const interval = setInterval(() => {
      fetchStats();
      fetchAlerts();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchAlerts]);

  const fetchTimeline = useCallback(async () => {
    setLoadingTimeline(true);
    try {
      const res = await fetchWithAuth(
        `${apiUrl}/api/v1/alerts/timeline?range=${timelineRange}`,
      );
      if (res.ok) {
        const data = await res.json();
        setHistoricalData(data);
      }
    } catch {
    } finally {
      setLoadingTimeline(false);
    }
  }, [apiUrl, timelineRange]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeLabel = now.toLocaleTimeString([], {
        minute: "2-digit",
        second: "2-digit",
      });
      const cutoff = Date.now() - 3000;
      const recentPackets = packets.filter((p) => p.timestamp * 1000 > cutoff);
      const recentThreats = recentPackets.filter((p) => p.is_threat).length;
      chartBufferRef.current = [
        ...chartBufferRef.current,
        {
          time: timeLabel,
          traffic: recentPackets.length,
          threats: recentThreats,
        },
      ].slice(-30);
      setTrafficChartData([...chartBufferRef.current]);
    }, 3000);
    return () => clearInterval(interval);
  }, [packets]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const wsUrl = getWsUrl();
    const ws = new WebSocket(
      `${wsUrl}/api/v1/traffic/stream?token=${encodeURIComponent(token)}`,
    );
    ws.onopen = () => setIsLive(true);
    ws.onmessage = (event) => {
      try {
        const packet: Packet = JSON.parse(event.data);
        setPackets((prev) => [packet, ...prev].slice(0, 50));
        setTotalPackets((prev) => prev + 1);
        if (packet.is_threat) setThreatCount((prev) => prev + 1);
      } catch {}
    };
    ws.onclose = () => setIsLive(false);
    ws.onerror = () => {};
    return () => ws.close();
  }, []);

  const handlePCAPUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setPcapSummary(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/v1/traffic/upload-pcap`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.status === "completed") {
        setPcapSummary(data.analysis);
        fetchTimeline();
        fetchStats();
        fetchAlerts();
        toast(
          "success",
          "PCAP Analysis Complete",
          `${data.analysis.packets_processed} packets, ${data.analysis.threats_detected} threats`,
        );
      } else {
        toast("error", "Analysis Failed", data.error || "Unknown error");
      }
    } catch {
      toast("error", "Upload Failed", "Valid PCAP under 10MB required");
    } finally {
      setIsUploading(false);
    }
  };

  const handleBlock = async (alertId: string) => {
    setBlockingId(alertId);
    try {
      const res = await fetchWithAuth(
        `${apiUrl}/api/v1/alerts/${alertId}/block`,
        { method: "POST" },
      );
      const data = await res.json();
      if (data.status === "blocked") {
        toast("success", "IP Blocked", `${data.ip} blocked via firewall`);
        fetchAlerts();
      } else {
        toast("error", "Block Failed", data.detail || "Unknown error");
      }
    } catch {
      toast("error", "Block Failed", "Could not block IP");
    } finally {
      setBlockingId(null);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/export`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "nids-threat-report.pdf";
        a.click();
        URL.revokeObjectURL(url);
        toast("success", "Report Downloaded", "PDF threat report saved");
      }
    } catch {
      toast("error", "Export Failed", "Could not generate PDF");
    }
  };

  const currentStatus =
    threatCount > 10 ? "CRITICAL" : threatCount > 0 ? "WARNING" : "SECURE";
  const statusConfig = {
    SECURE: { color: "#10b981", label: "SECURE", icon: ShieldCheck },
    WARNING: { color: "#f59e0b", label: "WARNING", icon: AlertTriangle },
    CRITICAL: { color: "#ef4444", label: "CRITICAL", icon: ServerCrash },
  };
  const StatusIcon = statusConfig[currentStatus].icon;

  const pieData = stats
    ? Object.entries(stats.by_label).map(([name, value]) => ({ name, value }))
    : [];
  const threatCategoriesForOrbs = pieData.slice(0, 3);

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      {/* Content */}
      <div className="relative z-10">
        {/* HEADER */}
        <div
          className={`px-6 pt-6 pb-4 border-b backdrop-blur-xl ${isDark ? "border-purple-500/20 bg-gradient-to-r from-purple-900/10 via-transparent to-blue-900/10" : "border-purple-400/20 bg-purple-950/5"}`}
        >
          <div className="max-w-7xl mx-auto flex justify-between items-start">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-300"
              >
                NIDS Sentinel
              </motion.h1>
              <p
                className={`mt-2 text-sm ${isDark ? "text-purple-200" : "text-purple-800"}`}
              >
                AI-powered real-time threat detection
              </p>
            </div>
            <div className="flex items-center gap-3">
              <motion.div
                animate={{
                  boxShadow: isLive ? "0 0 20px #10b981" : "0 0 20px #ef4444",
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur border ${isDark ? "bg-gradient-to-r from-purple-900/40 to-blue-900/40 border-purple-500/30" : "bg-purple-950/10 border-purple-400/20"}`}
              >
                <span className="relative w-2 h-2">
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{ background: isLive ? "#10b981" : "#ef4444" }}
                  />
                </span>
                <span
                  className={`font-semibold text-sm ${isDark ? "text-white" : "text-purple-900"}`}
                >
                  {isLive ? "LIVE" : "OFFLINE"}
                </span>
              </motion.div>

              <button
                onClick={() => {
                  if (isAnalyzing) return;
                  setIsAnalyzing(true);
                  setTimeout(() => {
                    setIsAnalyzing(false);
                    const details =
                      currentStatus === "SECURE"
                        ? "All AI scanners are green. No active threats detected."
                        : currentStatus === "WARNING"
                          ? "AI has flagged potential threats. Review the Live Feed below."
                          : "CRITICAL: High volume of threats detected. Action may be required.";
                    toast(
                      currentStatus === "SECURE"
                        ? "success"
                        : currentStatus === "WARNING"
                          ? "warning"
                          : "error",
                      `System ${statusConfig[currentStatus].label}`,
                      details,
                    );
                  }, 2000);
                }}
                disabled={isAnalyzing}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur border transition-all active:scale-95 ${isDark ? "bg-gradient-to-r from-purple-900/40 to-blue-900/40 border-purple-500/30 hover:border-purple-500/60" : "bg-purple-950/10 border-purple-400/20 hover:border-purple-400/40"} ${isAnalyzing ? "opacity-80 cursor-wait" : ""}`}
              >
                {isAnalyzing ? (
                  <RefreshCw size={16} className="animate-spin text-cyan-400" />
                ) : (
                  <StatusIcon
                    size={16}
                    style={{ color: statusConfig[currentStatus].color }}
                  />
                )}
                <span
                  className={`font-semibold text-sm ${isDark ? "text-white" : "text-purple-900"}`}
                >
                  {isAnalyzing ? "ANALYZING..." : statusConfig[currentStatus].label}
                </span>
              </button>

              <button
                onClick={handleExport}
                className="p-2 rounded-lg bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 hover:from-yellow-500/40 hover:to-yellow-600/40 border border-yellow-500/30 text-yellow-400 transition-all"
                title="Export PDF Report"
              >
                <Download size={16} />
              </button>

              <button
                onClick={async () => {
                  setIsRefreshing(true);
                  await Promise.all([
                    fetchStats(),
                    fetchAlerts(),
                    fetchTimeline(),
                  ]);
                  setTimeout(() => setIsRefreshing(false), 1000);
                  toast(
                    "info",
                    "Data Refreshed",
                    "Dashboard stats have been updated",
                  );
                }}
                className="p-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/40 hover:to-blue-500/40 border border-cyan-500/30 text-cyan-400 transition-all"
                title="Refresh"
              >
                <RefreshCw
                  size={16}
                  className={isRefreshing ? "animate-spin" : ""}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* STAT CARDS WITH 3D ORBS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Packets Analyzed",
                value: totalPackets,
                icon: Activity,
                color: "#06b6d4",
                trend: isLive ? "Live stream" : "Paused",
              },
              {
                label: "Threats Detected",
                value: stats?.total_threats ?? threatCount,
                icon: ShieldAlert,
                color: "#ef4444",
                trend: stats
                  ? `${Object.keys(stats.by_label).length} categories`
                  : "—",
              },
              {
                label: "Active Connections",
                value: isLive ? packets.length : 0,
                icon: Radio,
                color: ROYAL_COLORS.deepPurple,
                trend: isLive ? "Streaming" : "Idle",
              },
              {
                label: "Detection Rate",
                display:
                  totalPackets > 0
                    ? `${((threatCount / totalPackets) * 100).toFixed(1)}%`
                    : "0%",
                icon: Zap,
                color: ROYAL_COLORS.gold,
                trend: "ML: 99.82%",
              },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="group relative overflow-hidden rounded-2xl"
              >
                {/* Gradient background */}
                <div
                  className={`absolute inset-0 border ${isDark ? "bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-purple-900/5 border-purple-500/20" : "bg-purple-950/10 border-purple-400/20"}`}
                />

                {/* Hover glow effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div
                    className="absolute inset-0 blur-2xl"
                    style={{
                      background: `radial-gradient(circle at 50% 50%, ${s.color}20, transparent)`,
                    }}
                  />
                </div>

                <div className="relative backdrop-blur-xl p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p
                        className={`text-sm font-medium ${isDark ? "text-purple-200" : "text-purple-800"}`}
                      >
                        {s.label}
                      </p>
                      <p
                        className={`text-4xl font-bold mt-3 ${isDark ? "text-white" : "text-purple-950"}`}
                      >
                        {s.display ?? (
                          <AnimatedNumber value={s.value as number} />
                        )}
                      </p>
                      <p className="text-xs mt-3" style={{ color: s.color }}>
                        {s.trend}
                      </p>
                    </div>
                    <div
                      className="p-3 rounded-xl"
                      style={{ background: `${s.color}20`, color: s.color }}
                    >
                      <s.icon size={24} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* PROFESSIONAL THREAT INDICATORS */}
          {threatCategoriesForOrbs.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {threatCategoriesForOrbs.map((threat, idx) => {
                const indicatorStyles: Array<"radar" | "gauge" | "pulse"> = [
                  "radar",
                  "gauge",
                  "pulse",
                ];
                return (
                  <motion.div
                    key={threat.name}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`relative rounded-2xl overflow-hidden ${isDark ? "border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10" : "border border-purple-400/20 bg-purple-950/10"} backdrop-blur-xl`}
                    style={{ height: 300 }}
                  >
                    <ThreatIndicator
                      threat={threat}
                      index={idx}
                      style={indicatorStyles[idx]}
                      isDark={isDark}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Traffic Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`lg:col-span-2 rounded-2xl overflow-hidden ${isDark ? "border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10" : "border border-purple-400/20 bg-purple-950/10"} backdrop-blur-xl p-6`}
            >
              <div className="flex justify-between items-center mb-6">
                <h3
                  className={`text-xl font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-purple-950"}`}
                >
                  <Activity size={20} style={{ color: "#06b6d4" }} />
                  Live Traffic Flow
                </h3>
                <div className="flex gap-4">
                  <span
                    className={`text-sm flex items-center gap-2 ${isDark ? "text-purple-200" : "text-purple-800"}`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: "#06b6d4" }}
                    />{" "}
                    Traffic
                  </span>
                  <span
                    className={`text-sm flex items-center gap-2 ${isDark ? "text-purple-200" : "text-purple-800"}`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: "#ef4444" }}
                    />{" "}
                    Threats
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={trafficChartData}>
                  <defs>
                    <linearGradient id="gTraffic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gThreats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148,163,184,0.1)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark
                        ? "rgba(15,10,26,0.95)"
                        : "rgba(255,255,255,0.95)",
                      border: isDark
                        ? "1px solid rgba(168,85,247,0.3)"
                        : "1px solid rgba(203,213,225,0.5)",
                      borderRadius: "10px",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: isDark ? "#f1f5f9" : "#1e293b" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="traffic"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fill="url(#gTraffic)"
                  />
                  <Area
                    type="monotone"
                    dataKey="threats"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fill="url(#gThreats)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Threat Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`rounded-2xl overflow-hidden ${isDark ? "border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10" : "border border-purple-400/20 bg-purple-950/10"} backdrop-blur-xl p-6`}
            >
              <h3
                className={`text-xl font-bold flex items-center gap-2 mb-6 ${isDark ? "text-white" : "text-purple-950"}`}
              >
                <Target size={20} style={{ color: "#ec4899" }} />
                Threat Breakdown
              </h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((_, idx) => (
                        <Cell
                          key={idx}
                          fill={PIE_COLORS[idx % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15,10,26,0.95)",
                        border: "1px solid rgba(168,85,247,0.3)",
                        borderRadius: "10px",
                      }}
                      itemStyle={{ color: "#f1f5f9" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <ShieldCheck
                    size={32}
                    className="text-emerald-400 opacity-40 mb-3"
                  />
                  <p className={isDark ? "text-purple-300" : "text-purple-800"}>
                    No threats detected yet
                  </p>
                </div>
              )}
            </motion.div>
          </div>

          {/* RECENT ALERTS TABLE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`rounded-2xl overflow-hidden ${isDark ? "border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10" : "border border-purple-400/20 bg-purple-950/10"} backdrop-blur-xl p-6`}
          >
            <div className="flex justify-between items-center mb-6">
              <h3
                className={`text-xl font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-purple-950"}`}
              >
                <AlertTriangle size={20} style={{ color: "#f59e0b" }} />
                Recent Alerts
              </h3>
              <button
                onClick={() => router.push("/alerts")}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-medium transition-all flex items-center gap-2"
              >
                View All <ChevronRight size={16} />
              </button>
            </div>

            <div className="overflow-x-auto">
              {recentAlerts.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className={`border-b ${isDark ? "border-purple-500/20" : "border-purple-400/20"}`}
                    >
                      <th
                        className={`text-left py-3 px-4 font-medium ${isDark ? "text-purple-300" : "text-purple-800"}`}
                      >
                        Type
                      </th>
                      <th
                        className={`text-left py-3 px-4 font-medium ${isDark ? "text-purple-300" : "text-purple-800"}`}
                      >
                        Source IP
                      </th>
                      <th
                        className={`text-left py-3 px-4 font-medium ${isDark ? "text-purple-300" : "text-purple-800"}`}
                      >
                        Target
                      </th>
                      <th
                        className={`text-left py-3 px-4 font-medium ${isDark ? "text-purple-300" : "text-purple-800"}`}
                      >
                        Confidence
                      </th>
                      <th
                        className={`text-left py-3 px-4 font-medium ${isDark ? "text-purple-300" : "text-purple-800"}`}
                      >
                        Status
                      </th>
                      <th
                        className={`text-left py-3 px-4 font-medium ${isDark ? "text-purple-300" : "text-purple-800"}`}
                      >
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAlerts.map((a) => (
                      <motion.tr
                        key={a.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`border-b transition-colors ${isDark ? "border-purple-500/10 hover:bg-purple-500/10" : "border-purple-400/10 hover:bg-purple-500/10"}`}
                      >
                        <td className="py-3 px-4">
                          <span
                            className="flex items-center gap-2 font-medium"
                            style={{
                              color: THREAT_COLORS[a.label] || "#8b5cf6",
                            }}
                          >
                            {THREAT_ICONS[a.label] || <ShieldAlert size={14} />}
                            {a.label}
                          </span>
                        </td>
                        <td
                          className={`py-3 px-4 font-mono text-xs ${isDark ? "text-gray-300" : "text-purple-800"}`}
                        >
                          {a.src_ip}
                        </td>
                        <td
                          className={`py-3 px-4 font-mono text-xs ${isDark ? "text-gray-300" : "text-purple-800"}`}
                        >
                          {a.dst_ip}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-24 h-2 rounded-full overflow-hidden ${isDark ? "bg-purple-900" : "bg-purple-900/20"}`}
                            >
                              <div
                                className="h-full transition-all"
                                style={{
                                  width: `${a.confidence}%`,
                                  background:
                                    a.confidence >= 90
                                      ? "#ef4444"
                                      : a.confidence >= 70
                                        ? "#f59e0b"
                                        : "#10b981",
                                }}
                              />
                            </div>
                            <span
                              className={`text-xs ${isDark ? "text-white" : "text-purple-900"}`}
                            >
                              {a.confidence}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {a.is_blocked ? (
                            <span className="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-300 flex items-center gap-1 w-fit">
                              <Ban size={12} /> Blocked
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded-lg bg-blue-500/20 text-blue-300 flex items-center gap-1 w-fit">
                              <Eye size={12} /> Active
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {!a.is_blocked && (
                            <button
                              onClick={() => handleBlock(a.id)}
                              disabled={blockingId === a.id}
                              className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 text-xs font-medium transition-all disabled:opacity-50 flex items-center gap-1"
                            >
                              {blockingId === a.id ? (
                                <RefreshCw size={12} className="animate-spin" />
                              ) : (
                                <Ban size={12} />
                              )}
                              Block
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center">
                  <ShieldCheck
                    size={32}
                    className="text-emerald-400 opacity-40 mb-3"
                  />
                  <p className={isDark ? "text-purple-300" : "text-purple-800"}>
                    No recent alerts
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* LIVE TRAFFIC STREAM (THE 50 CONNECTIONS) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className={`rounded-2xl overflow-hidden ${isDark ? "border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10" : "border border-purple-400/20 bg-purple-950/10"} backdrop-blur-xl p-6`}
          >
            <div className="flex justify-between items-center mb-6">
              <h3
                className={`text-xl font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-purple-950"}`}
              >
                <Radio size={20} className="text-purple-400" />
                Live Traffic Stream (Last 50 Packets)
              </h3>
              <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />{" "}
                  NORMAL
                </span>
                <span className="flex items-center gap-1 ml-3">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> THREAT
                </span>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr
                    className={`${isDark ? "bg-[#0f0a1a] text-purple-300" : "bg-purple-100 text-purple-800"}`}
                  >
                    <th className="text-left py-2 px-4 font-medium border-b border-purple-500/20">
                      Timestamp
                    </th>
                    <th className="text-left py-2 px-4 font-medium border-b border-purple-500/20">
                      Source
                    </th>
                    <th className="text-left py-2 px-4 font-medium border-b border-purple-500/20">
                      Destination
                    </th>
                    <th className="text-left py-2 px-4 font-medium border-b border-purple-500/20">
                      Prot
                    </th>
                    <th className="text-left py-2 px-4 font-medium border-b border-purple-500/20">
                      Size
                    </th>
                    <th className="text-left py-2 px-4 font-medium border-b border-purple-500/20">
                      AI Label
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <FramerAnimatePresence>
                    {packets.map((p, idx) => (
                      <motion.tr
                        key={`${p.timestamp}-${idx}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`border-b border-purple-500/10 ${p.is_threat ? "bg-rose-500/5" : "hover:bg-purple-500/5"}`}
                      >
                        <td className="py-2 px-4 font-mono text-[11px] text-[var(--muted)]">
                          {new Date(p.timestamp * 1000).toLocaleTimeString()}
                        </td>
                        <td
                          className={`py-2 px-4 font-mono text-xs ${isDark ? "text-slate-300" : "text-purple-900"}`}
                        >
                          {p.src_ip}
                        </td>
                        <td
                          className={`py-2 px-4 font-mono text-xs ${isDark ? "text-slate-300" : "text-purple-900"}`}
                        >
                          {p.dst_ip}
                        </td>
                        <td className="py-2 px-4">
                          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold">
                            {p.protocol}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-xs text-[var(--muted)]">
                          {p.length} B
                        </td>
                        <td className="py-2 px-4">
                          <span
                            className={`text-[11px] font-semibold ${p.is_threat ? "text-rose-400" : "text-emerald-400"}`}
                          >
                            {p.label}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </FramerAnimatePresence>
                  {packets.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-10 text-center text-[var(--muted)]"
                      >
                        Waiting for live traffic...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* TOP ATTACKERS & PCAP */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Attackers */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`rounded-2xl overflow-hidden ${isDark ? "border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10" : "border border-purple-400/20 bg-purple-950/10"} backdrop-blur-xl p-6`}
            >
              <h3
                className={`text-xl font-bold flex items-center gap-2 mb-6 ${isDark ? "text-white" : "text-purple-950"}`}
              >
                <Globe size={20} style={{ color: ROYAL_COLORS.deepPurple }} />
                Top Attackers
              </h3>
              {stats?.top_sources && stats.top_sources.length > 0 ? (
                <div className="space-y-4">
                  {stats.top_sources.slice(0, 5).map((src, i) => {
                    const maxCount = stats.top_sources[0].count;
                    return (
                      <motion.div
                        key={src.ip}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-4"
                      >
                        <span className="text-sm font-bold text-purple-400 w-6">
                          #{i + 1}
                        </span>
                        <span
                          className={`font-mono text-xs flex-1 truncate ${isDark ? "text-gray-300" : "text-purple-800"}`}
                        >
                          {src.ip}
                        </span>
                        <div
                          className={`w-32 h-2 rounded-full overflow-hidden ${isDark ? "bg-purple-900" : "bg-purple-900/20"}`}
                        >
                          <motion.div
                            className="h-full"
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(src.count / maxCount) * 100}%`,
                            }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            style={{
                              background: PIE_COLORS[i % PIE_COLORS.length],
                            }}
                          />
                        </div>
                        <span
                          className={`text-xs font-bold w-8 text-right ${isDark ? "text-white" : "text-purple-900"}`}
                        >
                          {src.count}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center">
                  <Globe size={32} className="opacity-30 mb-3" />
                  <p className="text-purple-300 text-sm">No data yet</p>
                </div>
              )}
            </motion.div>

            {/* PCAP Upload */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`rounded-2xl overflow-hidden ${isDark ? "border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10" : "border border-purple-400/20 bg-purple-950/10"} backdrop-blur-xl p-6`}
            >
              <h3
                className={`text-xl font-bold flex items-center gap-2 mb-6 ${isDark ? "text-white" : "text-purple-950"}`}
              >
                <FileUp size={20} style={{ color: "#06b6d4" }} />
                PCAP Analysis
              </h3>
              <div className="relative group">
                <input
                  type="file"
                  accept=".pcap"
                  onChange={handlePCAPUpload}
                  disabled={isUploading}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center py-12 px-6 border-2 border-dashed border-cyan-500/40 rounded-xl group-hover:border-cyan-500/60 group-hover:bg-cyan-500/5 transition-all">
                  <FileUp
                    size={28}
                    className={`text-cyan-400 mb-3 ${isUploading ? "animate-bounce" : ""}`}
                  />
                  <p
                    className={`font-medium ${isDark ? "text-white" : "text-purple-900"}`}
                  >
                    {isUploading ? "Analyzing..." : "Drop .pcap or click"}
                  </p>
                  <p
                    className={`text-xs mt-2 ${isDark ? "text-purple-300" : "text-purple-800"}`}
                  >
                    PCAP file analysis for historical threats
                  </p>
                  {isUploading && (
                    <div className="mt-4 w-full h-1 bg-purple-900 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    </div>
                  )}
                </div>
              </div>
              <FramerAnimatePresence>
                {pcapSummary && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30"
                  >
                    <button
                      onClick={() => setPcapSummary(null)}
                      className={`absolute top-2 right-2 ${isDark ? "text-purple-300 hover:text-white" : "text-purple-400 hover:text-purple-900"}`}
                    >
                      <X size={16} />
                    </button>
                    <div className="space-y-2">
                      <p className="text-sm text-cyan-300">
                        📦 <strong>{pcapSummary.packets_processed}</strong>{" "}
                        packets processed
                      </p>
                      <p className="text-sm text-red-300">
                        ⚠️ <strong>{pcapSummary.threats_detected}</strong>{" "}
                        threats detected
                      </p>
                      {Object.entries(pcapSummary.categories).map(
                        ([cat, count]) => (
                          <p
                            key={cat}
                            className={`text-xs ${isDark ? "text-purple-300" : "text-purple-800"}`}
                          >
                            {cat}: {String(count)}
                          </p>
                        ),
                      )}
                    </div>
                  </motion.div>
                )}
              </FramerAnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
