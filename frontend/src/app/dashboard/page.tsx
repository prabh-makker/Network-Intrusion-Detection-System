"use client";

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Wifi,
  Cpu,
  Database,
  Radio,
  ServerCrash,
  Sun,
  Moon,
  LogOut,
  Globe,
  FileUp,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { getToken, removeToken, fetchWithAuth } from '@/lib/auth';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';

// Mock types
type Packet = {
  timestamp: number;
  src_ip: string;
  dst_ip: string;
  protocol: string;
  length: number;
  label: string;
  confidence: number;
  is_threat: boolean;
};

export default function NIDSDashboard() {
  const router = useRouter();
  const [packets, setPackets] = useState<Packet[]>([]);
  const [threatCount, setThreatCount] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [timelineRange, setTimelineRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pcapSummary, setPcapSummary] = useState<any>(null);


  // Fetch real historical data from backend
  const fetchTimeline = async () => {
    setLoadingTimeline(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/timeline?range=${timelineRange}`);
      const data = await res.json();
      setHistoricalData(data);
    } catch (err) {
      console.error("Failed to fetch timeline", err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [timelineRange]);


  // Auth Check
  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [isLightMode]);

  // Connect to websocket with token
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // Pass the token as a query parameter for authentication
    const ws = new WebSocket(`ws://localhost:8000/api/v1/traffic/stream?token=${encodeURIComponent(token)}`);


    ws.onopen = () => {
      setIsLive(true);
      console.log("WebSocket connected securely");
    };

    ws.onmessage = (event) => {
      try {
        const packet: Packet = JSON.parse(event.data);
        setPackets(prev => {
          const newPackets = [packet, ...prev].slice(0, 50); // Keep last 50
          return newPackets;
        });
        if (packet.is_threat) {
          setThreatCount(prev => prev + 1);
        }
      } catch (e) {
        console.error("WS parse error", e);
      }
    };

    ws.onclose = () => {
      setIsLive(false);
      console.log("WebSocket disconnected");
    };

    ws.onerror = () => {
      // WS unavailable when sniffer is not running
    };

    return () => {
      ws.close();
    };
  }, []);


  // Compute live stats for chart
  const getTrafficData = () => {
    // Generate some chart data based on packets or time
    const data = [];
    const now = new Date();
    for (let i = 20; i >= 0; i--) {
      data.push({
        time: new Date(now.getTime() - i * 1000).toLocaleTimeString([], { second: '2-digit', minute: '2-digit' }),
        traffic: Math.floor(Math.random() * 50) + 10,
        threats: Math.floor(Math.random() * 5)
      });
    }
    return data;
  };

  const handlePCAPUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setPcapSummary(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetchWithAuth(`${apiUrl}/api/v1/traffic/upload-pcap`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.status === 'completed') {
        setPcapSummary(data.analysis);
        // Refresh dashboard stats
        fetchTimeline();
      } else {
        alert(data.error || "Analysis failed");
      }
    } catch (err) {
      console.error("Upload failed", err);
      alert("Error connecting to server. Make sure PCAP is < 10MB.");
    } finally {
      setIsUploading(false);
    }
  };

  const currentStatus = threatCount > 10 ? 'CRITICAL' : (threatCount > 0 ? 'WARNING' : 'SECURE');
  const statusColors = {
    'SECURE': 'text-emerald-500',
    'WARNING': 'text-amber-500',
    'CRITICAL': 'text-rose-500'
  };

  return (
    <div className="min-h-screen p-6 md:p-8 flex flex-col gap-6 font-[family-name:var(--font-sans)]">

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-700/50 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-500/10 animate-pulse" />
            <ShieldAlert size={28} className="text-blue-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">NIDS Sentinel</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-2.5 w-2.5">
                {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isLive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                {isLive ? 'Live Stream Active' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsLightMode(!isLightMode)}
            className="glass-panel p-3 rounded-xl hover:bg-slate-800/10 transition-colors"
          >
            {isLightMode ? <Moon size={20} className="text-slate-700" /> : <Sun size={20} className="text-amber-400" />}
          </button>

          <Link href="/map" className="glass-panel px-4 py-3 rounded-xl text-sm font-bold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-2">
            <Globe size={16} /> Geo-IP Map
          </Link>
          <Link href="/alerts" className="glass-panel px-4 py-3 rounded-xl text-sm font-bold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-2">
            <ShieldAlert size={16} /> Alerts
          </Link>

          <button
            onClick={() => {
              removeToken();
              router.push('/login');
            }}
            className="glass-panel p-3 rounded-xl text-[var(--muted)] hover:text-rose-400 transition-colors flex items-center gap-2"
            title="Sign Out"
          >
            <LogOut size={20} />
          </button>

          <div className="glass-panel px-6 py-3 rounded-xl flex items-center gap-3">
            <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest">Network Status</span>
            <div className={`font-black tracking-wider ${statusColors[currentStatus]} flex items-center gap-2`}>
              {currentStatus === 'SECURE' ? <ShieldCheck size={18} /> : <ServerCrash size={18} />}
              {currentStatus}
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">

        {/* Left Col: Stats & Chart */}
        <div className="lg:col-span-3 flex flex-col gap-6">

          {/* Realtime Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Packets Analyzed', val: packets.length === 0 ? null : '14,291', trend: '+12%', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'Threats Blocked', val: packets.length === 0 ? null : threatCount.toString(), trend: '+2', icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-500/10' },
              { label: 'Active Streams', val: packets.length === 0 ? null : '84', trend: 'Stable', icon: Radio, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
            ].map((stat, i) => (
              <div key={i} className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl ${stat.bg} group-hover:scale-150 transition-transform duration-500`} />
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <h4 className="text-[var(--muted)] text-xs font-bold uppercase tracking-widest mb-1">{stat.label}</h4>
                    {stat.val === null ? (
                      <div className="h-8 bg-slate-700/50 rounded w-16 animate-pulse mt-1"></div>
                    ) : (
                      <span className="text-3xl font-black">{stat.val}</span>
                    )}
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                    <stat.icon size={22} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Flow Chart */}
          <div className="glass-panel p-6 rounded-2xl flex-1 min-h-[300px] flex flex-col">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--muted)] mb-6">Traffic & Threat Flow (Mbits/s)</h3>
            <div className="flex-1 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getTrafficData()}>
                  <defs>
                    <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickMargin={10} />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={(val) => `${val}M`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="traffic" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorTraffic)" />
                  <Area type="monotone" dataKey="threats" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorThreats)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Col: Live Packet Inspection */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col h-full overflow-hidden border-t-2 border-t-blue-500/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--foreground)] flex items-center gap-2">
              <Cpu size={16} className="text-blue-500" />
              Live Inference
            </h3>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-md font-mono">{packets.length} buffered</span>
          </div>

          {/* PCAP UPLOAD ZONE */}
          <div className="mb-6 p-4 rounded-xl border border-dashed border-slate-700 bg-slate-800/20 hover:bg-slate-800/40 transition-all relative overflow-hidden">
            <input
              type="file"
              accept=".pcap"
              onChange={handlePCAPUpload}
              className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
              disabled={isUploading}
            />
            <div className="flex flex-col items-center justify-center gap-2 py-2">
              <FileUp size={24} className={`${isUploading ? 'animate-bounce' : ''} text-blue-500`} />
              <div className="text-center">
                <p className="text-xs font-bold text-slate-300">{isUploading ? 'Analyzing Capture...' : 'Analyze PCAP History'}</p>
                <p className="text-[10px] text-[var(--muted)]">Drag or Click to Upload</p>
              </div>
            </div>
            {isUploading && <div className="absolute bottom-0 left-0 h-1 bg-blue-500 animate-loading-bar w-full" />}
          </div>

          {/* ANALYSIS RESULTS MINI-MODAL */}
          {pcapSummary && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 relative"
            >
              <button onClick={() => setPcapSummary(null)} className="absolute top-2 right-2 text-slate-500 hover:text-white">
                <X size={14} />
              </button>
              <h4 className="text-xs font-black text-indigo-400 uppercase mb-2">Analysis Complete</h4>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                <div className="bg-slate-900/40 p-2 rounded">
                  <p className="text-slate-400">PACKETS</p>
                  <p className="text-lg">{pcapSummary.packets_processed}</p>
                </div>
                <div className="bg-rose-900/20 p-2 rounded">
                  <p className="text-rose-400">THREATS</p>
                  <p className="text-lg">{pcapSummary.threats_detected}</p>
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            <AnimatePresence>
              {packets.length === 0 ? (
                // SKELETON LOADER
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((skeleton) => (
                    <div key={skeleton} className="p-4 rounded-xl border bg-[var(--card-bg)] border-[var(--card-border)] animate-pulse flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="h-4 bg-slate-700/50 rounded w-20"></div>
                        <div className="h-3 bg-slate-700/30 rounded w-16"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-slate-700/40 rounded w-3/4"></div>
                        <div className="h-3 bg-slate-700/40 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : packets.map((p, i) => (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={p.timestamp.toString() + i}
                  className={`p-4 rounded-xl border ${p.is_threat ? 'bg-rose-500/10 border-rose-500/30' : 'bg-[var(--card-bg)] border-[var(--card-border)]'} text-sm font-mono`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${p.is_threat ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {p.label} {p.confidence}%
                    </span>
                    <span className="text-xs text-[var(--muted)]">{p.protocol} | {p.length}B</span>
                  </div>
                  <div className="flex flex-col gap-1 text-[var(--foreground)] text-xs">
                    <div className="truncate"><span className="text-[var(--muted)]">SRC:</span> {p.src_ip}</div>
                    <div className="truncate"><span className="text-[var(--muted)]">DST:</span> {p.dst_ip}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* Historical Timeline Section */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col mt-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--foreground)] flex items-center gap-2">
            <Activity size={16} className="text-indigo-500" />
            Historical Threat Timeline
          </h3>

          {/* Range Selector */}
          <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
            {['24h', '7d', '30d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimelineRange(range as '24h' | '7d' | '30d')}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${timelineRange === range
                  ? 'bg-indigo-500 text-white shadow-lg'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-slate-700/30'
                  }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full h-[300px] relative">
          {loadingTimeline && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm rounded-xl">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={historicalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickMargin={10} />
              <YAxis stroke="#64748b" fontSize={10} tickFormatter={(val) => (typeof val === 'number' && val >= 1000) ? `${(val / 1000).toFixed(1)}k` : val} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar dataKey="Normal" stackId="a" fill="#3b82f6" fillOpacity={0.8} radius={[0, 0, 4, 4]} />
              <Bar dataKey="Threats" stackId="a" fill="#ef4444" fillOpacity={0.9} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
