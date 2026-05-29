"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence, useSpring, useTransform, useMotionValue } from "framer-motion";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine,
} from "recharts";
import {
  Cpu, HardDrive, Zap, Activity, TrendingUp, AlertCircle, CheckCircle2,
  Gauge, Clock, Wifi, Package, BrainCircuit, ShieldCheck, XCircle,
  Download,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

// ─── Types ───────────────────────────────────────────────────────────────────

type TimeWindow = "30s" | "5m" | "15m" | "1h";

const WINDOW_POINTS: Record<TimeWindow, number> = {
  "30s": 15,   // 2s interval
  "5m": 150,
  "15m": 450,
  "1h": 1800,
};

interface MetricsData {
  timestamp: string;
  cpu: number;
  memory: number;
  latency: number;
  throughput: number;
  packets: number;       // packets/sec (thousands)
  mlInference: number;  // ms
  detectionRate: number; // %
}

interface SystemHealth {
  cpu: "good" | "warning" | "critical";
  memory: "good" | "warning" | "critical";
  latency: "good" | "warning" | "critical";
  throughput: "good" | "warning" | "critical";
  mlInference: "good" | "warning" | "critical";
}

// ─── Insight helpers ─────────────────────────────────────────────────────────

const getPerformanceInsights = (m: {
  cpu: number; memory: number; latency: number; throughput: number;
  mlInference: number; detectionRate: number;
}) => [
  {
    icon: "⚡",
    title: "CPU Performance",
    metric: m.cpu,
    critical: 80, warning: 60,
    messages: {
      critical: "⚠️ CPU usage is critical. Consider optimizing resource allocation.",
      warning: "⚠️ CPU usage is elevated. Monitor for potential bottlenecks.",
      good: "✓ CPU usage is optimal. System performing well.",
    },
  },
  {
    icon: "💾",
    title: "Memory Performance",
    metric: m.memory,
    critical: 85, warning: 65,
    messages: {
      critical: "⚠️ Memory usage is critical. Consider clearing cache or increasing capacity.",
      warning: "⚠️ Memory usage is high. Monitor for memory leaks.",
      good: "✓ Memory usage is healthy. Good headroom available.",
    },
  },
  {
    icon: "🔌",
    title: "Network Latency",
    metric: m.latency,
    critical: 60, warning: 40,
    messages: {
      critical: "⚠️ Latency is high. Check network connectivity and routes.",
      warning: "⚠️ Latency is moderate. Performance may be affected.",
      good: "✓ Latency is low. Network response is fast.",
    },
  },
  {
    icon: "📊",
    title: "Throughput",
    metric: m.throughput,
    critical: 200, warning: 500,
    isInverse: true,
    messages: {
      critical: "⚠️ Throughput is low. May indicate network congestion.",
      warning: "✓ Throughput is good. Sufficient bandwidth.",
      good: "✓ Throughput is excellent. High network capacity.",
    },
  },
  {
    icon: "🧠",
    title: "ML Inference",
    metric: m.mlInference,
    critical: 20, warning: 10,
    messages: {
      critical: "⚠️ ML inference is slow. Model may be overloaded.",
      warning: "⚠️ ML inference is moderate. Watch for latency spikes.",
      good: "✓ ML inference is fast. Real-time detection on track.",
    },
  },
  {
    icon: "🛡️",
    title: "Detection Rate",
    metric: m.detectionRate,
    critical: 80, warning: 90,
    isInverse: true,
    messages: {
      critical: "⚠️ Detection rate is critically low. Review model accuracy.",
      warning: "⚠️ Detection rate is below target. Check false negative patterns.",
      good: "✓ Detection rate is excellent. Threats being caught reliably.",
    },
  },
];

const InsightCard = ({
  insight,
  isDark,
}: {
  insight: ReturnType<typeof getPerformanceInsights>[0];
  isDark: boolean;
}) => {
  let message = insight.messages.good;
  if (insight.isInverse) {
    message = insight.metric === 0
      ? insight.messages.good
      : insight.metric < insight.critical
        ? insight.messages.critical
        : insight.metric < insight.warning
          ? insight.messages.warning
          : insight.messages.good;
  } else {
    message = insight.metric > insight.critical
      ? insight.messages.critical
      : insight.metric > insight.warning
        ? insight.messages.warning
        : insight.messages.good;
  }

  return (
    <div className={`rounded-2xl p-6 border ${isDark ? "border-yellow-500/20" : "border-yellow-300/20"} backdrop-blur-xl`}>
      <h3 className="font-semibold text-[var(--foreground)] mb-3">
        {insight.icon} {insight.title}
      </h3>
      <p className={`text-sm ${isDark ? "text-yellow-200" : "text-yellow-800"}`}>
        {message}
      </p>
    </div>
  );
};

// ─── Animated Health Gauge ────────────────────────────────────────────────────

function AnimatedGauge({ score, color, bgStroke, GCX, GCY, GR, isDark }: {
  score: number; color: string; bgStroke: string;
  GCX: number; GCY: number; GR: number; isDark: boolean;
}) {
  const spring = useSpring(score, { stiffness: 60, damping: 18, mass: 0.8 });
  const [live, setLive] = useState(score);

  useEffect(() => { spring.set(score); }, [score, spring]);
  useEffect(() => spring.on("change", v => setLive(Math.round(v))), [spring]);

  const clampedLive = Math.max(0, Math.min(100, live));
  const gAngle = 180 - clampedLive * 1.8;
  const gRad   = (gAngle * Math.PI) / 180;
  const gX     = GCX + GR * Math.cos(gRad);
  const gY     = GCY - GR * Math.sin(gRad);
  const lArc   = 0; // sweep is always ≤180° for this half-circle gauge

  return (
    <svg width="160" height="92" viewBox="0 0 160 90">
      <path d="M 20 80 A 60 60 0 0 1 140 80"
        stroke={bgStroke} strokeWidth="12" fill="none" strokeLinecap="round" />
      {live > 0 && (
        <path d={`M 20 80 A 60 60 0 ${lArc} 1 ${gX.toFixed(1)} ${gY.toFixed(1)}`}
          stroke={color} strokeWidth="12" fill="none" strokeLinecap="round" />
      )}
      <line x1={GCX} y1={GCY} x2={gX.toFixed(1)} y2={gY.toFixed(1)}
        stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={GCX} cy={GCY} r="5" fill={color} />
      <text x={GCX} y={GCY - 12} textAnchor="middle"
        fill={color} fontSize="24" fontWeight="900">{live}</text>
      <text x={GCX} y={GCY + 4} textAnchor="middle"
        fill={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} fontSize="9">/ 100</text>
    </svg>
  );
}

// ─── Alert banner ─────────────────────────────────────────────────────────────

function AlertBanner({ message, isDark }: { message: string; isDark: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex items-center gap-3 px-5 py-3 rounded-xl border border-red-500/40 bg-red-500/10 backdrop-blur-xl"
    >
      <XCircle size={18} className="text-red-400 flex-shrink-0" />
      <span className={`text-sm font-semibold ${isDark ? "text-red-300" : "text-red-700"}`}>
        {message}
      </span>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PerformancePage() {
  const { isDark } = useTheme();
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("30s");
  const [metricsHistory, setMetricsHistory] = useState<MetricsData[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState({
    cpu: 0, memory: 0, latency: 0, throughput: 0,
    packets: 0, packetTotal: 0, mlInference: 0, detectionRate: 0,
  });
  const packetTotalRef = useRef(0);

  // Rolling window buffer: always keep max points, prune on window switch
  const historyBufferRef = useRef<MetricsData[]>([]);

  // Generate mock metrics data
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeLabel = now.toLocaleTimeString([], { minute: "2-digit", second: "2-digit" });

      const pps = Math.floor(Math.random() * 4000) + 500; // 500–4500 kpps
      packetTotalRef.current += pps * 2; // 2s interval

      const newMetrics: MetricsData = {
        timestamp: timeLabel,
        cpu: Math.floor(Math.random() * 85) + 5,
        memory: Math.floor(Math.random() * 70) + 20,
        latency: Math.floor(Math.random() * 80) + 10,
        throughput: Math.floor(Math.random() * 900) + 100,
        packets: pps,
        mlInference: Math.round((Math.random() * 22 + 2) * 10) / 10,
        detectionRate: Math.round((Math.random() * 10 + 89) * 10) / 10,
      };

      historyBufferRef.current = [...historyBufferRef.current, newMetrics].slice(-1800);

      setCurrentMetrics({
        cpu: newMetrics.cpu,
        memory: newMetrics.memory,
        latency: newMetrics.latency,
        throughput: newMetrics.throughput,
        packets: newMetrics.packets,
        packetTotal: packetTotalRef.current,
        mlInference: newMetrics.mlInference,
        detectionRate: newMetrics.detectionRate,
      });

      setMetricsHistory(historyBufferRef.current.slice(-WINDOW_POINTS[timeWindow]));
    }, 2000);

    return () => clearInterval(interval);
  }, [timeWindow]);

  const getMetricStatus = (
    value: number, critical: number, warning: number, isInverse = false
  ): "good" | "warning" | "critical" => {
    if (isInverse) {
      if (value === 0) return "good";
      return value < critical ? "critical" : value < warning ? "warning" : "good";
    }
    return value > critical ? "critical" : value > warning ? "warning" : "good";
  };

  const health: SystemHealth = {
    cpu: getMetricStatus(currentMetrics.cpu, 80, 60),
    memory: getMetricStatus(currentMetrics.memory, 85, 65),
    latency: getMetricStatus(currentMetrics.latency, 60, 40),
    throughput: getMetricStatus(currentMetrics.throughput, 200, 500, true),
    mlInference: getMetricStatus(currentMetrics.mlInference, 20, 10),
  };

  const cpuAlert = currentMetrics.cpu > 80;
  const memAlert = currentMetrics.memory > 85;

  // ── P2: Min / Max / Avg stats per metric ──────────────────────────────────
  const cpuStats = useMemo(() => {
    const v = metricsHistory.map(d => d.cpu);
    if (!v.length) return { min: 0, max: 0, avg: 0 };
    return { min: Math.round(Math.min(...v)), max: Math.round(Math.max(...v)), avg: Math.round(v.reduce((a,b)=>a+b,0)/v.length) };
  }, [metricsHistory]);

  const memStats = useMemo(() => {
    const v = metricsHistory.map(d => d.memory);
    if (!v.length) return { min: 0, max: 0, avg: 0 };
    return { min: Math.round(Math.min(...v)), max: Math.round(Math.max(...v)), avg: Math.round(v.reduce((a,b)=>a+b,0)/v.length) };
  }, [metricsHistory]);

  const latStats = useMemo(() => {
    const v = metricsHistory.map(d => d.latency);
    if (!v.length) return { min: 0, max: 0, avg: 0 };
    return { min: Math.round(Math.min(...v)), max: Math.round(Math.max(...v)), avg: Math.round(v.reduce((a,b)=>a+b,0)/v.length) };
  }, [metricsHistory]);

  const mlStats = useMemo(() => {
    const v = metricsHistory.map(d => d.mlInference);
    if (!v.length) return { min: 0, max: 0, avg: 0 };
    return {
      min: Math.round(Math.min(...v) * 10) / 10,
      max: Math.round(Math.max(...v) * 10) / 10,
      avg: Math.round((v.reduce((a,b)=>a+b,0)/v.length) * 10) / 10,
    };
  }, [metricsHistory]);

  // ── P3: Annotated history with spike markers ───────────────────────────────
  const annotatedHistory = useMemo(() => metricsHistory.map(d => ({
    ...d,
    cpuSpike:  d.cpu > 80         ? d.cpu         : undefined,
    memSpike:  d.memory > 85      ? d.memory      : undefined,
    mlSpike:   d.mlInference > 20 ? d.mlInference : undefined,
  })), [metricsHistory]);

  // ── P4: Composite system health score ─────────────────────────────────────
  const healthScore = useMemo(() => Math.max(0, Math.round(
    100 - (currentMetrics.cpu * 0.30 + currentMetrics.memory * 0.25 +
           currentMetrics.latency * 0.20 + (100 - currentMetrics.detectionRate) * 0.25)
  )), [currentMetrics]);

  // ── P5: Export metrics CSV ─────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (metricsHistory.length === 0) return;
    const headers = "timestamp,cpu,memory,latency,throughput,packets,mlInference,detectionRate";
    const rows = metricsHistory.map(d =>
      `${d.timestamp},${d.cpu},${d.memory},${d.latency},${d.throughput},${d.packets},${d.mlInference},${d.detectionRate}`
    );
    const blob = new Blob([[headers, ...rows].join("\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `perf-metrics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good": return "#10b981";
      case "warning": return "#f59e0b";
      case "critical": return "#ef4444";
      default: return "#8b5cf6";
    }
  };

  // Tooltip style
  const tooltipStyle = {
    contentStyle: {
      backgroundColor: isDark ? "rgba(15,10,26,0.95)" : "rgba(255,255,255,0.95)",
      border: isDark ? "1px solid rgba(148,163,184,0.2)" : "1px solid rgba(203,213,225,0.5)",
      borderRadius: "10px",
    },
  };

  const MetricCard = ({
    label, value, unit, icon: Icon, status, max = 100,
  }: {
    label: string; value: number; unit: string; icon: React.ElementType;
    status: "good" | "warning" | "critical"; max?: number;
  }) => {
    const percentage = (value / max) * 100;
    const statusColor = getStatusColor(status);
    const StatusIcon = status === "good" ? CheckCircle2 : AlertCircle;

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl p-6 border ${isDark ? "border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10" : "border-purple-400/20 bg-purple-950/10"} backdrop-blur-xl`}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${statusColor}25` }}>
              <Icon size={22} style={{ color: statusColor }} />
            </div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-purple-300" : "text-purple-800"}`}>
                {label}
              </p>
              <p className="text-2xl font-black mt-1" style={{ color: statusColor }}>
                {value.toFixed(1)}{unit}
              </p>
            </div>
          </div>
          <StatusIcon size={20} style={{ color: statusColor }} />
        </div>
        <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-black/10"}`}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: statusColor }}
            animate={{ width: `${Math.min(percentage, 100)}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-xs mt-3 font-semibold uppercase" style={{ color: statusColor }}>
          {status.toUpperCase()}
          {status === "good" && " - Optimal"}
          {status === "warning" && " - Monitor"}
          {status === "critical" && " - Alert"}
        </p>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-[var(--background)]">

      {/* ── Header ── */}

      <div className={`border-b backdrop-blur-xl px-6 py-6 sticky top-0 z-50 ${
        isDark
          ? "border-green-500/20 bg-gradient-to-r from-green-900/10 via-transparent to-emerald-900/10"
          : "border-green-400/20 bg-green-950/5"
      }`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 flex items-center gap-3">
              <Gauge size={32} className="text-green-400" />
              Performance Metrics
            </h1>
            <p className={`mt-1 text-sm ${isDark ? "text-green-200" : "text-green-800"}`}>
              Real-time CPU · memory · latency · throughput · ML inference monitoring
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* P5 — Export metrics CSV */}
            <button
              onClick={handleExportCSV}
              disabled={metricsHistory.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all disabled:opacity-40 ${
                isDark
                  ? "border-green-500/30 text-green-400 hover:bg-green-500/10"
                  : "border-green-500/40 text-green-700 hover:bg-green-50"
              }`}
            >
              <Download size={15} /> Export CSV
            </button>

            {/* Time-window toggle */}
            <div className={`flex items-center gap-1 rounded-xl p-1 border ${isDark ? "border-green-500/20 bg-green-900/10" : "border-green-400/20 bg-green-50"}`}>
              {(["30s", "5m", "15m", "1h"] as TimeWindow[]).map((w) => (
                <button
                  key={w}
                  onClick={() => setTimeWindow(w)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    timeWindow === w
                      ? "bg-green-500 text-white shadow"
                      : isDark
                        ? "text-green-300 hover:bg-green-500/10"
                        : "text-green-700 hover:bg-green-100"
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Alert banners */}
        <div className="max-w-7xl mx-auto mt-3 space-y-2">
          <AnimatePresence>
            {cpuAlert && (
              <AlertBanner
                key="cpu"
                message={`🔥 HIGH CPU ALERT — CPU usage at ${currentMetrics.cpu.toFixed(0)}% (threshold: 80%). Consider scaling resources or killing non-essential processes.`}
                isDark={isDark}
              />
            )}
            {memAlert && (
              <AlertBanner
                key="mem"
                message={`💾 HIGH MEMORY ALERT — Memory usage at ${currentMetrics.memory.toFixed(0)}% (threshold: 85%). Risk of OOM — clear cache or restart memory-heavy services.`}
                isDark={isDark}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="w-full px-6 py-12 relative z-0">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* ══════════════════════════════════════════════════════════════
              SECTION 1 — SYSTEM HEALTH CARDS  (6 cards)
          ══════════════════════════════════════════════════════════════ */}
          <section>
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6 flex items-center gap-3">
              <Activity size={24} className="text-green-400" />
              System Health Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <MetricCard label="CPU Usage" value={currentMetrics.cpu} unit="%" icon={Cpu} status={health.cpu} max={100} />
              <MetricCard label="Memory" value={currentMetrics.memory} unit="%" icon={HardDrive} status={health.memory} max={100} />
              <MetricCard label="Latency" value={currentMetrics.latency} unit="ms" icon={Clock} status={health.latency} max={100} />
              <MetricCard label="Throughput" value={currentMetrics.throughput} unit=" Mbps" icon={Wifi} status={health.throughput} max={1000} />
              {/* B: Packets/sec */}
              <MetricCard label="Packets/sec" value={currentMetrics.packets} unit="k" icon={Package} status="good" max={5000} />
              {/* C: ML Inference */}
              <MetricCard label="ML Inference" value={currentMetrics.mlInference} unit="ms" icon={BrainCircuit} status={health.mlInference} max={30} />
            </div>
          </section>

          {/* P4 — System Health Score Gauge */}
          <section>
            {(() => {
              const GCX = 80, GCY = 80, GR = 60;
              const gColor  = healthScore >= 80 ? "#10b981" : healthScore >= 60 ? "#f59e0b" : "#ef4444";
              const gLabel  = healthScore >= 80 ? "Healthy" : healthScore >= 60 ? "Degraded" : "Critical";
              const bgStroke = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
              return (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl p-6 border flex items-center gap-8 ${
                    isDark
                      ? "border-purple-500/20 bg-gradient-to-br from-slate-900/60 to-purple-900/10"
                      : "border-purple-400/20 bg-purple-50/50"
                  } backdrop-blur-xl`}
                >
                  {/* SVG half-circle gauge — animated needle */}
                  <div className="flex-shrink-0">
                    <AnimatedGauge score={healthScore} color={gColor} bgStroke={bgStroke} GCX={GCX} GCY={GCY} GR={GR} isDark={isDark} />
                  </div>
                  {/* Label */}
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? "text-purple-300/60" : "text-purple-600"}`}>
                      System Health Score
                    </p>
                    <p className="text-2xl font-black" style={{ color: gColor }}>{gLabel}</p>
                    <p className={`text-xs mt-2 ${isDark ? "text-white/40" : "text-gray-500"}`}>
                      CPU 30% · Memory 25% · Latency 20% · Detection 25%
                    </p>
                  </div>
                  {/* Breakdown */}
                  <div className="ml-auto hidden md:grid grid-cols-2 gap-x-10 gap-y-1 text-xs">
                    {[
                      { label: "CPU",       val: currentMetrics.cpu,            unit: "%",  weight: 0.30 },
                      { label: "Memory",    val: currentMetrics.memory,         unit: "%",  weight: 0.25 },
                      { label: "Latency",   val: currentMetrics.latency,        unit: "ms", weight: 0.20 },
                      { label: "Detection", val: currentMetrics.detectionRate,  unit: "%",  weight: 0.25 },
                    ].map(({ label, val, unit }) => (
                      <div key={label} className="flex justify-between gap-4">
                        <span className={isDark ? "text-white/40" : "text-gray-400"}>{label}</span>
                        <span className={`font-bold ${isDark ? "text-white/70" : "text-gray-700"}`}>{val.toFixed(0)}{unit}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })()}
          </section>

          {/* B extra: Total Packets + Detection Rate mini-stats */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Total Packets Processed */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl p-6 border flex items-center gap-5 ${isDark ? "border-cyan-500/20 bg-gradient-to-r from-cyan-900/20 to-blue-900/10" : "border-cyan-400/20 bg-cyan-50"} backdrop-blur-xl`}
              >
                <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-cyan-500/20 flex-shrink-0">
                  <Package size={26} className="text-cyan-400" />
                </div>
                <div>
                  <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-cyan-400" : "text-cyan-700"}`}>
                    Total Packets Processed
                  </p>
                  <p className="text-3xl font-black text-cyan-400 mt-1">
                    {(currentMetrics.packetTotal / 1_000_000).toFixed(2)}M
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? "text-cyan-300/60" : "text-cyan-600"}`}>
                    Since session start · {(currentMetrics.packets / 1000).toFixed(1)}k pps live
                  </p>
                </div>
              </motion.div>

              {/* Detection Rate */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl p-6 border flex items-center gap-5 ${isDark ? "border-emerald-500/20 bg-gradient-to-r from-emerald-900/20 to-green-900/10" : "border-emerald-400/20 bg-emerald-50"} backdrop-blur-xl`}
              >
                <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-emerald-500/20 flex-shrink-0">
                  <ShieldCheck size={26} className="text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                    Threat Detection Rate
                  </p>
                  <p className="text-3xl font-black text-emerald-400 mt-1">
                    {currentMetrics.detectionRate.toFixed(1)}%
                  </p>
                  <div className={`w-full h-2 rounded-full mt-2 ${isDark ? "bg-white/10" : "bg-black/10"}`}>
                    <motion.div
                      className="h-full rounded-full bg-emerald-400"
                      animate={{ width: `${currentMetrics.detectionRate}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 2 — CPU + DETECTION RATE (overlaid)   [D]
          ══════════════════════════════════════════════════════════════ */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <h2 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-3">
                <Cpu size={24} className="text-blue-400" />
                CPU Usage &amp; Threat Detection Rate
              </h2>
              {metricsHistory.length > 0 && (
                <span className={`text-xs font-mono px-3 py-1.5 rounded-full border ${isDark ? "bg-white/5 border-white/10 text-gray-400" : "bg-gray-100 border-gray-200 text-gray-500"}`}>
                  Min {cpuStats.min}% · Avg {cpuStats.avg}% · Max {cpuStats.max}%
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--muted)] mb-6">
              Processor utilization (blue) overlaid with detection rate % (green) · window: {timeWindow}
            </p>
            <div className={`rounded-2xl p-6 border ${isDark ? "border-blue-500/20" : "border-blue-300/20"} backdrop-blur-xl`}>
              {annotatedHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={annotatedHistory}>
                    <defs>
                      <linearGradient id="gradCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradDR" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
                    <XAxis dataKey="timestamp" stroke="#9ca3af" fontSize={11} />
                    <YAxis stroke="#9ca3af" fontSize={11} domain={[0, 100]} />
                    <Tooltip {...tooltipStyle} />
                    <Legend />
                    {/* P1 — ReferenceLine thresholds */}
                    <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 2"
                      label={{ value: "Critical 80%", fill: "#ef4444", fontSize: 10, position: "insideTopRight" }} />
                    <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="4 2"
                      label={{ value: "Warning 60%", fill: "#f59e0b", fontSize: 10, position: "insideTopRight" }} />
                    <Area type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} fill="url(#gradCpu)" name="CPU %" />
                    <Area type="monotone" dataKey="detectionRate" stroke="#10b981" strokeWidth={2} fill="url(#gradDR)" name="Detection Rate %" />
                    {/* P3 — Spike markers */}
                    <Line dataKey="cpuSpike" stroke="transparent" strokeWidth={0}
                      dot={{ r: 5, fill: "#ef4444", stroke: "rgba(239,68,68,0.35)", strokeWidth: 4 }}
                      activeDot={{ r: 7, fill: "#ef4444" }}
                      isAnimationActive={false} legendType="none" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <p className={isDark ? "text-blue-300" : "text-blue-800"}>Loading data...</p>
                </div>
              )}
            </div>
          </motion.section>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 3 — MEMORY USAGE OVER TIME
          ══════════════════════════════════════════════════════════════ */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <h2 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-3">
                <HardDrive size={24} className="text-purple-400" />
                Memory Usage Over Time
              </h2>
              {metricsHistory.length > 0 && (
                <span className={`text-xs font-mono px-3 py-1.5 rounded-full border ${isDark ? "bg-white/5 border-white/10 text-gray-400" : "bg-gray-100 border-gray-200 text-gray-500"}`}>
                  Min {memStats.min}% · Avg {memStats.avg}% · Max {memStats.max}%
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--muted)] mb-6">
              RAM allocation and utilization trends · window: {timeWindow}
            </p>
            <div className={`rounded-2xl p-6 border ${isDark ? "border-purple-500/20" : "border-purple-300/20"} backdrop-blur-xl`}>
              {annotatedHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={annotatedHistory}>
                    <defs>
                      <linearGradient id="gradMem" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
                    <XAxis dataKey="timestamp" stroke="#9ca3af" fontSize={11} />
                    <YAxis stroke="#9ca3af" fontSize={11} domain={[0, 100]} />
                    <Tooltip {...tooltipStyle} />
                    {/* P1 — ReferenceLine thresholds */}
                    <ReferenceLine y={85} stroke="#ef4444" strokeDasharray="4 2"
                      label={{ value: "Critical 85%", fill: "#ef4444", fontSize: 10, position: "insideTopRight" }} />
                    <ReferenceLine y={65} stroke="#f59e0b" strokeDasharray="4 2"
                      label={{ value: "Warning 65%", fill: "#f59e0b", fontSize: 10, position: "insideTopRight" }} />
                    <Area type="monotone" dataKey="memory" stroke="#a855f7" strokeWidth={2} fill="url(#gradMem)" name="Memory %" />
                    {/* P3 — Spike markers */}
                    <Line dataKey="memSpike" stroke="transparent" strokeWidth={0}
                      dot={{ r: 5, fill: "#ef4444", stroke: "rgba(239,68,68,0.35)", strokeWidth: 4 }}
                      activeDot={{ r: 7, fill: "#ef4444" }}
                      isAnimationActive={false} legendType="none" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <p className={isDark ? "text-purple-300" : "text-purple-800"}>Loading memory data...</p>
                </div>
              )}
            </div>
          </motion.section>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 4 — LATENCY & THROUGHPUT + ML INFERENCE
          ══════════════════════════════════════════════════════════════ */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2 flex items-center gap-3">
              <TrendingUp size={24} className="text-orange-400" />
              Network &amp; ML Performance
            </h2>
            <p className="text-sm text-[var(--muted)] mb-6">
              Latency, throughput, packets/sec, and ML inference time · window: {timeWindow}
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Latency — P1 stats badge */}
              <div className={`rounded-2xl p-6 border ${isDark ? "border-orange-500/20" : "border-orange-300/20"} backdrop-blur-xl`}>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                  <h3 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
                    <Clock size={20} className="text-orange-400" /> Latency (ms)
                  </h3>
                  {metricsHistory.length > 0 && (
                    <span className={`text-xs font-mono px-2.5 py-1 rounded-full border ${isDark ? "bg-white/5 border-white/10 text-gray-400" : "bg-gray-100 border-gray-200 text-gray-500"}`}>
                      Min {latStats.min} · Avg {latStats.avg} · Max {latStats.max} ms
                    </span>
                  )}
                </div>
                {metricsHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={metricsHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                      <XAxis dataKey="timestamp" stroke="#9ca3af" fontSize={10} />
                      <YAxis stroke="#9ca3af" fontSize={10} />
                      <Tooltip {...tooltipStyle} />
                      <Line type="monotone" dataKey="latency" stroke="#f59e0b" strokeWidth={2} dot={false} name="Latency ms" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center">
                    <p className={isDark ? "text-orange-300" : "text-orange-800"}>Loading latency data...</p>
                  </div>
                )}
              </div>

              {/* Throughput */}
              <div className={`rounded-2xl p-6 border ${isDark ? "border-green-500/20" : "border-green-300/20"} backdrop-blur-xl`}>
                <h3 className="text-lg font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
                  <Zap size={20} className="text-green-400" /> Throughput (Mbps)
                </h3>
                {metricsHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={metricsHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                      <XAxis dataKey="timestamp" stroke="#9ca3af" fontSize={10} />
                      <YAxis stroke="#9ca3af" fontSize={10} />
                      <Tooltip {...tooltipStyle} />
                      <Bar dataKey="throughput" fill="#10b981" name="Throughput Mbps" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center">
                    <p className={isDark ? "text-green-300" : "text-green-800"}>Loading throughput data...</p>
                  </div>
                )}
              </div>

              {/* ML Inference Time — P1 ReferenceLines + P2 stats + P3 spikes */}
              <div className={`rounded-2xl p-6 border ${isDark ? "border-violet-500/20" : "border-violet-300/20"} backdrop-blur-xl`}>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                  <h3 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
                    <BrainCircuit size={20} className="text-violet-400" /> ML Inference Time (ms)
                  </h3>
                  {metricsHistory.length > 0 && (
                    <span className={`text-xs font-mono px-2.5 py-1 rounded-full border ${isDark ? "bg-white/5 border-white/10 text-gray-400" : "bg-gray-100 border-gray-200 text-gray-500"}`}>
                      Min {mlStats.min} · Avg {mlStats.avg} · Max {mlStats.max} ms
                    </span>
                  )}
                </div>
                {annotatedHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={annotatedHistory}>
                      <defs>
                        <linearGradient id="gradML" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                      <XAxis dataKey="timestamp" stroke="#9ca3af" fontSize={10} />
                      <YAxis stroke="#9ca3af" fontSize={10} domain={[0, 30]} />
                      <Tooltip {...tooltipStyle} />
                      {/* P1 — ReferenceLine thresholds */}
                      <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="4 2"
                        label={{ value: "Critical 20ms", fill: "#ef4444", fontSize: 9, position: "insideTopRight" }} />
                      <ReferenceLine y={10} stroke="#f59e0b" strokeDasharray="4 2"
                        label={{ value: "Warning 10ms", fill: "#f59e0b", fontSize: 9, position: "insideTopRight" }} />
                      <Area type="monotone" dataKey="mlInference" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradML)" name="ML Inference ms" />
                      {/* P3 — Spike markers */}
                      <Line dataKey="mlSpike" stroke="transparent" strokeWidth={0}
                        dot={{ r: 5, fill: "#ef4444", stroke: "rgba(239,68,68,0.35)", strokeWidth: 4 }}
                        activeDot={{ r: 7, fill: "#ef4444" }}
                        isAnimationActive={false} legendType="none" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center">
                    <p className={isDark ? "text-violet-300" : "text-violet-800"}>Loading ML inference data...</p>
                  </div>
                )}
              </div>

              {/* B: Packets/sec chart */}
              <div className={`rounded-2xl p-6 border ${isDark ? "border-cyan-500/20" : "border-cyan-300/20"} backdrop-blur-xl`}>
                <h3 className="text-lg font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
                  <Package size={20} className="text-cyan-400" /> Packets/sec (k)
                </h3>
                {metricsHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={metricsHistory}>
                      <defs>
                        <linearGradient id="gradPkt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                      <XAxis dataKey="timestamp" stroke="#9ca3af" fontSize={10} />
                      <YAxis stroke="#9ca3af" fontSize={10} />
                      <Tooltip {...tooltipStyle} />
                      <Area type="monotone" dataKey="packets" stroke="#06b6d4" strokeWidth={2} fill="url(#gradPkt)" name="Packets/sec" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center">
                    <p className={isDark ? "text-cyan-300" : "text-cyan-800"}>Loading packet data...</p>
                  </div>
                )}
              </div>
            </div>
          </motion.section>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 5 — PERFORMANCE INSIGHTS
          ══════════════════════════════════════════════════════════════ */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6 flex items-center gap-3">
              <AlertCircle size={24} className="text-yellow-400" />
              Performance Insights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getPerformanceInsights(currentMetrics).map((insight, idx) => (
                <InsightCard key={idx} insight={insight} isDark={isDark} />
              ))}
            </div>
          </motion.section>

        </div>
      </div>
    </div>
  );
}
