"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, AlertCircle, Shield } from "lucide-react";
import { getApiUrl } from "@/lib/api";
import { fetchWithAuth } from "@/lib/auth";
import { useTheme } from "@/context/ThemeContext";

interface ComplianceStatus {
  framework: string;
  status: "compliant" | "at-risk" | "non-compliant";
  threatCount: number;
  percentage: number;
}

const mockComplianceData: ComplianceStatus[] = [
  { framework: "PCI-DSS", status: "compliant", threatCount: 2, percentage: 98 },
  { framework: "HIPAA", status: "at-risk", threatCount: 5, percentage: 85 },
  { framework: "SOC2", status: "compliant", threatCount: 1, percentage: 99 },
];

export default function ComplianceOverview() {
  const { isDark } = useTheme();
  const [data, setData] = useState<ComplianceStatus[]>(mockComplianceData);
  const [loading, setLoading] = useState(false);
  const apiUrl = getApiUrl();

  useEffect(() => {
    const fetchCompliance = async () => {
      try {
        const response = await fetchWithAuth(`${apiUrl}/api/v1/analytics/compliance`);
        if (response.ok) {
          const json = await response.json();
          setData(json.frameworks || mockComplianceData);
        }
      } catch (err) {
        setData(mockComplianceData);
      }
    };

    fetchCompliance();
    const interval = setInterval(fetchCompliance, 15000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "compliant":
        return isDark ? "border-emerald-500/30 bg-emerald-900/20" : "border-emerald-400/30 bg-emerald-50";
      case "at-risk":
        return isDark ? "border-amber-500/30 bg-amber-900/20" : "border-amber-400/30 bg-amber-50";
      case "non-compliant":
        return isDark ? "border-red-500/30 bg-red-900/20" : "border-red-400/30 bg-red-50";
      default:
        return isDark ? "border-purple-500/30 bg-purple-900/20" : "border-purple-400/30 bg-purple-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle size={20} className="text-emerald-400" />;
      case "at-risk":
        return <AlertCircle size={20} className="text-amber-400" />;
      case "non-compliant":
        return <AlertCircle size={20} className="text-red-400" />;
      default:
        return <Shield size={20} className="text-purple-400" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className={`rounded-2xl p-8 border ${isDark ? "border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-pink-900/10" : "border-purple-400/20 bg-purple-950/10"} backdrop-blur-xl`}
    >
      <div className="flex items-center gap-3 mb-6">
        <Shield size={28} className="text-purple-400" />
        <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-purple-950"}`}>
          Compliance Overview
        </h3>
      </div>

      <div className="space-y-4">
        {data.map((item) => (
          <motion.div
            key={item.framework}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-4 rounded-lg border ${getStatusColor(item.status)}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {getStatusIcon(item.status)}
                <span className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  {item.framework}
                </span>
              </div>
              <span className="text-sm font-bold" style={{ color: item.status === "compliant" ? "#10b981" : item.status === "at-risk" ? "#f59e0b" : "#ef4444" }}>
                {item.percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-800/50 rounded-full h-2">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor: item.status === "compliant" ? "#10b981" : item.status === "at-risk" ? "#f59e0b" : "#ef4444",
                }}
              />
            </div>
            <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {item.threatCount} threats detected
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
