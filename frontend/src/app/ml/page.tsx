"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
// BarChart used for confusion matrix visualization only
import {
  BrainCircuit, Cpu, Target, Layers, CheckCircle2,
  AlertTriangle, Activity, Table2, FlaskConical, Zap, Info,
  Flag, ThumbsUp, ThumbsDown, RotateCw, Loader,
} from "lucide-react";
import { getToken, fetchWithAuth } from "@/lib/auth";
import { getApiUrl } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";

// ─── Custom Select ───────────────────────────────────────────────────────────

function CustomSelect({
  value, onChange, options, isDark,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className={`w-full text-xs px-2.5 py-1.5 rounded-lg border font-mono flex items-center justify-between gap-2 transition-colors
          ${isDark
            ? "bg-white/5 border-white/15 text-slate-200 hover:border-purple-400/60"
            : "bg-white border-slate-300 text-slate-800 hover:border-purple-400"
          } focus:outline-none`}
      >
        <span>{value}</span>
        <svg className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""} ${isDark ? "text-slate-400" : "text-slate-500"}`}
          viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className={`absolute z-50 left-0 right-0 top-full mt-1 rounded-lg border shadow-xl overflow-hidden
          ${isDark
            ? "bg-slate-800 border-white/15 shadow-black/60"
            : "bg-white border-slate-200 shadow-slate-200/80"
          }`}>
          {options.map(o => (
            <button
              key={o}
              type="button"
              onClick={() => { onChange(o); setOpen(false); }}
              className={`w-full text-left text-xs font-mono px-3 py-2 transition-colors
                ${o === value
                  ? isDark
                    ? "bg-purple-600/40 text-purple-200 font-bold"
                    : "bg-purple-100 text-purple-800 font-bold"
                  : isDark
                    ? "text-slate-200 hover:bg-white/8"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
interface PredictionCorrection {
  id: string;
  timestamp: string;
  model_predicted: string;
  model_confidence: number;
  actual_label?: string;
  was_correct?: boolean;
  corrected_by?: string;
  notes?: string;
}
interface CorrectionStats {
  total_predictions: number;
  corrected_predictions: number;
  correction_rate: number;
  accuracy_with_corrections?: number;
  top_misclassifications: Array<{
    model_predicted: string;
    actual_label: string;
    count: number;
  }>;
}
interface RetrainingStatus {
  total_labeled_samples: number;
  ready_for_retrain: boolean;
  distribution: Record<string, number>;
  recommendation: string;
}

// ─── Prediction Review Component ─────────────────────────────────────────────

function PredictionReviewSection({ apiUrl, isDark }: { apiUrl: string; isDark: boolean }) {
  const [corrections, setCorrections] = useState<PredictionCorrection[]>([]);
  const [stats, setStats] = useState<CorrectionStats | null>(null);
  const [retrainStatus, setRetrainStatus] = useState<RetrainingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formState, setFormState] = useState<{
    actual_label: string;
    is_correct: boolean | null;
    notes: string;
  }>({ actual_label: "", is_correct: null, notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const THREAT_CLASSES = ["DoS", "Malware", "Normal", "Probe", "R2L", "U2R"];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [corrRes, statsRes, statusRes] = await Promise.all([
        fetchWithAuth(`${apiUrl}/api/v1/retrain/corrections/recent?limit=10`),
        fetchWithAuth(`${apiUrl}/api/v1/retrain/corrections/stats`),
        fetchWithAuth(`${apiUrl}/api/v1/retrain/data-for-retrain`),
      ]);

      if (corrRes.ok) setCorrections(await corrRes.json().then(d => d.corrections || []));
      if (statsRes.ok) setStats(await statsRes.json());
      if (statusRes.ok) setRetrainStatus(await statusRes.json());
    } catch (err) {
      console.error("Failed to fetch corrections:", err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  const submitCorrection = async (predictionId: string) => {
    if (!formState.actual_label || formState.is_correct === null) {
      alert("Please select correction status and actual label");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/v1/retrain/correct/${predictionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actual_label: formState.actual_label,
          is_correct: formState.is_correct,
          notes: formState.notes || undefined,
        }),
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setSelectedId(null);
        setFormState({ actual_label: "", is_correct: null, notes: "" });
        setTimeout(() => setSubmitSuccess(false), 3000);
        await fetchData(); // Refresh data
      } else {
        alert("Failed to submit correction");
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("Error submitting correction");
    } finally {
      setSubmitting(false);
    }
  };

  const selected = corrections.find(c => c.id === selectedId);

  return (
    <section className="relative">
      <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6 flex items-center gap-3">
        <Flag size={20} /> Prediction Review & Corrections
      </h2>
      <p className="text-sm text-[var(--muted)] mb-6">
        Analysts review recent predictions, mark them correct/incorrect, and provide ground truth labels.
        This feedback retrains the model continuously.
      </p>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Total Corrections"
          value={stats ? String(stats.corrected_predictions) : "—"}
          icon={CheckCircle2}
          color="#10b981"
        />
        <MetricCard
          label="Correction Rate"
          value={stats ? `${stats.correction_rate.toFixed(1)}%` : "—"}
          icon={Activity}
          color="#8b5cf6"
        />
        <MetricCard
          label="Model Accuracy"
          value={stats ? `${(stats.accuracy_with_corrections || 0).toFixed(1)}%` : "—"}
          icon={BrainCircuit}
          color="#3b82f6"
        />
        <MetricCard
          label="Labeled Samples"
          value={retrainStatus ? String(retrainStatus.total_labeled_samples) : "—"}
          icon={RotateCw}
          color={retrainStatus?.ready_for_retrain ? "#10b981" : "#f59e0b"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Predictions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="lg:col-span-2 glass-panel rounded-2xl p-6"
        >
          <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--foreground)] mb-4 pb-3 border-b border-[var(--glass-border)]">
            Recent Predictions Awaiting Review ({corrections.length})
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }}>
                <Loader size={20} className="text-purple-400" />
              </motion.div>
              <span className="text-sm text-purple-300 font-semibold">Loading corrections…</span>
            </div>
          ) : corrections.length === 0 ? (
            <div className="py-8 text-center">
              <Flag size={32} className={`mx-auto mb-3 ${isDark ? "text-slate-700" : "text-slate-300"}`} />
              <p className="text-[var(--muted)] font-medium">No predictions yet</p>
              <p className="text-[var(--muted)]/60 text-xs mt-1">Run inference simulator to generate predictions</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {corrections.map((pred, idx) => (
                <motion.div
                  key={pred.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => {
                    setSelectedId(pred.id);
                    setFormState({
                      actual_label: pred.actual_label || "",
                      is_correct: pred.was_correct ?? null,
                      notes: pred.notes || "",
                    });
                  }}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                    selectedId === pred.id
                      ? isDark
                        ? "bg-purple-500/20 border-purple-500/40"
                        : "bg-purple-100 border-purple-400"
                      : isDark
                      ? "bg-white/5 border-white/10 hover:bg-white/8"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg"
                      style={{
                        background: `${LABEL_COLORS[pred.model_predicted] || "#8b5cf6"}20`,
                        color: LABEL_COLORS[pred.model_predicted] || "#8b5cf6",
                      }}
                    >
                      {pred.model_predicted === "Normal" ? "✅" : "⚠️"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm truncate" style={{ color: LABEL_COLORS[pred.model_predicted] || "#8b5cf6" }}>
                          {pred.model_predicted}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                          isDark ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-700"
                        }`}>
                          {pred.model_confidence.toFixed(1)}%
                        </span>
                        {pred.was_correct === true && <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />}
                        {pred.was_correct === false && <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />}
                      </div>
                      <p className="text-[11px] text-[var(--muted)] mt-1">
                        {new Date(pred.timestamp).toLocaleString()}
                      </p>
                      {pred.actual_label && (
                        <p className="text-xs mt-1 text-[var(--foreground)]">
                          Actual: <span className="font-semibold">{pred.actual_label}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Correction Form */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-panel rounded-2xl p-6"
        >
          <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--foreground)] mb-4 pb-3 border-b border-[var(--glass-border)]">
            Mark Correction
          </h3>

          {!selected ? (
            <div className="py-12 text-center">
              <Flag size={32} className={`mx-auto mb-3 ${isDark ? "text-slate-700" : "text-slate-300"}`} />
              <p className="text-[var(--muted)] font-medium text-sm">Select a prediction to correct</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Current Prediction */}
              <div
                className={`p-3 rounded-lg border ${isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}
              >
                <p className={`text-xs font-mono uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Model Predicted
                </p>
                <p className="text-lg font-bold mt-1" style={{ color: LABEL_COLORS[selected.model_predicted] || "#8b5cf6" }}>
                  {selected.model_predicted}
                </p>
                <p className="text-xs text-[var(--muted)] mt-1">{selected.model_confidence.toFixed(1)}% confidence</p>
              </div>

              {/* Correction Status */}
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Was the prediction correct?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormState(prev => ({ ...prev, is_correct: true }))}
                    className={`flex-1 py-2 px-3 rounded-lg border font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      formState.is_correct === true
                        ? isDark
                          ? "bg-green-500/20 border-green-500/40 text-green-300"
                          : "bg-green-100 border-green-400 text-green-700"
                        : isDark
                        ? "bg-white/5 border-white/10 text-slate-400 hover:bg-white/8"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <ThumbsUp size={12} /> Correct
                  </button>
                  <button
                    onClick={() => setFormState(prev => ({ ...prev, is_correct: false }))}
                    className={`flex-1 py-2 px-3 rounded-lg border font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      formState.is_correct === false
                        ? isDark
                          ? "bg-red-500/20 border-red-500/40 text-red-300"
                          : "bg-red-100 border-red-400 text-red-700"
                        : isDark
                        ? "bg-white/5 border-white/10 text-slate-400 hover:bg-white/8"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <ThumbsDown size={12} /> Incorrect
                  </button>
                </div>
              </div>

              {/* Actual Label */}
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Actual Threat Type
                </p>
                <CustomSelect
                  value={formState.actual_label}
                  onChange={v => setFormState(prev => ({ ...prev, actual_label: v }))}
                  options={THREAT_CLASSES}
                  isDark={isDark}
                />
              </div>

              {/* Notes */}
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Notes (optional)
                </p>
                <textarea
                  value={formState.notes}
                  onChange={e => setFormState(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Why did you correct this prediction?"
                  rows={3}
                  className={`w-full text-xs px-3 py-2 rounded-lg border font-mono resize-none ${
                    isDark
                      ? "bg-white/5 border-white/15 text-slate-200 placeholder-slate-500"
                      : "bg-white border-slate-300 text-slate-800 placeholder-slate-400"
                  } focus:outline-none focus:border-purple-400`}
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={() => submitCorrection(selected.id)}
                disabled={submitting || !formState.actual_label || formState.is_correct === null}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 transition-all disabled:opacity-60 disabled:cursor-wait"
              >
                {submitting ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                      <Loader size={12} />
                    </motion.div>
                    Submitting…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={12} /> Submit Correction
                  </>
                )}
              </button>

              {submitSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg text-xs font-semibold text-center ${
                    isDark ? "bg-green-500/20 text-green-300 border border-green-500/30" : "bg-green-100 text-green-700 border border-green-300"
                  }`}
                >
                  ✓ Correction submitted successfully
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Misclassifications & Retrain Status */}
      {stats && stats.top_misclassifications.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Misclassifications */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--foreground)] mb-4 pb-3 border-b border-[var(--glass-border)]">
              Top Misclassifications
            </h3>
            <div className="space-y-2">
              {stats.top_misclassifications.slice(0, 5).map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-3 rounded-lg flex items-center justify-between border ${isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}
                >
                  <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
                    <span className="font-bold truncate" style={{ color: LABEL_COLORS[item.model_predicted] || "#8b5cf6" }}>
                      {item.model_predicted}
                    </span>
                    <span className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>→</span>
                    <span className="font-bold truncate" style={{ color: LABEL_COLORS[item.actual_label] || "#a78bfa" }}>
                      {item.actual_label}
                    </span>
                  </div>
                  <span className={`text-xs font-bold flex-shrink-0 ${isDark ? "text-red-400" : "text-red-600"}`}>
                    {item.count}x
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Retrain Status */}
          {retrainStatus && (
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--foreground)] mb-4 pb-3 border-b border-[var(--glass-border)]">
                Continuous Learning Status
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-xs font-mono ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      Labeled Samples
                    </p>
                    <p className="text-sm font-bold text-[var(--foreground)]">{retrainStatus.total_labeled_samples} / 50</p>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((retrainStatus.total_labeled_samples / 50) * 100, 100)}%` }}
                      transition={{ duration: 0.7 }}
                      className={`h-full rounded-full ${
                        retrainStatus.ready_for_retrain
                          ? "bg-gradient-to-r from-green-500 to-emerald-500"
                          : "bg-gradient-to-r from-amber-500 to-orange-500"
                      }`}
                    />
                  </div>
                </div>

                <div className={`p-3 rounded-lg border text-xs font-semibold text-center ${
                  retrainStatus.ready_for_retrain
                    ? isDark
                      ? "bg-green-500/20 border-green-500/30 text-green-300"
                      : "bg-green-100 border-green-300 text-green-700"
                    : isDark
                    ? "bg-amber-500/20 border-amber-500/30 text-amber-300"
                    : "bg-amber-100 border-amber-300 text-amber-700"
                }`}>
                  {retrainStatus.recommendation}
                </div>

                {retrainStatus.distribution && Object.keys(retrainStatus.distribution).length > 0 && (
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      Sample Distribution
                    </p>
                    <div className="space-y-1.5">
                      {Object.entries(retrainStatus.distribution).map(([label, count]) => (
                        <div key={label} className="flex items-center justify-between text-xs">
                          <span style={{ color: LABEL_COLORS[label] || "#a78bfa" }} className="font-semibold truncate">
                            {label}
                          </span>
                          <span className={`${isDark ? "text-slate-400" : "text-slate-600"}`}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </section>
  );
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

// ─── Feature Importance — Animated Gradient Pills ────────────────────────────

const PILL_GRADIENTS = [
  ["#7c3aed","#a78bfa"], ["#2563eb","#60a5fa"], ["#0891b2","#22d3ee"],
  ["#059669","#34d399"], ["#d97706","#fbbf24"], ["#dc2626","#f87171"],
  ["#7c2d8e","#c084fc"], ["#be185d","#f472b6"], ["#0f766e","#2dd4bf"],
  ["#4338ca","#818cf8"], ["#374151","#94a3b8"], ["#0284c7","#38bdf8"],
];

function FeatureImportanceChart({ data, descriptions }: {
  data: Array<{ name: string; value: number; type: string }>;
  descriptions: Record<string, string>;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const rankedData = [...data]
    .sort((a, b) => b.value - a.value)
    .map((d, idx) => ({ ...d, rank: idx + 1, pct: (d.value * 100).toFixed(2) }));

  const maxVal = rankedData[0]?.value || 1;

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className={`flex gap-6 text-xs font-semibold mb-4 px-1`}>
        <div className="flex items-center gap-2"><span>🔢</span><span className={isDark ? "text-purple-300" : "text-purple-700"}>Numeric</span></div>
        <div className="flex items-center gap-2"><span>🏷️</span><span className={isDark ? "text-purple-300" : "text-purple-700"}>Categorical</span></div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span className={`text-xs ${isDark ? "text-blue-400" : "text-blue-600"}`}>From trained model</span>
        </div>
      </div>

      {rankedData.map((f, idx) => {
        const [c1, c2] = PILL_GRADIENTS[idx % 12];
        const widthPct = (f.value / maxVal) * 100;
        return (
          <motion.div
            key={f.name}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.04, type: "spring", stiffness: 200 }}
            className={`rounded-xl border p-3 ${isDark ? "bg-white/5 border-white/10 hover:bg-white/8" : "bg-white border-slate-200 shadow-sm hover:shadow-md"} transition-all`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border"
                style={{ background: `${c1}25`, borderColor: `${c1}60` }}>
                <span className="text-xs font-black" style={{ color: c1 }}>#{f.rank}</span>
              </div>
              <span className={`text-sm font-bold flex-1 font-mono ${isDark ? "text-slate-100" : "text-slate-800"}`}>{f.name}</span>
              <span className="text-sm font-black font-mono" style={{ color: c1 }}>{f.pct}%</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                f.type === "numeric"
                  ? isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700"
                  : isDark ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700"
              }`}>{f.type === "numeric" ? "🔢" : "🏷️"}</span>
            </div>
            <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-slate-100"}`}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${widthPct}%` }}
                transition={{ delay: idx * 0.04 + 0.15, duration: 0.7, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${c1}, ${c2})` }}
              />
            </div>
            {descriptions[f.name] && (
              <p className={`text-xs mt-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{descriptions[f.name]}</p>
            )}
          </motion.div>
        );
      })}
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [simInputs, setSimInputs] = useState<Record<string, string>>({
    duration: "0", protocol_type: "tcp", service: "http", flag: "SF",
    src_bytes: "1000", dst_bytes: "0", count: "5", srv_count: "5",
    serror_rate: "0.0", rerror_rate: "0.0", same_srv_rate: "1.0", diff_srv_rate: "0.0",
  });
  const [simResult, setSimResult] = useState<{ label: string; confidence: number; probabilities: Record<string, number> } | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) router.push("/login");
  }, [router]);

  const fetchMetrics = useCallback(async () => {
    try {
      const r = await fetchWithAuth(`${apiUrl}/api/v1/models/metrics`);
      if (r.ok) { setMetrics(await r.json()); setLastUpdated(new Date()); }
    } catch {} finally { setLoadingMetrics(false); }
  }, [apiUrl]);

  const fetchPackets = useCallback(async () => {
    try {
      const r = await fetchWithAuth(`${apiUrl}/api/v1/models/preprocessed?limit=15`);
      if (r.ok) { const d = await r.json(); setPackets(d.packets || []); }
    } catch {} finally { setLoadingPackets(false); }
  }, [apiUrl]);

  const runInference = useCallback(async () => {
    setSimLoading(true);
    setSimResult(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(simInputs).map(([k, v]) => [k, isNaN(Number(v)) ? v : Number(v)])
      );
      const res = await fetchWithAuth(`${apiUrl}/api/v1/models/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSimResult(await res.json());
      } else {
        throw new Error("predict endpoint unavailable");
      }
    } catch {
      // Client-side demo fallback
      const se = Number(simInputs.serror_rate) || 0;
      const ds = Number(simInputs.diff_srv_rate) || 0;
      const sb = Number(simInputs.src_bytes) || 0;
      const cnt = Number(simInputs.count) || 0;
      const re = Number(simInputs.rerror_rate) || 0;
      let label = "Normal";
      let confidence = 96 + Math.random() * 3;
      const probs: Record<string, number> = { Normal: 0.96, DoS: 0.02, Probe: 0.01, "R2L (Unauthorized Access)": 0.005, "U2R (Root Access)": 0.005 };
      if (se > 0.5) {
        label = "DoS"; probs.DoS = 0.91; probs.Normal = 0.05; confidence = 91 + Math.random() * 7;
        probs["R2L (Unauthorized Access)"] = 0.02; probs["U2R (Root Access)"] = 0.01; probs.Probe = 0.01;
      } else if (ds > 0.6 || re > 0.7) {
        label = "Probe"; probs.Probe = 0.88; probs.Normal = 0.08; probs.DoS = 0.02; probs["R2L (Unauthorized Access)"] = 0.01; probs["U2R (Root Access)"] = 0.01;
        confidence = 88 + Math.random() * 8;
      } else if (sb > 50000 && cnt < 5) {
        label = "U2R (Root Access)"; probs["U2R (Root Access)"] = 0.85; probs.Normal = 0.10; probs.Probe = 0.03; probs.DoS = 0.01; probs["R2L (Unauthorized Access)"] = 0.01;
        confidence = 85 + Math.random() * 8;
      }
      setSimResult({ label, confidence: +confidence.toFixed(2), probabilities: probs });
    } finally {
      setSimLoading(false);
    }
  }, [apiUrl, simInputs]);

  // Real-time: packets every 5s, model metrics every 30s
  useEffect(() => {
    fetchMetrics();
    fetchPackets();
    const pInterval = setInterval(fetchPackets, 5000);
    const mInterval = setInterval(fetchMetrics, 30000);
    return () => { clearInterval(pInterval); clearInterval(mInterval); };
  }, [fetchMetrics, fetchPackets]);

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
          <div className="flex items-center gap-3">
            {metrics && (
              <div className="hidden md:flex items-center gap-2 glass-panel px-4 py-2 rounded-xl text-xs font-semibold text-[var(--foreground)]">
                <Cpu size={13} />
                {metrics.model.type} · {metrics.model.n_estimators} trees · depth {metrics.model.max_depth}
              </div>
            )}
            <button onClick={() => { fetchMetrics(); fetchPackets(); }}
              className="p-2.5 rounded-xl border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 transition-all"
              title="Refresh now">
              <Activity size={16} className={loadingMetrics ? "animate-spin" : ""} />
            </button>
            {lastUpdated && (
              <div className="hidden md:flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
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

        {/* ══════════════════════════════════════════════════════════════
            SECTION 5 — PREDICTION REVIEW & CONTINUOUS LEARNING
        ══════════════════════════════════════════════════════════════ */}
        <PredictionReviewSection apiUrl={apiUrl} isDark={isDark} />

        {/* ══════════════════════════════════════════════════════════════
            SECTION 6 — LIVE INFERENCE SIMULATOR
        ══════════════════════════════════════════════════════════════ */}
        <section className="relative">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6 flex items-center gap-3">
            <FlaskConical size={20} /> Live Inference Simulator
          </h2>
          <p className="text-sm text-[var(--muted)] mb-6">
            Configure packet features below and click <strong>Run Inference</strong> to see how the XGBoost model classifies the connection in real time.
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-semibold">Demo fallback if backend unavailable</span>
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* ── Input panel ── */}
            <div className="lg:col-span-2 glass-panel rounded-2xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--foreground)] mb-4 pb-3 border-b border-[var(--glass-border)]">
                Packet Feature Vector
              </h3>
              <div className="space-y-2.5">
                {Object.entries(simInputs).map(([key, val]) => {
                  const isCateg = FEATURE_TYPES[key] === "categorical";
                  const opts: Record<string, string[]> = {
                    protocol_type: ["tcp", "udp", "icmp"],
                    service: ["http", "ftp", "smtp", "telnet", "ssh", "dns", "other"],
                    flag: ["SF", "S0", "REJ", "RSTO", "SH", "RSTR"],
                  };
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <label className={`text-[11px] font-mono w-28 flex-shrink-0 ${isDark ? "text-slate-400" : "text-slate-600"}`}>{key}</label>
                      {isCateg && opts[key] ? (
                        <CustomSelect
                          value={val}
                          onChange={v => setSimInputs(prev => ({ ...prev, [key]: v }))}
                          options={opts[key]}
                          isDark={isDark}
                        />
                      ) : (
                        <input type="text" value={val}
                          onChange={e => setSimInputs(prev => ({ ...prev, [key]: e.target.value }))}
                          className={`flex-1 text-xs px-2.5 py-1.5 rounded-lg border font-mono ${isDark ? "bg-white/5 border-white/15 text-slate-200" : "bg-white border-slate-300 text-slate-800"} focus:outline-none focus:border-purple-400`}
                          placeholder="0.0" />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={runInference} disabled={simLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 transition-all disabled:opacity-60 disabled:cursor-wait">
                  {simLoading ? (
                    <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Activity size={14} /></motion.div> Analyzing...</>
                  ) : (
                    <><Zap size={14} /> Run Inference</>
                  )}
                </button>
                <button
                  onClick={() => { setSimInputs({ duration: "0", protocol_type: "tcp", service: "http", flag: "SF", src_bytes: "1000", dst_bytes: "0", count: "5", srv_count: "5", serror_rate: "0.0", rerror_rate: "0.0", same_srv_rate: "1.0", diff_srv_rate: "0.0" }); setSimResult(null); }}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-medium ${isDark ? "border-white/15 text-slate-400 hover:bg-white/5" : "border-slate-300 text-slate-600 hover:bg-slate-50"} transition-all`}>
                  Reset
                </button>
              </div>
              {/* Quick presets */}
              <div className="mt-3">
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? "text-purple-400" : "text-purple-600"}`}>Quick Presets:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "Normal HTTP", vals: { duration: "0.1", protocol_type: "tcp", service: "http", flag: "SF", src_bytes: "512", dst_bytes: "1024", count: "3", srv_count: "3", serror_rate: "0.0", rerror_rate: "0.0", same_srv_rate: "1.0", diff_srv_rate: "0.0" }},
                    { label: "SYN Flood", vals: { duration: "0", protocol_type: "tcp", service: "http", flag: "S0", src_bytes: "0", dst_bytes: "0", count: "500", srv_count: "500", serror_rate: "1.0", rerror_rate: "0.0", same_srv_rate: "1.0", diff_srv_rate: "0.0" }},
                    { label: "Port Scan", vals: { duration: "0", protocol_type: "tcp", service: "other", flag: "REJ", src_bytes: "0", dst_bytes: "0", count: "50", srv_count: "10", serror_rate: "0.1", rerror_rate: "0.8", same_srv_rate: "0.2", diff_srv_rate: "0.9" }},
                    { label: "Root Exploit", vals: { duration: "0.3", protocol_type: "tcp", service: "telnet", flag: "SF", src_bytes: "85000", dst_bytes: "1200", count: "2", srv_count: "2", serror_rate: "0.0", rerror_rate: "0.0", same_srv_rate: "1.0", diff_srv_rate: "0.0" }},
                  ].map(preset => (
                    <button key={preset.label}
                      onClick={() => { setSimInputs(prev => ({ ...prev, ...preset.vals })); setSimResult(null); }}
                      className={`text-[10px] px-2 py-1 rounded-lg border font-semibold ${isDark ? "border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20" : "border-purple-400/30 bg-purple-50 text-purple-700 hover:bg-purple-100"} transition-all`}>
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Result panel ── */}
            <div className="lg:col-span-3 glass-panel rounded-2xl p-6 flex flex-col">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--foreground)] mb-4 pb-3 border-b border-[var(--glass-border)]">
                Classification Result
              </h3>
              {!simResult && !simLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                  <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}>
                    <FlaskConical size={48} className={isDark ? "text-purple-500/25" : "text-purple-400/25"} />
                  </motion.div>
                  <p className={`mt-5 font-semibold text-lg ${isDark ? "text-purple-400" : "text-purple-600"}`}>Configure features &amp; run inference</p>
                  <p className={`text-sm mt-2 ${isDark ? "text-purple-500" : "text-purple-500"}`}>Try a quick preset to see the model in action</p>
                  <div className="mt-6 grid grid-cols-2 gap-3 max-w-xs text-left">
                    {[
                      { label: "serror_rate > 0.5", badge: "→ DoS", color: "#ef4444" },
                      { label: "diff_srv_rate > 0.6", badge: "→ Probe", color: "#f59e0b" },
                      { label: "src_bytes > 50k, low count", badge: "→ U2R", color: "#ec4899" },
                      { label: "SF flag, normal rates", badge: "→ Normal", color: "#10b981" },
                    ].map(hint => (
                      <div key={hint.label} className={`rounded-lg p-2.5 text-xs ${isDark ? "bg-white/5 border border-white/8" : "bg-slate-50 border border-slate-200"}`}>
                        <p className={isDark ? "text-slate-400" : "text-slate-500"}>{hint.label}</p>
                        <p className="font-bold mt-0.5" style={{ color: hint.color }}>{hint.badge}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : simLoading ? (
                <div className="flex-1 flex flex-col justify-between py-6">
                  <div className="flex items-center justify-center gap-3">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}>
                      <BrainCircuit size={40} className="text-purple-400" />
                    </motion.div>
                    <div>
                      <p className="text-purple-300 font-semibold">Analyzing threat pattern…</p>
                      <p className={`text-xs mt-0.5 ${isDark ? "text-purple-500" : "text-purple-600"}`}>Running inference model</p>
                    </div>
                  </div>
                  {/* Skeleton loader preview */}
                  <div className="space-y-4 mt-6">
                    <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}
                      className={`h-20 rounded-2xl ${isDark ? "bg-white/5" : "bg-slate-100"}`} />
                    <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2, delay: 0.1 }}
                      className={`h-32 rounded-xl ${isDark ? "bg-white/5" : "bg-slate-100"}`} />
                    <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2, delay: 0.2 }}
                      className={`h-24 rounded-lg ${isDark ? "bg-white/5" : "bg-slate-100"}`} />
                  </div>
                </div>
              ) : simResult ? (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 space-y-5">
                  {/* Main result banner */}
                  <div className={`rounded-2xl p-5 border ${simResult.label === "Normal"
                      ? isDark ? "bg-emerald-900/20 border-emerald-500/30" : "bg-emerald-50 border-emerald-300"
                      : isDark ? "bg-red-900/15 border-red-500/30" : "bg-red-50 border-red-300"}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background: `${LABEL_COLORS[simResult.label] || "#8b5cf6"}20`, border: `2px solid ${LABEL_COLORS[simResult.label] || "#8b5cf6"}50` }}>
                        {simResult.label === "Normal" ? "✅" : simResult.label.startsWith("DoS") ? "⚡" : simResult.label.startsWith("Probe") ? "🔍" : simResult.label.startsWith("U2R") ? "🔒" : "🚨"}
                      </div>
                      <div className="flex-1">
                        <p className={`text-[11px] uppercase tracking-widest font-bold ${isDark ? "text-purple-400" : "text-purple-600"}`}>Classification</p>
                        <p className="text-2xl font-black mt-0.5" style={{ color: LABEL_COLORS[simResult.label] || "#8b5cf6" }}>{simResult.label}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }}>
                            <motion.div className="h-full rounded-full"
                              initial={{ width: 0 }} animate={{ width: `${simResult.confidence}%` }}
                              transition={{ duration: 0.9 }}
                              style={{ background: LABEL_COLORS[simResult.label] || "#8b5cf6" }} />
                          </div>
                          <span className="text-sm font-bold" style={{ color: LABEL_COLORS[simResult.label] || "#8b5cf6" }}>
                            {simResult.confidence.toFixed(1)}% confidence
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Class probabilities */}
                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? "text-purple-300" : "text-purple-600"}`}>Class Probabilities</h4>
                    <div className="space-y-2.5">
                      {Object.entries(simResult.probabilities)
                        .sort(([, a], [, b]) => (b as number) - (a as number))
                        .map(([cls, prob]) => (
                          <div key={cls} className="flex items-center gap-3">
                            <span className="text-xs font-mono font-semibold w-40 flex-shrink-0 truncate" style={{ color: LABEL_COLORS[cls] || "#a78bfa" }}>{cls}</span>
                            <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)" }}>
                              <motion.div className="h-full rounded-full"
                                initial={{ width: 0 }} animate={{ width: `${(prob as number) * 100}%` }}
                                transition={{ duration: 0.7, ease: "easeOut" }}
                                style={{ background: LABEL_COLORS[cls] || "#8b5cf6" }} />
                            </div>
                            <span className="text-xs font-mono w-12 text-right font-black" style={{ color: LABEL_COLORS[cls] || "#a78bfa" }}>
                              {((prob as number) * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Top feature impacts */}
                  {metrics && (
                    <div className="pt-4 border-t border-[var(--glass-border)]">
                      <h4 className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? "text-purple-300" : "text-purple-600"}`}>Top Feature Weights (model-derived)</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(metrics.model.feature_importances)
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .slice(0, 6)
                          .map(([feat, importance]) => {
                            const desc = metrics.model.feature_descriptions?.[feat] || "Network feature for threat classification";
                            return (
                              <div key={feat}
                                className={`rounded-lg p-3 cursor-help transition-all group relative ${isDark ? "bg-white/8 border border-white/15 hover:bg-white/12 hover:border-white/25" : "bg-slate-50 border border-slate-200 hover:bg-slate-100"}`}
                                title={desc}>
                                <p className={`text-[11px] font-mono font-bold truncate ${isDark ? "text-slate-300" : "text-slate-600"}`}>{feat}</p>
                                <p className={`text-base font-black truncate mt-1 ${isDark ? "text-white" : "text-slate-900"}`}>{simInputs[feat] ?? "—"}</p>
                                <p className={`text-[11px] font-bold mt-0.5 ${isDark ? "text-purple-300" : "text-purple-600"}`}>{((importance as number) * 100).toFixed(1)}% weight</p>
                                {/* Tooltip on hover */}
                                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 ${isDark ? "bg-slate-900 text-slate-200 border border-slate-700" : "bg-slate-800 text-white border border-slate-600"}`}>
                                  {desc}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : null}
            </div>
          </div>
        </section>

        </div>
      </div>
    </div>
  );
}
