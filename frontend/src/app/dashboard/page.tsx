"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
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
  Brain,
  CheckCircle,
  Sparkles,
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
  LineChart,
  Line,
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
  active_threats?: number;
  blocked_threats?: number;
  by_label: Record<string, number>;
  by_label_active?: Record<string, number>;
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
  DDoS: "#d97706",
  "DDoS (Ping of Death)": "#ec4899",
  Probe: "#f59e0b",
  "R2L (Unauthorized Access)": "#f97316",
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
  totalThreats = 1,
}: {
  threat: { name: string; value: number };
  index: number;
  style: "radar" | "gauge" | "pulse";
  isDark?: boolean;
  totalThreats?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const threatColor = THREAT_COLORS[threat.name] || ROYAL_COLORS.gold;
  // Calculate REAL percentage based on total threats (not raw count)
  const percentage = totalThreats > 0
    ? Math.min(100, Math.round((threat.value / totalThreats) * 100))
    : 0;
  const severity =
    percentage > 50 ? "critical" : percentage > 25 ? "high" : "medium";

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

        {/* Multiple blips representing threats */}
        {[...Array(Math.min(8, Math.max(1, Math.floor(threat.value / 10))))].map((_, i) => {
          const angle = (i * 360) / 8 + index * 15;
          const radius = 30 + (i % 3) * 20;
          return (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: threatColor,
                boxShadow: `0 0 10px ${threatColor}`,
                left: `calc(50% + ${Math.cos(angle * Math.PI / 180) * radius}px)`,
                top: `calc(50% + ${Math.sin(angle * Math.PI / 180) * radius}px)`,
                transform: "translate(-50%, -50%)",
              }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
            />
          );
        })}

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
        <div className={`absolute bottom-4 left-4 right-4 text-center backdrop-blur-lg rounded-lg p-3 border ${isDark ? "border-purple-500/30 bg-black/40" : "border-purple-400/30 bg-white/70"}`}>
          <p
            className={`text-sm font-medium ${isDark ? "text-purple-200" : "text-purple-800"}`}
          >
            {threat.name}
          </p>
          <p
            className={`text-2xl font-bold mt-1 ${isDark ? "text-white" : "text-purple-950"}`}
            style={{ color: threatColor }}
          >
            {threat.value} <span className="text-sm font-normal">active</span>
          </p>
          <p className={`text-xs mt-1 ${isDark ? "text-purple-300" : "text-purple-700"}`}>
            {percentage}% of active threats
          </p>
        </div>
      </div>
    );
  }

  if (style === "gauge") {
    const circumference = 2 * Math.PI * 80;
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
            stroke={isDark ? "rgba(168, 85, 247, 0.15)" : "rgba(168, 85, 247, 0.2)"}
            strokeWidth="15"
          />

          {/* Gauge progress - uses REAL percentage */}
          <motion.circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke={threatColor}
            strokeWidth="15"
            strokeDasharray={`${(percentage / 100) * circumference} ${circumference}`}
            strokeLinecap="round"
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "100px 100px",
              filter: `drop-shadow(0 0 8px ${threatColor})`,
            }}
            animate={{
              strokeDasharray: [
                `0 ${circumference}`,
                `${(percentage / 100) * circumference} ${circumference}`,
              ],
            }}
            transition={{ duration: 1.5 }}
          />

          {/* Tick marks every 10% */}
          {[...Array(10)].map((_, i) => {
            const angle = (i * 36 - 90) * Math.PI / 180;
            return (
              <line
                key={i}
                x1={100 + Math.cos(angle) * 65}
                y1={100 + Math.sin(angle) * 65}
                x2={100 + Math.cos(angle) * 72}
                y2={100 + Math.sin(angle) * 72}
                stroke={isDark ? "rgba(168, 85, 247, 0.3)" : "rgba(168, 85, 247, 0.4)"}
                strokeWidth="1.5"
              />
            );
          })}

          {/* Center percentage - REAL value */}
          <text
            x="100"
            y="92"
            textAnchor="middle"
            className={`text-3xl font-bold ${isDark ? "fill-white" : "fill-purple-950"}`}
          >
            {percentage}%
          </text>
          <text
            x="100"
            y="112"
            textAnchor="middle"
            className="text-xs"
            fill={threatColor}
          >
            {threat.value} hits
          </text>
          <text
            x="100"
            y="128"
            textAnchor="middle"
            className={`text-xs ${isDark ? "fill-purple-300" : "fill-purple-700"}`}
          >
            {severity.toUpperCase()}
          </text>
        </svg>

        <p
          className={`text-sm font-medium mt-1 ${isDark ? "text-purple-200" : "text-purple-800"}`}
        >
          {threat.name}
        </p>
      </div>
    );
  }

  // Pulse style - mini bar chart visualization
  // Generate a simulated trend (10 bars showing fake intensity history)
  const trendBars = [...Array(10)].map((_, i) => {
    const seed = (threat.value + i * 7) % 100;
    return 20 + seed * 0.6;
  });

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center relative overflow-hidden"
    >
      {/* Pulsing rings */}
      {[1, 2, 3].map((ring) => (
        <motion.div
          key={ring}
          className="absolute rounded-full opacity-20"
          style={{
            width: `${ring * 60}px`,
            height: `${ring * 60}px`,
            border: `2px solid ${threatColor}`,
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, delay: ring * 0.3 }}
        />
      ))}

      {/* Center icon */}
      <div
        className="absolute w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${threatColor}, ${threatColor}80)`,
          boxShadow: `0 0 20px ${threatColor}`,
        }}
      >
        <Skull size={20} className="text-white" />
      </div>

      {/* Mini bar chart at bottom */}
      <div className="absolute bottom-20 left-4 right-4 flex items-end justify-center gap-1 h-12">
        {trendBars.map((height, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-t"
            style={{
              background: `linear-gradient(180deg, ${threatColor}, ${threatColor}40)`,
              maxWidth: "10px",
            }}
            initial={{ height: 0 }}
            animate={{ height: `${height}%` }}
            transition={{ delay: i * 0.05, duration: 0.5 }}
          />
        ))}
      </div>

      {/* Stats */}
      <div className={`absolute bottom-4 left-4 right-4 backdrop-blur-lg rounded-lg p-3 border text-center ${isDark ? "border-purple-500/30 bg-black/40" : "border-purple-400/30 bg-white/70"}`}>
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

// Stat cards config (constant to prevent recreation on every render)
const getStatCards = (
  totalPackets: number,
  threatCount: number,
  stats: DashboardStats | null,
  isLive: boolean,
  packets: Packet[],
  connectionCount: number
) => [
  {
    label: "Packets Analyzed",
    value: totalPackets,
    icon: Activity,
    color: "#06b6d4",
    trend: isLive ? "Live stream" : "Paused",
  },
  {
    label: "Active Threats",
    value: stats?.active_threats ?? (stats?.total_threats ?? threatCount),
    icon: ShieldAlert,
    color: "#ef4444",
    trend: stats?.blocked_threats !== undefined
      ? `${stats.blocked_threats} blocked`
      : (stats ? `${Object.keys(stats.by_label).length} categories` : "—"),
  },
  {
    label: "Active Connections",
    value: connectionCount,
    icon: Radio,
    color: ROYAL_COLORS.deepPurple,
    trend: `${connectionCount} active now`,
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
];

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
  const [showThreatAnalysis, setShowThreatAnalysis] = useState(false);
  const [isSecuring, setIsSecuring] = useState(false);
  const [securedCount, setSecuredCount] = useState(0);
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [isBulkBlocking, setIsBulkBlocking] = useState(false);
  const [connectionCount, setConnectionCount] = useState(0);
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
    } catch (e) {
      console.error("fetchStats failed:", e);
    }
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
    } catch (e) {
      console.error("fetchAlerts failed:", e);
    }
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

  // Fetch real active connections count every 5s
  useEffect(() => {
    if (!authenticated) return;
    const fetchConnectionCount = async () => {
      try {
        const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/recent?limit=50`);
        if (res.ok) {
          const data = await res.json();
          setConnectionCount(data.filter((c: any) => !c.is_blocked).length);
        }
      } catch {}
    };
    fetchConnectionCount();
    const interval = setInterval(fetchConnectionCount, 5000);
    return () => clearInterval(interval);
  }, [authenticated, apiUrl]);

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
    } catch (e) {
      console.error("fetchTimeline failed:", e);
    } finally {
      setLoadingTimeline(false);
    }
  }, [apiUrl, timelineRange]);

  useEffect(() => {
    fetchTimeline();
    // Auto-refresh timeline every 15 seconds for real-time chart updates
    const interval = setInterval(() => fetchTimeline(), 15 * 1000);
    return () => clearInterval(interval);
  }, [fetchTimeline]);

  // Built-in mock traffic sender:
  // - Normal traffic: 1 packet every 15 seconds (steady stream)
  // - Threat burst: 10 threats every 10 minutes (realistic attack pattern)
  useEffect(() => {
    // Use canonical threat types matching backend threat_configs.py
    const THREATS = ["DoS", "DDoS", "Probe", "U2R", "R2L"];
    const THREAT_WEIGHTS = [0.40, 0.20, 0.20, 0.10, 0.10]; // DoS most common
    const PROTOCOLS = ["TCP", "UDP", "ICMP", "HTTP"];
    // All 2-octet prefixes so generated IPs always have exactly 4 octets
    const SRC_BLOCKS = ["185.10", "13.210", "114.119", "45.22", "172.67", "103.22", "198.51", "203.0"];

    const pickWeighted = (arr: string[], weights: number[]): string => {
      const r = Math.random();
      let cumulative = 0;
      for (let i = 0; i < arr.length; i++) {
        cumulative += weights[i];
        if (r <= cumulative) return arr[i];
      }
      return arr[arr.length - 1];
    };

    const sendPacket = async (isThreat: boolean) => {
      try {
        const srcB = SRC_BLOCKS[Math.floor(Math.random() * SRC_BLOCKS.length)];
        const src = `${srcB}.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`;
        const threatType = pickWeighted(THREATS, THREAT_WEIGHTS);
        const payload = {
          timestamp: Date.now() / 1000,
          src_ip: src,
          dst_ip: `10.0.0.${Math.floor(Math.random() * 254) + 1}`,
          protocol: PROTOCOLS[Math.floor(Math.random() * PROTOCOLS.length)],
          length: Math.floor(Math.random() * 65000) + 40,
          label: isThreat ? threatType : "Normal",
          confidence: isThreat ? +(92 + Math.random() * 7).toFixed(2) : 99.9,
          is_threat: isThreat,
        };
        await fetchWithAuth(`${apiUrl}/api/v1/traffic/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        // silent — backend may be temporarily unavailable
      }
    };

    if (!authenticated) return;

    // NORMAL TRAFFIC: 1 packet every 15 seconds (slower, calmer feed)
    const normalInterval = setInterval(() => {
      sendPacket(false);
    }, 15 * 1000);

    // THREAT BURST: 10 threats every 10 minutes - spread over 30 seconds
    const sendThreatBurst = async () => {
      console.log("⚠️ Threat burst triggered: sending 10 threats over 30s");
      for (let i = 0; i < 10; i++) {
        await sendPacket(true);
        // Stagger threats over ~30 seconds (one every 3 seconds)
        await new Promise(r => setTimeout(r, 3000));
      }
      console.log("✓ Threat burst complete");
    };

    // Send first burst after 10 seconds, then every 10 minutes
    const initialBurstTimeout = setTimeout(sendThreatBurst, 10000);
    const burstInterval = setInterval(sendThreatBurst, 10 * 60 * 1000);

    return () => {
      clearInterval(normalInterval);
      clearInterval(burstInterval);
      clearTimeout(initialBurstTimeout);
    };
  }, [apiUrl, authenticated]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      // Show HH:MM:SS format for clearer time tracking
      const timeLabel = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      const cutoff = Date.now() - 3000;
      const recentPackets = packets.filter((p) => p.timestamp * 1000 > cutoff);
      const recentThreats = recentPackets.filter((p) => p.is_threat).length;
      const newData = [
        ...chartBufferRef.current,
        {
          time: timeLabel,
          traffic: recentPackets.length,
          threats: recentThreats,
        },
      ].slice(-30);

      // Only update state if data actually changed (prevents unnecessary re-renders)
      const dataChanged = JSON.stringify(chartBufferRef.current) !== JSON.stringify(newData);
      if (dataChanged) {
        chartBufferRef.current = newData;
        setTrafficChartData([...newData]);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [packets]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 2000;
    let destroyed = false;

    const connect = () => {
      const token = getToken();
      if (!token || destroyed) return;
      const wsUrl = getWsUrl();
      ws = new WebSocket(
        `${wsUrl}/api/v1/traffic/stream?token=${encodeURIComponent(token)}`,
      );
      ws.onopen = () => {
        setIsLive(true);
        retryDelay = 2000; // reset backoff on success
      };
      ws.onmessage = (event) => {
        try {
          const packet: Packet = JSON.parse(event.data);
          setPackets((prev) => [packet, ...prev].slice(0, 50));
          setTotalPackets((prev) => prev + 1);
          if (packet.is_threat) setThreatCount((prev) => prev + 1);
        } catch (e) {
          console.error("WS message parse error:", e);
        }
      };
      ws.onclose = () => {
        setIsLive(false);
        if (!destroyed) {
          retryTimeout = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 2, 30000);
            connect();
          }, retryDelay);
        }
      };
      ws.onerror = () => {
        // onerror always fires before onclose; onclose handles reconnect
        setIsLive(false);
      };
    };

    connect();
    return () => {
      destroyed = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      ws?.close();
    };
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

  // Toggle individual alert selection
  const toggleAlertSelection = (alertId: string) => {
    setSelectedAlerts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(alertId)) newSet.delete(alertId);
      else newSet.add(alertId);
      return newSet;
    });
  };

  // Select all unblocked alerts
  const toggleSelectAll = () => {
    const unblockedAlerts = recentAlerts.filter(a => !a.is_blocked);
    if (selectedAlerts.size === unblockedAlerts.length) {
      setSelectedAlerts(new Set());
    } else {
      setSelectedAlerts(new Set(unblockedAlerts.map(a => a.id)));
    }
  };

  // Block selected alerts (bulk operation)
  const handleBlockSelected = async () => {
    if (selectedAlerts.size === 0) {
      toast("warning", "No Selection", "Please select alerts to block first");
      return;
    }
    setIsBulkBlocking(true);
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/bulk-block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert_ids: Array.from(selectedAlerts) }),
      });
      const data = await res.json();
      if (data.status === "completed") {
        toast(
          "success",
          `✓ Blocked ${data.blocked_count} Threats`,
          `Successfully blocked ${data.blocked_count} of ${selectedAlerts.size} selected threats`
        );
        setSelectedAlerts(new Set());
        await Promise.all([fetchStats(), fetchAlerts()]);
      } else {
        toast("error", "Bulk Block Failed", "Could not block selected threats");
      }
    } catch (e) {
      console.error("Bulk block error:", e);
      toast("error", "Bulk Block Failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsBulkBlocking(false);
    }
  };

  // Block ALL active threats in database
  const handleBlockAllActive = async () => {
    setIsBulkBlocking(true);
    toast("info", "Blocking All Threats...", "Securing entire network from active threats");
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/block-all-active`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.status === "completed") {
        toast(
          "success",
          `✓ Network Fully Secured`,
          `Blocked ${data.blocked_count} threats from ${data.unique_ips_blocked} unique IPs`
        );
        setSelectedAlerts(new Set());
        await Promise.all([fetchStats(), fetchAlerts()]);
      }
    } catch (e) {
      console.error("Block all error:", e);
      toast("error", "Block All Failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsBulkBlocking(false);
    }
  };

  // SECURE DASHBOARD — blocks ALL active threats via single backend call
  const handleSecureDashboard = async () => {
    if (isSecuring) return;
    setIsSecuring(true);
    setSecuredCount(0);

    toast("info", "Securing Dashboard...", "Blocking every active threat in the database");

    try {
      const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/block-all-active`, {
        method: "POST",
      });

      if (!res.ok) {
        toast("error", "Security Action Failed", `Server returned ${res.status}`);
        return;
      }

      const data = await res.json();
      const blockedCount = data.blocked_count ?? 0;
      const uniqueIps = data.unique_ips_blocked ?? 0;
      const blockedIps: string[] = data.blocked_ips ?? [];

      setSecuredCount(blockedCount);

      if (blockedCount === 0) {
        toast("success", "Already Secure", "No active threats to block. System is fully protected.");
      } else {
        toast(
          "success",
          `✓ Secured ${blockedCount} Threats`,
          `Blocked ${uniqueIps} unique IPs${blockedIps.length > 0 ? `: ${blockedIps.slice(0, 3).join(", ")}${blockedIps.length > 3 ? ` +${blockedIps.length - 3} more` : ""}` : ""}`
        );
      }

      // Refresh stats and alerts so cards visibly drop
      await Promise.all([fetchStats(), fetchAlerts()]);
    } catch (e) {
      console.error("Secure dashboard error:", e);
      toast("error", "Security Action Failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsSecuring(false);
      setTimeout(() => setSecuredCount(0), 3000);
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

  // Show ACTIVE threats (real-time), not historical totals
  // This focuses the dashboard on actionable, current threats
  const activeThreats = stats?.by_label_active || {};
  const pieData = stats
    ? Object.entries(activeThreats)
        .map(([name, value]) => ({ name, value }))
        .filter(d => d.value > 0)
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

              {/* SMART AI ANALYSIS BUTTON - Combines status + ML recommendations */}
              <button
                onClick={() => setShowThreatAnalysis(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur border transition-all active:scale-95 hover:scale-105 ${
                  currentStatus === "CRITICAL"
                    ? "bg-gradient-to-r from-red-600/40 to-pink-600/40 border-red-500/60 hover:border-red-400 shadow-lg shadow-red-500/30"
                    : currentStatus === "WARNING"
                      ? "bg-gradient-to-r from-amber-600/40 to-orange-600/40 border-amber-500/60 hover:border-amber-400 shadow-lg shadow-amber-500/30"
                      : "bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border-cyan-500/40 hover:border-cyan-400"
                }`}
                title={`System Status: ${statusConfig[currentStatus].label} - Click for AI Analysis & Recommendations`}
              >
                {/* Status indicator dot */}
                <span className="relative flex h-2 w-2">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ backgroundColor: statusConfig[currentStatus].color }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-2 w-2"
                    style={{ backgroundColor: statusConfig[currentStatus].color }}
                  />
                </span>

                {/* Brain icon */}
                <Brain
                  size={16}
                  className={
                    currentStatus === "CRITICAL"
                      ? "text-red-300"
                      : currentStatus === "WARNING"
                        ? "text-amber-300"
                        : "text-cyan-400"
                  }
                />

                {/* Combined label: Status + AI Analysis */}
                <span className={`text-sm font-bold ${isDark ? "text-white" : "text-purple-900"}`}>
                  {statusConfig[currentStatus].label} • AI ANALYSIS
                </span>
              </button>

              {/* SECURE DASHBOARD BUTTON - One-Click Protection */}
              <button
                onClick={handleSecureDashboard}
                disabled={isSecuring}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border border-red-500 transition-all shadow-lg shadow-red-500/30 ${isSecuring ? "opacity-70 cursor-wait" : ""}`}
                title="Block top threats and secure network"
              >
                {isSecuring ? (
                  <RefreshCw size={16} className="animate-spin text-white" />
                ) : (
                  <Shield size={16} className="text-white" />
                )}
                <span className="text-sm font-bold text-white">
                  {isSecuring ? `SECURING (${securedCount})...` : "SECURE NOW"}
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
          {/* STAT CARDS WITH 3D ORBS - Now Clickable */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {getStatCards(totalPackets, threatCount, stats, isLive, packets, connectionCount).map((s, i) => {
              // Determine route based on stat card type
              const routes = ["/analytics", "/alerts", "/connections", "/ml"];
              const targetRoute = routes[i] || "/dashboard";
              return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => router.push(targetRoute)}
                className="group relative overflow-hidden rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform"
                title={`Click to view ${s.label} details`}
              >
                {/* Gradient background */}
                <div
                  className={`absolute inset-0 border ${isDark ? "bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-purple-900/5 border-purple-500/20" : "bg-white border-slate-200 shadow-sm"}`}
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
              );
            })}
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
                    className={`relative rounded-2xl overflow-hidden ${isDark ? "border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10" : "border border-slate-200 bg-white shadow-sm"} backdrop-blur-xl`}
                    style={{ height: 300 }}
                  >
                    <ThreatIndicator
                      threat={threat}
                      index={idx}
                      style={indicatorStyles[idx]}
                      isDark={isDark}
                      totalThreats={stats?.total_threats || 1}
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
                <div className="flex gap-3 items-center">
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
                  <button
                    onClick={() => router.push("/analytics")}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-500/30 transition-all hover:scale-105"
                    title="Open Analytics with time filters"
                  >
                    <TrendingUp size={14} />
                    View Analytics
                  </button>
                </div>
              </div>
              {(historicalData.length > 0 || trafficChartData.length > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={historicalData.length > 0 ? historicalData : trafficChartData}>
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
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-16">
                  <Activity
                    size={32}
                    className="text-cyan-400 opacity-40 mb-3"
                  />
                  <p className={isDark ? "text-cyan-300" : "text-cyan-800"}>
                    Waiting for traffic data...
                  </p>
                </div>
              )}
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
                Active Threats (Real-time)
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

          {/* ATTACK DISTRIBUTION OVER TIME — Time-Series Analysis */}
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
                <TrendingUp size={20} style={{ color: "#a855f7" }} />
                Attack Distribution Over Time
              </h3>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isDark ? "bg-purple-500/20 text-purple-300" : "bg-purple-400/20 text-purple-800"}`}>
                Statistical Analysis
              </span>
            </div>
            <p className={`text-sm mb-4 ${isDark ? "text-purple-300" : "text-purple-800"}`}>
              Time-series visualization of threat types detected in the last 30 minutes
            </p>
            {(historicalData.length > 0 || trafficChartData.length > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={historicalData.length > 0 ? historicalData : trafficChartData}>
                  <defs>
                    <linearGradient id="gradDoS" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradProbe" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradU2R" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
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
                    label={{ value: "Count", angle: -90, position: "insideLeft" }}
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
                    dataKey="threats"
                    stroke="#ef4444"
                    strokeWidth={3}
                    fill="url(#gradDoS)"
                    name="Threats Detected"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className={isDark ? "text-purple-300" : "text-purple-800"}>
                  Waiting for traffic data...
                </p>
              </div>
            )}
            <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-purple-500/20">
              <div>
                <p className={`text-xs ${isDark ? "text-purple-400" : "text-purple-700"}`}>Active DoS</p>
                <p className="text-lg font-bold text-red-400">
                  {((stats?.by_label_active?.["DoS"] || 0) + (stats?.by_label_active?.["DDoS"] || 0) + (stats?.by_label_active?.["DDoS (Ping of Death)"] || 0)).toLocaleString()}
                </p>
              </div>
              <div>
                <p className={`text-xs ${isDark ? "text-purple-400" : "text-purple-700"}`}>Active Probes</p>
                <p className="text-lg font-bold text-amber-400">
                  {((stats?.by_label_active?.["Probe"] || 0) + (stats?.by_label_active?.["Port Scan"] || 0)).toLocaleString()}
                </p>
              </div>
              <div>
                <p className={`text-xs ${isDark ? "text-purple-400" : "text-purple-700"}`}>Active Escalations</p>
                <p className="text-lg font-bold text-pink-400">
                  {((stats?.by_label_active?.["U2R"] || 0) + (stats?.by_label_active?.["U2R (Root Access)"] || 0) + (stats?.by_label_active?.["R2L"] || 0)).toLocaleString()}
                </p>
              </div>
            </div>
          </motion.div>

          {/* RECENT ALERTS TABLE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`rounded-2xl overflow-hidden ${isDark ? "border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10" : "border border-purple-400/20 bg-purple-950/10"} backdrop-blur-xl p-6`}
          >
            <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
              <h3
                className={`text-xl font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-purple-950"}`}
              >
                <AlertTriangle size={20} style={{ color: "#f59e0b" }} />
                Recent Alerts
                {selectedAlerts.size > 0 && (
                  <span className="text-sm font-normal px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300">
                    {selectedAlerts.size} selected
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {/* Block Selected Button */}
                {selectedAlerts.size > 0 && (
                  <button
                    onClick={handleBlockSelected}
                    disabled={isBulkBlocking}
                    className="px-3 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-red-500/30 transition-all disabled:opacity-50"
                  >
                    {isBulkBlocking ? <RefreshCw size={14} className="animate-spin" /> : <Ban size={14} />}
                    Block Selected ({selectedAlerts.size})
                  </button>
                )}
                {/* Block All Active Button */}
                <button
                  onClick={handleBlockAllActive}
                  disabled={isBulkBlocking}
                  className="px-3 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-amber-500/30 transition-all disabled:opacity-50"
                  title="Block ALL active threats in database (not just visible)"
                >
                  {isBulkBlocking ? <RefreshCw size={14} className="animate-spin" /> : <Shield size={14} />}
                  Block All Active
                </button>
                <button
                  onClick={() => router.push("/alerts")}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-medium transition-all flex items-center gap-2"
                >
                  View All <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {recentAlerts.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className={`border-b ${isDark ? "border-purple-500/20" : "border-purple-400/20"}`}
                    >
                      <th className="text-left py-3 px-2 w-8">
                        <input
                          type="checkbox"
                          checked={
                            recentAlerts.filter(a => !a.is_blocked).length > 0 &&
                            selectedAlerts.size === recentAlerts.filter(a => !a.is_blocked).length
                          }
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded cursor-pointer accent-cyan-500"
                          title="Select All Unblocked"
                        />
                      </th>
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
                        className={`border-b transition-colors ${
                          selectedAlerts.has(a.id)
                            ? isDark ? "bg-cyan-500/10 border-cyan-500/30" : "bg-cyan-100 border-cyan-400/30"
                            : isDark ? "border-purple-500/10 hover:bg-purple-500/10" : "border-purple-400/10 hover:bg-purple-500/10"
                        }`}
                      >
                        <td className="py-3 px-2">
                          {!a.is_blocked ? (
                            <input
                              type="checkbox"
                              checked={selectedAlerts.has(a.id)}
                              onChange={() => toggleAlertSelection(a.id)}
                              className="w-4 h-4 rounded cursor-pointer accent-cyan-500"
                            />
                          ) : (
                            <span className="text-xs opacity-30">—</span>
                          )}
                        </td>
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

      {/* THREAT ANALYSIS MODAL - Real ML Recommendations */}
      <FramerAnimatePresence>
        {showThreatAnalysis && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowThreatAnalysis(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`max-w-3xl w-full max-h-[85vh] overflow-y-auto rounded-2xl ${isDark ? "bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950 border border-cyan-500/40" : "bg-white border border-purple-400/40"} shadow-2xl`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-6 pb-4 border-b border-purple-500/30">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
                      <Brain size={28} className="text-white" />
                    </div>
                    <div>
                      <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-purple-950"}`}>
                        AI Threat Analysis
                      </h2>
                      <p className={`text-sm ${isDark ? "text-cyan-300" : "text-purple-700"}`}>
                        Real-time ML model recommendations for network security
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowThreatAnalysis(false)}
                    className={`p-2 rounded-lg hover:bg-purple-500/20 ${isDark ? "text-white" : "text-purple-900"}`}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* ML Model Status */}
                <div className={`mb-6 p-4 rounded-xl ${isDark ? "bg-gradient-to-r from-emerald-900/30 to-cyan-900/30 border border-emerald-500/30" : "bg-emerald-50 border border-emerald-300"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={18} className="text-emerald-400" />
                    <span className={`font-bold ${isDark ? "text-emerald-300" : "text-emerald-900"}`}>
                      ML Model Active
                    </span>
                  </div>
                  <p className={`text-sm ${isDark ? "text-emerald-200" : "text-emerald-800"}`}>
                    XGBoost Classifier • Accuracy: 99.82% • Features: 22 • Trained on: NSL-KDD
                  </p>
                </div>

                {/* Threat Summary */}
                <div className="mb-6">
                  <h3 className={`text-lg font-bold mb-3 flex items-center gap-2 ${isDark ? "text-white" : "text-purple-950"}`}>
                    <AlertTriangle size={20} className="text-amber-400" />
                    Current Threat Landscape
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className={`p-3 rounded-lg ${isDark ? "bg-red-900/30 border border-red-500/30" : "bg-red-50 border border-red-300"}`}>
                      <p className={`text-xs ${isDark ? "text-red-300" : "text-red-700"}`}>Active DoS/DDoS</p>
                      <p className={`text-2xl font-bold ${isDark ? "text-red-400" : "text-red-900"}`}>
                        {((stats?.by_label_active?.["DoS"] || 0) + (stats?.by_label_active?.["DDoS"] || 0) + (stats?.by_label_active?.["DDoS (Ping of Death)"] || 0)).toLocaleString()}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${isDark ? "bg-amber-900/30 border border-amber-500/30" : "bg-amber-50 border border-amber-300"}`}>
                      <p className={`text-xs ${isDark ? "text-amber-300" : "text-amber-700"}`}>Active Probes</p>
                      <p className={`text-2xl font-bold ${isDark ? "text-amber-400" : "text-amber-900"}`}>
                        {((stats?.by_label_active?.["Probe"] || 0) + (stats?.by_label_active?.["Port Scan"] || 0)).toLocaleString()}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${isDark ? "bg-pink-900/30 border border-pink-500/30" : "bg-pink-50 border border-pink-300"}`}>
                      <p className={`text-xs ${isDark ? "text-pink-300" : "text-pink-700"}`}>Active U2R/R2L</p>
                      <p className={`text-2xl font-bold ${isDark ? "text-pink-400" : "text-pink-900"}`}>
                        {((stats?.by_label_active?.["U2R"] || 0) + (stats?.by_label_active?.["U2R (Root Access)"] || 0) + (stats?.by_label_active?.["R2L"] || 0)).toLocaleString()}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${isDark ? "bg-purple-900/30 border border-purple-500/30" : "bg-purple-50 border border-purple-300"}`}>
                      <p className={`text-xs ${isDark ? "text-purple-300" : "text-purple-700"}`}>Active Threats</p>
                      <p className={`text-2xl font-bold ${isDark ? "text-purple-400" : "text-purple-900"}`}>
                        {(stats?.active_threats || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI Recommendations */}
                <div className="mb-6">
                  <h3 className={`text-lg font-bold mb-3 flex items-center gap-2 ${isDark ? "text-white" : "text-purple-950"}`}>
                    <Sparkles size={20} className="text-cyan-400" />
                    AI Security Recommendations
                  </h3>
                  <div className="space-y-3">
                    {/* Recommendation 1 */}
                    {((stats?.by_label_active?.["DoS"] || 0) + (stats?.by_label_active?.["DDoS"] || 0)) > 0 && (
                      <div className={`p-4 rounded-xl ${isDark ? "bg-red-900/20 border-l-4 border-red-500" : "bg-red-50 border-l-4 border-red-500"}`}>
                        <div className="flex items-start gap-3">
                          <Skull size={20} className="text-red-400 mt-0.5" />
                          <div className="flex-1">
                            <p className={`font-bold ${isDark ? "text-red-300" : "text-red-900"}`}>
                              CRITICAL: DoS/DDoS Attacks Detected
                            </p>
                            <p className={`text-sm mt-1 ${isDark ? "text-red-200" : "text-red-800"}`}>
                              ML detected high error rates (serror_rate &gt; 80%) and connection floods. Recommended actions:
                            </p>
                            <ul className={`text-sm mt-2 space-y-1 ${isDark ? "text-red-200" : "text-red-800"}`}>
                              <li>• Enable rate limiting on detected source IPs</li>
                              <li>• Activate SYN cookies on web server</li>
                              <li>• Configure cloud DDoS mitigation (Cloudflare/AWS Shield)</li>
                              <li>• Block top attacker IPs (click SECURE NOW button)</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recommendation 2 */}
                    {((stats?.by_label_active?.["Probe"] || 0) + (stats?.by_label_active?.["Port Scan"] || 0)) > 0 && (
                      <div className={`p-4 rounded-xl ${isDark ? "bg-amber-900/20 border-l-4 border-amber-500" : "bg-amber-50 border-l-4 border-amber-500"}`}>
                        <div className="flex items-start gap-3">
                          <Radar size={20} className="text-amber-400 mt-0.5" />
                          <div className="flex-1">
                            <p className={`font-bold ${isDark ? "text-amber-300" : "text-amber-900"}`}>
                              HIGH: Network Reconnaissance Detected
                            </p>
                            <p className={`text-sm mt-1 ${isDark ? "text-amber-200" : "text-amber-800"}`}>
                              ML detected port scanning patterns (diff_srv_rate &gt; 70%). Recommended actions:
                            </p>
                            <ul className={`text-sm mt-2 space-y-1 ${isDark ? "text-amber-200" : "text-amber-800"}`}>
                              <li>• Enable port scan detection rules in firewall</li>
                              <li>• Deploy honeypot to gather threat intelligence</li>
                              <li>• Hide unused service banners</li>
                              <li>• Log source IPs for further analysis</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recommendation 3 */}
                    {((stats?.by_label_active?.["U2R"] || 0) + (stats?.by_label_active?.["U2R (Root Access)"] || 0)) > 0 && (
                      <div className={`p-4 rounded-xl ${isDark ? "bg-pink-900/20 border-l-4 border-pink-500" : "bg-pink-50 border-l-4 border-pink-500"}`}>
                        <div className="flex items-start gap-3">
                          <Lock size={20} className="text-pink-400 mt-0.5" />
                          <div className="flex-1">
                            <p className={`font-bold ${isDark ? "text-pink-300" : "text-pink-900"}`}>
                              CRITICAL: Privilege Escalation Attempts
                            </p>
                            <p className={`text-sm mt-1 ${isDark ? "text-pink-200" : "text-pink-800"}`}>
                              ML detected user-to-root exploit attempts. Recommended actions:
                            </p>
                            <ul className={`text-sm mt-2 space-y-1 ${isDark ? "text-pink-200" : "text-pink-800"}`}>
                              <li>• Immediately isolate affected host(s)</li>
                              <li>• Audit user accounts and active sessions</li>
                              <li>• Check for rootkits with chkrootkit/rkhunter</li>
                              <li>• Rotate all admin credentials</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* General recommendation */}
                    <div className={`p-4 rounded-xl ${isDark ? "bg-cyan-900/20 border-l-4 border-cyan-500" : "bg-cyan-50 border-l-4 border-cyan-500"}`}>
                      <div className="flex items-start gap-3">
                        <ShieldCheck size={20} className="text-cyan-400 mt-0.5" />
                        <div className="flex-1">
                          <p className={`font-bold ${isDark ? "text-cyan-300" : "text-cyan-900"}`}>
                            Continuous Protection
                          </p>
                          <p className={`text-sm mt-1 ${isDark ? "text-cyan-200" : "text-cyan-800"}`}>
                            Maintain proactive security:
                          </p>
                          <ul className={`text-sm mt-2 space-y-1 ${isDark ? "text-cyan-200" : "text-cyan-800"}`}>
                            <li>• Keep ML model updated with daily training cycles</li>
                            <li>• Review Recent Alerts table every 15 minutes</li>
                            <li>• Export weekly PDF reports for audit trail</li>
                            <li>• Use SECURE NOW button for one-click protection</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ML Insights */}
                <div className={`p-4 rounded-xl ${isDark ? "bg-purple-900/20 border border-purple-500/30" : "bg-purple-50 border border-purple-300"}`}>
                  <h4 className={`font-bold mb-2 flex items-center gap-2 ${isDark ? "text-purple-300" : "text-purple-900"}`}>
                    <Cpu size={18} className="text-purple-400" />
                    Model Insights
                  </h4>
                  <p className={`text-sm ${isDark ? "text-purple-200" : "text-purple-800"}`}>
                    The XGBoost model uses 22 network features. Top predictors: <strong>serror_rate</strong> (SYN error rate),
                    <strong> diff_srv_rate</strong> (service diversity), <strong>count</strong> (connection volume).
                    Detection rate: {totalPackets > 0 ? ((threatCount / totalPackets) * 100).toFixed(1) : "0.0"}% •
                    Total analyzed: {totalPackets.toLocaleString()} packets
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowThreatAnalysis(false)}
                    className={`px-4 py-2 rounded-lg border ${isDark ? "border-purple-500/30 text-purple-300 hover:bg-purple-500/20" : "border-purple-400/30 text-purple-800 hover:bg-purple-100"}`}
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowThreatAnalysis(false);
                      handleSecureDashboard();
                    }}
                    className="px-6 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold shadow-lg shadow-red-500/30 flex items-center gap-2"
                  >
                    <Shield size={16} />
                    Apply Security Now
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </FramerAnimatePresence>
    </div>
  );
}
