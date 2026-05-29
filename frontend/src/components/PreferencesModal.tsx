"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreferencesChange?: (prefs: Preferences) => void;
}

export interface Preferences {
  threatTypes: {
    DoS: boolean;
    DDoS: boolean;
    U2R: boolean;
    R2L: boolean;
    Probe: boolean;
  };
  complianceFrameworks: {
    "PCI-DSS": boolean;
    HIPAA: boolean;
    SOC2: boolean;
    NIST: boolean;
  };
  severityRange: {
    min: number;
    max: number;
  };
  showCharts: {
    trends: boolean;
    geo: boolean;
    severity: boolean;
    compliance: boolean;
    metrics: boolean;
  };
}

const DEFAULT_PREFERENCES: Preferences = {
  threatTypes: {
    DoS: true,
    DDoS: true,
    U2R: true,
    R2L: true,
    Probe: true,
  },
  complianceFrameworks: {
    "PCI-DSS": true,
    HIPAA: true,
    SOC2: true,
    NIST: true,
  },
  severityRange: {
    min: 0,
    max: 10,
  },
  showCharts: {
    trends: true,
    geo: true,
    severity: true,
    compliance: true,
    metrics: true,
  },
};

export default function PreferencesModal({
  isOpen,
  onClose,
  onPreferencesChange,
}: PreferencesModalProps) {
  const { isDark } = useTheme();
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("recommendations-preferences");
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch {
        setPreferences(DEFAULT_PREFERENCES);
      }
    }
  }, []);

  const handleThreatTypeToggle = (threatType: keyof Preferences["threatTypes"]) => {
    const updated = {
      ...preferences,
      threatTypes: {
        ...preferences.threatTypes,
        [threatType]: !preferences.threatTypes[threatType],
      },
    };
    setPreferences(updated);
    localStorage.setItem("recommendations-preferences", JSON.stringify(updated));
    onPreferencesChange?.(updated);
  };

  const handleComplianceToggle = (
    framework: keyof Preferences["complianceFrameworks"]
  ) => {
    const updated = {
      ...preferences,
      complianceFrameworks: {
        ...preferences.complianceFrameworks,
        [framework]: !preferences.complianceFrameworks[framework],
      },
    };
    setPreferences(updated);
    localStorage.setItem("recommendations-preferences", JSON.stringify(updated));
    onPreferencesChange?.(updated);
  };

  const handleChartToggle = (chart: keyof Preferences["showCharts"]) => {
    const updated = {
      ...preferences,
      showCharts: {
        ...preferences.showCharts,
        [chart]: !preferences.showCharts[chart],
      },
    };
    setPreferences(updated);
    localStorage.setItem("recommendations-preferences", JSON.stringify(updated));
    onPreferencesChange?.(updated);
  };

  const handleSeverityChange = (type: "min" | "max", value: number) => {
    const updated = {
      ...preferences,
      severityRange: {
        ...preferences.severityRange,
        [type]: value,
      },
    };
    setPreferences(updated);
    localStorage.setItem("recommendations-preferences", JSON.stringify(updated));
    onPreferencesChange?.(updated);
  };

  const handleReset = () => {
    setPreferences(DEFAULT_PREFERENCES);
    localStorage.removeItem("recommendations-preferences");
    onPreferencesChange?.(DEFAULT_PREFERENCES);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`rounded-2xl border backdrop-blur-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
            isDark
              ? "border-purple-500/30 bg-gradient-to-br from-purple-900/40 to-blue-900/30"
              : "border-purple-400/30 bg-white"
          }`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between p-6 border-b ${
              isDark ? "border-purple-500/20" : "border-purple-300/30"
            } sticky top-0 bg-inherit`}
          >
            <div className="flex items-center gap-2">
              <Settings size={24} className="text-purple-400" />
              <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Recommendation Preferences
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Threat Types */}
            <div>
              <h3 className={`text-lg font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                Threat Types to Display
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(preferences.threatTypes).map(([type, enabled]) => (
                  <label
                    key={type}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      enabled
                        ? isDark
                          ? "bg-purple-900/40 border border-purple-500/50"
                          : "bg-purple-100 border border-purple-300"
                        : isDark
                          ? "bg-gray-900/30 border border-gray-700/50"
                          : "bg-gray-100 border border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() =>
                        handleThreatTypeToggle(type as keyof Preferences["threatTypes"])
                      }
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className={isDark ? "text-white" : "text-gray-900"}>{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Compliance Frameworks */}
            <div>
              <h3 className={`text-lg font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                Compliance Frameworks
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(preferences.complianceFrameworks).map(([framework, enabled]) => (
                  <label
                    key={framework}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      enabled
                        ? isDark
                          ? "bg-purple-900/40 border border-purple-500/50"
                          : "bg-purple-100 border border-purple-300"
                        : isDark
                          ? "bg-gray-900/30 border border-gray-700/50"
                          : "bg-gray-100 border border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() =>
                        handleComplianceToggle(
                          framework as keyof Preferences["complianceFrameworks"]
                        )
                      }
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className={isDark ? "text-white" : "text-gray-900"}>{framework}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Severity Range */}
            <div>
              <h3 className={`text-lg font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                Severity Range
              </h3>
              <div className="space-y-3">
                <div>
                  <label className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Minimum: {preferences.severityRange.min}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={preferences.severityRange.min}
                    onChange={(e) => handleSeverityChange("min", parseInt(e.target.value))}
                    className="w-full cursor-pointer"
                  />
                </div>
                <div>
                  <label className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Maximum: {preferences.severityRange.max}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={preferences.severityRange.max}
                    onChange={(e) => handleSeverityChange("max", parseInt(e.target.value))}
                    className="w-full cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Charts Display */}
            <div>
              <h3 className={`text-lg font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                Display Charts
              </h3>
              <div className="space-y-2">
                {[
                  { key: "trends", label: "Threat Trends" },
                  { key: "geo", label: "Geographic Intelligence" },
                  { key: "severity", label: "Severity Matrix" },
                  { key: "compliance", label: "Compliance Overview" },
                  { key: "metrics", label: "Performance Metrics" },
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      preferences.showCharts[key as keyof Preferences["showCharts"]]
                        ? isDark
                          ? "bg-purple-900/40 border border-purple-500/50"
                          : "bg-purple-100 border border-purple-300"
                        : isDark
                          ? "bg-gray-900/30 border border-gray-700/50"
                          : "bg-gray-100 border border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={preferences.showCharts[key as keyof Preferences["showCharts"]]}
                      onChange={() =>
                        handleChartToggle(key as keyof Preferences["showCharts"])
                      }
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className={isDark ? "text-white" : "text-gray-900"}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className={`flex items-center justify-between p-6 border-t ${
              isDark ? "border-purple-500/20" : "border-purple-300/30"
            } sticky bottom-0 bg-inherit`}
          >
            <button
              onClick={handleReset}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isDark
                  ? "bg-red-900/30 hover:bg-red-900/50 text-red-300"
                  : "bg-red-100 hover:bg-red-200 text-red-700"
              }`}
            >
              Reset to Defaults
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white transition-all"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
