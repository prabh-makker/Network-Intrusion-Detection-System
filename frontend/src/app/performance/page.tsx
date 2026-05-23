"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Cpu, HardDrive, Zap, Activity, TrendingUp, AlertCircle, CheckCircle2,
  Gauge, Clock, Wifi,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface MetricsData {
  timestamp: string;
  cpu: number;
  memory: number;
  latency: number;
  throughput: number;
}

interface SystemHealth {
  cpu: "good" | "warning" | "critical";
  memory: "good" | "warning" | "critical";
  latency: "good" | "warning" | "critical";
  throughput: "good" | "warning" | "critical";
}

// Helper to generate insight cards (eliminates copy-paste)
const getPerformanceInsights = (currentMetrics: { cpu: number; memory: number; latency: number; throughput: number }) => [
  {
    icon: "⚡",
    title: "CPU Performance",
    metric: currentMetrics.cpu,
    critical: 80,
    warning: 60,
    messages: {
      critical: "⚠️ CPU usage is critical. Consider optimizing resource allocation.",
      warning: "⚠️ CPU usage is elevated. Monitor for potential bottlenecks.",
      good: "✓ CPU usage is optimal. System performing well.",
    },
  },
  {
    icon: "💾",
    title: "Memory Performance",
    metric: currentMetrics.memory,
    critical: 80,
    warning: 60,
    messages: {
      critical: "⚠️ Memory usage is critical. Consider clearing cache or increasing capacity.",
      warning: "⚠️ Memory usage is high. Monitor for memory leaks.",
      good: "✓ Memory usage is healthy. Good headroom available.",
    },
  },
  {
    icon: "🔌",
    title: "Network Latency",
    metric: currentMetrics.latency,
    critical: 60,
    warning: 40,
    messages: {
      critical: "⚠️ Latency is high. Check network connectivity and routes.",
      warning: "⚠️ Latency is moderate. Performance may be affected.",
      good: "✓ Latency is low. Network response is fast.",
    },
  },
  {
    icon: "📊",
    title: "Throughput",
    metric: currentMetrics.throughput,
    critical: 200,
    warning: 500,
    isInverse: true,
    messages: {
      critical: "⚠️ Throughput is low. May indicate network congestion.",
      warning: "✓ Throughput is good. Sufficient bandwidth.",
      good: "✓ Throughput is excellent. High network capacity.",
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
    <div
      className={`rounded-2xl p-6 border ${isDark ? "border-yellow-500/20" : "border-yellow-300/20"} backdrop-blur-xl`}
    >
      <h3 className="font-semibold text-[var(--foreground)] mb-3">
        {insight.icon} {insight.title}
      </h3>
      <p className={`text-sm ${isDark ? "text-yellow-200" : "text-yellow-800"}`}>
        {message}
      </p>
    </div>
  );
};

export default function PerformancePage() {
  const { isDark } = useTheme();
  const [metricsHistory, setMetricsHistory] = useState<MetricsData[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState({
    cpu: 0,
    memory: 0,
    latency: 0,
    throughput: 0,
  });

  // Generate mock metrics data
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeLabel = now.toLocaleTimeString([], {
        minute: "2-digit",
        second: "2-digit",
      });

      const newMetrics = {
        timestamp: timeLabel,
        cpu: Math.floor(Math.random() * 85) + 5,
        memory: Math.floor(Math.random() * 70) + 20,
        latency: Math.floor(Math.random() * 80) + 10,
        throughput: Math.floor(Math.random() * 900) + 100,
      };

      setCurrentMetrics({
        cpu: newMetrics.cpu,
        memory: newMetrics.memory,
        latency: newMetrics.latency,
        throughput: newMetrics.throughput,
      });

      setMetricsHistory((prev) => [...prev, newMetrics].slice(-30));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getMetricStatus = (
    value: number,
    criticalThreshold: number,
    warningThreshold: number,
    isInverse = false
  ): "good" | "warning" | "critical" => {
    if (isInverse) {
      if (value === 0) return "good"; // No data yet — not a real alert
      return value < criticalThreshold ? "critical" : value < warningThreshold ? "warning" : "good";
    }
    return value > criticalThreshold ? "critical" : value > warningThreshold ? "warning" : "good";
  };

  const getHealthStatus = (): SystemHealth => {
    return {
      cpu: getMetricStatus(currentMetrics.cpu, 80, 60),
      memory: getMetricStatus(currentMetrics.memory, 80, 60),
      latency: getMetricStatus(currentMetrics.latency, 60, 40),
      throughput: getMetricStatus(currentMetrics.throughput, 200, 500, true),
    };
  };

  const health = getHealthStatus();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "#10b981";
      case "warning":
        return "#f59e0b";
      case "critical":
        return "#ef4444";
      default:
        return "#8b5cf6";
    }
  };

  const MetricCard = ({
    label,
    value,
    unit,
    icon: Icon,
    status,
    max = 100,
  }: {
    label: string;
    value: number;
    unit: string;
    icon: React.ElementType;
    status: "good" | "warning" | "critical";
    max?: number;
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
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${statusColor}25` }}
            >
              <Icon size={22} style={{ color: statusColor }} />
            </div>
            <div>
              <p
                className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-purple-300" : "text-purple-800"}`}
              >
                {label}
              </p>
              <p className="text-2xl font-black mt-1" style={{ color: statusColor }}>
                {value.toFixed(1)}{unit}
              </p>
            </div>
          </div>
          <StatusIcon size={20} style={{ color: statusColor }} />
        </div>

        {/* Progress bar */}
        <div
          className={`w-full h-2 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-black/10"}`}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: statusColor }}
            animate={{ width: `${Math.min(percentage, 100)}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Status label */}
        <p
          className="text-xs mt-3 font-semibold uppercase"
          style={{ color: statusColor }}
        >
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
      <div
        className={`border-b backdrop-blur-xl px-6 py-6 sticky top-0 z-50 ${
          isDark
            ? "border-green-500/20 bg-gradient-to-r from-green-900/10 via-transparent to-emerald-900/10"
            : "border-green-400/20 bg-green-950/5"
        }`}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 flex items-center gap-3">
              <Gauge size={32} className="text-green-400" />
              Performance Metrics
            </h1>
            <p
              className={`mt-1 text-sm ${isDark ? "text-green-200" : "text-green-800"}`}
            >
              Real-time system CPU · memory · latency · throughput monitoring
            </p>
          </div>
        </div>
      </div>

      <div className="w-full px-6 py-12 relative z-0">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* ══════════════════════════════════════════════════════════════
              SECTION 1 — SYSTEM HEALTH CARDS
          ══════════════════════════════════════════════════════════════ */}
          <section>
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6 flex items-center gap-3">
              <Activity size={24} className="text-green-400" />
              System Health Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="CPU Usage"
                value={currentMetrics.cpu}
                unit="%"
                icon={Cpu}
                status={health.cpu}
                max={100}
              />
              <MetricCard
                label="Memory Usage"
                value={currentMetrics.memory}
                unit="%"
                icon={HardDrive}
                status={health.memory}
                max={100}
              />
              <MetricCard
                label="Latency"
                value={currentMetrics.latency}
                unit="ms"
                icon={Clock}
                status={health.latency}
                max={100}
              />
              <MetricCard
                label="Throughput"
                value={currentMetrics.throughput}
                unit=" Mbps"
                icon={Wifi}
                status={health.throughput}
                max={1000}
              />
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 2 — CPU USAGE OVER TIME
          ══════════════════════════════════════════════════════════════ */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6 flex items-center gap-3">
              <Cpu size={24} className="text-blue-400" />
              CPU Usage Over Time
            </h2>
            <p className="text-sm text-[var(--muted)] mb-6">
              Processor utilization trends (last 30 seconds)
            </p>

            <div
              className={`rounded-2xl p-6 border ${isDark ? "border-blue-500/20" : "border-blue-300/20"} backdrop-blur-xl`}
            >
              {metricsHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metricsHistory}>
                    <defs>
                      <linearGradient id="gradCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148,163,184,0.1)"
                      vertical={false}
                    />
                    <XAxis dataKey="timestamp" stroke="#9ca3af" fontSize={11} />
                    <YAxis stroke="#9ca3af" fontSize={11} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark
                          ? "rgba(15,10,26,0.95)"
                          : "rgba(255,255,255,0.95)",
                        border: isDark
                          ? "1px solid rgba(59,130,246,0.3)"
                          : "1px solid rgba(203,213,225,0.5)",
                        borderRadius: "10px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cpu"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#gradCpu)"
                      name="CPU %"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <p className={isDark ? "text-blue-300" : "text-blue-800"}>
                    Loading CPU data...
                  </p>
                </div>
              )}
            </div>
          </motion.section>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 3 — MEMORY USAGE OVER TIME
          ══════════════════════════════════════════════════════════════ */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6 flex items-center gap-3">
              <HardDrive size={24} className="text-purple-400" />
              Memory Usage Over Time
            </h2>
            <p className="text-sm text-[var(--muted)] mb-6">
              RAM allocation and utilization trends (last 30 seconds)
            </p>

            <div
              className={`rounded-2xl p-6 border ${isDark ? "border-purple-500/20" : "border-purple-300/20"} backdrop-blur-xl`}
            >
              {metricsHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metricsHistory}>
                    <defs>
                      <linearGradient id="gradMem" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148,163,184,0.1)"
                      vertical={false}
                    />
                    <XAxis dataKey="timestamp" stroke="#9ca3af" fontSize={11} />
                    <YAxis stroke="#9ca3af" fontSize={11} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark
                          ? "rgba(15,10,26,0.95)"
                          : "rgba(255,255,255,0.95)",
                        border: isDark
                          ? "1px solid rgba(168,85,247,0.3)"
                          : "1px solid rgba(203,213,225,0.5)",
                        borderRadius: "10px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="memory"
                      stroke="#a855f7"
                      strokeWidth={2}
                      fill="url(#gradMem)"
                      name="Memory %"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <p className={isDark ? "text-purple-300" : "text-purple-800"}>
                    Loading memory data...
                  </p>
                </div>
              )}
            </div>
          </motion.section>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 4 — LATENCY & THROUGHPUT
          ══════════════════════════════════════════════════════════════ */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6 flex items-center gap-3">
              <TrendingUp size={24} className="text-orange-400" />
              Latency &amp; Throughput
            </h2>
            <p className="text-sm text-[var(--muted)] mb-6">
              Network performance indicators (last 30 seconds)
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Latency Chart */}
              <div
                className={`rounded-2xl p-6 border ${isDark ? "border-orange-500/20" : "border-orange-300/20"} backdrop-blur-xl`}
              >
                <h3 className="text-lg font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
                  <Clock size={20} className="text-orange-400" />
                  Latency (ms)
                </h3>
                {metricsHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={metricsHistory}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(148,163,184,0.1)"
                      />
                      <XAxis dataKey="timestamp" stroke="#9ca3af" fontSize={10} />
                      <YAxis stroke="#9ca3af" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark
                            ? "rgba(15,10,26,0.95)"
                            : "rgba(255,255,255,0.95)",
                          border: isDark
                            ? "1px solid rgba(249,115,22,0.3)"
                            : "1px solid rgba(203,213,225,0.5)",
                          borderRadius: "10px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="latency"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={false}
                        name="Latency ms"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center">
                    <p className={isDark ? "text-orange-300" : "text-orange-800"}>
                      Loading latency data...
                    </p>
                  </div>
                )}
              </div>

              {/* Throughput Chart */}
              <div
                className={`rounded-2xl p-6 border ${isDark ? "border-green-500/20" : "border-green-300/20"} backdrop-blur-xl`}
              >
                <h3 className="text-lg font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
                  <Zap size={20} className="text-green-400" />
                  Throughput (Mbps)
                </h3>
                {metricsHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={metricsHistory}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(148,163,184,0.1)"
                      />
                      <XAxis dataKey="timestamp" stroke="#9ca3af" fontSize={10} />
                      <YAxis stroke="#9ca3af" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark
                            ? "rgba(15,10,26,0.95)"
                            : "rgba(255,255,255,0.95)",
                          border: isDark
                            ? "1px solid rgba(16,185,129,0.3)"
                            : "1px solid rgba(203,213,225,0.5)",
                          borderRadius: "10px",
                        }}
                      />
                      <Bar
                        dataKey="throughput"
                        fill="#10b981"
                        name="Throughput Mbps"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center">
                    <p className={isDark ? "text-green-300" : "text-green-800"}>
                      Loading throughput data...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.section>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 5 — PERFORMANCE INSIGHTS
          ══════════════════════════════════════════════════════════════ */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6 flex items-center gap-3">
              <AlertCircle size={24} className="text-yellow-400" />
              Performance Insights
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
