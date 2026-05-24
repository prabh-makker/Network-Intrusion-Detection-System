"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Activity,
  Wifi,
  TrendingUp,
  AlertTriangle,
  Ban,
  Clock,
  ShieldCheck,
  Zap,
  Globe,
} from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { fetchWithAuth, getToken } from "@/lib/auth";
import { getApiUrl } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";

type Stats = {
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

type TimePoint = {
  time: string;
  active: number;
  blocked: number;
};

const CHART_COLORS = [
  "#a855f7", "#06b6d4", "#ec4899", "#f59e0b",
  "#ef4444", "#10b981", "#f97316", "#3b82f6",
  "#84cc16", "#8b5cf6",
];

const THREAT_COLORS: Record<string, string> = {
  DoS: "#06b6d4",
  DDoS: "#a855f7",
  "DDoS (Ping of Death)": "#ec4899",
  Probe: "#f59e0b",
  "U2R (Root Access)": "#ef4444",
  "R2L (Unauthorized Access)": "#f97316",
};

function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
  isDark,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  isDark: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-5 rounded-2xl border backdrop-blur-xl"
      style={{ borderColor: color + "50", background: color + "12" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div style={{ color }}>{icon}</div>
        <span className="text-xs font-mono font-bold opacity-60" style={{ color }}>LIVE</span>
      </div>
      <p className={`text-3xl font-black tabular-nums ${isDark ? "text-white" : "text-gray-900"}`}>{value}</p>
      <p className={`text-xs font-semibold mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>{label}</p>
      {sub && <p className="text-xs mt-0.5 opacity-70" style={{ color }}>{sub}</p>}
    </motion.div>
  );
}

export default function LiveTrafficPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const apiUrl = getApiUrl();

  const [stats, setStats] = useState<Stats>({ total_threats: 0, by_label: {}, top_sources: [] });
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);
  const [timeSeries, setTimeSeries] = useState<TimePoint[]>([]);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (!getToken()) router.push("/login");
    else setAuthenticated(true);
  }, [router]);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, recentRes] = await Promise.all([
        fetchWithAuth(`${apiUrl}/api/v1/alerts/stats`),
        fetchWithAuth(`${apiUrl}/api/v1/alerts/recent?limit=20`),
      ]);

      let newStats: Stats = { total_threats: 0, by_label: {}, top_sources: [] };
      if (statsRes.ok) {
        newStats = await statsRes.json();
        setStats(newStats);
      }
      if (recentRes.ok) {
        const data = await recentRes.json();
        setRecentAlerts(data);
      }

      // Rolling time series — one point per 5s fetch
      const timeLabel = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setTimeSeries((prev) => {
        const next: TimePoint = {
          time: timeLabel,
          active: newStats.active_threats ?? 0,
          blocked: newStats.blocked_threats ?? 0,
        };
        const updated = [...prev, next];
        return updated.length > 24 ? updated.slice(updated.length - 24) : updated;
      });
    } catch (e) {
      console.error("LiveTraffic fetchData failed:", e);
    }
  }, [apiUrl]);

  useEffect(() => {
    if (!authenticated) return;
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [authenticated, fetchData]);

  // Derived data
  const pieData = Object.entries(stats.by_label)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const topSources = stats.top_sources.slice(0, 7);

  const protocolMap: Record<string, number> = {};
  recentAlerts.forEach((a) => {
    protocolMap[a.protocol] = (protocolMap[a.protocol] || 0) + 1;
  });
  const protocolData = Object.entries(protocolMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const axisColor = isDark ? "#ffffff35" : "#00000035";
  const tooltipStyle = {
    background: isDark ? "#1a1a3e" : "#fff",
    border: isDark ? "1px solid #a78bfa40" : "1px solid #8b5cf620",
    borderRadius: 10,
    color: isDark ? "#e9d5ff" : "#3b0764",
    fontSize: 12,
  };

  const panelClass = `rounded-2xl border backdrop-blur-xl p-6 ${
    isDark
      ? "border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10"
      : "border-purple-300/40 bg-white shadow-md"
  }`;

  return (
    <div className={`min-h-screen w-full flex flex-col ${isDark ? "bg-[#0d0d1f]" : "bg-transparent"}`}>
      {/* Header */}
      <div
        className={`border-b backdrop-blur-xl px-6 py-6 ${
          isDark
            ? "border-cyan-500/20 bg-gradient-to-r from-cyan-900/10 via-transparent to-blue-900/10"
            : "border-cyan-400/20 bg-cyan-950/5"
        }`}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 flex items-center gap-3"
            >
              <Activity size={32} className="text-cyan-400" />
              Live Traffic
            </motion.h1>
            <p className={`mt-2 text-sm ${isDark ? "text-cyan-200" : "text-cyan-800"}`}>
              Real-time network traffic dashboard · Auto-updates every 5s
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <span className={`text-sm font-bold ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
              LIVE
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-6 py-6 w-full overflow-auto">
        <div className="max-w-7xl mx-auto w-full space-y-6">

          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              icon={<Wifi size={22} />}
              label="Total Threats"
              value={stats.total_threats.toLocaleString()}
              color="#a855f7"
              isDark={isDark}
              delay={0}
            />
            <KpiCard
              icon={<AlertTriangle size={22} />}
              label="Active Threats"
              value={(stats.active_threats ?? 0).toLocaleString()}
              sub="currently unblocked"
              color="#ef4444"
              isDark={isDark}
              delay={0.05}
            />
            <KpiCard
              icon={<Ban size={22} />}
              label="Quarantined"
              value={(stats.blocked_threats ?? 0).toLocaleString()}
              sub="IPs blocked"
              color="#10b981"
              isDark={isDark}
              delay={0.1}
            />
            <KpiCard
              icon={<TrendingUp size={22} />}
              label="Threat Types"
              value={Object.keys(stats.by_label).length}
              sub="distinct categories"
              color="#06b6d4"
              isDark={isDark}
              delay={0.15}
            />
          </div>

          {/* Live Threat Activity Line Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={panelClass}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-purple-950"}`}>
                <Activity size={20} className="text-cyan-400" />
                Live Threat Activity
              </h3>
              <span className={`text-xs ${isDark ? "text-purple-400" : "text-purple-600"}`}>
                rolling 24 snapshots · 5s interval
              </span>
            </div>
            {timeSeries.length < 2 ? (
              <div
                className={`flex items-center justify-center h-52 rounded-xl border border-dashed ${
                  isDark ? "border-purple-500/20 text-purple-400" : "border-purple-300 text-purple-500"
                }`}
              >
                <div className="text-center">
                  <Activity size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Collecting data — first point in ~5s…</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={timeSeries} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <XAxis
                    dataKey="time"
                    tick={{ fill: axisColor, fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: axisColor, fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="active"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    dot={false}
                    name="Active Threats"
                    activeDot={{ r: 4, fill: "#ef4444" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="blocked"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                    name="Blocked"
                    activeDot={{ r: 4, fill: "#10b981" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
            <div className="flex items-center gap-6 mt-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-6 h-0.5 bg-red-500 rounded" />
                <span className={isDark ? "text-red-400" : "text-red-600"}>Active Threats</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-6 h-0.5 bg-emerald-500 rounded" />
                <span className={isDark ? "text-emerald-400" : "text-emerald-600"}>Blocked</span>
              </div>
            </div>
          </motion.div>

          {/* Bottom Row: 3 panels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Threat Distribution Donut */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className={panelClass}
            >
              <h3 className={`text-base font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-purple-950"}`}>
                <Zap size={16} className="text-yellow-400" />
                Threat Distribution
              </h3>
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell
                            key={index}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-1.5">
                    {pieData.slice(0, 5).map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                          />
                          <span className={`truncate ${isDark ? "text-purple-300" : "text-purple-700"}`}>{d.name}</span>
                        </div>
                        <span className={`font-mono font-bold ml-2 shrink-0 ${isDark ? "text-white" : "text-purple-950"}`}>
                          {d.value.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className={`flex items-center justify-center h-48 text-sm ${isDark ? "text-purple-400" : "text-purple-600"}`}>
                  No data yet
                </div>
              )}
            </motion.div>

            {/* Top Attack Sources */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={panelClass}
            >
              <h3 className={`text-base font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-purple-950"}`}>
                <Globe size={16} className="text-red-400" />
                Top Attack Sources
              </h3>
              {topSources.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={topSources}
                    layout="vertical"
                    margin={{ left: 0, right: 10, top: 0, bottom: 0 }}
                  >
                    <XAxis
                      type="number"
                      tick={{ fill: axisColor, fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="ip"
                      tick={{ fill: axisColor, fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={95}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Threats">
                      {topSources.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className={`flex items-center justify-center h-48 text-sm ${isDark ? "text-purple-400" : "text-purple-600"}`}>
                  No data yet
                </div>
              )}
            </motion.div>

            {/* Recent Alerts Ticker */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className={panelClass}
            >
              <h3 className={`text-base font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-purple-950"}`}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                Recent Alerts
              </h3>
              <div className="space-y-2">
                {recentAlerts.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center py-10 text-sm ${isDark ? "text-purple-400" : "text-purple-600"}`}>
                    <ShieldCheck size={28} className="mb-2 opacity-30" />
                    <span>Waiting for alerts…</span>
                  </div>
                ) : (
                  recentAlerts.slice(0, 10).map((alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-center justify-between text-xs py-1.5 border-b ${
                        isDark ? "border-purple-500/10" : "border-purple-100"
                      }`}
                    >
                      <div className="min-w-0">
                        <span
                          className="font-semibold truncate block"
                          style={{ color: THREAT_COLORS[alert.label] || "#8b5cf6" }}
                        >
                          {alert.label}
                        </span>
                        <span className={`font-mono ${isDark ? "text-purple-400" : "text-purple-600"}`}>
                          {alert.src_ip}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className={alert.is_blocked ? "text-emerald-400" : "text-red-400"}>●</span>
                        <Clock size={10} className={isDark ? "text-purple-500" : "text-purple-400"} />
                        <span className={isDark ? "text-purple-500" : "text-purple-400"}>
                          {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : "—"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>

          {/* Protocol Distribution Bar */}
          {protocolData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={panelClass}
            >
              <h3 className={`text-base font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-purple-950"}`}>
                <Wifi size={16} className="text-cyan-400" />
                Protocol Distribution
                <span className={`text-xs font-normal ml-1 ${isDark ? "text-purple-400" : "text-purple-600"}`}>
                  (last 20 alerts)
                </span>
              </h3>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={protocolData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: axisColor, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: axisColor, fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Count">
                    {protocolData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
