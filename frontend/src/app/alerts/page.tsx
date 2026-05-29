"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Activity,
  AlertTriangle,
  Ban,
  Clock,
  Globe,
  ShieldCheck,
  Wifi,
  Zap,
  Terminal,
  TrendingUp,
  Radio,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { fetchWithAuth, getToken } from "@/lib/auth";
import { getApiUrl } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip as RTooltip } from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────
type Stats = {
  total_threats: number;
  active_threats?: number;
  blocked_threats?: number;
  by_label: Record<string, number>;
  by_label_active?: Record<string, number>;
  top_sources: { ip: string; count: number }[];
};

type LiveAlert = {
  id: string;
  timestamp: string;
  src_ip: string;
  dst_ip: string;
  protocol: string;
  label: string;
  confidence: number;
  is_blocked: boolean;
};

type RateTick = { t: number; count: number }; // epoch ms + alert count at that tick

// ── Constants ────────────────────────────────────────────────────────────────
const THREAT_COLORS: Record<string, string> = {
  DoS: "#06b6d4",
  DDoS: "#a855f7",
  "DDoS (Ping of Death)": "#ec4899",
  Probe: "#f59e0b",
  "U2R (Root Access)": "#ef4444",
  "R2L (Unauthorized Access)": "#f97316",
  Malware: "#ef4444",
  "Brute Force": "#f59e0b",
  "Port Scan": "#14b8a6",
  "SQL Injection": "#8b5cf6",
};

const LABEL_EMOJI: Record<string, string> = {
  DDoS: "💥", "DDoS (Ping of Death)": "💀", DoS: "⚡",
  Probe: "📡", "U2R (Root Access)": "👑", "R2L (Unauthorized Access)": "🚪",
  Malware: "🦠", "Brute Force": "🔓", "Port Scan": "🔍", "SQL Injection": "💉",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function relTime(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return new Date(ts).toLocaleTimeString();
}

function ProtocolBar({
  name, count, max, isDark,
}: { name: string; count: number; max: number; isDark: boolean }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className={`font-mono font-semibold ${isDark ? "text-cyan-300" : "text-cyan-700"}`}>{name}</span>
        <span className={isDark ? "text-white" : "text-gray-900"}>{count} <span className="opacity-50">({pct}%)</span></span>
      </div>
      <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-purple-900/40" : "bg-purple-100"}`}>
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function LiveTrafficPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const apiUrl = getApiUrl();

  const [stats, setStats] = useState<Stats>({ total_threats: 0, by_label: {}, top_sources: [] });
  const [liveLog, setLiveLog] = useState<LiveAlert[]>([]);
  const [rateTicks, setRateTicks] = useState<RateTick[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [paused, setPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [filterPreset, setFilterPreset] = useState<"all" | "critical" | "unblocked">("all");
  const [rateHistory, setRateHistory] = useState<{ t: string; rate: number }[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const prevAlertIds = useRef<Set<string>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playBeep = () => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "square"; osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(); osc.stop(ctx.currentTime + 0.15);
    } catch {}
  };

  useEffect(() => {
    if (!getToken()) router.push("/login");
    else setAuthenticated(true);
  }, [router]);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, recentRes] = await Promise.all([
        fetchWithAuth(`${apiUrl}/api/v1/alerts/stats`),
        fetchWithAuth(`${apiUrl}/api/v1/alerts/recent?limit=50`),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());

      if (recentRes.ok) {
        const fresh: LiveAlert[] = await recentRes.json();

        const newOnes = fresh.filter((a) => !prevAlertIds.current.has(a.id));
        newOnes.forEach((a) => prevAlertIds.current.add(a.id));

        if (!paused) {
          setLiveLog((prev) => {
            const combined = [...newOnes, ...prev];
            const seen = new Set<string>();
            return combined
              .filter((a) => { if (seen.has(a.id)) return false; seen.add(a.id); return true; })
              .slice(0, 80);
          });
        }

        // Sound alert for new CRITICAL-label threats
        if (soundEnabled && newOnes.some(a => ["U2R (Root Access)", "DDoS (Ping of Death)", "Malware"].includes(a.label))) {
          playBeep();
        }

        const now = Date.now();
        setRateTicks((prev) => {
          const updated = [...prev, { t: now, count: newOnes.length }];
          return updated.filter((tk) => now - tk.t < 60_000);
        });

        // Keep rolling rate chart (one point per poll)
        setRateHistory(prev => {
          const point = { t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }), rate: newOnes.length };
          return [...prev, point].slice(-30);
        });
      }
    } catch (e) {
      console.error("LiveTraffic fetch failed:", e);
    }
  }, [apiUrl]);

  useEffect(() => {
    if (!authenticated) return;
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [authenticated, fetchData]);

  const alertsPerMin = rateTicks.reduce((sum, tk) => sum + tk.count, 0);

  // Apply filter preset
  const filteredLog = liveLog.filter(a => {
    if (filterPreset === "critical") return ["U2R (Root Access)", "DDoS (Ping of Death)", "DDoS", "Malware"].includes(a.label);
    if (filterPreset === "unblocked") return !a.is_blocked;
    return true;
  });

  // Protocol breakdown from live log
  const protocolMap: Record<string, number> = {};
  liveLog.forEach((a) => { protocolMap[a.protocol] = (protocolMap[a.protocol] || 0) + 1; });
  const protocols = Object.entries(protocolMap).sort((a, b) => b[1] - a[1]);
  const maxProto = protocols[0]?.[1] ?? 1;

  // Per-label active counts
  const labelActive = stats.by_label_active ?? {};

  // Threat severity rating
  const securityScore = stats.total_threats > 0
    ? Math.max(0, 100 - Math.round(((stats.active_threats ?? 0) / stats.total_threats) * 100))
    : 100;

  const scoreColor = securityScore >= 80 ? "#10b981" : securityScore >= 50 ? "#f59e0b" : "#ef4444";
  const scoreLabel = securityScore >= 80 ? "SECURE" : securityScore >= 50 ? "MODERATE" : "AT RISK";

  const panelClass = `rounded-2xl border backdrop-blur-xl ${
    isDark
      ? "border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10"
      : "border-purple-300/40 bg-white shadow-md"
  }`;

  return (
    <div className={`min-h-screen w-full flex flex-col ${isDark ? "bg-[#0d0d1f]" : "bg-transparent"}`}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className={`border-b backdrop-blur-xl px-6 py-5 ${isDark ? "border-cyan-500/20 bg-gradient-to-r from-cyan-900/10 via-transparent to-blue-900/10" : "border-cyan-400/20 bg-cyan-950/5"}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4 flex-wrap">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 flex items-center gap-3"
            >
              <Radio size={30} className="text-cyan-400" />
              Live Traffic
            </motion.h1>
            <p className={`mt-1 text-sm ${isDark ? "text-cyan-200" : "text-cyan-800"}`}>
              Real-time SOC operations view · Polls every 5s · No historical aggregation
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`px-4 py-2 rounded-xl border text-sm font-bold flex items-center gap-2 ${isDark ? "border-red-500/30 bg-red-900/20 text-red-300" : "border-red-400/30 bg-red-50 text-red-700"}`}>
              <Zap size={15} /> {alertsPerMin} alerts/min
            </div>
            {/* Pause / Resume */}
            <button
              onClick={() => setPaused(p => !p)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold transition-all ${
                paused
                  ? isDark ? "border-amber-500/40 bg-amber-900/20 text-amber-300" : "border-amber-400/40 bg-amber-50 text-amber-700"
                  : isDark ? "border-cyan-500/30 bg-cyan-900/10 text-cyan-300" : "border-cyan-400/30 bg-cyan-50 text-cyan-700"
              }`}
            >
              {paused ? <><Play size={14}/> Resume</> : <><Pause size={14}/> Pause</>}
            </button>
            {/* Sound toggle */}
            <button
              onClick={() => setSoundEnabled(s => !s)}
              title="Sound alerts for critical threats"
              className={`p-2 rounded-xl border text-sm font-bold transition-all ${
                soundEnabled
                  ? isDark ? "border-purple-500/40 bg-purple-900/20 text-purple-300" : "border-purple-400/40 bg-purple-50 text-purple-700"
                  : isDark ? "border-white/10 text-white/30 hover:border-white/20" : "border-gray-300 text-gray-400"
              }`}
            >
              {soundEnabled ? <Volume2 size={16}/> : <VolumeX size={16}/>}
            </button>
            {/* Live pulse */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                {!paused && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
                <span className={`relative inline-flex rounded-full h-3 w-3 ${paused ? "bg-amber-400" : "bg-emerald-500"}`} />
              </span>
              <span className={`text-sm font-bold ${paused ? isDark ? "text-amber-400" : "text-amber-600" : isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                {paused ? "PAUSED" : "LIVE"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-6 py-6 w-full overflow-auto">
        <div className="max-w-7xl mx-auto w-full space-y-5">

          {/* ── KPI Row ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Security Score */}
            <motion.div
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              className={`${panelClass} p-5`}
            >
              <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Network Status</p>
              <div className="flex items-end gap-2">
                <p className="text-4xl font-black" style={{ color: scoreColor }}>{securityScore}</p>
                <p className="text-sm font-bold mb-1" style={{ color: scoreColor }}>/100</p>
              </div>
              <p className="text-xs font-bold mt-1" style={{ color: scoreColor }}>{scoreLabel}</p>
            </motion.div>

            {/* Active threats */}
            <motion.div
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className={`${panelClass} p-5`}
            >
              <div className="flex items-center justify-between mb-3">
                <AlertTriangle size={18} className="text-red-400" />
                <span className="text-xs font-mono text-red-400">ACTIVE</span>
              </div>
              <p className={`text-4xl font-black ${isDark ? "text-white" : "text-gray-900"}`}>{stats.active_threats ?? 0}</p>
              <p className={`text-xs mt-1 ${isDark ? "text-red-300" : "text-red-600"}`}>unblocked threats</p>
            </motion.div>

            {/* Blocked */}
            <motion.div
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className={`${panelClass} p-5`}
            >
              <div className="flex items-center justify-between mb-3">
                <Ban size={18} className="text-emerald-400" />
                <span className="text-xs font-mono text-emerald-400">BLOCKED</span>
              </div>
              <p className={`text-4xl font-black ${isDark ? "text-white" : "text-gray-900"}`}>{stats.blocked_threats ?? 0}</p>
              <p className={`text-xs mt-1 ${isDark ? "text-emerald-300" : "text-emerald-600"}`}>IPs quarantined</p>
            </motion.div>

            {/* Unique attackers */}
            <motion.div
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className={`${panelClass} p-5`}
            >
              <div className="flex items-center justify-between mb-3">
                <Globe size={18} className="text-purple-400" />
                <span className="text-xs font-mono text-purple-400">ATTACKERS</span>
              </div>
              <p className={`text-4xl font-black ${isDark ? "text-white" : "text-gray-900"}`}>{stats.top_sources.length}</p>
              <p className={`text-xs mt-1 ${isDark ? "text-purple-300" : "text-purple-600"}`}>unique source IPs</p>
            </motion.div>
          </div>

          {/* ── Main 2-column layout ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Alert Rate Chart + Live Event Log — 2/3 */}
            <div className={`lg:col-span-2 ${panelClass} p-5 flex flex-col gap-4`}>

              {/* Alert Rate Mini-Chart */}
              {rateHistory.length > 2 && (
                <div>
                  <p className={`text-xs font-bold mb-1 flex items-center gap-1 ${isDark ? "text-cyan-400" : "text-cyan-700"}`}>
                    <TrendingUp size={12}/> Alert Rate (last 60s)
                  </p>
                  <ResponsiveContainer width="100%" height={60}>
                    <LineChart data={rateHistory}>
                      <XAxis dataKey="t" hide />
                      <YAxis hide />
                      <RTooltip
                        contentStyle={{ backgroundColor: isDark ? "#0d0d1f" : "#fff", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 8, fontSize: 11 }}
                        formatter={(v: any) => [`${v} new`, "Alerts"]}
                      />
                      <Line type="monotone" dataKey="rate" stroke="#06b6d4" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Filter Presets */}
              <div className="flex items-center gap-2 flex-wrap">
                <Filter size={13} className={isDark ? "text-purple-400" : "text-purple-600"} />
                <span className={`text-xs font-semibold ${isDark ? "text-purple-300" : "text-purple-700"}`}>Show:</span>
                {([
                  { key: "all",       label: "All Events",     color: "cyan" },
                  { key: "critical",  label: "🔴 Critical Only", color: "red" },
                  { key: "unblocked", label: "⚡ Unblocked Only", color: "amber" },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilterPreset(key)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      filterPreset === key
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow"
                        : isDark ? "border border-purple-500/30 text-purple-300 hover:border-purple-500/60" : "border border-purple-300 text-purple-700 hover:bg-purple-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <span className={`ml-auto text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  {filteredLog.length} / {liveLog.length} events
                </span>
              </div>

              <div className="flex items-center justify-between">
                <h3 className={`font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                  <Terminal size={18} className="text-cyan-400" />
                  Live Event Log {paused && <span className="text-xs text-amber-400 font-normal">(paused)</span>}
                </h3>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className={isDark ? "text-red-300" : "text-red-600"}>{filteredLog.length} events</span>
                </div>
              </div>

              {/* Terminal-style log */}
              <div
                ref={logRef}
                className={`flex-1 overflow-y-auto rounded-xl font-mono text-xs space-y-0.5 p-3 max-h-[480px] ${
                  isDark ? "bg-black/40 border border-green-900/30" : "bg-gray-50 border border-gray-200"
                }`}
              >
                {filteredLog.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center h-40 ${isDark ? "text-green-500/50" : "text-gray-400"}`}>
                    <Activity size={24} className="mb-2" />
                    <span>{paused ? "Feed paused — click Resume to continue" : "Waiting for events…"}</span>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {filteredLog.map((alert, i) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: -10, backgroundColor: "rgba(239,68,68,0.15)" }}
                        animate={{ opacity: 1, x: 0, backgroundColor: "rgba(0,0,0,0)" }}
                        transition={{ duration: 0.4 }}
                        className={`flex items-start gap-2 py-1 px-1 rounded leading-tight ${
                          i === 0 ? isDark ? "bg-green-900/10" : "bg-green-50" : ""
                        }`}
                      >
                        {/* Timestamp */}
                        <span className={`shrink-0 ${isDark ? "text-green-600" : "text-gray-400"}`}>
                          [{alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : "--:--:--"}]
                        </span>
                        {/* Severity dot */}
                        <span
                          className="shrink-0 mt-0.5"
                          style={{ color: THREAT_COLORS[alert.label] || "#8b5cf6" }}
                        >●</span>
                        {/* Label */}
                        <span className="font-bold shrink-0" style={{ color: THREAT_COLORS[alert.label] || "#8b5cf6" }}>
                          {LABEL_EMOJI[alert.label] ?? "🔴"} {alert.label}
                        </span>
                        {/* IPs */}
                        <span className={isDark ? "text-cyan-400" : "text-cyan-700"}>{alert.src_ip}</span>
                        <span className={isDark ? "text-gray-500" : "text-gray-400"}>→</span>
                        <span className={isDark ? "text-purple-400" : "text-purple-600"}>{alert.dst_ip}</span>
                        {/* Protocol */}
                        <span className={`shrink-0 px-1 rounded ${isDark ? "bg-blue-900/40 text-blue-300" : "bg-blue-100 text-blue-700"}`}>
                          {alert.protocol}
                        </span>
                        {/* Confidence */}
                        <span className={isDark ? "text-gray-500" : "text-gray-400"}>{Math.round(alert.confidence)}%</span>
                        {/* Status */}
                        {alert.is_blocked && (
                          <span className={`shrink-0 ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>[BLOCKED]</span>
                        )}
                        {/* Relative time */}
                        <span className={`ml-auto shrink-0 ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                          {relTime(alert.timestamp)}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>

            {/* Right column — 1/3 */}
            <div className="space-y-5">

              {/* Protocol Breakdown */}
              <div className={`${panelClass} p-5`}>
                <h3 className={`font-bold flex items-center gap-2 mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                  <Wifi size={16} className="text-cyan-400" />
                  Protocol Breakdown
                </h3>
                {protocols.length > 0 ? (
                  <div className="space-y-3">
                    {protocols.slice(0, 6).map(([name, count]) => (
                      <ProtocolBar key={name} name={name} count={count} max={maxProto} isDark={isDark} />
                    ))}
                  </div>
                ) : (
                  <p className={`text-xs text-center py-6 ${isDark ? "text-purple-400" : "text-purple-600"}`}>Collecting data…</p>
                )}
              </div>

              {/* Active Threat Types */}
              <div className={`${panelClass} p-5`}>
                <h3 className={`font-bold flex items-center gap-2 mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                  <TrendingUp size={16} className="text-red-400" />
                  Active Threat Types
                </h3>
                {Object.keys(labelActive).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(labelActive)
                      .sort(([, a], [, b]) => b - a)
                      .map(([label, count]) => (
                        <div key={label} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm">{LABEL_EMOJI[label] ?? "❓"}</span>
                            <span className={`text-xs truncate ${isDark ? "text-purple-200" : "text-purple-800"}`}>{label}</span>
                          </div>
                          <span
                            className="text-sm font-black tabular-nums shrink-0"
                            style={{ color: THREAT_COLORS[label] || "#8b5cf6" }}
                          >
                            {count}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className={`flex flex-col items-center py-6 text-xs ${isDark ? "text-purple-400" : "text-purple-600"}`}>
                    <ShieldCheck size={24} className="mb-2 text-emerald-400 opacity-60" />
                    No active threats
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Top Attackers — horizontal list ─────────────────────────── */}
          {stats.top_sources.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`${panelClass} p-5`}
            >
              <h3 className={`font-bold flex items-center gap-2 mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                <Globe size={16} className="text-orange-400" />
                Top Attacking IPs
                <span className={`text-xs font-normal ml-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>live session totals</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {stats.top_sources.slice(0, 12).map((src, i) => (
                  <div
                    key={src.ip}
                    className={`p-3 rounded-xl border text-center ${
                      isDark
                        ? "border-orange-500/20 bg-orange-900/10"
                        : "border-orange-200 bg-orange-50"
                    }`}
                  >
                    <p className={`text-xs font-mono truncate mb-1 ${isDark ? "text-orange-300" : "text-orange-700"}`}>
                      #{i + 1} {src.ip}
                    </p>
                    <p className={`text-2xl font-black ${isDark ? "text-white" : "text-gray-900"}`}>{src.count}</p>
                    <p className={`text-xs mt-0.5 ${isDark ? "text-orange-400/70" : "text-orange-500"}`}>hits</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}
