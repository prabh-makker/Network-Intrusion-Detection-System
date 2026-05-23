"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  Brain,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { getToken, fetchWithAuth } from "@/lib/auth";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useTheme } from "@/context/ThemeContext";

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

const THREAT_COLORS: Record<string, string> = {
  DoS: "#06b6d4",
  "DDoS (Ping of Death)": "#ec4899",
  Probe: "#f59e0b",
  "U2R (Root Access)": "#ef4444",
  "R2L (Unauthorized Access)": "#8b5cf6",
};

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
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{display}</>;
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

  const apiUrl = getApiUrl();

  useEffect(() => {
    if (!getToken()) router.push("/login");
    else setAuthenticated(true);
  }, [router]);

  const blockThreats = useCallback(async (threatType?: string) => {
    try {
      setRefreshing(true);
      const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/block-all-active`, {
        method: "POST",
      });

      if (res.ok) {
        toast("success", "Threats blocked successfully!");
        // Refresh recommendations immediately to show updated counts
        setTimeout(() => fetchRecommendations(), 500);
      } else {
        toast("error", "Failed to block threats");
      }
    } catch (e) {
      console.error("Block threats error:", e);
      toast("error", "Error blocking threats");
    } finally {
      setRefreshing(false);
    }
  }, [authenticated, apiUrl, toast]);

  const fetchRecommendations = useCallback(async () => {
    if (!authenticated) return;

    try {
      setRefreshing(true);
      const res = await fetchWithAuth(`${apiUrl}/api/v1/ml/recommendations/`);
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data);
      } else {
        toast("error", "Failed to load recommendations");
      }
    } catch (e) {
      console.error("Fetch recommendations error:", e);
      toast("error", "Error loading recommendations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authenticated, apiUrl, toast]);

  useEffect(() => {
    if (!authenticated) return;
    fetchRecommendations();
    const interval = setInterval(fetchRecommendations, 5000);
    return () => clearInterval(interval);
  }, [authenticated, fetchRecommendations]);

  const pieData = recommendations?.threat_breakdown
    ? Object.entries(recommendations.threat_breakdown).map(([name, value]) => ({
        name,
        value: value as number,
      }))
    : [];

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

        {!loading && recommendations && (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Risk Assessment Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Risk Score */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border backdrop-blur-xl p-6 ${isDark ? "bg-gradient-to-br from-red-900/20 to-red-800/10 border-red-500/40" : "bg-red-50 border-red-300/60"}`}
              >
                <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? "text-red-300" : "text-red-600"}`}>
                  Risk Score
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-4xl font-black ${isDark ? "text-white" : "text-red-950"}`}>
                      <AnimatedNumber value={recommendations.risk_score} />
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? "text-red-400" : "text-red-600"}`}>out of 100</p>
                  </div>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${recommendations.risk_score > 70 ? "bg-red-500/20" : recommendations.risk_score > 40 ? "bg-yellow-500/20" : "bg-green-500/20"}`}>
                    <ShieldAlert size={28} className={recommendations.risk_score > 70 ? "text-red-400" : recommendations.risk_score > 40 ? "text-yellow-400" : "text-green-400"} />
                  </div>
                </div>
              </motion.div>

              {/* Threat Trend */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`rounded-2xl border backdrop-blur-xl p-6 ${isDark ? "bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-500/40" : "bg-purple-50 border-purple-300/60"}`}
              >
                <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? "text-purple-300" : "text-purple-600"}`}>
                  Threat Trend
                </p>
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

              {/* Top Threat */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`rounded-2xl border backdrop-blur-xl p-6 ${isDark ? "bg-gradient-to-br from-cyan-900/20 to-cyan-800/10 border-cyan-500/40" : "bg-cyan-50 border-cyan-300/60"}`}
              >
                <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? "text-cyan-300" : "text-cyan-600"}`}>
                  Top Threat
                </p>
                <div className="flex items-center justify-between">
                  <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-cyan-950"}`}>{recommendations.top_threat}</p>
                  <Target size={24} className="text-cyan-400" />
                </div>
              </motion.div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* DO NOW & DO LATER */}
              <div className="lg:col-span-2 space-y-6">
                {/* DO NOW Section */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border backdrop-blur-xl p-6 ${isDark ? "border-red-500/30 bg-gradient-to-br from-red-900/10 to-red-800/5" : "border-red-300/40 bg-red-50/30"}`}
                >
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <AlertTriangle size={24} className="text-red-400" />
                    🚨 DO NOW (Immediate Actions)
                  </h2>

                  <AnimatePresence>
                    {recommendations.immediate_actions.length > 0 ? (
                      <div className="space-y-4">
                        {recommendations.immediate_actions.map((action, idx) => {
                          const pc = getPriorityColors(isDark)[action.priority];
                          return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`rounded-xl border backdrop-blur p-4 ${pc.bg} ${pc.border} border`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${pc.badge}`}>
                                  {action.priority}
                                </span>
                                <h3 className={`text-lg font-bold mt-2 ${isDark ? "text-white" : "text-gray-900"}`}>{action.title}</h3>
                              </div>
                              <Clock size={20} className={pc.text} />
                            </div>

                            <p className={`text-sm mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                              <strong>Why dangerous:</strong> {action.why_dangerous}
                            </p>

                            <div className={`mb-3 p-2 rounded ${isDark ? "bg-black/30" : "bg-white/30"}`}>
                              <p className={`text-xs font-bold mb-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                                <strong>Active: {action.active_count}</strong> | Total: {action.total_count} | Est. time: {action.time_needed}
                              </p>
                            </div>

                            <div className="mb-4">
                              <p className={`text-xs font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>Recommended Steps:</p>
                              <ol className="space-y-1 ml-4">
                                {action.steps.slice(0, 3).map((step, i) => (
                                  <li key={i} className={`text-sm ${isDark ? "text-gray-400" : "text-gray-700"}`}>
                                    <span className="font-bold">{i + 1}.</span> {step.trim()}
                                  </li>
                                ))}
                              </ol>
                            </div>

                            {action.can_execute && (
                              <button
                                onClick={() => blockThreats(action.threat_type)}
                                disabled={refreshing}
                                className="w-full px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

                {/* DO LATER Section */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`rounded-2xl border backdrop-blur-xl p-6 ${isDark ? "border-cyan-500/30 bg-gradient-to-br from-cyan-900/10 to-cyan-800/5" : "border-cyan-300/40 bg-cyan-50/30"}`}
                >
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Clock size={24} className="text-cyan-400" />
                    📅 DO LATER (Long-term Improvements)
                  </h2>

                  <div className="grid grid-cols-1 gap-4">
                    {recommendations.future_improvements.map((imp, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + idx * 0.1 }}
                        className={`rounded-xl border backdrop-blur p-4 ${isDark ? "border-cyan-500/30 bg-cyan-500/10" : "border-cyan-300/40 bg-cyan-50/50"}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold mb-2 ${isDark ? "bg-cyan-500/20 text-cyan-300" : "bg-cyan-100 text-cyan-800"}`}>
                              {imp.category}
                            </span>
                            <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{imp.title}</h3>
                          </div>
                        </div>
                        <p className={`text-sm mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>{imp.description}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className={`px-2 py-1 rounded ${isDark ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-700"}`}>
                            ⏱️ {imp.timeline}
                          </span>
                          <span className={`px-2 py-1 rounded ${isDark ? "bg-orange-500/20 text-orange-300" : "bg-orange-100 text-orange-700"}`}>
                            💪 {imp.effort}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-6">
                {/* Threat Breakdown Chart */}
                {pieData.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className={`rounded-2xl border backdrop-blur-xl p-6 ${isDark ? "border-purple-500/30 bg-gradient-to-br from-purple-900/10 to-purple-800/5" : "border-purple-300/40 bg-purple-50/30"}`}
                  >
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <PieChartIcon size={20} className="text-purple-400" />
                      Threat Breakdown
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={THREAT_COLORS[entry.name] || "#6b7280"} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDark ? "#1f2937" : "#ffffff",
                            border: `1px solid ${isDark ? "#4b5563" : "#e5e7eb"}`,
                            borderRadius: "8px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
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
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className={`rounded-2xl border backdrop-blur-xl p-6 ${isDark ? "border-green-500/30 bg-gradient-to-br from-green-900/10 to-green-800/5" : "border-green-300/40 bg-green-50/30"}`}
                >
                  <h3 className="text-lg font-bold mb-4">Key Stats</h3>
                  <div className="space-y-3">
                    <div>
                      <p className={`text-xs font-bold uppercase ${isDark ? "text-green-300" : "text-green-600"}`}>Active Threats</p>
                      <p className={`text-2xl font-black ${isDark ? "text-white" : "text-green-950"}`}>
                        <AnimatedNumber value={recommendations.stats.active_threats} />
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs font-bold uppercase ${isDark ? "text-green-300" : "text-green-600"}`}>Blocked</p>
                      <p className={`text-2xl font-black ${isDark ? "text-white" : "text-green-950"}`}>
                        <AnimatedNumber value={recommendations.stats.blocked_threats} />
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs font-bold uppercase ${isDark ? "text-green-300" : "text-green-600"}`}>Total</p>
                      <p className={`text-2xl font-black ${isDark ? "text-white" : "text-green-950"}`}>
                        <AnimatedNumber value={recommendations.stats.total_threats} />
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        )}

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
