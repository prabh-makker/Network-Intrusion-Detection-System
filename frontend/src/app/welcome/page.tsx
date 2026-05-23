"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Shield,
  LayoutDashboard,
  Bell,
  Globe,
  Brain,
  Lightbulb,
  Power,
  ChevronRight,
  Activity,
  Lock,
  Zap,
  CheckCircle,
} from "lucide-react";
import { getToken } from "@/lib/auth";

const FEATURES = [
  {
    icon: LayoutDashboard,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.3)",
    title: "Live Dashboard",
    desc: "Real-time threat counters, traffic charts, and active attack breakdowns — all updating every 5 seconds.",
  },
  {
    icon: Bell,
    color: "#ef4444",
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.3)",
    title: "Threat Alerts",
    desc: "Full alert history with confidence scores, AI explanations per threat, and one-click SECURE NOW blocking.",
  },
  {
    icon: Globe,
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.10)",
    border: "rgba(6,182,212,0.3)",
    title: "Geo-IP Map",
    desc: "Live world map pinning attacker origins. Filter by threat type, click pins for full source details.",
  },
  {
    icon: Brain,
    color: "#ec4899",
    bg: "rgba(236,72,153,0.10)",
    border: "rgba(236,72,153,0.3)",
    title: "ML Analytics",
    desc: "XGBoost model metrics — real feature importance rankings, confusion matrix, and detection accuracy.",
  },
  {
    icon: Lightbulb,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.3)",
    title: "Security Advisor",
    desc: "AI-generated action plan: ranked threats to block NOW and long-term hardening recommendations.",
  },
  {
    icon: Power,
    color: "#10b981",
    bg: "rgba(16,185,129,0.10)",
    border: "rgba(16,185,129,0.3)",
    title: "System Boot",
    desc: "Visual boot sequence showing all NIDS services initializing — DB, API, ML model, packet sniffer.",
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const [username, setUsername] = useState("Analyst");
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    setAuthenticated(true);

    // Get username from localStorage (stored on login)
    const storedUsername = localStorage.getItem("nids_username");
    if (storedUsername) setUsername(storedUsername);
  }, [router]);

  if (!authenticated) return null;

  return (
    <div
      className="min-h-screen w-full relative flex flex-col items-center justify-start overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0a0614 0%, #0d0820 50%, #060410 100%)" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(139,92,246,0.15) 0%, transparent 70%)",
        }}
      />

      {/* Grid lines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 w-full max-w-5xl px-6 py-16 flex flex-col items-center">
        {/* Shield icon */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
          className="mb-6"
        >
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.2))",
              border: "1px solid rgba(139,92,246,0.4)",
              boxShadow: "0 0 40px rgba(139,92,246,0.3)",
            }}
          >
            <Shield size={40} className="text-purple-400" />
          </div>
        </motion.div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-3"
        >
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">
            <span className="text-white">Welcome, </span>
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(90deg, #a855f7, #ec4899, #38bdf8, #a855f7)",
                backgroundSize: "200% 100%",
                animation: "nids-heading-sweep 10s linear infinite",
              }}
            >
              {username}
            </span>
            <span className="text-white"> 👋</span>
          </h1>
          <p className="text-slate-400 text-lg">Your AI-powered Security Operations Center is ready.</p>
        </motion.div>

        {/* Checkmarks row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex flex-wrap gap-4 justify-center mb-12 mt-4"
        >
          {["Account Created", "ML Model Active", "Threat Engine Online", "Real-Time Monitoring"].map(
            (label, i) => (
              <div key={i} className="flex items-center gap-1.5 text-sm text-emerald-400">
                <CheckCircle size={14} />
                <span>{label}</span>
              </div>
            )
          )}
        </motion.div>

        {/* Feature cards */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.08, type: "spring", stiffness: 120, damping: 14 }}
                className="rounded-xl p-5 flex flex-col gap-3 cursor-default group transition-all"
                style={{
                  background: f.bg,
                  border: `1px solid ${f.border}`,
                }}
                whileHover={{ scale: 1.03, y: -3 }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: `${f.color}22`, border: `1px solid ${f.color}44` }}
                >
                  <Icon size={20} style={{ color: f.color }} />
                </div>
                <div>
                  <h3 className="font-bold text-sm mb-1" style={{ color: f.color }}>{f.title}</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex flex-wrap gap-8 justify-center mb-12"
        >
          {[
            { icon: Activity, label: "Live Packet Analysis", color: "#8b5cf6" },
            { icon: Lock, label: "AES-256 Encrypted", color: "#06b6d4" },
            { icon: Zap, label: "< 50ms Detection Latency", color: "#f59e0b" },
          ].map(({ icon: Icon, label, color }, i) => (
            <div key={i} className="flex items-center gap-2 text-sm" style={{ color }}>
              <Icon size={16} />
              <span className="text-slate-400">{label}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.0, type: "spring", stiffness: 150 }}
        >
          <button
            onClick={() => router.push("/dashboard")}
            className="group flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-lg text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #ec4899)",
              boxShadow: "0 0 30px rgba(139,92,246,0.5), 0 4px 20px rgba(236,72,153,0.3)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 0 50px rgba(139,92,246,0.7), 0 4px 30px rgba(236,72,153,0.5)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 0 30px rgba(139,92,246,0.5), 0 4px 20px rgba(236,72,153,0.3)";
            }}
          >
            <Shield size={22} />
            Start Monitoring
            <ChevronRight
              size={20}
              className="transition-transform group-hover:translate-x-1"
            />
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mt-4 text-slate-600 text-xs"
        >
          Already familiar?{" "}
          <button
            onClick={() => router.push("/dashboard")}
            className="text-purple-500 hover:text-purple-400 underline underline-offset-2"
          >
            Skip to Dashboard →
          </button>
        </motion.p>
      </div>
    </div>
  );
}
