"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, AlertCircle } from "lucide-react";
import { getApiUrl } from "@/lib/api";
import { fetchWithAuth } from "@/lib/auth";
import { useTheme } from "@/context/ThemeContext";

interface ThreatTrendData {
  timestamp: string;
  total_threats: number;
  active_threats: number;
  blocked_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  avg_severity_score: number;
}

export default function ThreatTrendsChart() {
  const { isDark } = useTheme();
  const [data, setData] = useState<ThreatTrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrendData = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiUrl = getApiUrl();
        const response = await fetchWithAuth(
          `${apiUrl}/api/v1/analytics/trends?time_range=7d&bucket_interval=hour`
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const trends = await response.json();
        setData(trends);
      } catch (err) {
        console.error("Error fetching threat trends:", err);
        setError(err instanceof Error ? err.message : "Failed to load threat trends");
      } finally {
        setLoading(false);
      }
    };

    fetchTrendData();
    const interval = setInterval(fetchTrendData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading && !data.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl p-8 border ${
          isDark
            ? "border-blue-500/30 bg-gradient-to-br from-blue-900/20 to-cyan-900/10"
            : "border-blue-400/20 bg-blue-950/10"
        } backdrop-blur-xl`}
      >
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp size={28} className="text-blue-400 animate-pulse" />
          <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-blue-950"}`}>
            Historical Threat Trends
          </h3>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-400 border-t-transparent" />
            <p className={`mt-4 text-sm ${isDark ? "text-blue-300" : "text-blue-800"}`}>
              Loading threat trends data...
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl p-8 border ${
          isDark
            ? "border-red-500/30 bg-red-900/20"
            : "border-red-400/20 bg-red-950/10"
        } backdrop-blur-xl`}
      >
        <div className="flex items-center gap-3">
          <AlertCircle size={24} className="text-red-400" />
          <div>
            <h3 className={`font-semibold ${isDark ? "text-red-400" : "text-red-700"}`}>
              Error Loading Trends
            </h3>
            <p className={`text-sm ${isDark ? "text-red-300" : "text-red-600"}`}>
              {error}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`rounded-2xl p-8 border ${
        isDark
          ? "border-blue-500/30 bg-gradient-to-br from-blue-900/20 to-cyan-900/10"
          : "border-blue-400/20 bg-blue-950/10"
      } backdrop-blur-xl`}
    >
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp size={28} className="text-blue-400" />
        <div className="flex-1">
          <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-blue-950"}`}>
            Historical Threat Trends
          </h3>
          <p className={`text-xs mt-1 ${isDark ? "text-blue-300" : "text-blue-800"}`}>
            Last 7 days threat volume and severity trends
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
          />
          <XAxis
            dataKey="timestamp"
            stroke={isDark ? "#666" : "#999"}
            style={{ fontSize: "12px" }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            yAxisId="left"
            stroke={isDark ? "#666" : "#999"}
            style={{ fontSize: "12px" }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke={isDark ? "#666" : "#999"}
            style={{ fontSize: "12px" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "#1f2937" : "#f9fafb",
              border: isDark ? "1px solid #374151" : "1px solid #e5e7eb",
              borderRadius: "8px",
            }}
            labelStyle={{ color: isDark ? "#fff" : "#000" }}
          />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="total_threats"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            name="Total Threats"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="blocked_count"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            name="Blocked"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="avg_severity_score"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            name="Avg Severity"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.length > 0 && (
          <>
            <div
              className={`p-3 rounded-lg ${
                isDark
                  ? "bg-blue-500/10 border border-blue-500/30"
                  : "bg-blue-100 border border-blue-300"
              }`}
            >
              <p className={`text-xs ${isDark ? "text-blue-300" : "text-blue-700"}`}>
                Peak Threats
              </p>
              <p className="text-lg font-bold text-blue-400">
                {Math.max(...data.map((d) => d.total_threats))}
              </p>
            </div>
            <div
              className={`p-3 rounded-lg ${
                isDark
                  ? "bg-green-500/10 border border-green-500/30"
                  : "bg-green-100 border border-green-300"
              }`}
            >
              <p className={`text-xs ${isDark ? "text-green-300" : "text-green-700"}`}>
                Total Blocked
              </p>
              <p className="text-lg font-bold text-green-400">
                {data.reduce((sum, d) => sum + d.blocked_count, 0)}
              </p>
            </div>
            <div
              className={`p-3 rounded-lg ${
                isDark
                  ? "bg-yellow-500/10 border border-yellow-500/30"
                  : "bg-yellow-100 border border-yellow-300"
              }`}
            >
              <p className={`text-xs ${isDark ? "text-yellow-300" : "text-yellow-700"}`}>
                Avg Severity
              </p>
              <p className="text-lg font-bold text-yellow-400">
                {(
                  data.reduce((sum, d) => sum + d.avg_severity_score, 0) / data.length
                ).toFixed(2)}
              </p>
            </div>
            <div
              className={`p-3 rounded-lg ${
                isDark
                  ? "bg-purple-500/10 border border-purple-500/30"
                  : "bg-purple-100 border border-purple-300"
              }`}
            >
              <p className={`text-xs ${isDark ? "text-purple-300" : "text-purple-700"}`}>
                Avg Threats/hr
              </p>
              <p className="text-lg font-bold text-purple-400">
                {(data.reduce((sum, d) => sum + d.total_threats, 0) / data.length).toFixed(
                  1
                )}
              </p>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
