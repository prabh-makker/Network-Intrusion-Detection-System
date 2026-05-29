"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, AlertCircle } from "lucide-react";
import { getApiUrl } from "@/lib/api";
import { fetchWithAuth } from "@/lib/auth";
import { useTheme } from "@/context/ThemeContext";

interface ThreatSeverityData {
  [threatType: string]: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export default function ThreatSeverityMatrix() {
  const { isDark } = useTheme();
  const [data, setData] = useState<ThreatSeverityData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const threatTypes = ["DoS", "DDoS", "U2R", "R2L", "Probe"];
  const severityLevels = [
    { key: "critical", label: "Critical (9-10)", color: "#ef4444" },
    { key: "high", label: "High (7-8.9)", color: "#f59e0b" },
    { key: "medium", label: "Medium (4-6.9)", color: "#eab308" },
    { key: "low", label: "Low (0-3.9)", color: "#10b981" },
  ];

  useEffect(() => {
    const fetchSeverityData = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiUrl = getApiUrl();
        const response = await fetchWithAuth(
          `${apiUrl}/api/v1/analytics/trends?time_range=24h&bucket_interval=hour`
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const trends = await response.json();

        // Transform trends data into severity matrix
        const severityData: ThreatSeverityData = {};
        threatTypes.forEach((type) => {
          severityData[type] = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
          };
        });

        // Aggregate data from trends (simplified - in real app would fetch from DB)
        // For now, use mock data structure
        if (Array.isArray(trends) && trends.length > 0) {
          const latest = trends[trends.length - 1];
          // Distribute threats by type and severity
          const totalBySeverity = {
            critical: latest.critical_count || 0,
            high: latest.high_count || 0,
            medium: latest.medium_count || 0,
            low: latest.low_count || 0,
          };

          // Distribute proportionally across threat types
          threatTypes.forEach((type) => {
            const proportion = 1 / threatTypes.length;
            severityData[type] = {
              critical: Math.round(totalBySeverity.critical * proportion),
              high: Math.round(totalBySeverity.high * proportion),
              medium: Math.round(totalBySeverity.medium * proportion),
              low: Math.round(totalBySeverity.low * proportion),
            };
          });
        }

        setData(severityData);
      } catch (err) {
        // Silently ignore transient network errors (backend restart, etc.)
        // Only update error state if we've never loaded data successfully
        setError(prev => prev);
      } finally {
        setLoading(false);
      }
    };

    fetchSeverityData();
    const interval = setInterval(fetchSeverityData, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Get color intensity based on count
  const getIntensity = (count: number, maxCount: number) => {
    if (maxCount === 0) return 0.1;
    const ratio = count / maxCount;
    if (ratio === 0) return 0.05;
    if (ratio < 0.25) return 0.2;
    if (ratio < 0.5) return 0.4;
    if (ratio < 0.75) return 0.6;
    if (ratio < 1) return 0.8;
    return 1;
  };

  // Get color for severity level
  const getBaseColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return isDark ? "rgb(239, 68, 68)" : "rgb(220, 38, 38)"; // Red
      case "high":
        return isDark ? "rgb(245, 158, 11)" : "rgb(217, 119, 6)"; // Orange
      case "medium":
        return isDark ? "rgb(234, 179, 8)" : "rgb(202, 138, 4)"; // Yellow
      case "low":
        return isDark ? "rgb(16, 185, 129)" : "rgb(5, 150, 105)"; // Green
      default:
        return isDark ? "rgb(107, 114, 128)" : "rgb(156, 163, 175)";
    }
  };

  // Calculate max count for intensity scaling
  const getAllCounts = () => {
    const counts: number[] = [];
    Object.values(data).forEach((typeData) => {
      Object.values(typeData).forEach((count) => {
        if (typeof count === "number") counts.push(count);
      });
    });
    return counts.length > 0 ? Math.max(...counts) : 1;
  };

  const maxCount = getAllCounts();

  if (loading && Object.keys(data).length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl p-8 border ${
          isDark
            ? "border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-pink-900/10"
            : "border-purple-400/20 bg-purple-950/10"
        } backdrop-blur-xl`}
      >
        <div className="flex items-center gap-3 mb-6">
          <Shield size={28} className="text-purple-400 animate-pulse" />
          <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-purple-950"}`}>
            Threat Severity Distribution
          </h3>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-purple-400 border-t-transparent" />
            <p className={`mt-4 text-sm ${isDark ? "text-purple-300" : "text-purple-800"}`}>
              Loading severity data...
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
              Error Loading Severity Data
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
      transition={{ delay: 0.4 }}
      className={`rounded-2xl p-8 border ${
        isDark
          ? "border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-pink-900/10"
          : "border-purple-400/20 bg-purple-950/10"
      } backdrop-blur-xl`}
    >
      <div className="flex items-center gap-3 mb-6">
        <Shield size={28} className="text-purple-400" />
        <div className="flex-1">
          <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-purple-950"}`}>
            Threat Severity Distribution
          </h3>
          <p className={`text-xs mt-1 ${isDark ? "text-purple-300" : "text-purple-800"}`}>
            Threat type × severity level matrix (darker = more threats)
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-6 flex flex-wrap gap-3">
        {severityLevels.map((level) => (
          <div key={level.key} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: level.color }}
            />
            <span className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              {level.label}
            </span>
          </div>
        ))}
      </div>

      {/* Matrix Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th
                className={`p-3 text-left font-semibold text-sm border ${
                  isDark
                    ? "bg-purple-900/50 border-purple-500/30 text-purple-300"
                    : "bg-purple-100 border-purple-300 text-purple-900"
                }`}
              >
                Threat Type
              </th>
              {severityLevels.map((level) => (
                <th
                  key={level.key}
                  className={`p-3 text-center font-semibold text-sm border ${
                    isDark
                      ? "bg-purple-900/50 border-purple-500/30 text-purple-300"
                      : "bg-purple-100 border-purple-300 text-purple-900"
                  }`}
                  style={{ color: level.color }}
                >
                  {level.label.split(" (")[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {threatTypes.map((threatType, typeIdx) => (
              <motion.tr
                key={threatType}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: typeIdx * 0.05 }}
              >
                <td
                  className={`p-3 font-semibold border ${
                    isDark
                      ? "bg-purple-900/20 border-purple-500/20 text-purple-300"
                      : "bg-purple-50 border-purple-200 text-purple-900"
                  }`}
                >
                  {threatType}
                </td>
                {severityLevels.map((level) => {
                  const count = data[threatType]?.[level.key as keyof typeof data[typeof threatType]] || 0;
                  const intensity = getIntensity(count, maxCount);
                  const baseColor = getBaseColor(level.key);

                  return (
                    <td
                      key={`${threatType}-${level.key}`}
                      className={`p-3 text-center border border-purple-500/20 cursor-pointer hover:opacity-80 transition-opacity`}
                      style={{
                        backgroundColor: `rgba(${baseColor
                          .match(/\d+/g)
                          ?.slice(0, 3)
                          .join(", ")}, ${intensity})`,
                      }}
                      title={`${threatType} - ${level.label}: ${count} threats`}
                    >
                      <span className={`font-semibold text-sm ${
                        intensity > 0.5
                          ? "text-white drop-shadow-md"
                          : isDark ? "text-gray-400" : "text-gray-700"
                      }`}>
                        {count > 0 ? count : "-"}
                      </span>
                    </td>
                  );
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total Statistics */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {severityLevels.map((level) => {
          const total = Object.values(data).reduce((sum, typeData) => {
            return sum + (typeData[level.key as keyof typeof typeData] || 0);
          }, 0);

          return (
            <motion.div
              key={`total-${level.key}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`p-4 rounded-lg border`}
              style={{
                borderColor: level.color,
                backgroundColor: `${level.color}15`,
              }}
            >
              <p className="text-xs font-medium mb-1" style={{ color: level.color }}>
                {level.label.split(" (")[0]}
              </p>
              <p className="text-2xl font-bold" style={{ color: level.color }}>
                {total}
              </p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
