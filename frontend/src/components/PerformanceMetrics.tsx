"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Clock, TrendingUp } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface MetricsData {
  mttd: number; // Mean Time To Detection (minutes)
  mttr: number; // Mean Time To Remediation (minutes)
  accuracy: number; // Detection accuracy %
  falsePositives: number; // False positive rate %
}

const mockMetrics: MetricsData = {
  mttd: 2.5,
  mttr: 15,
  accuracy: 99.82,
  falsePositives: 0.18,
};

export default function PerformanceMetrics() {
  const { isDark } = useTheme();
  const [metrics, setMetrics] = useState<MetricsData>(mockMetrics);

  const getMetricColor = (label: string) => {
    if (label === "MTTD" || label === "MTTR") {
      return isDark ? "text-cyan-400" : "text-cyan-600";
    } else if (label === "Accuracy") {
      return isDark ? "text-emerald-400" : "text-emerald-600";
    } else {
      return isDark ? "text-amber-400" : "text-amber-600";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className={`rounded-2xl p-8 border ${isDark ? "border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-pink-900/10" : "border-purple-400/20 bg-purple-950/10"} backdrop-blur-xl`}
    >
      <div className="flex items-center gap-3 mb-6">
        <Zap size={28} className="text-purple-400" />
        <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-purple-950"}`}>
          Performance Metrics
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.65 }}
          className={`p-4 rounded-lg ${isDark ? "bg-gray-900/50" : "bg-gray-100"}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className={getMetricColor("MTTD")} />
            <p className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              MTTD
            </p>
          </div>
          <p className={`text-2xl font-bold ${getMetricColor("MTTD")}`}>
            {metrics.mttd}m
          </p>
          <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
            Mean Time to Detect
          </p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className={`p-4 rounded-lg ${isDark ? "bg-gray-900/50" : "bg-gray-100"}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className={getMetricColor("MTTR")} />
            <p className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              MTTR
            </p>
          </div>
          <p className={`text-2xl font-bold ${getMetricColor("MTTR")}`}>
            {metrics.mttr}m
          </p>
          <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
            Mean Time to Remediate
          </p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.75 }}
          className={`p-4 rounded-lg ${isDark ? "bg-gray-900/50" : "bg-gray-100"}`}
        >
          <p className={`text-xs font-medium mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Accuracy
          </p>
          <p className={`text-2xl font-bold ${getMetricColor("Accuracy")}`}>
            {metrics.accuracy.toFixed(2)}%
          </p>
          <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
            Detection Rate
          </p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className={`p-4 rounded-lg ${isDark ? "bg-gray-900/50" : "bg-gray-100"}`}
        >
          <p className={`text-xs font-medium mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            False Pos.
          </p>
          <p className={`text-2xl font-bold ${getMetricColor("FP")}`}>
            {metrics.falsePositives.toFixed(2)}%
          </p>
          <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
            False Positives
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
