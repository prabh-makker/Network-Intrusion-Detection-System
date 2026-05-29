"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, CheckCircle2, Shield, AlertTriangle, Users, FileText } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { fetchWithAuth } from "@/lib/auth";
import { getApiUrl } from "@/lib/api";

interface RemediationWizardProps {
  isOpen:   boolean;
  onClose:  () => void;
  threatType?: string;
}

type Step = "action" | "severity" | "assign" | "confirm" | "done";

const ACTION_OPTIONS = [
  { value: "block",       label: "Block",       desc: "Immediately block all traffic from threat sources", icon: "🚫", color: "#ef4444" },
  { value: "isolate",     label: "Isolate",      desc: "Quarantine affected hosts from the network",        icon: "🔒", color: "#f97316" },
  { value: "patch",       label: "Patch",        desc: "Schedule patching of vulnerable services",          icon: "🔧", color: "#f59e0b" },
  { value: "investigate", label: "Investigate",  desc: "Log and flag for deeper forensic analysis",         icon: "🔍", color: "#8b5cf6" },
];

const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critical", desc: "P1 — respond within 15 minutes",  color: "#ef4444", bg: "bg-red-500/20 border-red-500/40"    },
  { value: "high",     label: "High",     desc: "P2 — respond within 1 hour",       color: "#f97316", bg: "bg-orange-500/20 border-orange-500/40" },
  { value: "medium",   label: "Medium",   desc: "P3 — respond within 24 hours",     color: "#f59e0b", bg: "bg-amber-500/20 border-amber-500/40"   },
  { value: "low",      label: "Low",      desc: "P4 — respond within 1 week",       color: "#10b981", bg: "bg-green-500/20 border-green-500/40"   },
];

const STEP_ORDER: Step[] = ["action", "severity", "assign", "confirm"];

export default function RemediationWizard({ isOpen, onClose, threatType = "" }: RemediationWizardProps) {
  const { isDark } = useTheme();
  const apiUrl = getApiUrl();

  const [step, setStep] = useState<Step>("action");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    actionType:   "block",
    severity:     "high",
    assignedTo:   "security-team",
    dueDate:      new Date(Date.now() + 86_400_000).toISOString().split("T")[0],
    notes:        threatType ? `Remediation for ${threatType} threat` : "",
  });

  const currentIdx = STEP_ORDER.indexOf(step as any);

  const handleNext = () => {
    const next = STEP_ORDER[currentIdx + 1];
    if (next) setStep(next);
  };
  const handleBack = () => {
    const prev = STEP_ORDER[currentIdx - 1];
    if (prev) setStep(prev);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetchWithAuth(`${apiUrl}/api/v1/remediation/tasks`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(formData),
      });
      setStep("done");
      setTimeout(() => { handleClose(); }, 2000);
    } catch (err) {
      console.error("Failed to create remediation task:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep("action");
    setFormData({ actionType:"block", severity:"high", assignedTo:"security-team",
      dueDate: new Date(Date.now()+86_400_000).toISOString().split("T")[0], notes: "" });
    onClose();
  };

  const panel = isDark
    ? "bg-gradient-to-br from-slate-950 to-indigo-950 border-purple-500/40"
    : "bg-white border-purple-400/40";
  const muted = isDark ? "text-gray-400" : "text-gray-500";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={e => e.stopPropagation()}
            className={`w-full max-w-lg rounded-2xl border ${panel} shadow-2xl overflow-hidden`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? "border-purple-500/20" : "border-purple-200/60"}`}>
              <div>
                <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Create Remediation Task
                </h2>
                {step !== "done" && (
                  <p className={`text-xs mt-0.5 ${muted}`}>
                    Step {currentIdx + 1} of {STEP_ORDER.length - 1} —{" "}
                    {step === "action" ? "Choose action" : step === "severity" ? "Set severity" : step === "assign" ? "Assign & schedule" : "Review & submit"}
                  </p>
                )}
              </div>
              <button onClick={handleClose}
                className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}>
                <X size={18} />
              </button>
            </div>

            {/* Step progress bar */}
            {step !== "done" && (
              <div className={`h-1 ${isDark ? "bg-white/10" : "bg-gray-200"}`}>
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
                  animate={{ width: `${((currentIdx + 1) / STEP_ORDER.length) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            )}

            {/* Body */}
            <div className="p-6">

              {/* DONE STATE */}
              {step === "done" && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center py-8 gap-3">
                  <CheckCircle2 size={56} className="text-green-400" />
                  <p className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Task Created!</p>
                  <p className={`text-sm ${muted}`}>Remediation task queued for {formData.assignedTo}</p>
                </motion.div>
              )}

              {/* STEP: action */}
              {step === "action" && (
                <div className="space-y-3">
                  <p className={`text-sm font-semibold mb-4 ${isDark ? "text-purple-300" : "text-purple-700"}`}>
                    <Shield size={14} className="inline mr-1" /> Choose remediation action type
                  </p>
                  {ACTION_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setFormData(f => ({ ...f, actionType: opt.value }))}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                        formData.actionType === opt.value
                          ? "border-purple-500 bg-purple-500/15"
                          : isDark ? "border-white/10 hover:border-purple-500/50 hover:bg-white/5" : "border-gray-200 hover:border-purple-400/50"
                      }`}>
                      <span className="text-2xl">{opt.icon}</span>
                      <div className="flex-1">
                        <p className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-900"}`} style={{ color: formData.actionType === opt.value ? opt.color : undefined }}>
                          {opt.label}
                        </p>
                        <p className={`text-xs ${muted}`}>{opt.desc}</p>
                      </div>
                      {formData.actionType === opt.value && <CheckCircle2 size={18} className="text-purple-400 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}

              {/* STEP: severity */}
              {step === "severity" && (
                <div className="space-y-3">
                  <p className={`text-sm font-semibold mb-4 ${isDark ? "text-purple-300" : "text-purple-700"}`}>
                    <AlertTriangle size={14} className="inline mr-1" /> Set task severity / priority
                  </p>
                  {SEVERITY_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setFormData(f => ({ ...f, severity: opt.value }))}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                        formData.severity === opt.value
                          ? `border-2 ${opt.bg}`
                          : isDark ? "border-white/10 hover:border-white/30" : "border-gray-200 hover:border-gray-300"
                      }`}>
                      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                      <div className="flex-1">
                        <p className="font-bold text-sm" style={{ color: opt.color }}>{opt.label}</p>
                        <p className={`text-xs ${muted}`}>{opt.desc}</p>
                      </div>
                      {formData.severity === opt.value && <CheckCircle2 size={18} className="flex-shrink-0" style={{ color: opt.color }} />}
                    </button>
                  ))}
                </div>
              )}

              {/* STEP: assign */}
              {step === "assign" && (
                <div className="space-y-5">
                  <p className={`text-sm font-semibold ${isDark ? "text-purple-300" : "text-purple-700"}`}>
                    <Users size={14} className="inline mr-1" /> Assign and schedule
                  </p>
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${muted}`}>Assign to</label>
                    <input type="text" value={formData.assignedTo}
                      onChange={e => setFormData(f => ({ ...f, assignedTo: e.target.value }))}
                      placeholder="security-team, alice@company.com, …"
                      className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-sm ${
                        isDark ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "bg-gray-50 border-gray-200 text-gray-900"
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${muted}`}>Due date</label>
                    <input type="date" value={formData.dueDate}
                      onChange={e => setFormData(f => ({ ...f, dueDate: e.target.value }))}
                      className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-sm ${
                        isDark ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${muted}`}>Notes (optional)</label>
                    <textarea value={formData.notes}
                      onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Context, affected systems, steps already taken…"
                      rows={3}
                      className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-sm resize-none ${
                        isDark ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "bg-gray-50 border-gray-200 text-gray-900"
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* STEP: confirm */}
              {step === "confirm" && (
                <div className="space-y-4">
                  <p className={`text-sm font-semibold ${isDark ? "text-purple-300" : "text-purple-700"}`}>
                    <FileText size={14} className="inline mr-1" /> Review before submitting
                  </p>
                  <div className={`rounded-xl p-4 space-y-3 ${isDark ? "bg-white/5 border border-white/10" : "bg-gray-50 border border-gray-200"}`}>
                    {[
                      { label: "Action",    value: ACTION_OPTIONS.find(o => o.value === formData.actionType)?.label ?? formData.actionType },
                      { label: "Severity",  value: formData.severity.charAt(0).toUpperCase() + formData.severity.slice(1) },
                      { label: "Assign to", value: formData.assignedTo },
                      { label: "Due date",  value: formData.dueDate },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center">
                        <span className={`text-xs font-bold uppercase tracking-wider ${muted}`}>{label}</span>
                        <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{value}</span>
                      </div>
                    ))}
                    {formData.notes && (
                      <div>
                        <span className={`text-xs font-bold uppercase tracking-wider ${muted}`}>Notes</span>
                        <p className={`text-sm mt-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>{formData.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer nav */}
            {step !== "done" && (
              <div className={`flex items-center justify-between px-6 py-4 border-t ${isDark ? "border-white/10" : "border-gray-200"}`}>
                <button onClick={handleBack} disabled={currentIdx === 0}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 ${isDark ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}>
                  ← Back
                </button>
                {step !== "confirm" ? (
                  <button onClick={handleNext}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-bold hover:from-purple-600 hover:to-indigo-600 transition-all">
                    Next <ChevronRight size={15} />
                  </button>
                ) : (
                  <button onClick={handleSubmit} disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-bold hover:from-green-600 hover:to-emerald-600 disabled:opacity-60 transition-all">
                    {submitting ? "Creating…" : "✓ Create Task"}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
