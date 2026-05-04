"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  BrainCircuit, Cpu, Target, Layers, CheckCircle2,
  AlertTriangle, Activity, Table2, FlaskConical, Zap, Info,
} from "lucide-react";
import { getToken, fetchWithAuth } from "@/lib/auth";
import { getApiUrl } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClassMetric {
  precision: number; recall: number; f1: number; support: number;
}
interface ModelMetrics {
  model: {
    type: string; n_estimators: number; max_depth: number;
    n_features: number; n_classes: number; classes: string[];
    feature_names: string[]; feature_descriptions: Record<string, string>;
    feature_importances: Record<string, number>;
  };
  accuracy: {
    overall_accuracy: number;
    by_class: Record<string, ClassMetric>;
    confusion_matrix: number[][];
    confusion_labels: string[];
  };
}
interface Packet {
  id: string; timestamp: string; src_ip: string; dst_ip: string;
  label: string; confidence: number;
  duration: number; protocol_type: string; service: string; flag: string;
  src_bytes: number; dst_bytes: number; count: number; srv_count: number;
  serror_rate: number; rerror_rate: number; same_srv_rate: number; diff_srv_rate: number;
}

// ─── Feature Type Mapping ────────────────────────────────────────────────────

const FEATURE_TYPES: Record<string, string> = {
  "duration": "numeric",
  "protocol_type": "categorical",
  "service": "categorical",
  "flag": "categorical",
  "src_bytes": "numeric",
  "dst_bytes": "numeric",
  "count": "numeric",
  "srv_count": "numeric",
  "serror_rate": "numeric",
  "rerror_rate": "numeric",
  "same_srv_rate": "numeric",
  "diff_srv_rate": "numeric",
};

const TYPE_ICONS: Record<string, string> = {
  "numeric": "🔢",
  "categorical": "🏷️",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LABEL_COLORS: Record<string, string> = {
  "DoS": "#ef4444",
  "Probe": "#f59e0b",
  "R2L (Unauthorized Access)": "#8b5cf6",
  "U2R (Root Access)": "#ec4899",
  "Normal": "#10b981",
};

const BAR_COLORS = [
  "#8b5cf6","#6366f1","#3b82f6","#06b6d4","#10b981",
  "#f59e0b","#ef4444","#ec4899","#14b8a6","#a855f7","#64748b","#0ea5e9",
];

function pct(n: number) { return `${n.toFixed(2)}%`; }

function MetricCard({ label, value, icon: Icon, color }: {
  label: string; value: string; icon: React.ElementType; color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl p-6 flex items-center gap-4 border border-[var(--glass-border)] hover:border-[var(--glass-border)]/50 transition-all"
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}25` }}>
        <Icon size={22} style={{ color }} className="drop-shadow-lg" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-1">{label}</p>
        <p className="text-3xl font-black" style={{ color }}>{value}</p>
      </div>
    </motion.div>
  );
}

// ─── Confusion Matrix ─────────────────────────────────────────────────────────

function ConfusionMatrix({ matrix, labels }: { matrix: number[][]; labels: string[] }) {
  const maxVal = Math.max(...matrix.flat());
  const short = (l: string) => l.split(" ")[0];

  return (
    <div className="overflow-x-auto">
      <table className="text-[10px] border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="text-[var(--muted)] text-left pr-2 pb-1 font-semibold">Actual ↓ / Pred →</th>
            {labels.map(l => (
              <th key={l} className="text-center font-bold text-[var(--muted)] pb-1 min-w-[56px]">
                {short(l)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, ri) => (
            <tr key={ri}>
              <td className="pr-2 font-bold text-[var(--foreground)] whitespace-nowrap">
                {short(labels[ri])}
              </td>
              {row.map((val, ci) => {
                const intensity = val / maxVal;
                const isDiag = ri === ci;
                const bg = isDiag
                  ? `rgba(16,185,129,${0.15 + intensity * 0.6})`
                  : val > 0 ? `rgba(239,68,68,${0.1 + intensity * 0.5})` : "rgba(148,163,184,0.04)";
                return (
                  <td key={ci} className="text-center rounded-lg p-1.5 font-mono font-semibold transition-all"
                    style={{ background: bg, color: isDiag ? "#10b981" : val > 0 ? "#ef4444" : "var(--muted)" }}>
                    {val.toLocaleString()}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Feature Importance Enhanced ──────────────────────────────────────────────

function FeatureImportanceChart({ data, descriptions }: {
  data: Array<{ name: string; value: number; type: string }>;
  descriptions: Record<string, string>;
}) {
  // Add ranks + format for display
  const rankedData = data
    .map((d, idx) => ({
      ...d,
      rank: idx + 1,
      valuePercent: (d.value * 100).toFixed(2),
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex gap-6 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔢</span>
          <span className="text-[var(--muted)]">Numeric</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">🏷️</span>
          <span className="text-[var(--muted)]">Categorical</span>
        </div>
      </div>

      {/* Chart - Fixed Height Container */}
      <div className="w-full h-[500px] mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rankedData}
            layout="vertical"
            margin={{ left: 150, right: 40, top: 10, bottom: 10 }}
          >
            <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted)" }} tickFormatter={v => `${(v * 100).toFixed(1)}%`} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "var(--foreground)" }}
              width={140}
            />
            <Tooltip
              formatter={(v: any) => {
                if (typeof v === 'number') return [`${(v * 100).toFixed(3)}%`, "Importance"];
                return [v, "Importance"];
              }}
              contentStyle={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 10, fontSize: 11 }}
              cursor={{ fill: "rgba(100,100,100,0.1)" }}
            />
            <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]}>
              {rankedData.map((entry, i) => (
                <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Feature Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        {rankedData.map((feature, idx) => (
          <motion.div
            key={feature.name}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="glass-panel rounded-lg p-4 border border-[var(--glass-border)]/50 hover:border-[var(--glass-border)]/80 transition-all"
          >
            {/* Header with Rank + Type */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                  <span className="text-xs font-bold text-purple-400">#{feature.rank}</span>
                </div>
                <div className="text-lg">{TYPE_ICONS[feature.type] || "?"}</div>
              </div>
              <span className="text-xs bg-[var(--glass-bg)] px-2.5 py-1 rounded-full text-[var(--muted)] font-medium">
                {feature.type}
              </span>
            </div>

            {/* Feature Name */}
            <p className="font-bold text-[var(--foreground)] text-sm mb-1">{feature.name}</p>

            {/* Description */}
            <p className="text-xs text-[var(--muted)] mb-3 line-clamp-2">{descriptions[feature.name] || "—"}</p>

            {/* Importance Bar + Value */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2.5 bg-[var(--glass-border)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, feature.value * 800)}%`,
                    background: BAR_COLORS[idx % BAR_COLORS.length],
                  }}
                />
              </div>
              <span className="font-bold text-sm font-mono whitespace-nowrap" style={{ color: BAR_COLORS[idx % BAR_COLORS.length] }}>
                {feature.valuePercent}%
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MLAnalyticsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const apiUrl = getApiUrl();

  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingPackets, setLoadingPackets] = useState(true);

  useEffect(() => {
    if (!getToken()) router.push("/login");
  }, [router]);

  useEffect(() => {
    fetchWithAuth(`${apiUrl}/api/v1/models/metrics`)
      .then(r => r.json())
      .then(setMetrics)
      .catch(console.error)
      .finally(() => setLoadingMetrics(false));

    fetchWithAuth(`${apiUrl}/api/v1/models/preprocessed?limit=15`)
      .then(r => r.json())
      .then(d => setPackets(d.packets || []))
      .catch(console.error)
      .finally(() => setLoadingPackets(false));
  }, [apiUrl]);

  useEffect(() => {
    if (!loadingMetrics && !metrics) {
      console.warn("ML Page: Failed to load model metrics from API");
    }
    if (!loadingPackets && packets.length === 0) {
      console.info("ML Page: No packet data loaded - DB may be empty");
    }
  }, [loadingMetrics, metrics, loadingPackets, packets]);

  const importanceData = metrics
    ? Object.entries(metrics.model.feature_importances)
        .map(([name, val]) => ({ name, value: val, type: FEATURE_TYPES[name] || "unknown" }))
        .sort((a, b) => b.value - a.value)
    : [];

  const classRows = metrics
    ? Object.entries(metrics.accuracy.by_class).map(([label, m]) => ({ label, ...m }))
    : [];

  const samplePacket: Record<string, string | number> = {
    duration: 0.1, protocol_type: "tcp", service: "http", flag: "SF",
    src_bytes: 512, dst_bytes: 0, count: 1, srv_count: 3,
    serror_rate: 0.05, rerror_rate: 0.0, same_srv_rate: 1.0, diff_srv_rate: 0.0,
  };

  return (
    <div className="min-h-screen w-full bg-[var(--background)]">

      {/* ── Header ── */}
      <div className={`border-b backdrop-blur-xl px-6 py-6 sticky top-0 z-50 ${
        isDark
          ? "border-purple-500/20 bg-gradient-to-r from-purple-900/10 via-transparent to-indigo-900/10"
          : "border-purple-400/20 bg-purple-950/5"
      }`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-400 to-cyan-400 flex items-center gap-3">
              <BrainCircuit size={32} className="text-purple-400" />
              ML Analytics
            </h1>
            <p className={`mt-1 text-sm ${isDark ? "text-purple-200" : "text-purple-800"}`}>
              XGBoost Random Forest model performance · feature extraction · preprocessed traffic analysis
            </p>
          </div>
          {metrics && (
            <div className="hidden md:flex items-center gap-2 glass-panel px-4 py-2 rounded-xl text-xs font-semibold text-[var(--foreground)]">
              <Cpu size={13} />
              {metrics.model.type} · {metrics.model.n_estimators} trees · depth {metrics.model.max_depth}
            </div>
          )}
        </div>
      </div>

      {/* ── Purpose Section ── */}
      <div className="px-6 py-8 border-b border-purple-500/10 relative z-0">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-2xl p-8 border border-purple-500/20"
          >
            <div className="flex gap-4 mb-4">
              <Info size={24} className="text-purple-400 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)] mb-3">What is ML Analytics?</h2>
                <ul className="space-y-2 text-sm text-[var(--muted)]">
                  <li>✓ <strong>Model Insights:</strong> View Random Forest classifier performance metrics, confusion matrix, and per-class detection accuracy</li>
                  <li>✓ <strong>Feature Importance:</strong> Understand which network features drive threat detection decisions (ranked 1-12 by importance)</li>
                  <li>✓ <strong>Data Understanding:</strong> See preprocessed traffic packets and extracted feature vectors used for training/inference</li>
                  <li>✓ <strong>Decision Transparency:</strong> Learn why certain connections are classified as threats (which features matter most)</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="w-full px-6 py-12 relative z-0">
        <div className="max-w-7xl mx-auto space-y-16">

        {/* ══════════════════════════════════════════════════════════════
            SECTION 1 — MODEL PERFORMANCE (Accuracy / Confusion Matrix)
        ══════════════════════════════════════════════════════════════ */}
        <section className="relative">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6 flex items-center gap-3">
            <Target size={20} /> Model Accuracy / Confusion Matrix
          </h2>
          <p className="text-sm text-[var(--muted)] mb-6">Shows how well the model detects each threat type. Green diagonal = correct predictions, red = misclassifications.</p>

          {loadingMetrics ? (
            <div className="glass-panel rounded-2xl p-12 flex items-center justify-center border-2 border-purple-500/30">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                <BrainCircuit size={32} className="text-purple-400" />
              </motion.div>
              <span className="ml-3 text-sm font-semibold text-purple-300">Loading model metrics…</span>
            </div>
          ) : metrics ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <MetricCard label="Overall Accuracy" value={pct(metrics.accuracy.overall_accuracy)} icon={CheckCircle2} color="#10b981" />
                <MetricCard label="Model Type" value="XGBoost" icon={Layers} color="#8b5cf6" />
                <MetricCard label="Trees" value={String(metrics.model.n_estimators)} icon={Cpu} color="#3b82f6" />
                <MetricCard label="Feature Count" value={String(metrics.model.n_features)} icon={Activity} color="#f59e0b" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-2xl p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--foreground)] mb-4 pb-3 border-b border-[var(--glass-border)]">Confusion Matrix</h3>
                  <ConfusionMatrix
                    matrix={metrics.accuracy.confusion_matrix}
                    labels={metrics.accuracy.confusion_labels}
                  />
                  <p className="text-[10px] text-[var(--muted)] mt-3 opacity-60">KDD Cup 99 benchmark · green = correct · red = misclassified</p>
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-2xl p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--foreground)] mb-4 pb-3 border-b border-[var(--glass-border)]">Per-Class Detection Results</h3>
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b-2 border-[var(--glass-border)]">
                        {["Class","Precision","Recall","F1","Support"].map(h => (
                          <th key={h} className="text-left pb-3 font-black uppercase tracking-wider text-[var(--foreground)] text-[10px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {classRows.map((row, i) => (
                        <motion.tr key={row.label}
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={`border-b border-[var(--glass-border)]/30 ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-purple-500/5"}`}
                        >
                          <td className="py-2.5 pr-2 font-semibold" style={{ color: LABEL_COLORS[row.label] || "#8b5cf6" }}>
                            {row.label.split(" ")[0]}
                          </td>
                          <td className="py-2.5 font-mono text-[var(--foreground)]">{pct(row.precision)}</td>
                          <td className="py-2.5 font-mono text-[var(--foreground)]">{pct(row.recall)}</td>
                          <td className="py-2.5 font-mono font-bold" style={{ color: LABEL_COLORS[row.label] || "#8b5cf6" }}>
                            {pct(row.f1)}
                          </td>
                          <td className="py-2.5 font-mono text-[var(--muted)]">{row.support.toLocaleString()}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
              </div>
            </>
          ) : (
            <div className="glass-panel rounded-2xl p-8 text-center border-2 border-red-500/30 bg-red-500/5">
              <AlertTriangle className="inline-block mb-3 text-red-400" size={24} />
              <p className="text-red-300 font-semibold">Could not load model metrics</p>
              <p className="text-red-200/60 text-xs mt-2">Check backend connectivity and authentication</p>
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 2 — FEATURE IMPORTANCE (ENHANCED)
        ══════════════════════════════════════════════════════════════ */}
        <section className="relative">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6 flex items-center gap-3">
            <Zap size={20} /> Feature Importance Ranking
          </h2>
          <p className="text-sm text-[var(--muted)] mb-6">Ranked by importance score (1-12). Shows which network features have the strongest influence on threat classification decisions.</p>

          {loadingMetrics ? (
            <div className="glass-panel rounded-2xl p-12 flex items-center justify-center border-2 border-purple-500/30">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                <BrainCircuit size={32} className="text-purple-400" />
              </motion.div>
              <span className="ml-3 text-sm font-semibold text-purple-300">Loading feature importance…</span>
            </div>
          ) : importanceData.length > 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-2xl p-6">
              <FeatureImportanceChart data={importanceData} descriptions={metrics?.model.feature_descriptions || {}} />
            </motion.div>
          ) : (
            <div className="glass-panel rounded-2xl p-8 text-center text-[var(--muted)] text-sm">
              No feature data available
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 3 — PREPROCESSED TRAFFIC
        ══════════════════════════════════════════════════════════════ */}
        <section className="relative">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6 flex items-center gap-3">
            <Table2 size={20} /> Preprocessed Traffic
          </h2>
          <p className="text-sm text-[var(--muted)] mb-6">Cleaned network packets with extracted features. Each row = one connection that was preprocessed and fed to the ML model.</p>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-2xl p-6 overflow-auto">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--foreground)] mb-4 pb-3 border-b border-[var(--glass-border)]">
              Recent Packets — Cleaned Feature Vectors ({packets.length} shown)
            </h3>
            {loadingPackets ? (
              <div className="flex items-center justify-center py-12 text-cyan-300 text-sm gap-3 font-semibold">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                  <Activity size={20} className="text-cyan-400" />
                </motion.div>
                Loading traffic data…
              </div>
            ) : packets.length === 0 ? (
              <div className="text-center py-12 bg-slate-500/5 rounded-lg border border-slate-500/20">
                <p className="text-[var(--muted)] text-sm font-medium">No threat data yet</p>
                <p className="text-[var(--muted)]/60 text-xs mt-1">Upload PCAP or wait for live traffic</p>
              </div>
            ) : (
              <table className="w-full text-[10px] min-w-[900px]">
                <thead>
                  <tr className="border-b-2 border-[var(--glass-border)] bg-[var(--glass-bg)]">
                    {["Timestamp","Src IP","Dst IP","Protocol","Service","Flag","src_bytes","srv_cnt","serror_r","Label","Conf"].map(h => (
                      <th key={h} className="text-left py-3 px-3 font-black uppercase tracking-wider text-[var(--foreground)] text-[10px] whitespace-nowrap sticky top-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {packets.map((p, i) => (
                    <motion.tr key={p.id}
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className={`border-b border-[var(--glass-border)]/30 ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-purple-500/5"}`}
                    >
                      <td className="py-2 px-3 font-mono text-[var(--muted)] whitespace-nowrap">
                        {new Date(p.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 px-3 font-mono text-cyan-400 whitespace-nowrap">{p.src_ip}</td>
                      <td className="py-2 px-3 font-mono text-[var(--muted)] whitespace-nowrap">{p.dst_ip}</td>
                      <td className="py-2 px-3 font-mono text-blue-400 uppercase">{p.protocol_type}</td>
                      <td className="py-2 px-3 font-mono text-[var(--foreground)]">{p.service}</td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[9px] ${
                          p.flag === "S0" ? "bg-red-500/15 text-red-400" :
                          p.flag === "REJ" ? "bg-orange-500/15 text-orange-400" :
                          "bg-green-500/15 text-green-400"
                        }`}>{p.flag}</span>
                      </td>
                      <td className="py-2 px-3 font-mono text-[var(--foreground)]">{p.src_bytes.toFixed(0)}</td>
                      <td className="py-2 px-3 font-mono text-[var(--foreground)]">{p.srv_count.toFixed(0)}</td>
                      <td className="py-2 px-3 font-mono text-[var(--foreground)]">{p.serror_rate.toFixed(2)}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded-full font-bold text-[9px]"
                          style={{
                            background: `${LABEL_COLORS[p.label] || "#8b5cf6"}20`,
                            color: LABEL_COLORS[p.label] || "#8b5cf6",
                          }}>
                          {p.label}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold" style={{ color: LABEL_COLORS[p.label] || "#8b5cf6" }}>
                        {p.confidence.toFixed(1)}%
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </motion.div>
        </section>

        </div>
      </div>
    </div>
  );
}
