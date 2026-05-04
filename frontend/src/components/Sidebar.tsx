"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldAlert,
  LayoutDashboard,
  Bell,
  Globe,
  Sun,
  Moon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  BrainCircuit,
  Settings,
  Gauge,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { removeToken } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/alerts", label: "Threat Alerts", icon: Bell },
  { href: "/map", label: "Geo-IP Map", icon: Globe },
  { href: "/ml", label: "ML Analytics", icon: BrainCircuit },
  { href: "/performance", label: "Performance", icon: Gauge },
  { href: "/settings", label: "System Config", icon: Settings },
];

function SidebarSparkles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();

    type Sparkle = { x: number; y: number; size: number; opacity: number; speed: number; phase: number; color: string };
    const sparkles: Sparkle[] = [];
    const colors = isDark
      ? ["#a78bfa", "#8b5cf6", "#06b6d4", "#ec4899", "#f59e0b"]
      : ["#6d28d9", "#7c3aed", "#2563eb", "#9333ea", "#4f46e5"];

    for (let i = 0; i < 25; i++) {
      sparkles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2.5 + 0.5,
        opacity: Math.random(),
        speed: 0.005 + Math.random() * 0.015,
        phase: Math.random() * Math.PI * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let frame: number;
    let time = 0;

    const draw = () => {
      frame = requestAnimationFrame(draw);
      time += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      sparkles.forEach((s) => {
        s.phase += s.speed;
        const alpha = (Math.sin(s.phase) * 0.5 + 0.5) * (isDark ? 0.9 : 0.7);
        const size = s.size * (0.8 + Math.sin(s.phase * 1.5) * 0.4);

        // Glow
        ctx.beginPath();
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, size * 4);
        grad.addColorStop(0, s.color + Math.round(alpha * 60).toString(16).padStart(2, "0"));
        grad.addColorStop(1, s.color + "00");
        ctx.fillStyle = grad;
        ctx.arc(s.x, s.y, size * 4, 0, Math.PI * 2);
        ctx.fill();

        // Core sparkle
        ctx.beginPath();
        ctx.fillStyle = s.color + Math.round(alpha * 255).toString(16).padStart(2, "0");
        ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
        ctx.fill();

        // Cross sparkle rays
        ctx.strokeStyle = s.color + Math.round(alpha * 120).toString(16).padStart(2, "0");
        ctx.lineWidth = 0.5;
        const rayLen = size * 3;
        ctx.beginPath();
        ctx.moveTo(s.x - rayLen, s.y);
        ctx.lineTo(s.x + rayLen, s.y);
        ctx.moveTo(s.x, s.y - rayLen);
        ctx.lineTo(s.x, s.y + rayLen);
        ctx.stroke();

        // Slowly drift
        s.y += Math.sin(time * 0.3 + s.phase) * 0.15;
        s.x += Math.cos(time * 0.2 + s.phase) * 0.1;

        // Wrap
        if (s.y > canvas.height + 10) s.y = -10;
        if (s.y < -10) s.y = canvas.height + 10;
        if (s.x > canvas.width + 10) s.x = -10;
        if (s.x < -10) s.x = canvas.width + 10;
      });
    };
    draw();

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frame);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = React.useState(false);

  if (pathname === "/login" || pathname === "/") return null;

  return (
    <aside
      className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}
    >
      {/* Sparkle effects */}
      <SidebarSparkles />

      {/* Brand */}
      <div className="sidebar__brand" style={{ position: "relative", zIndex: 1 }}>
        <div className="sidebar__logo">
          <ShieldAlert size={24} />
        </div>
        {!collapsed && (
          <div className="sidebar__brand-text">
            <span className="sidebar__title">NIDS Sentinel</span>
            <span className="sidebar__subtitle">Threat Detection</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav" style={{ position: "relative", zIndex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar__link ${isActive ? "sidebar__link--active" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={20} />
              {!collapsed && <span>{item.label}</span>}
              {isActive && <div className="sidebar__active-indicator" />}
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom Actions */}
      <div className="sidebar__actions" style={{ position: "relative", zIndex: 1 }}>
        <button
          onClick={toggleTheme}
          className="sidebar__action-btn"
          title={theme === "dark" ? "Light Mode" : "Dark Mode"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          {!collapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
        </button>

        <button
          onClick={() => {
            removeToken();
            router.push("/login");
          }}
          className="sidebar__action-btn sidebar__action-btn--danger"
          title="Sign Out"
        >
          <LogOut size={18} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="sidebar__collapse-btn"
        style={{ position: "relative", zIndex: 1 }}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
