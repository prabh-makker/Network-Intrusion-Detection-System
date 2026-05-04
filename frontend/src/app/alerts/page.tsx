"use client";

import React, { useEffect, useState } from "react";
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
  by_label: Record<string, number>;
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
  "DDoS (Ping of Death)": "#ec4899",
  Probe: "#f59e0b",
  "U2R (Root Access)": "#ef4444",
};

const THREAT_ICONS: Record<string, React.ReactNode> = {
  DoS: <Zap size={20} />,
  "DDoS (Ping of Death)": <Skull size={20} />,
  Probe: <Radar size={20} />,
  "U2R (Root Access)": <Lock size={20} />,
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

  const filteredAlerts = alerts.filter(
    (a) =>
      a.src_ip.includes(searchTerm) ||
      a.dst_ip.includes(searchTerm) ||
      a.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full flex flex-col bg-black">
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
          {/* Stat Cards - ALWAYS VISIBLE AT TOP (STICKY) */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 50,
              marginBottom: "24px",
              width: "100%",
              backgroundColor: isDark ? "#000000" : "#000000",
              paddingBottom: "12px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "12px",
                width: "100%",
              }}
            >
              {/* Total Threats Card */}
              <div
                style={{
                  background: isDark
                    ? "linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(153, 27, 27, 0.1) 50%, rgba(127, 29, 29, 0.08) 100%)"
                    : "linear-gradient(135deg, rgba(254, 226, 226, 0.2) 0%, rgba(254, 202, 202, 0.15) 50%, rgba(252, 165, 165, 0.1) 100%)",
                  backdropFilter: "blur(20px) saturate(180%)",
                  border: "1.5px solid",
                  borderColor: isDark ? "rgba(239, 68, 68, 0.4)" : "rgba(248, 113, 113, 0.3)",
                  borderRadius: "20px",
                  padding: "20px 16px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  boxShadow: isDark
                    ? "0 0 30px rgba(220, 38, 38, 0.25), 0 0 60px rgba(220, 38, 38, 0.1), inset 0 1px 15px rgba(255, 255, 255, 0.08)"
                    : "0 0 30px rgba(248, 113, 113, 0.15), 0 0 60px rgba(248, 113, 113, 0.08), inset 0 1px 15px rgba(255, 255, 255, 0.15)",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.08) translateY(-4px)";
                  e.currentTarget.style.borderColor = isDark ? "rgba(239, 68, 68, 0.6)" : "rgba(248, 113, 113, 0.5)";
                  e.currentTarget.style.boxShadow = isDark
                    ? "0 0 40px rgba(220, 38, 38, 0.4), 0 0 80px rgba(220, 38, 38, 0.2), inset 0 1px 15px rgba(255, 255, 255, 0.12)"
                    : "0 0 40px rgba(248, 113, 113, 0.25), 0 0 80px rgba(248, 113, 113, 0.12), inset 0 1px 15px rgba(255, 255, 255, 0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1) translateY(0)";
                  e.currentTarget.style.borderColor = isDark ? "rgba(239, 68, 68, 0.4)" : "rgba(248, 113, 113, 0.3)";
                  e.currentTarget.style.boxShadow = isDark
                    ? "0 0 30px rgba(220, 38, 38, 0.25), 0 0 60px rgba(220, 38, 38, 0.1), inset 0 1px 15px rgba(255, 255, 255, 0.08)"
                    : "0 0 30px rgba(248, 113, 113, 0.15), 0 0 60px rgba(248, 113, 113, 0.08), inset 0 1px 15px rgba(255, 255, 255, 0.15)";
                }}
              >
                <div style={{ position: "absolute", top: "-50%", right: "-50%", width: "200px", height: "200px", background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
                <div style={{ fontSize: "14px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", color: isDark ? "#fca5a5" : "#dc2626", margin: "0 0 12px 0", opacity: 0.85 }}>
                  🚨 Total Threats
                </div>
                <div style={{ fontSize: "48px", fontWeight: "900", color: isDark ? "#fff" : "#1f2937", margin: "0", textShadow: isDark ? "0 2px 8px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.15)" }}>
                  {stats.total_threats}
                </div>
              </div>

              {/* Threat Type Cards */}
              {Object.entries(stats.by_label).map(([label, count]) => {
                const colors: Record<string, { glassGradient: string; borderColor: string; emoji: string }> = {
                  Benign: { glassGradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.08) 50%, rgba(4, 120, 87, 0.05) 100%)", borderColor: isDark ? "rgba(52, 211, 153, 0.4)" : "rgba(16, 185, 129, 0.3)", emoji: "✅" },
                  "Brute Force": { glassGradient: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.08) 50%, rgba(180, 83, 9, 0.05) 100%)", borderColor: isDark ? "rgba(251, 191, 36, 0.4)" : "rgba(245, 158, 11, 0.3)", emoji: "🔓" },
                  DDoS: { glassGradient: "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.08) 50%, rgba(109, 40, 217, 0.05) 100%)", borderColor: isDark ? "rgba(167, 139, 250, 0.4)" : "rgba(139, 92, 246, 0.3)", emoji: "💥" },
                  "DDoS (Ping of Death)": { glassGradient: "linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(219, 39, 119, 0.08) 50%, rgba(190, 24, 93, 0.05) 100%)", borderColor: isDark ? "rgba(244, 114, 182, 0.4)" : "rgba(236, 72, 153, 0.3)", emoji: "💀" },
                  DoS: { glassGradient: "linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(8, 145, 178, 0.08) 50%, rgba(14, 116, 144, 0.05) 100%)", borderColor: isDark ? "rgba(34, 211, 238, 0.4)" : "rgba(6, 182, 212, 0.3)", emoji: "⚡" },
                  Malware: { glassGradient: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.08) 50%, rgba(185, 28, 28, 0.05) 100%)", borderColor: isDark ? "rgba(248, 113, 113, 0.4)" : "rgba(239, 68, 68, 0.3)", emoji: "🦠" },
                  "Port Scan": { glassGradient: "linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(13, 148, 136, 0.08) 50%, rgba(15, 118, 110, 0.05) 100%)", borderColor: isDark ? "rgba(45, 212, 191, 0.4)" : "rgba(20, 184, 166, 0.3)", emoji: "🔍" },
                  Probe: { glassGradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.08) 50%, rgba(29, 78, 216, 0.05) 100%)", borderColor: isDark ? "rgba(96, 165, 250, 0.4)" : "rgba(59, 130, 246, 0.3)", emoji: "📡" },
                  "R2L (Unauthorized Access)": { glassGradient: "linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(234, 88, 12, 0.08) 50%, rgba(194, 65, 12, 0.05) 100%)", borderColor: isDark ? "rgba(251, 146, 60, 0.4)" : "rgba(249, 115, 22, 0.3)", emoji: "🚪" },
                  "SQL Injection": { glassGradient: "linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(147, 51, 234, 0.08) 50%, rgba(126, 34, 206, 0.05) 100%)", borderColor: isDark ? "rgba(216, 180, 254, 0.4)" : "rgba(168, 85, 247, 0.3)", emoji: "💉" },
                  "U2R (Root Access)": { glassGradient: "linear-gradient(135deg, rgba(255, 0, 110, 0.1) 0%, rgba(217, 3, 104, 0.08) 50%, rgba(165, 0, 71, 0.05) 100%)", borderColor: isDark ? "rgba(255, 107, 182, 0.4)" : "rgba(255, 0, 110, 0.3)", emoji: "👑" },
                };
                const color = colors[label] || { glassGradient: "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(79, 70, 229, 0.08) 50%, rgba(67, 56, 202, 0.05) 100%)", borderColor: isDark ? "rgba(129, 140, 248, 0.4)" : "rgba(99, 102, 241, 0.3)", emoji: "❓" };

                return (
                  <button
                    key={label}
                    onClick={() => {
                      setSelectedLabel(selectedLabel === label ? null : label);
                      fetchExplanation(label);
                    }}
                    style={{
                      background: color.glassGradient,
                      backdropFilter: "blur(20px) saturate(180%)",
                      border: `1.5px solid ${color.borderColor}`,
                      borderRadius: "20px",
                      padding: "18px 14px",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                      color: isDark ? "#fff" : "#1f2937",
                      fontFamily: "inherit",
                      fontSize: "13px",
                      boxShadow: selectedLabel === label
                        ? `0 0 40px ${color.borderColor}50, 0 0 20px ${color.borderColor}30, inset 0 1px 15px rgba(255,255,255,0.15)`
                        : `0 0 20px ${color.borderColor}30, inset 0 1px 15px rgba(255,255,255,0.1)`,
                      position: "relative",
                      overflow: "hidden",
                      transform: selectedLabel === label ? "scale(1.08) translateY(-4px)" : "scale(1) translateY(0)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.08) translateY(-4px)";
                      e.currentTarget.style.borderColor = color.borderColor.replace("0.4", "0.6");
                      e.currentTarget.style.boxShadow = `0 0 50px ${color.borderColor}50, 0 0 30px ${color.borderColor}30, inset 0 1px 15px rgba(255,255,255,0.2)`;
                    }}
                    onMouseLeave={(e) => {
                      if (selectedLabel !== label) {
                        e.currentTarget.style.transform = "scale(1) translateY(0)";
                        e.currentTarget.style.borderColor = color.borderColor;
                        e.currentTarget.style.boxShadow = `0 0 20px ${color.borderColor}30, inset 0 1px 15px rgba(255,255,255,0.1)`;
                      }
                    }}
                  >
                    <div style={{ position: "absolute", top: "-50%", right: "-50%", width: "200px", height: "200px", background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
                    <div style={{ fontSize: "20px", marginBottom: "6px" }}>{color.emoji}</div>
                    <div style={{ fontSize: "40px", fontWeight: "900", margin: "0 0 8px 0", textShadow: isDark ? "0 2px 8px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.15)" }}>
                      {count}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        margin: "0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        letterSpacing: "0.5px",
                        opacity: 0.9,
                      }}
                    >
                      {label}
                    </div>
                  </button>
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
                className={`relative rounded-xl border backdrop-blur-xl ${isDark ? "border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10" : "border-purple-400/20 bg-purple-950/10"}`}
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
                        className={`rounded-xl border backdrop-blur-xl p-4 transition-all group ${isDark ? "border-purple-500/30 bg-gradient-to-r from-purple-900/20 to-blue-900/10 hover:border-purple-500/50" : "border-slate-200 bg-white/70 hover:border-purple-300"} ${
                          alert.is_blocked ? "opacity-50" : ""
                        }`}
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
                              <span className="text-xs bg-purple-500/30 text-purple-200 px-2 py-1 rounded-full">
                                {alert.confidence}%
                              </span>
                              {alert.is_blocked && (
                                <span className="text-xs bg-emerald-500/30 text-emerald-300 px-2 py-1 rounded-full flex items-center gap-1">
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
              className={`rounded-2xl border backdrop-blur-xl p-6 h-fit sticky top-6 ${isDark ? "border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10" : "border-purple-400/20 bg-purple-950/10"}`}
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
                      <div key={i} className={`rounded-lg p-2 border ${isDark ? "bg-purple-900/40 border-purple-500/20" : "bg-purple-900/10 border-purple-400/20"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono text-cyan-300">{ind.feature}</span>
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
