"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Loader, Server, Zap, Shield, Activity, Power } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface BootStep {
  name: string;
  status: "pending" | "running" | "complete" | "error";
  duration: number;
  details?: string;
}

export default function SystemStartupContent() {
  const { isDark } = useTheme();
  const [bootSteps] = useState<BootStep[]>([
    { name: "BIOS POST (Power-On Self Test)", status: "pending", duration: 2.0 },
    { name: "Boot Loader Initialization", status: "pending", duration: 1.5 },
    { name: "Kernel Loading", status: "pending", duration: 3.0 },
    { name: "System Services Startup", status: "pending", duration: 2.2 },
    { name: "Database Initialization", status: "pending", duration: 3.5 },
    { name: "API Server Start (Port 8001)", status: "pending", duration: 1.5 },
    { name: "WebSocket Service Ready", status: "pending", duration: 1.0 },
    { name: "Packet Sniffer Activation", status: "pending", duration: 2.0 },
    { name: "ML Model Loading", status: "pending", duration: 5.0 },
    { name: "Threat Detection Engine Ready", status: "pending", duration: 1.2 },
  ]);

  const [bootTime, setBootTime] = useState(0);
  const [systemReady, setSystemReady] = useState(false);
  const [bootStarted, setBootStarted] = useState(false);

  // Manual boot start handler
  const handleBootSystem = () => {
    setBootStarted(true);
    setBootTime(0);
    setSystemReady(false);
  };

  // Reset the boot state to shutdown
  const handleShutdown = () => {
    setBootStarted(false);
    setBootTime(0);
    setSystemReady(false);
    // Auto-reboot immediately after shutdown
    setBootStarted(true);
  };

  useEffect(() => {
    if (!bootStarted) return;

    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 0.1;
      setBootTime(parseFloat(elapsed.toFixed(1)));
      if (elapsed >= 23.9) {
        setSystemReady(true);
        clearInterval(interval);
      }
    }, 150);
    return () => clearInterval(interval);
  }, [bootStarted]);

  const totalTime = bootSteps.reduce((sum, step) => sum + step.duration, 0);

  const getStepStyleClass = (isComplete: boolean, isRunning: boolean, isDark: boolean): string => {
    if (isComplete) return isDark ? "border-green-500/30 bg-green-500/5" : "border-green-400/30 bg-green-500/5";
    if (isRunning) return isDark ? "border-blue-500/30 bg-blue-500/5" : "border-blue-400/30 bg-blue-500/5";
    return isDark ? "border-purple-500/20 bg-purple-500/5" : "border-purple-400/20 bg-purple-500/5";
  };

  const BootStepItem = ({ step, index }: { step: BootStep; index: number }) => {
    const cumulativeTime = bootSteps.slice(0, index).reduce((sum, s) => sum + s.duration, 0);
    const isComplete = systemReady || bootTime >= cumulativeTime + step.duration;
    const isRunning = !isComplete && bootTime >= cumulativeTime;

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`flex items-start gap-4 p-4 rounded-lg border ${getStepStyleClass(isComplete, isRunning, isDark)}`}
      >
        <div className="flex-shrink-0 mt-1">
          {isComplete ? (
            <CheckCircle2 size={20} className="text-green-400" />
          ) : isRunning ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
              <Loader size={20} className="text-blue-400" />
            </motion.div>
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-purple-400/30" />
          )}
        </div>
        <div className="flex-1">
          <p className={`font-semibold text-sm ${isDark ? "text-white" : "text-purple-950"}`}>
            {step.name}
          </p>
          {step.details && (
            <p className={`text-xs mt-1 ${isDark ? "text-purple-300" : "text-purple-800"}`}>
              {step.details}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <p className={`text-xs font-mono ${isDark ? "text-purple-400" : "text-purple-700"}`}>
            {step.duration}s
          </p>
        </div>
      </motion.div>
    );
  };

  // Deterministic positioning based on index (avoids hydration mismatch)
  const getBackgroundDotProps = (index: number) => {
    const seed = (index * 2654435761) >>> 0;
    const pseudoRandom = (seed ^ (seed >> 15)) * 2.654435761;
    const frac1 = (pseudoRandom - Math.floor(pseudoRandom)) * 100;
    const frac2 = ((pseudoRandom * 73) - Math.floor(pseudoRandom * 73)) * 100;
    const frac3 = ((pseudoRandom * 53) - Math.floor(pseudoRandom * 53)) * 3 + 2;
    const frac4 = ((pseudoRandom * 97) - Math.floor(pseudoRandom * 97)) * 2;

    return {
      left: frac1 % 100,
      top: frac2 % 100,
      duration: frac3,
      delay: frac4,
    };
  };

  return (
    <div className="min-h-screen w-full bg-[var(--background)] overflow-hidden">
      {/* ── Boot Sequence Background ── */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        {[...Array(20)].map((_, i) => {
          const props = getBackgroundDotProps(i);
          return (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-green-400"
              animate={{
                y: [0, -1000],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: props.duration,
                delay: props.delay,
                repeat: Infinity,
              }}
              style={{
                left: `${props.left}%`,
                top: `${props.top}%`,
              }}
            />
          );
        })}
      </div>

      <div className="relative z-10 w-full min-h-screen flex flex-col">
        {/* ── Header ── */}
        <div
          className={`border-b backdrop-blur-xl px-6 py-6 ${
            isDark
              ? "border-green-500/20 bg-gradient-to-r from-green-900/10 via-transparent to-emerald-900/10"
              : "border-green-400/20 bg-green-950/5"
          }`}
        >
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 flex items-center gap-3">
              <Server size={32} className="text-green-400" />
              System Startup & Initialization
            </h1>
            <p className={`mt-1 text-sm ${isDark ? "text-green-200" : "text-green-800"}`}>
              NIDS Sentinel boot sequence · kernel initialization · service startup · threat detection engine ready
            </p>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 w-full px-6 py-12">
          <div className="max-w-4xl mx-auto">

            {/* Boot Progress - Always shown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl p-8 border mb-8 ${
                isDark
                  ? "border-green-500/30 bg-gradient-to-br from-green-900/20 to-emerald-900/10"
                  : "border-green-400/20 bg-green-950/10"
              } backdrop-blur-xl`}
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-green-950"}`}>
                    Boot Progress
                  </h2>
                  <p className={`text-sm mt-1 ${isDark ? "text-green-300" : "text-green-800"}`}>
                    {!bootStarted ? "System offline · Ready to boot" : systemReady ? "System is online and ready" : "System initialization in progress"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-400 font-mono">
                    {bootTime.toFixed(1)}s
                  </p>
                  <p className={`text-xs ${isDark ? "text-green-400" : "text-green-700"}`}>
                    {!bootStarted ? "OFFLINE" : systemReady ? "✓ READY" : "Loading..."}
                  </p>
                </div>
              </div>

              {!bootStarted ? (
                <button
                  onClick={handleBootSystem}
                  className="mb-4 px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold flex items-center gap-2"
                  title="Manually start the system boot sequence"
                >
                  <Power size={16} />
                  BOOT SYSTEM
                </button>
              ) : systemReady && (
                <button
                  onClick={handleShutdown}
                  className="mb-4 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold flex items-center gap-2"
                  title="Immediately reboot the system"
                >
                  <Power size={14} />
                  REBOOT SYSTEM
                </button>
              )}

              {/* Progress Bar */}
              <div className={`w-full h-3 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-black/10"}`}>
                <motion.div
                  className="h-full bg-gradient-to-r from-green-400 to-emerald-400"
                  animate={{ width: `${bootStarted ? (bootTime / totalTime) * 100 : 0}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>

              {/* Status */}
              <div className="mt-4 flex items-center gap-2">
                {systemReady ? (
                  <>
                    <CheckCircle2 size={20} className="text-green-400" />
                    <p className="text-green-400 font-semibold">System Ready</p>
                  </>
                ) : bootStarted ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }}>
                      <Loader size={20} className="text-green-400" />
                    </motion.div>
                    <p className="text-green-400 font-semibold">Initializing...</p>
                  </>
                ) : (
                  <>
                    <AlertCircle size={20} className="text-orange-400" />
                    <p className="text-orange-400 font-semibold">Offline</p>
                  </>
                )}
              </div>
            </motion.div>

            {/* Boot Steps - Always shown */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-2"
            >
              <h3 className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-green-950"}`}>
                Initialization Steps
              </h3>
              {bootSteps.map((step, idx) => (
                <BootStepItem key={idx} step={step} index={idx} />
              ))}
            </motion.div>

            {/* System Info */}
            {systemReady && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className={`rounded-2xl p-8 border mt-8 ${
                  isDark
                    ? "border-green-500/30 bg-gradient-to-br from-green-900/20 to-emerald-900/10"
                    : "border-green-400/20 bg-green-950/10"
                } backdrop-blur-xl`}
              >
                <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${isDark ? "text-white" : "text-green-950"}`}>
                  <Shield size={24} className="text-green-400" />
                  System Status
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "API Server", icon: Zap, status: "ONLINE" },
                    { label: "Database", icon: Activity, status: "READY" },
                    { label: "Packet Sniffer", icon: Activity, status: "ACTIVE" },
                    { label: "ML Engine", icon: Shield, status: "LOADED" },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className={`p-4 rounded-lg border ${
                          isDark
                            ? "border-green-500/30 bg-green-500/5"
                            : "border-green-400/30 bg-green-500/5"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon size={18} className="text-green-400" />
                          <p className={`text-sm font-semibold ${isDark ? "text-green-300" : "text-green-800"}`}>
                            {item.label}
                          </p>
                        </div>
                        <p className="text-green-400 text-xs font-mono">● {item.status}</p>
                      </div>
                    );
                  })}
                </div>

                <div className={`mt-6 p-4 rounded-lg border ${isDark ? "border-green-500/30 bg-green-500/5" : "border-green-400/30 bg-green-500/5"}`}>
                  <p className={`text-sm ${isDark ? "text-green-300" : "text-green-800"}`}>
                    ✓ All systems operational. NIDS Sentinel ready for threat detection.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
