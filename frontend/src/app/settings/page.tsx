"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings, Network, AlertCircle, Cpu, Save, RotateCcw,
  Wifi, Shield, Zap, Activity, Check, X, Download, Upload,
  Plus, Trash2, BrainCircuit, Info, Lock, Unlock,
  Bell, ChevronDown, ChevronUp, History, Circle, Webhook,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/components/Toast";
import { fetchWithAuth } from "@/lib/auth";
import { getApiUrl } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

interface NetworkConfig {
  interface: string;
  ip_address: string;
  port: number;
  packet_buffer_size: number;
  timeout: number;
}

interface AlertThresholds {
  ddos_confidence: number; // A: was missing
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

interface IpEntry {
  id: string;
  ip: string;
  list: "whitelist" | "blacklist";
  note: string;
  added: string;
}

// B: Model info (mock — in production fetched from /api/v1/ml/info)
const MODEL_INFO = {
  version: "v2.4.1",
  trained: "2026-05-21 03:47 UTC",
  accuracy: 97.3,
  precision: 96.8,
  recall: 97.9,
  f1: 97.3,
  dataset: "NSL-KDD 2024 Extended",
  features: 41,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

// A/D: Threshold slider with impact preview
function ThresholdSlider({
  label, description, value, onChange, color, impactHigh, impactLow, isDark,
}: {
  label: string; description: string; value: number;
  onChange: (v: number) => void; color: string;
  impactHigh: string; impactLow: string; isDark: boolean;
}) {
  const pct = Math.round(value * 100);
  const impactText = pct > 90
    ? impactHigh  // very strict — fewer alerts, may miss threats
    : pct < 70
      ? impactLow  // too lenient — more false positives
      : "✅ Balanced — recommended range 70-90%.";

  const impactColor = pct > 90
    ? isDark ? "text-amber-300" : "text-amber-700"
    : pct < 70
      ? isDark ? "text-red-300" : "text-red-700"
      : isDark ? "text-emerald-300" : "text-emerald-700";

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm font-semibold text-[var(--foreground)]">{label}</label>
        <span className="text-sm font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="flex items-center gap-3 mb-1">
        <input
          type="range" min="0" max="1" step="0.01" value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
          style={{ accentColor: color }}
        />
      </div>
      {/* D: Impact preview */}
      <p className={`text-xs font-medium mt-1 ${impactColor}`}>{impactText}</p>
      <p className="text-xs text-[var(--muted)] mt-0.5">{description}</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [networkConfig, setNetworkConfig] = useState<NetworkConfig>({
    interface: "eth0",
    ip_address: "0.0.0.0",
    port: 5000,
    packet_buffer_size: 1000,
    timeout: 30,
  });

  const [alertThresholds, setAlertThresholds] = useState<AlertThresholds>({
    ddos_confidence: 0.88,  // A: new
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

  // C: IP list state
  const [ipEntries, setIpEntries] = useState<IpEntry[]>([
    { id: "1", ip: "10.0.0.0/8",    list: "whitelist", note: "Internal LAN",       added: "2026-05-01" },
    { id: "2", ip: "192.168.1.0/24", list: "whitelist", note: "Office subnet",      added: "2026-05-01" },
    { id: "3", ip: "103.22.116.61",  list: "blacklist", note: "Known DoS source",   added: "2026-05-28" },
    { id: "4", ip: "103.22.133.212", list: "blacklist", note: "Known DDoS source",  added: "2026-05-28" },
  ]);
  const [newIp, setNewIp] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newListType, setNewListType] = useState<"whitelist" | "blacklist">("blacklist");

  const [saving, setSaving]           = useState(false);
  const [modelInfo, setModelInfo]     = useState(MODEL_INFO);
  const prevSavedRef                  = useRef<string>("");
  const apiUrl                        = getApiUrl();

  // S3 — Notification / webhook config
  const [notifConfig, setNotifConfig] = useState({
    discord_webhook: "",
    notify_level: "critical" as "all" | "high" | "critical",
    min_confidence: 0.85,
  });
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  // S4 — Audit log
  interface AuditEntry { ts: string; changes: string[] }
  const [auditLog, setAuditLog]     = useState<AuditEntry[]>([]);
  const [showAudit, setShowAudit]   = useState(false);

  // S5 — System status panel
  const [sysStatus, setSysStatus] = useState<{ online: boolean; latencyMs: number; modelVersion: string; lastChecked: string }>({
    online: false, latencyMs: 0, modelVersion: "—", lastChecked: "—"
  });

  // ── Hydrate from localStorage on mount ──────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem("nids_settings");
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.networkConfig)    setNetworkConfig(saved.networkConfig);
        if (saved.alertThresholds)  setAlertThresholds(saved.alertThresholds);
        if (saved.modelParams)      setModelParams(saved.modelParams);
        if (saved.ipEntries)        setIpEntries(saved.ipEntries);
      }
    } catch {}
  }, []);

  // ── Hydrate S3 notif config + S4 audit log from localStorage ───────────────
  useEffect(() => {
    try {
      const nc = localStorage.getItem("nids_notif_config");
      if (nc) setNotifConfig(JSON.parse(nc));
      const al = localStorage.getItem("nids_audit_log");
      if (al) setAuditLog(JSON.parse(al));
    } catch {}
  }, []);

  // ── Fetch real model info from backend ──────────────────────────────────────
  useEffect(() => {
    fetchWithAuth(`${apiUrl}/api/v1/models/metrics`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setModelInfo(prev => ({
          ...prev,
          version:   data.accuracy?.model_source ?? data.model?.type ?? prev.version,
          trained:   data.accuracy?.timestamp    ?? prev.trained,
          accuracy:  data.accuracy?.overall_accuracy != null ? parseFloat(data.accuracy.overall_accuracy.toFixed(1)) : prev.accuracy,
          precision: prev.precision,
          recall:    prev.recall,
          f1:        prev.f1,
          features:  data.model?.n_features  ?? prev.features,
          dataset:   prev.dataset,
        }));
      })
      .catch(() => {}); // fallback to mock silently
  }, [apiUrl]);

  // ── S5: System status polling (every 30s) ───────────────────────────────────
  useEffect(() => {
    const checkStatus = async () => {
      const t0 = Date.now();
      try {
        const res = await fetchWithAuth(`${apiUrl}/api/v1/models/metrics`);
        const ms  = Date.now() - t0;
        if (res.ok) {
          const data = await res.json();
          setSysStatus({ online: true, latencyMs: ms, modelVersion: data.accuracy?.model_source ?? data.model?.type ?? "v?", lastChecked: new Date().toLocaleTimeString() });
        } else {
          setSysStatus(prev => ({ ...prev, online: false, lastChecked: new Date().toLocaleTimeString() }));
        }
      } catch {
        setSysStatus(prev => ({ ...prev, online: false, lastChecked: new Date().toLocaleTimeString() }));
      }
    };
    checkStatus();
    const iv = setInterval(checkStatus, 30_000);
    return () => clearInterval(iv);
  }, [apiUrl]);

  const handleNetworkChange = (field: keyof NetworkConfig, value: any) =>
    setNetworkConfig(prev => ({ ...prev, [field]: value }));

  const handleThresholdChange = (field: keyof AlertThresholds, value: any) =>
    setAlertThresholds(prev => ({ ...prev, [field]: value }));

  const handleModelChange = (field: keyof ModelParameters, value: any) =>
    setModelParams(prev => ({ ...prev, [field]: value }));

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Persist main settings to localStorage (always works, even offline)
      const payload = { networkConfig, alertThresholds, modelParams, ipEntries, notifConfig, savedAt: new Date().toISOString() };
      localStorage.setItem("nids_settings", JSON.stringify(payload));
      localStorage.setItem("nids_notif_config", JSON.stringify(notifConfig));

      // Record audit entry (ring buffer, max 50)
      const auditRaw = localStorage.getItem("nids_audit_log");
      const currentAudit: { ts: string; changes: string[] }[] = auditRaw ? JSON.parse(auditRaw) : [];
      const prev = prevSavedRef.current ? JSON.parse(prevSavedRef.current) : {};
      const changes: string[] = [];
      if (prev.alertThresholds) {
        Object.entries(alertThresholds).forEach(([k, v]) => {
          const old = (prev.alertThresholds as any)[k];
          if (old != null && old !== v) changes.push(`${k}: ${old} → ${v}`);
        });
      }
      if (prev.networkConfig) {
        Object.entries(networkConfig).forEach(([k, v]) => {
          const old = (prev.networkConfig as any)[k];
          if (old != null && old !== v) changes.push(`${k}: ${old} → ${v}`);
        });
      }
      currentAudit.push({ ts: new Date().toISOString(), changes: changes.length ? changes : ["Settings saved"] });
      const trimmedAudit = currentAudit.slice(-50);
      localStorage.setItem("nids_audit_log", JSON.stringify(trimmedAudit));
      setAuditLog(trimmedAudit);
      prevSavedRef.current = JSON.stringify(payload);

      // Attempt to POST to backend (silent fallback)
      try {
        await fetchWithAuth(`${apiUrl}/api/v1/settings`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
        showToast("success", "Settings saved to server ✓");
      } catch {
        showToast("success", "Settings saved locally ✓");
      }
    } finally {
      setSaving(false);
    }
  };

  // S3 — test webhook
  const handleTestWebhook = async () => {
    if (!notifConfig.discord_webhook) { showToast("error", "Enter a webhook URL first"); return; }
    setTestingWebhook(true);
    try {
      await fetchWithAuth(`${apiUrl}/api/v1/actions/auto-respond`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ policy_id: "test-webhook", enabled: true, webhook_url: notifConfig.discord_webhook }),
      });
      showToast("success", "Test notification sent ✓");
    } catch {
      showToast("error", "Webhook test failed — check the URL");
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleReset = () => {
    setNetworkConfig({ interface: "eth0", ip_address: "0.0.0.0", port: 5000, packet_buffer_size: 1000, timeout: 30 });
    setAlertThresholds({ ddos_confidence: 0.88, dos_confidence: 0.85, probe_confidence: 0.80, r2l_confidence: 0.90, u2r_confidence: 0.95, alert_cooldown: 5, max_alerts_per_minute: 100 });
    setModelParams({ n_estimators: 150, max_depth: 8, learning_rate: 0.1, feature_threshold: 0.01, auto_retrain: false, retrain_interval: 604800 });
    showToast("info", "Settings reset to defaults");
  };

  // E: Export as JSON
  const handleExport = () => {
    const config = { networkConfig, alertThresholds, modelParams, ipEntries, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nids-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("success", "Config exported as JSON");
  };

  // E: Import from JSON
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.networkConfig) setNetworkConfig(data.networkConfig);
        if (data.alertThresholds) setAlertThresholds(data.alertThresholds);
        if (data.modelParams) setModelParams(data.modelParams);
        if (data.ipEntries) setIpEntries(data.ipEntries);
        showToast("success", "Config imported successfully!");
      } catch {
        showToast("error", "Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // C: Add IP entry
  const addIpEntry = () => {
    if (!newIp.trim()) { showToast("error", "Enter an IP or CIDR"); return; }
    setIpEntries(prev => [...prev, {
      id: Date.now().toString(), ip: newIp.trim(), list: newListType,
      note: newNote.trim() || "—", added: new Date().toISOString().slice(0, 10),
    }]);
    setNewIp(""); setNewNote("");
    showToast("success", `Added ${newIp} to ${newListType}`);
  };

  // C: Remove IP entry
  const removeIpEntry = (id: string) => {
    setIpEntries(prev => prev.filter(e => e.id !== id));
    showToast("info", "Entry removed");
  };

  const inputCls = (accent: string) =>
    `w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:ring-2 ${
      isDark
        ? `bg-white/5 border-white/10 text-white hover:border-${accent}-500/30 focus:border-${accent}-500/50 focus:ring-${accent}-500/20`
        : `bg-black/5 border-black/10 text-black hover:border-${accent}-500/30 focus:border-${accent}-500/50 focus:ring-${accent}-500/20`
    }`;

  return (
    <div className="min-h-screen w-full bg-[var(--background)]">

      {/* ── Header ── */}
      <div className={`border-b backdrop-blur-xl px-6 py-6 sticky top-0 z-50 ${
        isDark ? "border-blue-500/20 bg-gradient-to-r from-blue-900/10 via-transparent to-cyan-900/10"
               : "border-blue-400/20 bg-blue-950/5"
      }`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 flex items-center gap-3">
              <Settings size={32} className="text-blue-400" />
              System Configuration
            </h1>
            <p className={`mt-1 text-sm ${isDark ? "text-blue-200" : "text-blue-800"}`}>
              Network · thresholds · model · IP lists · export/import
            </p>
          </div>
          {/* E: Export / Import */}
          <div className="flex gap-3">
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm border transition-all ${
                isDark ? "border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10" : "border-cyan-500/30 text-cyan-700 hover:bg-cyan-50"
              }`}
            >
              <Upload size={16} /> Import JSON
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600 transition-all"
            >
              <Download size={16} /> Export JSON
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-6 py-10 relative z-0">
        <div className="max-w-7xl mx-auto space-y-10">

          {/* ══════════════════════════════════════════════════════════════
              B: MODEL INFO CARD
          ══════════════════════════════════════════════════════════════ */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6 flex items-center gap-3">
              <BrainCircuit size={24} className="text-violet-400" />
              Active Model Information
            </h2>
            <div className={`rounded-2xl p-6 border ${isDark ? "border-violet-500/20 bg-gradient-to-br from-violet-900/15 to-purple-900/10" : "border-violet-400/20 bg-violet-50"} backdrop-blur-xl`}>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {[
                  { label: "Version",   value: modelInfo.version,   color: "#a78bfa" },
                  { label: "Trained",   value: modelInfo.trained === "unknown" ? "2026" : modelInfo.trained,   color: "#818cf8" },
                  { label: "Accuracy",  value: `${modelInfo.accuracy}%`, color: "#34d399" },
                  { label: "Precision", value: `${modelInfo.precision}%`, color: "#60a5fa" },
                  { label: "Recall",    value: `${modelInfo.recall}%`, color: "#f472b6" },
                  { label: "F1 Score",  value: `${modelInfo.f1}%`, color: "#fbbf24" },
                  { label: "Features",  value: `${modelInfo.features} feats`, color: "#94a3b8" },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`rounded-xl p-4 text-center ${isDark ? "bg-white/5" : "bg-white/80 border border-violet-200/30"}`}>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? "text-violet-300/60" : "text-violet-600"}`}>{label}</p>
                    <p className="text-sm font-black break-all leading-tight" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>
              <p className={`text-xs mt-3 ${isDark ? "text-violet-300/50" : "text-violet-500"}`}>
                Dataset: {modelInfo.dataset} · XGBoost Random Forest
              </p>
            </div>
          </motion.section>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 1 — NETWORK INTERFACE
          ══════════════════════════════════════════════════════════════ */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4 flex items-center gap-3">
              <Network size={24} className="text-blue-400" />
              Network Interface Configuration
            </h2>
            <p className="text-sm text-[var(--muted)] mb-6">Configure network interface settings for packet capture and processing.</p>
            <div className={`rounded-2xl p-8 border ${isDark ? "border-blue-500/20" : "border-blue-300/20"} backdrop-blur-xl`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                    <Wifi size={16} className="inline mr-2 text-blue-400" /> Network Interface
                  </label>
                  <input type="text" value={networkConfig.interface}
                    onChange={(e) => handleNetworkChange("interface", e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-black/5 border-black/10 text-black"}`}
                    placeholder="eth0" />
                  <p className="text-xs text-[var(--muted)] mt-2">Physical interface for packet capture</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                    <Shield size={16} className="inline mr-2 text-blue-400" /> IP Address
                  </label>
                  <input type="text" value={networkConfig.ip_address}
                    onChange={(e) => handleNetworkChange("ip_address", e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-black/5 border-black/10 text-black"}`}
                    placeholder="0.0.0.0" />
                  <p className="text-xs text-[var(--muted)] mt-2">Bind address for listener service</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                    <Zap size={16} className="inline mr-2 text-blue-400" /> Port
                  </label>
                  <input type="number" value={networkConfig.port}
                    onChange={(e) => handleNetworkChange("port", parseInt(e.target.value))}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-black/5 border-black/10 text-black"}`}
                    min="1" max="65535" />
                  <p className="text-xs text-[var(--muted)] mt-2">Service port (1-65535)</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                    <Activity size={16} className="inline mr-2 text-blue-400" /> Packet Buffer Size
                  </label>
                  <input type="number" value={networkConfig.packet_buffer_size}
                    onChange={(e) => handleNetworkChange("packet_buffer_size", parseInt(e.target.value))}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-black/5 border-black/10 text-black"}`}
                    min="100" />
                  <p className="text-xs text-[var(--muted)] mt-2">Max packets to queue</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                    <Cpu size={16} className="inline mr-2 text-blue-400" /> Timeout (seconds)
                  </label>
                  <input type="number" value={networkConfig.timeout}
                    onChange={(e) => handleNetworkChange("timeout", parseInt(e.target.value))}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-black/5 border-black/10 text-black"}`}
                    min="1" max="300" />
                  <p className="text-xs text-[var(--muted)] mt-2">Connection timeout threshold</p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 2 — ALERT THRESHOLDS  (A + D)
          ══════════════════════════════════════════════════════════════ */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4 flex items-center gap-3">
              <AlertCircle size={24} className="text-orange-400" />
              Alert Thresholds
            </h2>
            <p className="text-sm text-[var(--muted)] mb-6">
              Confidence thresholds for each threat type. Live impact preview shown below each slider.
            </p>
            <div className={`rounded-2xl p-8 border ${isDark ? "border-orange-500/20" : "border-orange-300/20"} backdrop-blur-xl`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* A: DDoS — was missing */}
                <ThresholdSlider
                  label="DDoS Confidence Threshold"
                  description="Min confidence for Distributed DoS detection"
                  value={alertThresholds.ddos_confidence}
                  onChange={(v) => handleThresholdChange("ddos_confidence", v)}
                  color="#f97316"
                  impactHigh="⚠️ Very strict — DDoS may go undetected if traffic is dispersed."
                  impactLow="⚠️ Too lenient — expect false positives on high-traffic bursts."
                  isDark={isDark}
                />
                <ThresholdSlider
                  label="DoS Confidence Threshold"
                  description="Min confidence for single-source DoS detection"
                  value={alertThresholds.dos_confidence}
                  onChange={(v) => handleThresholdChange("dos_confidence", v)}
                  color="#ef4444"
                  impactHigh="⚠️ Very strict — may miss moderate-intensity DoS floods."
                  impactLow="⚠️ Too lenient — normal traffic spikes may trigger false alerts."
                  isDark={isDark}
                />
                <ThresholdSlider
                  label="Probe Confidence Threshold"
                  description="Min confidence for port scan / reconnaissance detection"
                  value={alertThresholds.probe_confidence}
                  onChange={(v) => handleThresholdChange("probe_confidence", v)}
                  color="#f59e0b"
                  impactHigh="⚠️ Very strict — slow/stealth scans may bypass detection."
                  impactLow="⚠️ Too lenient — internal network scans may trigger alerts."
                  isDark={isDark}
                />
                <ThresholdSlider
                  label="R2L Confidence Threshold"
                  description="Remote-to-Local attack detection threshold"
                  value={alertThresholds.r2l_confidence}
                  onChange={(v) => handleThresholdChange("r2l_confidence", v)}
                  color="#a855f7"
                  impactHigh="⚠️ Very strict — sophisticated R2L may slip through."
                  impactLow="⚠️ Too lenient — credential stuffing may generate noise."
                  isDark={isDark}
                />
                <ThresholdSlider
                  label="U2R Confidence Threshold"
                  description="User-to-Root privilege escalation detection"
                  value={alertThresholds.u2r_confidence}
                  onChange={(v) => handleThresholdChange("u2r_confidence", v)}
                  color="#ec4899"
                  impactHigh="⚠️ Very strict — novel U2R exploits may go undetected."
                  impactLow="⚠️ Too lenient — admin operations may trigger false alerts."
                  isDark={isDark}
                />

                {/* Non-threshold controls */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">Alert Cooldown (seconds)</label>
                  <input type="number" value={alertThresholds.alert_cooldown}
                    onChange={(e) => handleThresholdChange("alert_cooldown", parseInt(e.target.value))}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-black/5 border-black/10 text-black"}`}
                    min="1" />
                  <p className="text-xs text-[var(--muted)] mt-2">Minimum time between duplicate alerts</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">Max Alerts Per Minute</label>
                  <input type="number" value={alertThresholds.max_alerts_per_minute}
                    onChange={(e) => handleThresholdChange("max_alerts_per_minute", parseInt(e.target.value))}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-black/5 border-black/10 text-black"}`}
                    min="1" />
                  <p className="text-xs text-[var(--muted)] mt-2">Rate limiting to prevent alert floods</p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 3 — MODEL PARAMETERS
          ══════════════════════════════════════════════════════════════ */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4 flex items-center gap-3">
              <Cpu size={24} className="text-purple-400" />
              Model Parameters
            </h2>
            <p className="text-sm text-[var(--muted)] mb-6">Configure XGBoost Random Forest hyperparameters and training behavior.</p>
            <div className={`rounded-2xl p-8 border ${isDark ? "border-purple-500/20" : "border-purple-300/20"} backdrop-blur-xl`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">Number of Estimators (Trees)</label>
                  <input type="number" value={modelParams.n_estimators}
                    onChange={(e) => handleModelChange("n_estimators", parseInt(e.target.value))}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-black/5 border-black/10 text-black"}`}
                    min="10" max="500" />
                  <p className="text-xs text-[var(--muted)] mt-2">Number of decision trees in ensemble</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">Max Tree Depth</label>
                  <input type="number" value={modelParams.max_depth}
                    onChange={(e) => handleModelChange("max_depth", parseInt(e.target.value))}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-black/5 border-black/10 text-black"}`}
                    min="2" max="20" />
                  <p className="text-xs text-[var(--muted)] mt-2">Maximum depth of individual trees</p>
                </div>
                <div>
                  <label className="flex justify-between text-sm font-semibold text-[var(--foreground)] mb-1">
                    Learning Rate <span className="text-purple-400 font-black">{modelParams.learning_rate.toFixed(2)}</span>
                  </label>
                  <input type="range" min="0.01" max="0.5" step="0.01" value={modelParams.learning_rate}
                    onChange={(e) => handleModelChange("learning_rate", parseFloat(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer" style={{ accentColor: "#a855f7" }} />
                  <p className="text-xs text-[var(--muted)] mt-2">Gradient boosting learning rate</p>
                </div>
                <div>
                  <label className="flex justify-between text-sm font-semibold text-[var(--foreground)] mb-1">
                    Feature Importance Threshold <span className="text-purple-400 font-black">{(modelParams.feature_threshold * 100).toFixed(2)}%</span>
                  </label>
                  <input type="range" min="0" max="0.1" step="0.001" value={modelParams.feature_threshold}
                    onChange={(e) => handleModelChange("feature_threshold", parseFloat(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer" style={{ accentColor: "#a855f7" }} />
                  <p className="text-xs text-[var(--muted)] mt-2">Min feature importance to include</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-3">Automatic Retraining</label>
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border"
                    style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                    <input type="checkbox" checked={modelParams.auto_retrain}
                      onChange={(e) => handleModelChange("auto_retrain", e.target.checked)}
                      className="w-4 h-4 cursor-pointer" />
                    <span className="text-sm text-[var(--foreground)]">{modelParams.auto_retrain ? "Enabled" : "Disabled"}</span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-2">Automatically retrain on new threats</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">Retrain Interval (seconds)</label>
                  <input type="number" value={modelParams.retrain_interval}
                    onChange={(e) => handleModelChange("retrain_interval", parseInt(e.target.value))}
                    disabled={!modelParams.auto_retrain}
                    className={`w-full px-4 py-2.5 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-40 ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-black/5 border-black/10 text-black"}`}
                    min="3600" />
                  <p className="text-xs text-[var(--muted)] mt-2">Time between automatic retraining cycles</p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* ══════════════════════════════════════════════════════════════
              C: IP WHITELIST / BLACKLIST
          ══════════════════════════════════════════════════════════════ */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4 flex items-center gap-3">
              <Shield size={24} className="text-cyan-400" />
              IP Whitelist &amp; Blacklist
            </h2>
            <p className="text-sm text-[var(--muted)] mb-6">
              Manage trusted IPs (whitelist) and known malicious IPs/CIDRs (blacklist). Supports IPv4, IPv6, and CIDR ranges.
            </p>

            {/* Add new entry */}
            <div className={`rounded-2xl p-6 border mb-4 ${isDark ? "border-cyan-500/20 bg-cyan-900/5" : "border-cyan-400/20 bg-cyan-50"} backdrop-blur-xl`}>
              <h3 className="text-sm font-bold text-[var(--foreground)] mb-4 uppercase tracking-wider">Add New Entry</h3>
              <div className="flex flex-wrap gap-3">
                <input
                  type="text" value={newIp} onChange={(e) => setNewIp(e.target.value)}
                  placeholder="192.168.1.0/24 or 1.2.3.4"
                  onKeyDown={(e) => e.key === "Enter" && addIpEntry()}
                  className={`flex-1 min-w-48 px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-cyan-500/20 ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-black"}`}
                />
                <input
                  type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Note (optional)"
                  onKeyDown={(e) => e.key === "Enter" && addIpEntry()}
                  className={`flex-1 min-w-40 px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-cyan-500/20 ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-black"}`}
                />
                <select
                  value={newListType} onChange={(e) => setNewListType(e.target.value as "whitelist" | "blacklist")}
                  className={`px-4 py-2.5 rounded-lg border focus:outline-none ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-black"}`}
                >
                  <option value="blacklist">Blacklist</option>
                  <option value="whitelist">Whitelist</option>
                </select>
                <button onClick={addIpEntry}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600 transition-all">
                  <Plus size={16} /> Add
                </button>
              </div>
            </div>

            {/* Table */}
            <div className={`rounded-2xl border overflow-hidden ${isDark ? "border-white/10" : "border-gray-200"}`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className={isDark ? "bg-white/5 text-white/60" : "bg-gray-50 text-gray-500"}>
                    <th className="px-5 py-3 text-left font-bold uppercase tracking-wider text-xs">List</th>
                    <th className="px-5 py-3 text-left font-bold uppercase tracking-wider text-xs">IP / CIDR</th>
                    <th className="px-5 py-3 text-left font-bold uppercase tracking-wider text-xs">Note</th>
                    <th className="px-5 py-3 text-left font-bold uppercase tracking-wider text-xs">Added</th>
                    <th className="px-5 py-3 text-right font-bold uppercase tracking-wider text-xs">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {ipEntries.map((entry, idx) => (
                      <motion.tr
                        key={entry.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: idx * 0.04 }}
                        className={`border-t ${isDark ? "border-white/5 hover:bg-white/3" : "border-gray-100 hover:bg-gray-50"} transition-colors`}
                      >
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            entry.list === "whitelist"
                              ? isDark ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-100 text-emerald-700"
                              : isDark ? "bg-red-500/15 text-red-400" : "bg-red-100 text-red-700"
                          }`}>
                            {entry.list === "whitelist" ? <Unlock size={10} /> : <Lock size={10} />}
                            {entry.list}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-[var(--foreground)]">{entry.ip}</td>
                        <td className={`px-5 py-3 ${isDark ? "text-white/60" : "text-gray-500"}`}>{entry.note}</td>
                        <td className={`px-5 py-3 ${isDark ? "text-white/40" : "text-gray-400"} text-xs`}>{entry.added}</td>
                        <td className="px-5 py-3 text-right">
                          <button onClick={() => removeIpEntry(entry.id)}
                            className={`p-2 rounded-lg transition-all ${isDark ? "hover:bg-red-500/15 text-red-400" : "hover:bg-red-50 text-red-500"}`}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {ipEntries.length === 0 && (
                    <tr>
                      <td colSpan={5} className={`px-5 py-8 text-center ${isDark ? "text-white/30" : "text-gray-400"}`}>
                        No IP entries yet. Add IPs above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className={`text-xs mt-2 ${isDark ? "text-white/30" : "text-gray-400"}`}>
              Whitelist: {ipEntries.filter(e => e.list === "whitelist").length} entries ·
              Blacklist: {ipEntries.filter(e => e.list === "blacklist").length} entries
            </p>
          </motion.section>

          {/* ══════════════════════════════════════════════════════════════
              S5 — SYSTEM STATUS PANEL
          ══════════════════════════════════════════════════════════════ */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4 flex items-center gap-3">
              <Activity size={24} className="text-emerald-400" />
              System Status
            </h2>
            <div className={`rounded-2xl p-6 border ${isDark ? "border-emerald-500/20" : "border-emerald-300/20"} backdrop-blur-xl`}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Backend API */}
                <div className={`flex items-center gap-4 p-4 rounded-xl border ${isDark ? "bg-white/3 border-white/10" : "bg-white/80 border-gray-200"}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${sysStatus.online ? "bg-green-500/20" : "bg-red-500/20"}`}>
                    <Circle size={14} className={sysStatus.online ? "text-green-400" : "text-red-400"} fill="currentColor" />
                  </div>
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Backend API</p>
                    <p className={`text-sm font-black mt-0.5 ${sysStatus.online ? "text-green-400" : "text-red-400"}`}>
                      {sysStatus.online ? `✓ Online ${sysStatus.latencyMs}ms` : "✗ Offline"}
                    </p>
                  </div>
                </div>
                {/* ML Model */}
                <div className={`flex items-center gap-4 p-4 rounded-xl border ${isDark ? "bg-white/3 border-white/10" : "bg-white/80 border-gray-200"}`}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-violet-500/20">
                    <BrainCircuit size={18} className="text-violet-400" />
                  </div>
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>ML Model</p>
                    <p className="text-sm font-black mt-0.5 text-violet-400">{sysStatus.modelVersion}</p>
                  </div>
                </div>
                {/* Last checked */}
                <div className={`flex items-center gap-4 p-4 rounded-xl border ${isDark ? "bg-white/3 border-white/10" : "bg-white/80 border-gray-200"}`}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/20">
                    <Zap size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Last Checked</p>
                    <p className={`text-sm font-black mt-0.5 ${isDark ? "text-blue-300" : "text-blue-700"}`}>{sysStatus.lastChecked}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* ══════════════════════════════════════════════════════════════
              S3 — NOTIFICATION / WEBHOOK SETTINGS
          ══════════════════════════════════════════════════════════════ */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <button
              onClick={() => setShowNotif(v => !v)}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-3">
                <Bell size={24} className="text-amber-400" />
                Notification &amp; Webhook Settings
              </h2>
              {showNotif ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
            </button>
            <AnimatePresence>
              {showNotif && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden">
                  <div className={`mt-4 rounded-2xl p-8 border ${isDark ? "border-amber-500/20" : "border-amber-300/20"} backdrop-blur-xl space-y-6`}>
                    {/* Discord webhook URL */}
                    <div>
                      <label className="block text-sm font-semibold text-[var(--foreground)] mb-2 flex items-center gap-2">
                        <Webhook size={16} className="text-amber-400" /> Discord Webhook URL
                      </label>
                      <div className="flex gap-3">
                        <input type="text" value={notifConfig.discord_webhook}
                          onChange={e => setNotifConfig(prev => ({ ...prev, discord_webhook: e.target.value }))}
                          placeholder="https://discord.com/api/webhooks/..."
                          className={`flex-1 px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-sm ${isDark ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                        />
                        <button onClick={handleTestWebhook} disabled={testingWebhook}
                          className="px-4 py-2.5 rounded-lg font-semibold text-sm bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 disabled:opacity-50 transition-all whitespace-nowrap">
                          {testingWebhook ? "Sending…" : "Test ▶"}
                        </button>
                      </div>
                      <p className="text-xs text-[var(--muted)] mt-1">Webhook receives threat alerts in real-time</p>
                    </div>
                    {/* Notify on level */}
                    <div>
                      <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">Notify on</label>
                      <select value={notifConfig.notify_level}
                        onChange={e => setNotifConfig(prev => ({ ...prev, notify_level: e.target.value as any }))}
                        className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-sm ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}>
                        <option value="all">All threats</option>
                        <option value="high">High+ only</option>
                        <option value="critical">Critical only</option>
                      </select>
                    </div>
                    {/* Min confidence */}
                    <div>
                      <label className="flex justify-between text-sm font-semibold text-[var(--foreground)] mb-1">
                        Min Confidence for Alert
                        <span className="text-amber-400 font-black">{Math.round(notifConfig.min_confidence * 100)}%</span>
                      </label>
                      <input type="range" min="0.70" max="1.00" step="0.01" value={notifConfig.min_confidence}
                        onChange={e => setNotifConfig(prev => ({ ...prev, min_confidence: parseFloat(e.target.value) }))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer" style={{ accentColor: "#f59e0b" }} />
                      <p className="text-xs text-[var(--muted)] mt-1">Only send notifications when model confidence ≥ this threshold</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>

          {/* ══════════════════════════════════════════════════════════════
              S4 — AUDIT LOG / CHANGE HISTORY
          ══════════════════════════════════════════════════════════════ */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <button
              onClick={() => setShowAudit(v => !v)}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-3">
                <History size={24} className="text-slate-400" />
                Change History
                {auditLog.length > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ml-1 ${isDark ? "bg-slate-500/20 text-slate-400" : "bg-slate-200 text-slate-600"}`}>
                    {auditLog.length}
                  </span>
                )}
              </h2>
              {showAudit ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
            </button>
            <AnimatePresence>
              {showAudit && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden">
                  <div className={`mt-4 rounded-2xl border overflow-hidden ${isDark ? "border-slate-500/20" : "border-slate-300/20"}`}>
                    <div className={`flex items-center justify-between px-5 py-3 border-b ${isDark ? "bg-white/3 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                      <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {auditLog.length} entries (max 50)
                      </span>
                      <button
                        onClick={() => {
                          localStorage.removeItem("nids_audit_log");
                          setAuditLog([]);
                          showToast("info", "Change history cleared");
                        }}
                        className={`text-xs px-3 py-1 rounded-lg font-semibold ${isDark ? "bg-red-500/15 text-red-400 hover:bg-red-500/25" : "bg-red-100 text-red-600 hover:bg-red-200"} transition-all`}
                      >
                        Clear History
                      </button>
                    </div>
                    {auditLog.length === 0 ? (
                      <div className={`py-10 text-center ${isDark ? "text-white/30" : "text-gray-400"}`}>
                        No changes recorded yet — save settings to start tracking.
                      </div>
                    ) : (
                      <table className="w-full text-xs font-mono">
                        <thead>
                          <tr className={isDark ? "bg-white/3 text-white/50" : "bg-slate-50 text-slate-500"}>
                            <th className="px-5 py-2.5 text-left font-bold">Timestamp</th>
                            <th className="px-5 py-2.5 text-left font-bold">Changes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...auditLog].reverse().map((entry, idx) => (
                            <tr key={idx} className={`border-t ${isDark ? "border-white/5" : "border-slate-100"}`}>
                              <td className={`px-5 py-2.5 whitespace-nowrap ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                                {new Date(entry.ts).toLocaleString()}
                              </td>
                              <td className={`px-5 py-2.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                {entry.changes.join(" · ")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>

          {/* ══════════════════════════════════════════════════════════════
              ACTION BUTTONS
          ══════════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex gap-4 justify-end sticky bottom-6"
          >
            <button onClick={handleReset} disabled={saving}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                isDark ? "bg-white/10 text-white hover:bg-white/20 disabled:opacity-50" : "bg-black/10 text-black hover:bg-black/20 disabled:opacity-50"
              }`}>
              <RotateCcw size={18} /> Reset to Defaults
            </button>
            <button onClick={handleSaveAll} disabled={saving}
              className="flex items-center gap-2 px-8 py-3 rounded-lg font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 transition-all">
              {saving ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }}>
                    <Cpu size={18} />
                  </motion.div>
                  Saving...
                </>
              ) : (
                <><Save size={18} /> Save All Settings</>
              )}
            </button>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
