"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Clock, Target, Brain, RefreshCw, AlertCircle, ChevronRight,
  PieChart as PieChartIcon, Globe, Zap, Ban, BarChart2, Shield,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar,
  LineChart, Line,
} from "recharts";
import { getToken, fetchWithAuth } from "@/lib/auth";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useTheme } from "@/context/ThemeContext";
import ThreatSeverityMatrix from "@/components/ThreatSeverityMatrix";
import ComplianceOverview from "@/components/ComplianceOverview";
import ActionControls from "@/components/ActionControls";
import RemediationWizard from "@/components/RemediationWizard";
import PerformanceMetrics from "@/components/PerformanceMetrics";

interface ImmediateAction {
  priority: "CRITICAL" | "HIGH" | "MEDIUM";
  threat_type: string;
  title: string;
  description: string;
  why_dangerous: string;
  active_count: number;
  total_count: number;
  top_sources: string[];
  steps: string[];
  time_needed: string;
  can_execute: boolean;
  explanation: any;
}

interface FutureImprovement {
  category: string;
  title: string;
  description: string;
  benefits: string[];
  effort: string;
  timeline: string;
  priority: number;
}

interface Recommendations {
  risk_score: number;
  risk_trend: "improving" | "stable" | "worsening";
  stats: any;
  top_threat: string;
  immediate_actions: ImmediateAction[];
  future_improvements: FutureImprovement[];
  threat_breakdown: Record<string, number>;
}

interface TimelinePoint {
  time: string;
  threats: number;
  blocked: number;
  active: number;
  traffic: number;
}

interface GeoEntry {
  country_code: string;
  threat_count: number;
  blocked_count: number;
  avg_severity: number;
  max_severity: number;
  top_threat_types: { label: string; count: number }[];
}

interface RemediationTaskItem {
  id: number;
  threat_type: string;
  action_type: string;
  status: "pending" | "in_progress" | "resolved";
  due_date: string;
  severity: string;
  assigned_to?: string;
}

const DEFAULT_POLICIES = [
  { id: "ddos-block",  label: "Auto-block DDoS",       threat: "DDoS",  threshold: 50,  action: "block", enabled: true  },
  { id: "u2r-alert",  label: "Alert on Root Access",   threat: "U2R",   threshold: 1,   action: "alert", enabled: true  },
  { id: "probe-log",  label: "Log all Probe activity", threat: "Probe", threshold: 10,  action: "log",   enabled: false },
  { id: "dos-rate",   label: "Rate-limit DoS sources", threat: "DoS",   threshold: 100, action: "limit", enabled: true  },
];

const THREAT_COLORS: Record<string, string> = {
  DoS: "#06b6d4",
  DDoS: "#d97706",
  "DDoS (Ping of Death)": "#ec4899",
  Probe: "#f59e0b",
  "U2R (Root Access)": "#ef4444",
  "R2L (Unauthorized Access)": "#8b5cf6",
};

const GEO_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#06b6d4", "#8b5cf6", "#10b981", "#ec4899", "#64748b", "#84cc16", "#6366f1"];

const getPriorityColors = (isDark: boolean) => ({
  CRITICAL: {
    bg: isDark ? "bg-red-900/30" : "bg-red-50",
    border: isDark ? "border-red-500/50" : "border-red-400/60",
    text: isDark ? "text-red-400" : "text-red-700",
    badge: isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-800",
  },
  HIGH: {
    bg: isDark ? "bg-orange-900/30" : "bg-orange-50",
    border: isDark ? "border-orange-500/50" : "border-orange-400/60",
    text: isDark ? "text-orange-400" : "text-orange-700",
    badge: isDark ? "bg-orange-500/20 text-orange-400" : "bg-orange-100 text-orange-800",
  },
  MEDIUM: {
    bg: isDark ? "bg-yellow-900/30" : "bg-yellow-50",
    border: isDark ? "border-yellow-500/50" : "border-yellow-400/60",
    text: isDark ? "text-yellow-400" : "text-yellow-700",
    badge: isDark ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-800",
  },
});

function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.max(1, Math.ceil(value / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{display}</>;
}

function VelocityBadge({ current, previous, isDark }: { current: number; previous: number; isDark: boolean }) {
  const delta = current - previous;
  if (delta > 2) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400">
      <TrendingUp size={10} /> +{delta}/min
    </span>
  );
  if (delta < -2) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/20 text-green-400">
      <TrendingDown size={10} /> {delta}/min
    </span>
  );
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${isDark ? "bg-gray-500/20 text-gray-400" : "bg-gray-200 text-gray-600"}`}>
      → steady
    </span>
  );
}

export default function RecommendationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [blockingAll, setBlockingAll] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [timelineData, setTimelineData] = useState<TimelinePoint[]>([]);
  const [geoData, setGeoData] = useState<GeoEntry[]>([]);
  const prevCounts = useRef<Record<string, number>>({});
  const [showWizard, setShowWizard] = useState(false);

  // R1 — risk score sparkline history
  const [riskSparkData, setRiskSparkData] = useState<{t: number; score: number}[]>([]);
  // R2 — per-threat velocity sparkline history
  const [threatSparkData, setThreatSparkData] = useState<Record<string, number[]>>({});
  // R3 — auto-response policies
  const [policies, setPolicies] = useState(DEFAULT_POLICIES);
  const [showPolicies, setShowPolicies] = useState(false);
  // R4 — remediation tasks
  const [remediationTasks, setRemediationTasks] = useState<RemediationTaskItem[]>([]);
  // R5 — system status
  const [systemStatus, setSystemStatus] = useState({ modelVersion: "—", backendOnline: false, lastRefresh: "—", latencyMs: 0 });

  const apiUrl = getApiUrl();

  useEffect(() => {
    if (!getToken()) router.push("/login");
    else setAuthenticated(true);
  }, [router]);

  const blockThreats = useCallback(async (threatType?: string) => {
    try {
      setRefreshing(true);
      const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/block-all-active`, { method: "POST" });
      if (res.ok) {
        toast("success", threatType ? `${threatType} threats blocked!` : "All threats blocked!");
        setTimeout(() => fetchRecommendations(), 500);
      } else {
        toast("error", "Failed to block threats");
      }
    } catch (e) {
      toast("error", "Error blocking threats");
    } finally {
      setRefreshing(false);
    }
  }, [authenticated, apiUrl, toast]);

  const blockAllCritical = useCallback(async () => {
    setBlockingAll(true);
    setShowBlockConfirm(false);
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/block-all-active`, { method: "POST" });
      if (res.ok) {
        toast("success", "All critical threats blocked!");
        setTimeout(() => fetchRecommendations(), 500);
      } else {
        toast("error", "Failed to block critical threats");
      }
    } catch (e) {
      toast("error", "Error blocking threats");
    } finally {
      setBlockingAll(false);
    }
  }, [apiUrl, toast]);

  const fetchRecommendations = useCallback(async () => {
    if (!authenticated) return;
    try {
      setRefreshing(true);
      const res = await fetchWithAuth(`${apiUrl}/api/v1/ml/recommendations/`);
      if (res.ok) {
        const data = await res.json();
        // Save previous counts for velocity badges
        if (recommendations) {
          const newPrev: Record<string, number> = {};
          recommendations.immediate_actions.forEach(a => { newPrev[a.threat_type] = a.active_count; });
          prevCounts.current = newPrev;
        }
        setRecommendations(data);
        // R1 — push to risk score sparkline (10-point ring buffer)
        setRiskSparkData(prev => [...prev, { t: Date.now(), score: data.risk_score }].slice(-10));
        // R2 — push to per-threat velocity sparklines (8-point ring buffer)
        setThreatSparkData(prev => {
          const next = { ...prev };
          data.immediate_actions.forEach((a: ImmediateAction) => {
            next[a.threat_type] = [...(next[a.threat_type] ?? []), a.active_count].slice(-8);
          });
          return next;
        });
      } else {
        toast("error", "Failed to load recommendations");
      }
    } catch (e) {
      toast("error", "Error loading recommendations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authenticated, apiUrl, toast, recommendations]);

  const fetchTimeline = useCallback(async () => {
    if (!authenticated) return;
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/timeline?range=24h`);
      if (res.ok) setTimelineData(await res.json());
    } catch {}
  }, [authenticated, apiUrl]);

  const fetchGeo = useCallback(async () => {
    if (!authenticated) return;
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/v1/analytics/geo`);
      if (res.ok) setGeoData(await res.json());
    } catch {}
  }, [authenticated, apiUrl]);

  // R4 — fetch remediation task list
  const fetchRemediationTasks = useCallback(async () => {
    if (!authenticated) return;
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/v1/remediation/tasks`);
      if (res.ok) setRemediationTasks(await res.json());
    } catch {}
  }, [authenticated, apiUrl]);

  // R3 — toggle auto-response policy
  const togglePolicy = async (id: string, enabled: boolean) => {
    setPolicies(prev => prev.map(p => p.id === id ? { ...p, enabled } : p));
    try {
      await fetchWithAuth(`${apiUrl}/api/v1/actions/auto-respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policy_id: id, enabled }),
      });
    } catch {}
  };

  useEffect(() => {
    if (!authenticated) return;
    fetchRecommendations();
    fetchTimeline();
    fetchGeo();
    fetchRemediationTasks();
    const interval           = setInterval(fetchRecommendations, 10000);
    const timelineInterval   = setInterval(fetchTimeline, 30000);
    const geoInterval        = setInterval(fetchGeo, 60000);
    const remediationInterval = setInterval(fetchRemediationTasks, 30000);
    return () => {
      clearInterval(interval);
      clearInterval(timelineInterval);
      clearInterval(geoInterval);
      clearInterval(remediationInterval);
    };
  }, [authenticated]);

  // R5 — system status polling
  useEffect(() => {
    if (!authenticated) return;
    const checkStatus = async () => {
      const t0 = Date.now();
      try {
        const res = await fetchWithAuth(`${apiUrl}/api/v1/models/metrics`);
        const ms  = Date.now() - t0;
        if (res.ok) {
          const data = await res.json();
          setSystemStatus({ modelVersion: data.accuracy?.model_source ?? data.model?.type ?? "v?", backendOnline: true, lastRefresh: new Date().toLocaleTimeString(), latencyMs: ms });
        } else {
          setSystemStatus(prev => ({ ...prev, backendOnline: false, lastRefresh: new Date().toLocaleTimeString() }));
        }
      } catch {
        setSystemStatus(prev => ({ ...prev, backendOnline: false, lastRefresh: new Date().toLocaleTimeString() }));
      }
    };
    checkStatus();
    const iv = setInterval(checkStatus, 30000);
    return () => clearInterval(iv);
  }, [authenticated, apiUrl]);

  const pieData = recommendations?.threat_breakdown
    ? Object.entries(recommendations.threat_breakdown).map(([name, value]) => ({ name, value: value as number }))
    : [];

  const criticalCount = recommendations?.immediate_actions.filter(a => a.priority === "CRITICAL").length ?? 0;
  const topGeo = geoData.slice(0, 8);
  const maxGeoCount = topGeo[0]?.threat_count ?? 1;

  const getTrendIcon = () => {
    if (recommendations?.risk_trend === "worsening") return <TrendingUp size={24} className="text-red-400" />;
    if (recommendations?.risk_trend === "improving") return <TrendingDown size={24} className="text-green-400" />;
    return <AlertCircle size={24} className="text-yellow-400" />;
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      <div className="relative z-10 px-6 py-6">

        {/* Header */}
        <div className={`mb-8 border-b backdrop-blur-xl px-6 py-6 -mx-6 ${isDark ? "border-purple-500/20 bg-gradient-to-r from-purple-900/10 via-transparent to-blue-900/10" : "border-purple-400/20 bg-purple-950/5"}`}>
          <div className="max-w-7xl mx-auto flex justify-between items-start">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 flex items-center gap-3"
              >
                <Brain size={36} /> AI Security Advisor
              </motion.h1>
              <p className={`mt-2 text-sm ${isDark ? "text-purple-200" : "text-purple-800"}`}>
                Real-time threat analysis and personalized security recommendations
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {/* R5 — System status pills */}
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${systemStatus.backendOnline ? "bg-green-500/15 text-green-400 border border-green-500/20" : "bg-red-500/15 text-red-400 border border-red-500/20"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${systemStatus.backendOnline ? "bg-green-400" : "bg-red-400"} animate-pulse`} />
                  {systemStatus.backendOnline ? `Backend ✓ ${systemStatus.latencyMs}ms` : "✗ Offline"}
                </span>
                {systemStatus.modelVersion !== "—" && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/20">
                    <Brain size={10} /> {systemStatus.modelVersion}
                  </span>
                )}
                {systemStatus.lastRefresh !== "—" && (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isDark ? "bg-white/5 text-gray-400 border border-white/10" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                    {systemStatus.lastRefresh}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowWizard(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-500/20 to-indigo-500/20 hover:from-purple-500/40 hover:to-indigo-500/40 border border-purple-500/30 text-purple-300 text-sm font-semibold transition-all"
                >
                  + New Task
                </motion.button>
                <motion.button
                  whileHover={{ rotate: 180 }}
                  onClick={fetchRecommendations}
                  disabled={refreshing}
                  className="p-3 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/40 hover:to-blue-500/40 border border-cyan-500/30 text-cyan-400 transition-all disabled:opacity-50"
                >
                  <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {!loading && recommendations && (
          <div className="max-w-7xl mx-auto space-y-6">

            {/* ── Risk Assessment Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border backdrop-blur-xl p-6 ${isDark ? "bg-gradient-to-br from-red-900/20 to-red-800/10 border-red-500/40" : "bg-red-50 border-red-300/60"}`}>
                <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? "text-red-300" : "text-red-600"}`}>Risk Score</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-4xl font-black ${isDark ? "text-white" : "text-red-950"}`}><AnimatedNumber value={recommendations.risk_score} /></p>
                    <p className={`text-xs mt-1 ${isDark ? "text-red-400" : "text-red-600"}`}>out of 100</p>
                  </div>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${recommendations.risk_score > 70 ? "bg-red-500/20" : recommendations.risk_score > 40 ? "bg-yellow-500/20" : "bg-green-500/20"}`}>
                    <ShieldAlert size={28} className={recommendations.risk_score > 70 ? "text-red-400" : recommendations.risk_score > 40 ? "text-yellow-400" : "text-green-400"} />
                  </div>
                </div>
                {/* R1 — Risk score sparkline */}
                {riskSparkData.length > 1 && (
                  <div className="mt-3 -mx-1">
                    <ResponsiveContainer width="100%" height={36}>
                      <LineChart data={riskSparkData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                        <Line type="monotone" dataKey="score" stroke={recommendations.risk_score > 70 ? "#ef4444" : recommendations.risk_score > 40 ? "#f59e0b" : "#10b981"}
                          strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className={`text-xs text-center -mt-1 ${isDark ? "text-red-400/50" : "text-red-400"}`}>last {riskSparkData.length} readings</p>
                  </div>
                )}
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className={`rounded-2xl border backdrop-blur-xl p-6 ${isDark ? "bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-500/40" : "bg-purple-50 border-purple-300/60"}`}>
                <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? "text-purple-300" : "text-purple-600"}`}>Threat Trend</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-2xl font-bold capitalize ${recommendations.risk_trend === "worsening" ? "text-red-400" : recommendations.risk_trend === "improving" ? "text-green-400" : "text-yellow-400"}`}>
                      {recommendations.risk_trend}
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? "text-purple-400" : "text-purple-600"}`}>last 5 minutes</p>
                  </div>
                  {getTrendIcon()}
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className={`rounded-2xl border backdrop-blur-xl p-6 ${isDark ? "bg-gradient-to-br from-cyan-900/20 to-cyan-800/10 border-cyan-500/40" : "bg-cyan-50 border-cyan-300/60"}`}>
                <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? "text-cyan-300" : "text-cyan-600"}`}>Top Threat</p>
                <div className="flex items-center justify-between">
                  <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-cyan-950"}`}>{recommendations.top_threat}</p>
                  <Target size={24} className="text-cyan-400" />
                </div>
              </motion.div>
            </div>

            {/* ── Action Controls ── */}
            <ActionControls
              threatCount={recommendations.stats.active_threats}
              onActionComplete={fetchRecommendations}
            />

            {/* ── R3: Auto-Response Policies ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border backdrop-blur-xl overflow-hidden ${isDark ? "border-indigo-500/20 bg-gradient-to-br from-indigo-900/10 to-purple-900/5" : "border-indigo-300/30 bg-indigo-50/30"}`}>
              <button
                onClick={() => setShowPolicies(v => !v)}
                className={`w-full flex items-center justify-between px-6 py-4 text-left transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-black/5"}`}
              >
                <div className="flex items-center gap-3">
                  <Zap size={18} className="text-indigo-400" />
                  <span className={`font-bold text-sm ${isDark ? "text-indigo-200" : "text-indigo-800"}`}>Auto-Response Policies</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isDark ? "bg-indigo-500/20 text-indigo-400" : "bg-indigo-100 text-indigo-700"}`}>
                    {policies.filter(p => p.enabled).length}/{policies.length} active
                  </span>
                </div>
                <ChevronRight size={16} className={`text-gray-400 transition-transform ${showPolicies ? "rotate-90" : ""}`} />
              </button>
              <AnimatePresence>
                {showPolicies && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={`px-6 pb-4 pt-1 border-t ${isDark ? "border-white/10" : "border-indigo-200/50"}`}>
                      <div className="space-y-2">
                        {policies.map(policy => (
                          <div key={policy.id}
                            className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? "border-white/10 bg-white/3" : "border-gray-200 bg-white/80"}`}>
                            <div className="flex-1">
                              <p className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{policy.label}</p>
                              <p className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                {policy.threat} · {policy.action} when &gt;{policy.threshold} events
                              </p>
                            </div>
                            <button
                              onClick={() => togglePolicy(policy.id, !policy.enabled)}
                              className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 ${policy.enabled ? "bg-indigo-500" : isDark ? "bg-white/20" : "bg-gray-300"}`}
                            >
                              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${policy.enabled ? "left-5" : "left-0.5"}`} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ── R4: Remediation Task List ── */}
            {remediationTasks.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border backdrop-blur-xl overflow-hidden ${isDark ? "border-teal-500/20 bg-gradient-to-br from-teal-900/10 to-emerald-900/5" : "border-teal-300/30 bg-teal-50/30"}`}>
                <div className={`px-6 py-4 border-b ${isDark ? "border-white/10" : "border-teal-200/50"} flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <Shield size={18} className="text-teal-400" />
                    <span className={`font-bold text-sm ${isDark ? "text-teal-200" : "text-teal-800"}`}>Remediation Tasks</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isDark ? "bg-teal-500/20 text-teal-400" : "bg-teal-100 text-teal-700"}`}>
                      {remediationTasks.length} tasks
                    </span>
                  </div>
                  <motion.button whileHover={{ scale: 1.03 }} onClick={() => setShowWizard(true)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-500/20 to-emerald-500/20 border border-teal-500/30 text-teal-400 font-bold hover:from-teal-500/40">
                    + New Task
                  </motion.button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className={isDark ? "bg-white/3 text-white/50" : "bg-teal-50 text-teal-600"}>
                        <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider">Threat</th>
                        <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider">Action</th>
                        <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider">Status</th>
                        <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider">Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {remediationTasks.slice(0, 5).map((task, idx) => (
                        <tr key={task.id} className={`border-t ${isDark ? "border-white/5" : "border-teal-100"}`}>
                          <td className={`px-4 py-2.5 font-mono font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{task.threat_type}</td>
                          <td className={`px-4 py-2.5 capitalize ${isDark ? "text-gray-300" : "text-gray-700"}`}>{task.action_type}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                              task.status === "resolved"   ? "bg-green-500/20 text-green-400"  :
                              task.status === "in_progress" ? "bg-blue-500/20 text-blue-400"   :
                              "bg-yellow-500/20 text-yellow-400"
                            }`}>
                              {task.status === "in_progress" ? "🔵 in progress" : task.status === "resolved" ? "🟢 resolved" : "🟡 pending"}
                            </span>
                          </td>
                          <td className={`px-4 py-2.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{task.due_date?.slice(0, 10) ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* ── 24h Threat Timeline Chart ── */}
            {timelineData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className={`rounded-2xl border backdrop-blur-xl p-6 ${isDark ? "border-blue-500/30 bg-gradient-to-br from-blue-900/10 to-indigo-900/5" : "border-blue-300/40 bg-blue-50/30"}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <BarChart2 size={20} className="text-blue-400" />
                    24h Threat Timeline
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700"}`}>
                    Last 24 hours · hourly
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={timelineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="threatGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="blockedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#ffffff10" : "#00000010"} />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: isDark ? "#9ca3af" : "#6b7280" }} interval={3} />
                    <YAxis tick={{ fontSize: 10, fill: isDark ? "#9ca3af" : "#6b7280" }} />
                    <Tooltip contentStyle={{ backgroundColor: isDark ? "#1f2937" : "#fff", border: "1px solid #4b5563", borderRadius: "8px", fontSize: 12 }} />
                    <Area type="monotone" dataKey="threats" stroke="#ef4444" strokeWidth={2} fill="url(#threatGrad)" name="Threats" />
                    <Area type="monotone" dataKey="blocked" stroke="#10b981" strokeWidth={2} fill="url(#blockedGrad)" name="Blocked" />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-red-400 inline-block" /> Threats</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-green-400 inline-block" /> Blocked</span>
                </div>
              </motion.div>
            )}

            {/* ── Threat Severity Matrix ── */}
            <ThreatSeverityMatrix />

            {/* ── Main Content Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* LEFT: DO NOW + DO LATER */}
              <div className="lg:col-span-2 space-y-6">

                {/* DO NOW */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border backdrop-blur-xl p-6 ${isDark ? "border-red-500/30 bg-gradient-to-br from-red-900/10 to-red-800/5" : "border-red-300/40 bg-red-50/30"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <AlertTriangle size={24} className="text-red-400" />
                      🚨 DO NOW (Immediate Actions)
                    </h2>
                    {/* Block All Critical button */}
                    {criticalCount > 0 && (
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setShowBlockConfirm(true)}
                        disabled={blockingAll}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-all disabled:opacity-50 shadow-lg shadow-red-900/30"
                      >
                        <Ban size={16} />
                        {blockingAll ? "Blocking..." : `Block All ${criticalCount} Critical`}
                      </motion.button>
                    )}
                  </div>

                  {/* Confirm modal */}
                  <AnimatePresence>
                    {showBlockConfirm && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        className={`mb-4 p-4 rounded-xl border ${isDark ? "border-red-500/50 bg-red-900/30" : "border-red-400/60 bg-red-50"}`}>
                        <p className="font-bold text-red-400 mb-3">⚠️ Block all {criticalCount} critical threat sources now?</p>
                        <div className="flex gap-2">
                          <button onClick={blockAllCritical} className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold">Confirm Block All</button>
                          <button onClick={() => setShowBlockConfirm(false)} className={`px-4 py-1.5 rounded-lg text-sm font-bold ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"}`}>Cancel</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {recommendations.immediate_actions.length > 0 ? (
                      <div className="space-y-4">
                        {recommendations.immediate_actions.map((action, idx) => {
                          const pc = getPriorityColors(isDark)[action.priority];
                          const prevCount = prevCounts.current[action.threat_type] ?? action.active_count;
                          return (
                            <motion.div key={idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}
                              className={`rounded-xl border backdrop-blur p-4 ${pc.bg} ${pc.border} border`}>
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${pc.badge}`}>{action.priority}</span>
                                    {/* Velocity badge */}
                                    <VelocityBadge current={action.active_count} previous={prevCount} isDark={isDark} />
                                  </div>
                                  <h3 className={`text-lg font-bold mt-2 ${isDark ? "text-white" : "text-gray-900"}`}>{action.title}</h3>
                                </div>
                                <Clock size={20} className={pc.text} />
                              </div>

                              <p className={`text-sm mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                <strong>Why dangerous:</strong> {action.why_dangerous}
                              </p>

                              <div className={`mb-3 p-2 rounded ${isDark ? "bg-black/30" : "bg-white/30"}`}>
                                <p className={`text-xs font-bold ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                                  <strong>Active: {action.active_count}</strong> | Total: {action.total_count} | Est. time: {action.time_needed}
                                </p>
                                {/* R2 — Per-card velocity sparkline */}
                                {(threatSparkData[action.threat_type]?.length ?? 0) > 1 && (
                                  <div className="mt-1.5 -mx-0.5">
                                    <ResponsiveContainer width="100%" height={24}>
                                      <LineChart data={(threatSparkData[action.threat_type] ?? []).map((v, i) => ({ v, i }))}
                                        margin={{ top: 1, right: 1, left: 1, bottom: 1 }}>
                                        <Line type="monotone" dataKey="v"
                                          stroke={action.priority === "CRITICAL" ? "#ef4444" : "#f97316"}
                                          strokeWidth={1.5} dot={false} isAnimationActive={false} />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                                )}
                              </div>

                              <div className="mb-3">
                                <p className={`text-xs font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>Recommended Steps:</p>
                                <ol className="space-y-1 ml-4">
                                  {action.steps.slice(0, 3).map((step, i) => (
                                    <li key={i} className={`text-sm ${isDark ? "text-gray-400" : "text-gray-700"}`}>
                                      <span className="font-bold">{i + 1}.</span> {step.trim()}
                                    </li>
                                  ))}
                                </ol>
                              </div>

                              {/* Top Source IPs — the data was always there, now displayed */}
                              {action.top_sources && action.top_sources.length > 0 && (
                                <div className={`mb-4 p-3 rounded-lg ${isDark ? "bg-black/20" : "bg-white/40"}`}>
                                  <p className={`text-xs font-bold mb-2 flex items-center gap-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                                    <Globe size={12} /> Top Attack Sources
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {action.top_sources.slice(0, 5).map((ip, i) => (
                                      <span key={i} className={`text-xs font-mono px-2 py-1 rounded flex items-center gap-1 ${isDark ? "bg-red-900/40 text-red-300 border border-red-500/30" : "bg-red-50 text-red-700 border border-red-200"}`}>
                                        <Zap size={10} /> {ip}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {action.can_execute && (
                                <button
                                  onClick={() => blockThreats(action.threat_type)}
                                  disabled={refreshing}
                                  className="w-full px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                  ⚡ {refreshing ? "SECURING..." : "SECURE NOW"}
                                  {!refreshing && <ChevronRight size={16} />}
                                </button>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={`text-center py-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        <CheckCircle2 size={32} className="mx-auto mb-2 text-green-400" />
                        <p>No immediate threats detected. System is secure!</p>
                      </div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* DO LATER */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className={`rounded-2xl border backdrop-blur-xl p-6 ${isDark ? "border-cyan-500/30 bg-gradient-to-br from-cyan-900/10 to-cyan-800/5" : "border-cyan-300/40 bg-cyan-50/30"}`}>
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Clock size={24} className="text-cyan-400" />
                    📅 DO LATER (Long-term Improvements)
                  </h2>
                  <div className="grid grid-cols-1 gap-4">
                    {recommendations.future_improvements.map((imp, idx) => (
                      <motion.div key={idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + idx * 0.1 }}
                        className={`rounded-xl border backdrop-blur p-4 ${isDark ? "border-cyan-500/30 bg-cyan-500/10" : "border-cyan-300/40 bg-cyan-50/50"}`}>
                        <div className="mb-2">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-bold mb-2 ${isDark ? "bg-cyan-500/20 text-cyan-300" : "bg-cyan-100 text-cyan-800"}`}>{imp.category}</span>
                          <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{imp.title}</h3>
                        </div>
                        <p className={`text-sm mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>{imp.description}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className={`px-2 py-1 rounded ${isDark ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-700"}`}>⏱️ {imp.timeline}</span>
                          <span className={`px-2 py-1 rounded ${isDark ? "bg-orange-500/20 text-orange-300" : "bg-orange-100 text-orange-700"}`}>💪 {imp.effort}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* RIGHT SIDEBAR */}
              <div className="space-y-6">
                {/* Threat Breakdown Pie */}
                {pieData.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className={`rounded-2xl border backdrop-blur-xl p-6 ${isDark ? "border-purple-500/30 bg-gradient-to-br from-purple-900/10 to-purple-800/5" : "border-purple-300/40 bg-purple-50/30"}`}>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <PieChartIcon size={20} className="text-purple-400" />
                      Threat Breakdown
                    </h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={THREAT_COLORS[entry.name] || "#6b7280"} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: isDark ? "#1f2937" : "#fff", border: "1px solid #4b5563", borderRadius: "8px", fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-3 space-y-1.5">
                      {pieData.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: THREAT_COLORS[item.name] || "#6b7280" }} />
                            <span className={isDark ? "text-gray-300" : "text-gray-700"}>{item.name}</span>
                          </div>
                          <span className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Key Stats */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                  className={`rounded-2xl border backdrop-blur-xl p-6 ${isDark ? "border-green-500/30 bg-gradient-to-br from-green-900/10 to-green-800/5" : "border-green-300/40 bg-green-50/30"}`}>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Shield size={20} className="text-green-400" />
                    Key Stats
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className={`text-xs font-bold uppercase ${isDark ? "text-green-300" : "text-green-600"}`}>Active Threats</p>
                      <p className={`text-2xl font-black ${isDark ? "text-white" : "text-green-950"}`}><AnimatedNumber value={recommendations.stats.active_threats} /></p>
                    </div>
                    <div>
                      <p className={`text-xs font-bold uppercase ${isDark ? "text-green-300" : "text-green-600"}`}>Blocked</p>
                      <p className={`text-2xl font-black ${isDark ? "text-white" : "text-green-950"}`}><AnimatedNumber value={recommendations.stats.blocked_threats} /></p>
                    </div>
                    <div>
                      <p className={`text-xs font-bold uppercase ${isDark ? "text-green-300" : "text-green-600"}`}>Total</p>
                      <p className={`text-2xl font-black ${isDark ? "text-white" : "text-green-950"}`}><AnimatedNumber value={recommendations.stats.total_threats} /></p>
                    </div>
                  </div>
                </motion.div>

                {/* GeoIP Top Sources */}
                {topGeo.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                    className={`rounded-2xl border backdrop-blur-xl p-6 ${isDark ? "border-orange-500/30 bg-gradient-to-br from-orange-900/10 to-orange-800/5" : "border-orange-300/40 bg-orange-50/30"}`}>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Globe size={20} className="text-orange-400" />
                      Top Attack Origins
                    </h3>
                    <div className="space-y-2">
                      {topGeo.map((geo, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-bold font-mono ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                              🌍 {geo.country_code}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>{geo.threat_count} threats</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                geo.avg_severity > 7 ? "bg-red-500/20 text-red-400" :
                                geo.avg_severity > 4 ? "bg-yellow-500/20 text-yellow-400" :
                                "bg-green-500/20 text-green-400"
                              }`}>
                                {geo.avg_severity.toFixed(1)}
                              </span>
                            </div>
                          </div>
                          <div className={`w-full h-1.5 rounded-full ${isDark ? "bg-white/10" : "bg-black/10"}`}>
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${(geo.threat_count / maxGeoCount) * 100}%`,
                                backgroundColor: GEO_COLORS[idx % GEO_COLORS.length],
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className={`text-xs mt-3 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Score = avg CVSS severity</p>
                  </motion.div>
                )}

                {/* Detection Performance (MTTD/MTTR) */}
                <PerformanceMetrics />

                {/* Compliance Alignment */}
                <ComplianceOverview />
              </div>
            </div>
          </div>
        )}

        {/* ── Remediation Wizard Modal ── */}
        <RemediationWizard isOpen={showWizard} onClose={() => setShowWizard(false)} />

        {loading && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Brain size={48} className="animate-pulse mx-auto mb-4 text-purple-400" />
              <p className={isDark ? "text-gray-400" : "text-gray-600"}>Analyzing your network threats...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
