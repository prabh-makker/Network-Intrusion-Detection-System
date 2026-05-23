"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Shield, Lock, User, Eye, EyeOff, AlertCircle, ChevronRight, Fingerprint, AlertTriangle, Radar, Wifi, Monitor, Mail, HelpCircle, MessageSquare, Activity } from "lucide-react";
import { setToken } from "@/lib/auth";
import { getApiUrl } from "@/lib/api";

// ========== AURORA CANVAS — flowing colored ribbons (FULL SCREEN) ==========
const AuroraCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const time = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const w = () => canvas.offsetWidth;
    const h = () => canvas.offsetHeight;

    // Wine, blue, purple palette only
    const ribbons = [
      { color: [120, 40, 80], speed: 0.3, amp: 80, yBase: 0.25, width: 200, phase: 0 },      // wine
      { color: [139, 92, 246], speed: 0.25, amp: 100, yBase: 0.4, width: 220, phase: 2 },     // purple
      { color: [59, 130, 246], speed: 0.35, amp: 70, yBase: 0.55, width: 180, phase: 4 },     // blue
      { color: [168, 85, 247], speed: 0.2, amp: 90, yBase: 0.7, width: 160, phase: 1 },       // violet
      { color: [157, 50, 90], speed: 0.28, amp: 60, yBase: 0.5, width: 140, phase: 3 },       // deep wine
      { color: [99, 60, 180], speed: 0.22, amp: 75, yBase: 0.85, width: 130, phase: 5 },      // indigo-wine
    ];

    // Data pulse dots removed by request

    const animate = () => {
      ctx.clearRect(0, 0, w(), h());
      time.current += 0.008;

      // Draw ribbons
      ribbons.forEach((r) => {
        ctx.beginPath();
        const segments = 80;
        for (let i = 0; i <= segments; i++) {
          const x = (i / segments) * w();
          const progress = i / segments;
          const wave1 = Math.sin(progress * 4 + time.current * r.speed + r.phase) * r.amp;
          const wave2 = Math.sin(progress * 2.5 + time.current * r.speed * 0.7 + r.phase) * r.amp * 0.5;
          const y = h() * r.yBase + wave1 + wave2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        const grad = ctx.createLinearGradient(0, 0, w(), 0);
        grad.addColorStop(0, `rgba(${r.color.join(",")}, 0)`);
        grad.addColorStop(0.2, `rgba(${r.color.join(",")}, 0.07)`);
        grad.addColorStop(0.5, `rgba(${r.color.join(",")}, 0.14)`);
        grad.addColorStop(0.8, `rgba(${r.color.join(",")}, 0.07)`);
        grad.addColorStop(1, `rgba(${r.color.join(",")}, 0)`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = r.width;
        ctx.lineCap = "round";
        ctx.stroke();

        // Bright core
        ctx.beginPath();
        for (let i = 0; i <= segments; i++) {
          const x = (i / segments) * w();
          const progress = i / segments;
          const wave1 = Math.sin(progress * 4 + time.current * r.speed + r.phase) * r.amp;
          const wave2 = Math.sin(progress * 2.5 + time.current * r.speed * 0.7 + r.phase) * r.amp * 0.5;
          const y = h() * r.yBase + wave1 + wave2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const coreGrad = ctx.createLinearGradient(0, 0, w(), 0);
        coreGrad.addColorStop(0, `rgba(${r.color.join(",")}, 0)`);
        coreGrad.addColorStop(0.3, `rgba(${r.color.join(",")}, 0.3)`);
        coreGrad.addColorStop(0.5, `rgba(${r.color.join(",")}, 0.45)`);
        coreGrad.addColorStop(0.7, `rgba(${r.color.join(",")}, 0.3)`);
        coreGrad.addColorStop(1, `rgba(${r.color.join(",")}, 0)`);
        ctx.strokeStyle = coreGrad;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Draw data pulses removed by request

      requestAnimationFrame(animate);
    };

    animate();
    return () => window.removeEventListener("resize", resize);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }} />;
};

// ========== RADAR PULSE — wine/blue/purple ==========
const RadarPulse = () => (
  <div className="absolute top-8 right-8 w-20 h-20 pointer-events-none" style={{ zIndex: 3 }}>
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="absolute inset-0 rounded-full"
        style={{ border: `1px solid ${["rgba(120,40,80,0.3)", "rgba(139,92,246,0.3)", "rgba(59,130,246,0.3)"][i]}` }}
        animate={{ scale: [0.3, 1.5], opacity: [0.8, 0] }}
        transition={{ duration: 3, repeat: Infinity, delay: i * 1, ease: "easeOut" }}
      />
    ))}
    <div className="absolute inset-0 flex items-center justify-center">
      <Activity size={16} className="text-purple-400/60" />
    </div>
  </div>
);

// ========== DATA STREAM LINE — wine/blue/purple ==========
const DataStream = () => (
  <motion.div
    className="absolute left-0 right-0 pointer-events-none"
    style={{
      height: "1px",
      background: "linear-gradient(90deg, transparent, rgba(120,40,80,0.4) 20%, rgba(139,92,246,0.5) 40%, rgba(59,130,246,0.5) 60%, rgba(168,85,247,0.4) 80%, transparent)",
      boxShadow: "0 0 15px rgba(139,92,246,0.2), 0 0 30px rgba(120,40,80,0.1)",
      zIndex: 2,
    }}
    animate={{ top: ["0%", "100%"] }}
    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
  />
);

// ========== THREAT FEED — wine/blue/purple ==========
const ThreatFeed = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const threats = [
    { icon: AlertTriangle, text: "C2 beacon intercepted", color: "#9d325a", time: "09:12:35" },
    { icon: AlertCircle, text: "Port scan detected — 192.168.1.47", color: "#8b5cf6", time: "09:12:28" },
    { icon: Radar, text: "Lateral movement neutralized", color: "#7c3aed", time: "09:12:19" },
    { icon: Shield, text: "SSH brute force attempt blocked", color: "#3b82f6", time: "09:11:54" },
    { icon: Monitor, text: "New device: MAC a4:c3:10:xx", color: "#a855f7", time: "09:11:38" },
  ];

  useEffect(() => {
    const interval = setInterval(() => setActiveIndex((i) => (i + 1) % threats.length), 2500);
    return () => clearInterval(interval);
  }, [threats.length]);

  return (
    <div className="space-y-1">
      {threats.map((t, i) => {
        const Icon = t.icon;
        const isActive = i === activeIndex;
        return (
          <motion.div
            key={i}
            animate={{ opacity: isActive ? 1 : 0.4, x: isActive ? 4 : 0, scale: isActive ? 1.02 : 1 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2 py-1 text-[13px]"
          >
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: t.color }}
            />
            <Icon size={13} style={{ color: t.color }} className="flex-shrink-0" />
            <span className="text-slate-300 truncate">{t.text}</span>
            <span className="ml-auto text-[10px] font-mono flex-shrink-0" style={{ color: t.color }}>{t.time}</span>
          </motion.div>
        );
      })}
    </div>
  );
};

// ========== ANIMATED COUNTER ==========
const AnimCounter = ({ end, suffix, color }: { end: number; suffix?: string; color: string }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(end / 60);
    const interval = setInterval(() => {
      start += step;
      if (start >= end) { setVal(end); clearInterval(interval); }
      else setVal(start);
    }, 25);
    return () => clearInterval(interval);
  }, [end]);

  return (
    <span className="text-4xl lg:text-5xl font-black tabular-nums" style={{ color }}>
      {val.toLocaleString()}{suffix || ""}
    </span>
  );
};

// ========== COLOR-CYCLING BORDER — wine/blue/purple only ==========
const CyclingBorder = () => {
  const [angle, setAngle] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setAngle((a) => (a + 1.5) % 360), 20);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <div className="absolute -inset-[3px] rounded-3xl" style={{
        background: `conic-gradient(from ${angle}deg, #782850, #8b5cf6, #3b82f6, #a855f7, #9d325a, #782850)`,
        opacity: 0.15, filter: "blur(12px)",
      }} />
      <div className="absolute -inset-[1px] rounded-3xl" style={{
        background: `conic-gradient(from ${angle}deg, #782850, #8b5cf6, #3b82f6, #a855f7, #9d325a, #782850)`,
        opacity: 0.3,
      }} />
    </>
  );
};

// ========== COLOR-CYCLING BUTTON — wine/blue/purple only ==========
const GradientButton = ({ loading, children, ...props }: any) => {
  const [phase, setPhase] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => (p + 1) % 300), 30);
    return () => clearInterval(id);
  }, []);

  // Cycle between wine(340), purple(270), blue(220)
  const hues = [340, 270, 220];
  const t = phase / 100; // 0..3
  const idx = Math.floor(t) % 3;
  const frac = t - Math.floor(t);
  const h1 = hues[idx];
  const h2 = hues[(idx + 1) % 3];
  const h3 = hues[(idx + 2) % 3];
  const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

  return (
    <motion.button {...props} disabled={loading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.97 }}
      className="relative w-full py-3.5 rounded-xl text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2 text-[15px] overflow-hidden"
      style={{
        background: `linear-gradient(135deg, hsl(${lerp(h1,h2,frac)},70%,45%), hsl(${lerp(h2,h3,frac)},65%,40%), hsl(${lerp(h3,h1,frac)},70%,45%))`,
        boxShadow: isHovered
          ? `0 8px 40px hsla(${lerp(h1,h2,frac)},70%,40%,0.5), 0 0 60px hsla(${lerp(h2,h3,frac)},65%,40%,0.2)`
          : `0 4px 20px hsla(${lerp(h1,h2,frac)},70%,40%,0.25)`,
        transition: "box-shadow 0.3s ease",
      }}>
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%)" }}
        animate={isHovered ? { x: ["-100%", "200%"] } : { x: "-100%" }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      />
      {isHovered && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ border: `2px solid hsla(270,70%,60%,0.4)` }}
          animate={{ scale: [1, 1.08], opacity: [0.6, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
};

// ========== 3D TILT CARD ==========
const TiltCard = ({ children }: { children: React.ReactNode }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 20 });

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [x, y]);

  const handleLeave = useCallback(() => { x.set(0); y.set(0); }, [x, y]);

  return (
    <motion.div
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      className="relative w-full max-w-[380px]"
    >
      {children}
    </motion.div>
  );
};

// ========== MAIN LOGIN PAGE ==========
export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"login" | "signup" | "forgot">("login");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  // Forgot password state
  const [forgotStep, setForgotStep] = useState<1 | 2>(1); // 1=enter username, 2=answer question + new password
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotQuestion, setForgotQuestion] = useState("");
  const [forgotAnswer, setForgotAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const apiUrl = getApiUrl();
  const questions = [
    "What was the name of your first pet?",
    "What city were you born in?",
    "What is your mother's maiden name?",
    "What was the name of your first school?",
    "What is your favourite movie?",
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);
      const res = await fetch(`${apiUrl}/api/v1/login/access-token`, {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: formData.toString(),
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.access_token);
        localStorage.setItem("nids_username", username);
        const newUser = localStorage.getItem("nids_new_user");
        if (newUser === username) {
          localStorage.removeItem("nids_new_user");
          router.push("/welcome");
        } else {
          router.push("/dashboard");
        }
      }
      else setError(data.detail || "Login failed");
    } catch { setError("Connection error"); }
    finally { setLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/signup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, email: `${username}@nids.local`, security_question: securityQuestion, security_answer: securityAnswer }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("nids_new_user", username);
        setError(""); setSuccess("Account created! Please login."); setView("login"); setUsername(""); setPassword(""); setSecurityQuestion(""); setSecurityAnswer("");
      }
      else setError(data.detail || "Signup failed");
    } catch { setError("Connection error"); }
    finally { setLoading(false); }
  };

  const handleForgotGetQuestion = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    if (!forgotUsername.trim()) { setError("Enter your username"); setLoading(false); return; }
    try {
      const res = await fetch(`${apiUrl}/api/v1/forgot/get-question`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: forgotUsername }),
      });
      const data = await res.json();
      if (res.ok) { setForgotQuestion(data.question); setForgotStep(2); }
      else setError(data.detail || "User not found");
    } catch { setError("Connection error"); }
    finally { setLoading(false); }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    if (!forgotAnswer.trim()) { setError("Enter your answer"); setLoading(false); return; }
    if (newPassword.length < 4) { setError("Password must be at least 4 characters"); setLoading(false); return; }
    try {
      const res = await fetch(`${apiUrl}/api/v1/forgot/reset`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: forgotUsername, security_answer: forgotAnswer, new_password: newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Password reset! Please login.");
        setView("login"); setForgotStep(1); setForgotUsername(""); setForgotQuestion(""); setForgotAnswer(""); setNewPassword("");
      } else setError(data.detail || "Reset failed");
    } catch { setError("Connection error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-page min-h-screen w-full relative overflow-hidden bg-[#030108]">
      {/* ===== FULL-SCREEN AURORA BACKGROUND ===== */}
      <AuroraCanvas />
      <DataStream />
      {/* Orbs removed by request */}
      {/* ===== CONTENT OVERLAY — both sides same effect behind =====  */}
      <div className="relative min-h-screen flex flex-col lg:flex-row" style={{ zIndex: 5 }}>

        {/* ===== LEFT SIDE — Stats & Info ===== */}
        <div className="hidden lg:flex w-[55%] flex-col justify-between p-10">
          {/* Logo */}
          <div>
            <motion.div
              className="flex items-center gap-3 mb-6"
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Shield size={28} className="text-purple-400" />
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-purple-500/40 to-transparent" />
            </motion.div>
            <h2 className="text-5xl font-black tracking-tight mb-2">
              <span
                className="bg-clip-text text-transparent select-none"
                style={{
                  backgroundImage: "linear-gradient(90deg, #a855f7, #ec4899, #38bdf8, #a855f7)",
                  backgroundSize: "200% 100%",
                  animation: "nids-heading-sweep 10s linear infinite",
                }}
              >
                NIDS SENTINEL
              </span>
            </h2>
            <p className="text-slate-500 text-sm tracking-wide">Securing Networks &bull; Detecting Threats &bull; AI-Powered</p>
          </div>

          {/* Stats — NO containers, just bold floating numbers */}
          <div className="space-y-8">
            <div className="flex items-end gap-10">
              <div>
                <AnimCounter end={2847} color="#8b5cf6" />
                <div className="text-[10px] uppercase tracking-[0.2em] text-purple-500/50 mt-1">Threats Blocked</div>
              </div>
              <div>
                <AnimCounter end={99} suffix="%" color="#3b82f6" />
                <div className="text-[10px] uppercase tracking-[0.2em] text-blue-500/50 mt-1">Accuracy</div>
              </div>
              <div>
                <AnimCounter end={147} color="#9d325a" />
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#9d325a]/50 mt-1">Nodes Active</div>
              </div>
            </div>

            {/* Threat Feed */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-purple-500/50 mb-3 flex items-center gap-2 font-semibold">
                <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                  <Wifi size={11} />
                </motion.span>
                Live Threat Feed
              </p>
              <ThreatFeed />
            </div>
          </div>

          {/* Bottom */}
          <p className="text-[11px] text-slate-600">
            Real-time AI-powered defense &bull; <span className="text-purple-600">XGBoost ML</span> classification
          </p>
        </div>

        {/* ===== RIGHT SIDE — Login Card (NO container, transparent glass only) ===== */}
        <div className="w-full lg:w-[45%] flex flex-col items-center justify-center px-6 py-10 relative">
          {/* CARD with 3D tilt */}
          <div style={{ zIndex: 10 }}>
            <TiltCard>
              {/* Cycling border */}
              <CyclingBorder />

              {/* DARK GLASS CARD — subtle, not bright */}
              <div className="relative rounded-3xl p-8 border border-white/[0.06]"
                style={{
                  background: "rgba(8,4,16,0.6)",
                  backdropFilter: "blur(40px) saturate(1.4)",
                  WebkitBackdropFilter: "blur(40px) saturate(1.4)",
                }}>
                {/* Inner glow — wine/blue/purple */}
                <div className="absolute inset-0 rounded-3xl pointer-events-none"
                  style={{ background: "linear-gradient(135deg, rgba(120,40,80,0.03) 0%, transparent 30%, rgba(139,92,246,0.03) 50%, transparent 70%, rgba(59,130,246,0.03) 100%)" }} />

                {/* Header */}
                <div className="relative text-center mb-7">
                  <motion.div
                    className="flex items-center justify-center mx-auto mb-4"
                    animate={{ rotateY: view !== "login" ? 180 : 0 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Fingerprint size={32} className="text-purple-400" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-white">
                    {view === "login" ? "Welcome Back" : view === "signup" ? "Create Account" : "Reset Password"}
                  </h2>
                  <p className="text-[13px] text-slate-400 mt-1">
                    {view === "login" ? "Authenticate to access your dashboard" : view === "signup" ? "Set up your credentials" : "Recover your access"}
                  </p>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                      <AlertCircle size={15} className="text-red-400" />
                      <span className="text-sm text-red-300">{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Success */}
                <AnimatePresence>
                  {success && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="mb-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-2">
                      <Shield size={15} className="text-purple-400" />
                      <span className="text-sm text-purple-300">{success}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ===== LOGIN ===== */}
                <AnimatePresence mode="wait">
                  {view === "login" && (
                    <motion.form key="login" onSubmit={handleLogin} className="space-y-5"
                      initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} transition={{ duration: 0.3 }}>
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] text-purple-300 mb-1.5 block">Username</label>
                        <div className="relative">
                          <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
                          <input type="text" placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 border border-white/[0.06] focus:border-purple-500/30 focus:outline-none focus:ring-1 focus:ring-purple-500/20 transition-all"
                            style={{ background: "rgba(255,255,255,0.03)" }} />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] text-blue-300 mb-1.5 block">Password</label>
                        <div className="relative">
                          <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" />
                          <input type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-10 py-3 rounded-xl text-sm text-white placeholder-slate-500 border border-white/[0.06] focus:border-blue-500/30 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
                            style={{ background: "rgba(255,255,255,0.03)" }} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>

                      <GradientButton type="submit" loading={loading}>
                        {loading ? "Authenticating..." : (<>Access Dashboard <ChevronRight size={18} /></>)}
                      </GradientButton>

                      <div className="text-center space-y-2 pt-1">
                        <button type="button" onClick={() => { setView("forgot"); setError(""); }}
                          className="text-[13px] text-slate-500 hover:text-slate-300 block mx-auto transition-colors">Forgot password?</button>
                        <p className="text-[13px] text-slate-600">
                          New here?{" "}
                          <button type="button" onClick={() => { setView("signup"); setError(""); }}
                            className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">Create account &gt;</button>
                        </p>
                      </div>
                    </motion.form>
                  )}

                  {/* ===== SIGNUP ===== */}
                  {view === "signup" && (
                    <motion.form key="signup" onSubmit={handleSignup} className="space-y-3.5"
                      initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} transition={{ duration: 0.3 }}>
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] text-purple-300 mb-1 block">Username</label>
                        <div className="relative">
                          <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
                          <input type="text" placeholder="Choose a username" value={username} onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 border border-white/[0.06] focus:border-purple-500/30 focus:outline-none transition-all"
                            style={{ background: "rgba(255,255,255,0.03)" }} />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] text-[#c45a7a] mb-1 block">Password</label>
                        <div className="relative">
                          <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c45a7a]" />
                          <input type={showPassword ? "text" : "password"} placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 border border-white/[0.06] focus:border-[#9d325a]/30 focus:outline-none transition-all"
                            style={{ background: "rgba(255,255,255,0.03)" }} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600">
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] text-purple-300 mb-1 block">Security Question</label>
                        <div className="relative">
                          <HelpCircle size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
                          <select value={securityQuestion} onChange={(e) => setSecurityQuestion(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white border border-white/[0.06] focus:border-purple-500/30 focus:outline-none appearance-none transition-all"
                            style={{ background: "rgba(255,255,255,0.03)" }}>
                            <option value="">Select a question</option>
                            {questions.map((q) => <option key={q} value={q}>{q}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="relative">
                        <MessageSquare size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" />
                        <input type="text" placeholder="Your answer" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 border border-white/[0.06] focus:border-blue-500/30 focus:outline-none transition-all"
                          style={{ background: "rgba(255,255,255,0.03)" }} />
                      </div>

                      <GradientButton type="submit" loading={loading}>
                        {loading ? "Creating..." : "Create Account"}
                      </GradientButton>

                      <p className="text-center text-[13px] text-slate-600">
                        Already have an account?{" "}
                        <button type="button" onClick={() => { setView("login"); setError(""); }}
                          className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">Login</button>
                      </p>
                    </motion.form>
                  )}

                  {/* ===== FORGOT — Step 1: Enter Username ===== */}
                  {view === "forgot" && forgotStep === 1 && (
                    <motion.form key="forgot1" onSubmit={handleForgotGetQuestion} className="space-y-4"
                      initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} transition={{ duration: 0.3 }}>
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] text-purple-300 mb-1.5 block">Username</label>
                        <div className="relative">
                          <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
                          <input type="text" placeholder="Enter your username" value={forgotUsername} onChange={(e) => setForgotUsername(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 border border-white/[0.06] focus:border-purple-500/30 focus:outline-none focus:ring-1 focus:ring-purple-500/20 transition-all"
                            style={{ background: "rgba(255,255,255,0.03)" }} />
                        </div>
                      </div>
                      <GradientButton type="submit" loading={loading}>
                        {loading ? "Looking up..." : "Get Security Question"}
                      </GradientButton>
                      <button type="button" onClick={() => { setView("login"); setError(""); setSuccess(""); setForgotUsername(""); }}
                        className="text-[13px] text-slate-500 hover:text-slate-300 block mx-auto transition-colors">Back to Login</button>
                    </motion.form>
                  )}

                  {/* ===== FORGOT — Step 2: Answer Question + New Password ===== */}
                  {view === "forgot" && forgotStep === 2 && (
                    <motion.form key="forgot2" onSubmit={handleForgotReset} className="space-y-4"
                      initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} transition={{ duration: 0.3 }}>
                      <div className="p-3 rounded-xl border border-purple-500/10 bg-purple-500/5">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-purple-400 mb-1">Security Question</p>
                        <p className="text-sm text-white">{forgotQuestion}</p>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] text-blue-300 mb-1.5 block">Your Answer</label>
                        <div className="relative">
                          <MessageSquare size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" />
                          <input type="text" placeholder="Enter your answer" value={forgotAnswer} onChange={(e) => setForgotAnswer(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 border border-white/[0.06] focus:border-blue-500/30 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
                            style={{ background: "rgba(255,255,255,0.03)" }} />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] text-[#c45a7a] mb-1.5 block">New Password</label>
                        <div className="relative">
                          <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c45a7a]" />
                          <input type={showPassword ? "text" : "password"} placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full pl-10 pr-10 py-3 rounded-xl text-sm text-white placeholder-slate-500 border border-white/[0.06] focus:border-[#9d325a]/30 focus:outline-none focus:ring-1 focus:ring-[#9d325a]/20 transition-all"
                            style={{ background: "rgba(255,255,255,0.03)" }} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>
                      <GradientButton type="submit" loading={loading}>
                        {loading ? "Resetting..." : "Reset Password"}
                      </GradientButton>
                      <button type="button" onClick={() => { setForgotStep(1); setError(""); setForgotAnswer(""); setNewPassword(""); }}
                        className="text-[13px] text-slate-500 hover:text-slate-300 block mx-auto transition-colors">Back</button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </TiltCard>
          </div>

          {/* Tech badges — wine/blue/purple */}
          <div className="flex gap-6 mt-8" style={{ zIndex: 10 }}>
            {[
              { label: "AES-256", color: "text-purple-600/40" },
              { label: "JWT Auth", color: "text-blue-600/40" },
              { label: "ZTA Ready", color: "text-[#c45a7a]" },
            ].map((b) => (
              <div key={b.label} className={`flex items-center gap-1.5 text-[11px] ${b.color}`}>
                <Shield size={11} />
                <span>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
