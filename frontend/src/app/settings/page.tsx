"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings, Network, AlertCircle, Cpu, Save, RotateCcw,
  Wifi, Shield, Zap, Activity, Info, Check, X,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/components/Toast";

interface NetworkConfig {
  interface: string;
  ip_address: string;
  port: number;
  packet_buffer_size: number;
  timeout: number;
}

interface AlertThresholds {
  dos_confidence: number;
  probe_confidence: number;
  r2l_confidence: number;
  u2r_confidence: number;
  alert_cooldown: number;
  max_alerts_per_minute: number;
}

interface ModelParameters {
  n_estimators: number;
  max_depth: number;
  learning_rate: number;
  feature_threshold: number;
  auto_retrain: boolean;
  retrain_interval: number;
}

export default function SettingsPage() {
  const { isDark } = useTheme();
  const { showToast } = useToast();

  const [networkConfig, setNetworkConfig] = useState<NetworkConfig>({
    interface: "eth0",
    ip_address: "0.0.0.0",
    port: 5000,
    packet_buffer_size: 1000,
    timeout: 30,
  });

  const [alertThresholds, setAlertThresholds] = useState<AlertThresholds>({
    dos_confidence: 0.85,
    probe_confidence: 0.80,
    r2l_confidence: 0.90,
    u2r_confidence: 0.95,
    alert_cooldown: 5,
    max_alerts_per_minute: 100,
  });

  const [modelParams, setModelParams] = useState<ModelParameters>({
    n_estimators: 150,
    max_depth: 8,
    learning_rate: 0.1,
    feature_threshold: 0.01,
    auto_retrain: false,
    retrain_interval: 604800,
  });

  const [saving, setSaving] = useState(false);

  const handleNetworkChange = (field: keyof NetworkConfig, value: any) => {
    setNetworkConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleThresholdChange = (field: keyof AlertThresholds, value: any) => {
    setAlertThresholds(prev => ({ ...prev, [field]: value }));
  };

  const handleModelChange = (field: keyof ModelParameters, value: any) => {
    setModelParams(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      showToast("success", "All settings saved successfully!");
    } catch (err) {
      showToast("error", "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setNetworkConfig({
      interface: "eth0",
      ip_address: "0.0.0.0",
      port: 5000,
      packet_buffer_size: 1000,
      timeout: 30,
    });
    setAlertThresholds({
      dos_confidence: 0.85,
      probe_confidence: 0.80,
      r2l_confidence: 0.90,
      u2r_confidence: 0.95,
      alert_cooldown: 5,
      max_alerts_per_minute: 100,
    });
    setModelParams({
      n_estimators: 150,
      max_depth: 8,
      learning_rate: 0.1,
      feature_threshold: 0.01,
      auto_retrain: false,
      retrain_interval: 604800,
    });
    showToast("info", "Settings reset to defaults");
  };

  return (
    <div className="min-h-screen w-full bg-[var(--background)]">
      {/* ── Header ── */}
      <div className={`border-b backdrop-blur-xl px-6 py-6 sticky top-0 z-50 ${
        isDark
          ? "border-blue-500/20 bg-gradient-to-r from-blue-900/10 via-transparent to-cyan-900/10"
          : "border-blue-400/20 bg-blue-950/5"
      }`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 flex items-center gap-3">
              <Settings size={32} className="text-blue-400" />
              System Configuration
            </h1>
            <p className={`mt-1 text-sm ${isDark ? "text-blue-200" : "text-blue-800"}`}>
              Network interface · alert thresholds · model parameters
            </p>
          </div>
        </div>
      </div>

      <div className="w-full px-6 py-12 relative z-0">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* ══════════════════════════════════════════════════════════════
              SECTION 1 — NETWORK INTERFACE
          ══════════════════════════════════════════════════════════════ */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
          >
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6 flex items-center gap-3">
              <Network size={24} className="text-blue-400" />
              Network Interface Configuration
            </h2>
            <p className="text-sm text-[var(--muted)] mb-6">Configure network interface settings for packet capture and processing.</p>

            <div className={`glass-panel rounded-2xl p-8 border ${isDark ? "border-blue-500/20" : "border-blue-300/20"}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Interface */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                    <Wifi size={16} className="inline mr-2 text-blue-400" />
                    Network Interface
                  </label>
                  <input
                    type="text"
                    value={networkConfig.interface}
                    onChange={(e) => handleNetworkChange("interface", e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-white/5 border-white/10 text-white hover:border-blue-500/30 focus:border-blue-500/50"
                        : "bg-black/5 border-black/10 text-black hover:border-blue-500/30 focus:border-blue-500/50"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    placeholder="eth0"
                  />
                  <p className="text-xs text-[var(--muted)] mt-2">Physical interface for packet capture</p>
                </div>

                {/* IP Address */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                    <Shield size={16} className="inline mr-2 text-blue-400" />
                    IP Address
                  </label>
                  <input
                    type="text"
                    value={networkConfig.ip_address}
                    onChange={(e) => handleNetworkChange("ip_address", e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-white/5 border-white/10 text-white hover:border-blue-500/30 focus:border-blue-500/50"
                        : "bg-black/5 border-black/10 text-black hover:border-blue-500/30 focus:border-blue-500/50"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    placeholder="0.0.0.0"
                  />
                  <p className="text-xs text-[var(--muted)] mt-2">Bind address for listener service</p>
                </div>

                {/* Port */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                    <Zap size={16} className="inline mr-2 text-blue-400" />
                    Port
                  </label>
                  <input
                    type="number"
                    value={networkConfig.port}
                    onChange={(e) => handleNetworkChange("port", parseInt(e.target.value))}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-white/5 border-white/10 text-white hover:border-blue-500/30 focus:border-blue-500/50"
                        : "bg-black/5 border-black/10 text-black hover:border-blue-500/30 focus:border-blue-500/50"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    min="1"
                    max="65535"
                  />
                  <p className="text-xs text-[var(--muted)] mt-2">Service port (1-65535)</p>
                </div>

                {/* Buffer Size */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                    <Activity size={16} className="inline mr-2 text-blue-400" />
                    Packet Buffer Size
                  </label>
                  <input
                    type="number"
                    value={networkConfig.packet_buffer_size}
                    onChange={(e) => handleNetworkChange("packet_buffer_size", parseInt(e.target.value))}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-white/5 border-white/10 text-white hover:border-blue-500/30 focus:border-blue-500/50"
                        : "bg-black/5 border-black/10 text-black hover:border-blue-500/30 focus:border-blue-500/50"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    min="100"
                  />
                  <p className="text-xs text-[var(--muted)] mt-2">Max packets to queue</p>
                </div>

                {/* Timeout */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                    <Cpu size={16} className="inline mr-2 text-blue-400" />
                    Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    value={networkConfig.timeout}
                    onChange={(e) => handleNetworkChange("timeout", parseInt(e.target.value))}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-white/5 border-white/10 text-white hover:border-blue-500/30 focus:border-blue-500/50"
                        : "bg-black/5 border-black/10 text-black hover:border-blue-500/30 focus:border-blue-500/50"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    min="1"
                    max="300"
                  />
                  <p className="text-xs text-[var(--muted)] mt-2">Connection timeout threshold</p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 2 — ALERT THRESHOLDS
          ══════════════════════════════════════════════════════════════ */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6 flex items-center gap-3">
              <AlertCircle size={24} className="text-orange-400" />
              Alert Thresholds
            </h2>
            <p className="text-sm text-[var(--muted)] mb-6">Set confidence thresholds for threat detection and alerting behavior.</p>

            <div className={`glass-panel rounded-2xl p-8 border ${isDark ? "border-orange-500/20" : "border-orange-300/20"}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* DoS Confidence */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                    DoS Confidence Threshold
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={alertThresholds.dos_confidence}
                      onChange={(e) => handleThresholdChange("dos_confidence", parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-gradient-to-r from-red-500/20 to-red-500/50 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm font-bold text-red-400 w-12 text-right">
                      {(alertThresholds.dos_confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-2">Min confidence for DoS detection</p>
                </div>

                {/* Probe Confidence */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                    Probe Confidence Threshold
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={alertThresholds.probe_confidence}
                      onChange={(e) => handleThresholdChange("probe_confidence", parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-gradient-to-r from-amber-500/20 to-amber-500/50 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm font-bold text-amber-400 w-12 text-right">
                      {(alertThresholds.probe_confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-2">Min confidence for Probe detection</p>
                </div>

                {/* R2L Confidence */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                    R2L Confidence Threshold
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={alertThresholds.r2l_confidence}
                      onChange={(e) => handleThresholdChange("r2l_confidence", parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-gradient-to-r from-purple-500/20 to-purple-500/50 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm font-bold text-purple-400 w-12 text-right">
                      {(alertThresholds.r2l_confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-2">Min confidence for R2L detection</p>
                </div>

                {/* U2R Confidence */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                    U2R Confidence Threshold
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={alertThresholds.u2r_confidence}
                      onChange={(e) => handleThresholdChange("u2r_confidence", parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-gradient-to-r from-pink-500/20 to-pink-500/50 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm font-bold text-pink-400 w-12 text-right">
                      {(alertThresholds.u2r_confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-2">Min confidence for U2R detection</p>
                </div>

                {/* Alert Cooldown */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                    Alert Cooldown (seconds)
                  </label>
                  <input
                    type="number"
                    value={alertThresholds.alert_cooldown}
                    onChange={(e) => handleThresholdChange("alert_cooldown", parseInt(e.target.value))}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-white/5 border-white/10 text-white hover:border-orange-500/30 focus:border-orange-500/50"
                        : "bg-black/5 border-black/10 text-black hover:border-orange-500/30 focus:border-orange-500/50"
                    } focus:outline-none focus:ring-2 focus:ring-orange-500/20`}
                    min="1"
                  />
                  <p className="text-xs text-[var(--muted)] mt-2">Minimum time between duplicate alerts</p>
                </div>

                {/* Max Alerts Per Minute */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                    Max Alerts Per Minute
                  </label>
                  <input
                    type="number"
                    value={alertThresholds.max_alerts_per_minute}
                    onChange={(e) => handleThresholdChange("max_alerts_per_minute", parseInt(e.target.value))}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-white/5 border-white/10 text-white hover:border-orange-500/30 focus:border-orange-500/50"
                        : "bg-black/5 border-black/10 text-black hover:border-orange-500/30 focus:border-orange-500/50"
                    } focus:outline-none focus:ring-2 focus:ring-orange-500/20`}
                    min="1"
                  />
                  <p className="text-xs text-[var(--muted)] mt-2">Rate limiting to prevent alert floods</p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 3 — MODEL PARAMETERS
          ══════════════════════════════════════════════════════════════ */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6 flex items-center gap-3">
              <Cpu size={24} className="text-purple-400" />
              Model Parameters
            </h2>
            <p className="text-sm text-[var(--muted)] mb-6">Configure XGBoost Random Forest model hyperparameters and training behavior.</p>

            <div className={`glass-panel rounded-2xl p-8 border ${isDark ? "border-purple-500/20" : "border-purple-300/20"}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* N Estimators */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                    Number of Estimators (Trees)
                  </label>
                  <input
                    type="number"
                    value={modelParams.n_estimators}
                    onChange={(e) => handleModelChange("n_estimators", parseInt(e.target.value))}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-white/5 border-white/10 text-white hover:border-purple-500/30 focus:border-purple-500/50"
                        : "bg-black/5 border-black/10 text-black hover:border-purple-500/30 focus:border-purple-500/50"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    min="10"
                    max="500"
                  />
                  <p className="text-xs text-[var(--muted)] mt-2">Number of decision trees in forest</p>
                </div>

                {/* Max Depth */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                    Max Tree Depth
                  </label>
                  <input
                    type="number"
                    value={modelParams.max_depth}
                    onChange={(e) => handleModelChange("max_depth", parseInt(e.target.value))}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-white/5 border-white/10 text-white hover:border-purple-500/30 focus:border-purple-500/50"
                        : "bg-black/5 border-black/10 text-black hover:border-purple-500/30 focus:border-purple-500/50"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    min="2"
                    max="20"
                  />
                  <p className="text-xs text-[var(--muted)] mt-2">Maximum depth of individual trees</p>
                </div>

                {/* Learning Rate */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                    Learning Rate
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0.01"
                      max="0.5"
                      step="0.01"
                      value={modelParams.learning_rate}
                      onChange={(e) => handleModelChange("learning_rate", parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-gradient-to-r from-purple-500/20 to-purple-500/50 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm font-bold text-purple-400 w-12 text-right">
                      {modelParams.learning_rate.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-2">Gradient boosting learning rate</p>
                </div>

                {/* Feature Threshold */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                    Feature Importance Threshold
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="0.1"
                      step="0.001"
                      value={modelParams.feature_threshold}
                      onChange={(e) => handleModelChange("feature_threshold", parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-gradient-to-r from-purple-500/20 to-purple-500/50 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm font-bold text-purple-400 w-12 text-right">
                      {(modelParams.feature_threshold * 100).toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-2">Min feature importance to include</p>
                </div>

                {/* Auto Retrain */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-3">
                    Automatic Retraining
                  </label>
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border"
                    style={{
                      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                      backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"
                    }}>
                    <input
                      type="checkbox"
                      checked={modelParams.auto_retrain}
                      onChange={(e) => handleModelChange("auto_retrain", e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm text-[var(--foreground)]">
                      {modelParams.auto_retrain ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-2">Automatically retrain on new threats</p>
                </div>

                {/* Retrain Interval */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                    Retrain Interval (seconds)
                  </label>
                  <input
                    type="number"
                    value={modelParams.retrain_interval}
                    onChange={(e) => handleModelChange("retrain_interval", parseInt(e.target.value))}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors ${
                      isDark
                        ? "bg-white/5 border-white/10 text-white hover:border-purple-500/30 focus:border-purple-500/50"
                        : "bg-black/5 border-black/10 text-black hover:border-purple-500/30 focus:border-purple-500/50"
                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                    min="3600"
                    disabled={!modelParams.auto_retrain}
                  />
                  <p className="text-xs text-[var(--muted)] mt-2">Time between automatic retraining cycles</p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* ══════════════════════════════════════════════════════════════
              ACTION BUTTONS
          ══════════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-4 justify-end sticky bottom-6"
          >
            <button
              onClick={handleReset}
              disabled={saving}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                isDark
                  ? "bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
                  : "bg-black/10 text-black hover:bg-black/20 disabled:opacity-50"
              }`}
            >
              <RotateCcw size={18} />
              Reset to Defaults
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3 rounded-lg font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 transition-all"
            >
              {saving ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }}>
                    <Cpu size={18} />
                  </motion.div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save All Settings
                </>
              )}
            </button>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
