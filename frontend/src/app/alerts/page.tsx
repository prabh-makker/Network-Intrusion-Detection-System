"use client";

import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  ChevronRight, 
  Search,
  ArrowLeft,
  Ban,
  Info,
  BarChart3,
  Sun,
  Moon,
  AlertTriangle,
  Skull,
  Radar,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

type Alert = {
  id: string;
  timestamp: string;
  src_ip: string;
  dst_ip: string;
  protocol: string;
  label: string;
  confidence: number;
  is_blocked: boolean;
};

type AlertStats = {
  total_threats: number;
  by_label: Record<string, number>;
  top_sources: { ip: string; count: number }[];
};

type Explanation = {
  label: string;
  description: string;
  key_indicators: { feature: string; impact: string; detail: string }[];
  severity: string;
  mitigation: string;
};

const THREAT_ICONS: Record<string, React.ReactNode> = {
  "DoS": <Skull size={18} />,
  "DDoS (Ping of Death)": <Skull size={18} />,
  "Probe": <Radar size={18} />,
  "U2R (Root Access)": <Lock size={18} />
};

const SEVERITY_COLORS: Record<string, string> = {
  "CRITICAL": "text-rose-500 bg-rose-500/15 border-rose-500/30",
  "HIGH": "text-amber-500 bg-amber-500/15 border-amber-500/30",
  "MEDIUM": "text-blue-500 bg-blue-500/15 border-blue-500/30",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [isLightMode, setIsLightMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [isLightMode]);

  // Fetch alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const url = selectedLabel 
          ? `http://localhost:8000/api/v1/alerts/recent?limit=100&label=${encodeURIComponent(selectedLabel)}`
          : `http://localhost:8000/api/v1/alerts/recent?limit=100`;
        const res = await fetch(url);
        const data = await res.json();
        setAlerts(data);
      } catch (e) { console.error(e); }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, [selectedLabel]);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/v1/alerts/stats");
        const data = await res.json();
        setStats(data);
      } catch (e) { console.error(e); }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch explanation when label selected
  const fetchExplanation = async (label: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/alerts/explain/${encodeURIComponent(label)}`);
      const data = await res.json();
      setExplanation(data);
    } catch (e) { console.error(e); }
  };

  const handleBlock = async (alertId: string) => {
    try {
      await fetch(`http://localhost:8000/api/v1/alerts/${alertId}/block`, { method: 'POST' });
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_blocked: true } : a));
    } catch (e) { console.error(e); }
  };

  const filteredAlerts = alerts.filter(a => 
    a.src_ip.includes(searchTerm) || 
    a.dst_ip.includes(searchTerm) || 
    a.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen p-6 md:p-8 flex flex-col gap-6">

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--glass-border)] pb-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="glass-panel p-3 rounded-xl hover:scale-105 transition-transform">
            <ArrowLeft size={20} className="text-[var(--muted)]" />
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-rose-400 to-orange-500 bg-clip-text text-transparent">
              Threat Alerts
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mt-1">
              AI-Powered Threat Analysis & Explainability
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsLightMode(!isLightMode)}
            className="glass-panel p-3 rounded-xl hover:bg-slate-800/10 transition-colors"
          >
            {isLightMode ? <Moon size={20} className="text-slate-700" /> : <Sun size={20} className="text-amber-400" />}
          </button>
          <Link href="/dashboard" className="glass-panel px-4 py-3 rounded-xl text-sm font-bold text-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-2">
            <BarChart3 size={16} /> Dashboard
          </Link>
        </div>
      </header>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="glass-panel p-4 rounded-2xl text-center">
            <div className="text-2xl font-black text-rose-500">{stats.total_threats}</div>
            <div className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest mt-1">Total Threats</div>
          </div>
          {Object.entries(stats.by_label).map(([label, count]) => (
            <button
              key={label}
              onClick={() => { setSelectedLabel(selectedLabel === label ? null : label); fetchExplanation(label); }}
              className={`glass-panel p-4 rounded-2xl text-center cursor-pointer transition-all hover:scale-105 ${selectedLabel === label ? 'ring-2 ring-blue-500' : ''}`}
            >
              <div className="text-2xl font-black text-[var(--foreground)]">{count}</div>
              <div className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest mt-1 truncate">{label}</div>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">

        {/* Left: Alert List */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Search */}
          <div className="glass-panel px-4 py-3 rounded-xl flex items-center gap-3">
            <Search size={16} className="text-[var(--muted)]" />
            <input 
              type="text" 
              placeholder="Search by IP, label..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none flex-1 text-sm text-[var(--foreground)] placeholder-[var(--muted)]"
            />
            {selectedLabel && (
              <button onClick={() => setSelectedLabel(null)} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-md">
                ✕ {selectedLabel}
              </button>
            )}
          </div>

          {/* Alert Cards */}
          <div className="flex-1 overflow-y-auto max-h-[60vh] space-y-3 pr-1">
            <AnimatePresence>
              {filteredAlerts.length === 0 ? (
                <div className="text-[var(--muted)] text-sm text-center py-16 glass-panel rounded-2xl">
                  <ShieldCheck size={48} className="mx-auto mb-4 text-emerald-500" />
                  No threats detected yet.
                </div>
              ) : filteredAlerts.map((alert, i) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`glass-panel p-4 rounded-xl flex items-center gap-4 group ${alert.is_blocked ? 'opacity-50' : ''}`}
                >
                  {/* Icon */}
                  <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500 shrink-0">
                    {THREAT_ICONS[alert.label] || <AlertTriangle size={18} />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-[var(--foreground)]">{alert.label}</span>
                      <span className="text-xs text-[var(--muted)]">{alert.confidence}%</span>
                      {alert.is_blocked && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">BLOCKED</span>}
                    </div>
                    <div className="text-xs text-[var(--muted)] font-mono flex gap-3">
                      <span>{alert.src_ip} → {alert.dst_ip}</span>
                      <span>{alert.protocol}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => fetchExplanation(alert.label)}
                      className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                      title="Explain"
                    >
                      <Info size={14} />
                    </button>
                    {!alert.is_blocked && (
                      <button 
                        onClick={() => handleBlock(alert.id)}
                        className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                        title="Block IP"
                      >
                        <Ban size={14} />
                      </button>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span className="text-xs text-[var(--muted)] shrink-0 hidden md:block">
                    {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : '—'}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: AI Explainability Panel */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col border-t-2 border-t-rose-500/50">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--foreground)] flex items-center gap-2 mb-6">
            <Info size={16} className="text-blue-500" />
            AI Explainability
          </h3>

          {explanation ? (
            <div className="space-y-5 flex-1 overflow-y-auto">
              {/* Header */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                    {THREAT_ICONS[explanation.label] || <AlertTriangle size={20} />}
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-[var(--foreground)]">{explanation.label}</h4>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[explanation.severity] || 'text-slate-400'}`}>
                      {explanation.severity}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-[var(--muted)] leading-relaxed mt-3">
                  {explanation.description}
                </p>
              </div>

              {/* Key Indicators */}
              <div>
                <h5 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3">Key Indicators (Why AI Flagged This)</h5>
                <div className="space-y-2">
                  {explanation.key_indicators.map((ind, i) => (
                    <div key={i} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold font-mono text-[var(--foreground)]">{ind.feature}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[ind.impact] || 'text-slate-400'}`}>
                          {ind.impact}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--muted)]">{ind.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mitigation */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                <h5 className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-2 flex items-center gap-2">
                  <ShieldCheck size={14} /> Recommended Mitigation
                </h5>
                <p className="text-sm text-[var(--foreground)] leading-relaxed">{explanation.mitigation}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--muted)]">
              <Info size={48} className="mb-4 opacity-30" />
              <p className="text-sm text-center">Select a threat type or click the <strong>ℹ️</strong> button on any alert to see AI explanation.</p>
            </div>
          )}

          {/* Top Attackers */}
          {stats && stats.top_sources.length > 0 && (
            <div className="mt-6 pt-4 border-t border-[var(--glass-border)]">
              <h5 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3">Top Threat Sources</h5>
              <div className="space-y-2">
                {stats.top_sources.slice(0, 5).map((s, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className="font-mono text-[var(--foreground)]">{s.ip}</span>
                    <span className="text-xs bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full font-bold">
                      {s.count} hits
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
