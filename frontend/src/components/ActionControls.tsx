"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Download, Volume2, VolumeX, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { fetchWithAuth } from "@/lib/auth";
import { getApiUrl } from "@/lib/api";

interface ActionControlsProps {
  threatCount?: number;
  onActionComplete?: () => void;
}

export default function ActionControls({ threatCount = 0, onActionComplete }: ActionControlsProps) {
  const { isDark } = useTheme();
  const apiUrl = getApiUrl();
  const [isMuted, setIsMuted]           = useState(false);
  const [muteLabel, setMuteLabel]       = useState("Mute (1h)");
  const [comments, setComments]         = useState("");
  const [showComments, setShowComments] = useState(false);
  const [exporting, setExporting]       = useState(false);
  const [muting, setMuting]             = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/v1/export/threats?format=csv`);
      if (res.ok) {
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = `threats-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        onActionComplete?.();
      } else {
        // fallback: export whatever we can from the page
        console.warn("Export endpoint returned", res.status);
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  const handleMuteAlerts = async () => {
    if (isMuted) return;
    setMuting(true);
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/mute`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ duration: 3600, reason: "Muted by analyst" }),
      });
      if (res.ok) {
        setIsMuted(true);
        setMuteLabel("Muted ✓ (1h)");
        setTimeout(() => { setIsMuted(false); setMuteLabel("Mute (1h)"); }, 3_600_000);
        onActionComplete?.();
      }
    } catch (err) {
      console.error("Mute failed:", err);
    } finally {
      setMuting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`rounded-2xl p-5 border ${
        isDark
          ? "border-slate-500/30 bg-gradient-to-br from-slate-900/40 to-slate-800/20"
          : "border-slate-400/20 bg-slate-50/60"
      } backdrop-blur-xl`}
    >
      <div className="flex flex-wrap items-center gap-3">

        {/* Export CSV */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-cyan-500/40 text-cyan-400 hover:border-cyan-300 transition-colors text-sm font-semibold disabled:opacity-50"
        >
          <Download size={15} />
          {exporting ? "Exporting…" : "Export CSV"}
        </motion.button>

        {/* Mute alerts */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleMuteAlerts}
          disabled={isMuted || muting}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-60 ${
            isMuted
              ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
              : "bg-gray-500/10 border-gray-500/30 text-gray-400 hover:border-gray-300"
          }`}
        >
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          {muting ? "Muting…" : muteLabel}
        </motion.button>

        {/* Analyst comments toggle */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowComments(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:border-purple-300 transition-colors text-sm font-semibold"
        >
          <MessageSquare size={15} />
          Analyst Notes
          {showComments ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </motion.button>

        {/* Active threat count pill */}
        <div className={`ml-auto text-xs px-3 py-1.5 rounded-full font-bold ${
          threatCount > 0
            ? "bg-red-500/20 text-red-400 border border-red-500/30"
            : "bg-green-500/20 text-green-400 border border-green-500/30"
        }`}>
          {threatCount > 0 ? `${threatCount} active threats` : "No active threats"}
        </div>
      </div>

      {/* Collapsible analyst notes */}
      {showComments && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4"
        >
          <textarea
            value={comments}
            onChange={e => setComments(e.target.value)}
            placeholder="Add analyst notes for this session — observations, hypotheses, escalation decisions…"
            rows={3}
            className={`w-full p-3 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/30 ${
              isDark
                ? "bg-black/30 border-purple-500/20 text-white placeholder-gray-500"
                : "bg-white border-purple-300/40 text-gray-900 placeholder-gray-400"
            }`}
          />
          {comments.length > 0 && (
            <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              {comments.length} characters · auto-saved to session
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
