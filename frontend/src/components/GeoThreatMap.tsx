"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Globe, AlertCircle } from "lucide-react";
import { getApiUrl } from "@/lib/api";
import { fetchWithAuth } from "@/lib/auth";
import { useTheme } from "@/context/ThemeContext";

interface GeoThreat {
  country_code: string;
  threat_count: number;
  blocked_count: number;
  avg_severity: number;
  max_severity: number;
  top_threat_types: Array<{ label: string; count: number }>;
}

export default function GeoThreatMap() {
  const { isDark } = useTheme();
  const [data, setData] = useState<GeoThreat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGeoData = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiUrl = getApiUrl();
        const response = await fetchWithAuth(
          `${apiUrl}/api/v1/analytics/geo?time_range=24h&limit=15`
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const geoData = await response.json();
        setData(geoData);
      } catch (err) {
        console.error("Error fetching geo threat data:", err);
        setError(err instanceof Error ? err.message : "Failed to load geographic data");
      } finally {
        setLoading(false);
      }
    };

    fetchGeoData();
    const interval = setInterval(fetchGeoData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Get color based on severity
  const getSeverityColor = (severity: number) => {
    if (severity >= 9) return "#ef4444"; // Critical - Red
    if (severity >= 7) return "#f59e0b"; // High - Orange
    if (severity >= 4) return "#eab308"; // Medium - Yellow
    return "#10b981"; // Low - Green
  };

  if (loading && !data.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl p-8 border ${
          isDark
            ? "border-cyan-500/30 bg-gradient-to-br from-cyan-900/20 to-teal-900/10"
            : "border-cyan-400/20 bg-cyan-950/10"
        } backdrop-blur-xl`}
      >
        <div className="flex items-center gap-3 mb-6">
          <Globe size={28} className="text-cyan-400 animate-pulse" />
          <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-cyan-950"}`}>
            Geographic Threat Intelligence
          </h3>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-cyan-400 border-t-transparent" />
            <p className={`mt-4 text-sm ${isDark ? "text-cyan-300" : "text-cyan-800"}`}>
              Loading geographic data...
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
              Error Loading Geographic Data
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
      transition={{ delay: 0.3 }}
      className={`rounded-2xl p-8 border ${
        isDark
          ? "border-cyan-500/30 bg-gradient-to-br from-cyan-900/20 to-teal-900/10"
          : "border-cyan-400/20 bg-cyan-950/10"
      } backdrop-blur-xl`}
    >
      <div className="flex items-center gap-3 mb-6">
        <Globe size={28} className="text-cyan-400" />
        <div className="flex-1">
          <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-cyan-950"}`}>
            Geographic Threat Intelligence
          </h3>
          <p className={`text-xs mt-1 ${isDark ? "text-cyan-300" : "text-cyan-800"}`}>
            Top threat sources by country (last 24 hours)
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
          />
          <XAxis
            dataKey="country_code"
            stroke={isDark ? "#666" : "#999"}
            style={{ fontSize: "12px" }}
          />
          <YAxis
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
            cursor={{ fill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}
          />
          <Legend />
          <Bar dataKey="threat_count" fill="#0ea5e9" name="Total Threats">
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getSeverityColor(entry.avg_severity)}
              />
            ))}
          </Bar>
          <Bar dataKey="blocked_count" fill="#10b981" name="Blocked" />
        </BarChart>
      </ResponsiveContainer>

      {data.length > 0 && (
        <div className="mt-6 space-y-3 max-h-64 overflow-y-auto">
          <p className={`text-sm font-semibold ${isDark ? "text-cyan-300" : "text-cyan-700"}`}>
            Top Threat Sources by Country
          </p>
          {data.slice(0, 5).map((country, idx) => (
            <motion.div
              key={country.country_code}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`flex items-center justify-between p-3 rounded-lg ${
                isDark
                  ? "bg-cyan-500/10 border border-cyan-500/30"
                  : "bg-cyan-100 border border-cyan-300"
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg text-cyan-400">
                    {country.country_code}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    country.avg_severity >= 7
                      ? "bg-red-500/20 text-red-400"
                      : country.avg_severity >= 4
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-green-500/20 text-green-400"
                  }`}>
                    Severity: {country.avg_severity.toFixed(1)}/10
                  </span>
                </div>
                <p className={`text-xs mt-1 ${isDark ? "text-cyan-300" : "text-cyan-700"}`}>
                  {country.top_threat_types
                    .slice(0, 2)
                    .map((t) => `${t.label} (${t.count})`)
                    .join(", ")}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-cyan-400">{country.threat_count}</p>
                <p className={`text-xs ${isDark ? "text-cyan-300" : "text-cyan-700"}`}>
                  {country.blocked_count} blocked
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
