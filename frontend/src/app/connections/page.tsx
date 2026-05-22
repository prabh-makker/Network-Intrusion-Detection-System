"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Radio,
  Activity,
  Globe,
  Server,
  Wifi,
  Zap,
  RefreshCw,
  Filter,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { getApiUrl } from "@/lib/api";
import { fetchWithAuth, getToken } from "@/lib/auth";

interface Connection {
  id: string;
  src_ip: string;
  dst_ip: string;
  protocol: string;
  label: string;
  confidence: number;
  timestamp: string;
  is_blocked: boolean;
}

export default function ActiveConnectionsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const apiUrl = getApiUrl();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [protocolFilter, setProtocolFilter] = useState<string>("all");
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (!getToken()) router.push("/login");
    else setAuthenticated(true);
  }, [router]);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/recent?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setConnections(data);
      }
    } catch (e) {
      console.error("fetchConnections failed:", e);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    if (!authenticated) return;
    fetchConnections();
    const interval = setInterval(fetchConnections, 5000);
    return () => clearInterval(interval);
  }, [authenticated, fetchConnections]);

  const filteredConnections =
    protocolFilter === "all"
      ? connections
      : connections.filter((c) => c.protocol.toUpperCase() === protocolFilter.toUpperCase());

  const protocols = ["all", ...Array.from(new Set(connections.map((c) => c.protocol.toUpperCase())))];
  const activeCount = connections.filter((c) => !c.is_blocked).length;
  const blockedCount = connections.filter((c) => c.is_blocked).length;
  const threatCount = connections.filter((c) => c.label !== "Normal").length;

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push("/dashboard")}
              className={`flex items-center gap-2 mb-3 text-sm ${isDark ? "text-purple-300 hover:text-purple-200" : "text-purple-700 hover:text-purple-900"}`}
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-400 to-blue-400 flex items-center gap-3">
              <Radio size={32} />
              Active Connections
            </h1>
            <p className={`mt-2 text-sm ${isDark ? "text-purple-200" : "text-purple-800"}`}>
              Real-time network connection monitoring · Updates every 5 seconds
            </p>
          </div>
          <button
            onClick={fetchConnections}
            className="p-3 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/40 hover:to-blue-500/40 border border-cyan-500/30 text-cyan-400 transition-all"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl ${isDark ? "border border-cyan-500/30 bg-gradient-to-br from-cyan-900/20 to-blue-900/10" : "border border-cyan-400/20 bg-cyan-50/30"} backdrop-blur-xl`}
          >
            <div className="flex items-center justify-between mb-2">
              <Wifi size={20} className="text-cyan-400" />
              <span className="text-xs text-cyan-400 font-mono">LIVE</span>
            </div>
            <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-purple-950"}`}>
              {connections.length}
            </p>
            <p className={`text-xs ${isDark ? "text-cyan-300" : "text-cyan-700"}`}>Total Connections</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`p-4 rounded-xl ${isDark ? "border border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 to-green-900/10" : "border border-emerald-400/20 bg-emerald-50/30"} backdrop-blur-xl`}
          >
            <div className="flex items-center justify-between mb-2">
              <Activity size={20} className="text-emerald-400" />
              <span className="text-xs text-emerald-400 font-mono">ACTIVE</span>
            </div>
            <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-purple-950"}`}>
              {activeCount}
            </p>
            <p className={`text-xs ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>Active Now</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`p-4 rounded-xl ${isDark ? "border border-red-500/30 bg-gradient-to-br from-red-900/20 to-pink-900/10" : "border border-red-400/20 bg-red-50/30"} backdrop-blur-xl`}
          >
            <div className="flex items-center justify-between mb-2">
              <Zap size={20} className="text-red-400" />
              <span className="text-xs text-red-400 font-mono">THREATS</span>
            </div>
            <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-purple-950"}`}>
              {threatCount}
            </p>
            <p className={`text-xs ${isDark ? "text-red-300" : "text-red-700"}`}>Malicious</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`p-4 rounded-xl ${isDark ? "border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10" : "border border-purple-400/20 bg-purple-50/30"} backdrop-blur-xl`}
          >
            <div className="flex items-center justify-between mb-2">
              <Server size={20} className="text-purple-400" />
              <span className="text-xs text-purple-400 font-mono">BLOCKED</span>
            </div>
            <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-purple-950"}`}>
              {blockedCount}
            </p>
            <p className={`text-xs ${isDark ? "text-purple-300" : "text-purple-700"}`}>Quarantined</p>
          </motion.div>
        </div>

        {/* Protocol Filter */}
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <Filter size={16} className={isDark ? "text-purple-300" : "text-purple-700"} />
          <span className={`text-sm font-semibold ${isDark ? "text-purple-200" : "text-purple-800"}`}>Filter by protocol:</span>
          {protocols.map((p) => (
            <button
              key={p}
              onClick={() => setProtocolFilter(p)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                protocolFilter === p
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30"
                  : isDark
                    ? "border border-purple-500/30 text-purple-300 hover:border-purple-500/60"
                    : "border border-purple-400/30 text-purple-700 hover:bg-purple-100"
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Connections Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl overflow-hidden ${isDark ? "border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/10" : "border border-purple-400/20 bg-purple-950/10"} backdrop-blur-xl`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${isDark ? "border-purple-500/20" : "border-purple-400/20"}`}>
                  <th className={`text-left py-3 px-4 font-medium ${isDark ? "text-purple-300" : "text-purple-800"}`}>Time</th>
                  <th className={`text-left py-3 px-4 font-medium ${isDark ? "text-purple-300" : "text-purple-800"}`}>Source IP</th>
                  <th className={`text-left py-3 px-4 font-medium ${isDark ? "text-purple-300" : "text-purple-800"}`}>Destination</th>
                  <th className={`text-left py-3 px-4 font-medium ${isDark ? "text-purple-300" : "text-purple-800"}`}>Protocol</th>
                  <th className={`text-left py-3 px-4 font-medium ${isDark ? "text-purple-300" : "text-purple-800"}`}>Type</th>
                  <th className={`text-left py-3 px-4 font-medium ${isDark ? "text-purple-300" : "text-purple-800"}`}>Confidence</th>
                  <th className={`text-left py-3 px-4 font-medium ${isDark ? "text-purple-300" : "text-purple-800"}`}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredConnections.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={`py-8 text-center ${isDark ? "text-purple-300" : "text-purple-700"}`}>
                      {loading ? "Loading connections..." : "No active connections"}
                    </td>
                  </tr>
                ) : (
                  filteredConnections.map((conn) => (
                    <tr
                      key={conn.id}
                      className={`border-b transition-colors ${isDark ? "border-purple-500/10 hover:bg-purple-500/10" : "border-purple-400/10 hover:bg-purple-500/5"}`}
                    >
                      <td className={`py-3 px-4 font-mono text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        {conn.timestamp ? new Date(conn.timestamp).toLocaleTimeString() : "—"}
                      </td>
                      <td className={`py-3 px-4 font-mono text-xs ${isDark ? "text-cyan-300" : "text-cyan-700"}`}>
                        {conn.src_ip}
                      </td>
                      <td className={`py-3 px-4 font-mono text-xs ${isDark ? "text-purple-300" : "text-purple-700"}`}>
                        {conn.dst_ip}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono ${isDark ? "bg-cyan-500/20 text-cyan-300" : "bg-cyan-100 text-cyan-800"}`}>
                          {conn.protocol}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs font-semibold ${
                            conn.label === "Normal"
                              ? isDark ? "text-emerald-400" : "text-emerald-700"
                              : isDark ? "text-red-400" : "text-red-700"
                          }`}
                        >
                          {conn.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-20 h-2 rounded-full overflow-hidden ${isDark ? "bg-purple-900/50" : "bg-purple-200"}`}>
                            <div
                              className="h-full"
                              style={{
                                width: `${conn.confidence}%`,
                                background:
                                  conn.confidence >= 90 ? "#ef4444"
                                    : conn.confidence >= 70 ? "#f59e0b"
                                      : "#10b981",
                              }}
                            />
                          </div>
                          <span className={`text-xs ${isDark ? "text-white" : "text-purple-900"}`}>
                            {Math.round(conn.confidence)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {conn.is_blocked ? (
                          <span className="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-300 font-medium">
                            Blocked
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-medium flex items-center gap-1 w-fit">
                            <motion.span
                              className="w-2 h-2 rounded-full bg-emerald-400"
                              animate={{ opacity: [1, 0.3, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
