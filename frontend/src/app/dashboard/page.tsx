"use client";

import React, { useEffect, useState, useRef } from 'react';
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
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
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
  const [packets, setPackets] = useState<Packet[]>([]);
  const [threatCount, setThreatCount] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  
  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [isLightMode]);

  // Connect to websocket
  useEffect(() => {
    // We will establish the WS connection to FastAPI
    const ws = new WebSocket('ws://localhost:8000/api/v1/traffic/stream');
    
    ws.onopen = () => {
      setIsLive(true);
    };

    ws.onmessage = (event) => {
      const packet: Packet = JSON.parse(event.data);
      setPackets(prev => {
        const newPackets = [packet, ...prev].slice(0, 50); // Keep last 50
        return newPackets;
      });
      if (packet.is_threat) {
        setThreatCount(prev => prev + 1);
      }
    };

    ws.onclose = () => {
      setIsLive(false);
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
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
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
          <div className="glass-panel px-6 py-3 rounded-xl flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Network Status</span>
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
              { label: 'Packets Analyzed', val: '14,291', trend: '+12%', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'Threats Blocked', val: threatCount.toString(), trend: '+2', icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-500/10' },
              { label: 'Active Streams', val: '84', trend: 'Stable', icon: Radio, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
            ].map((stat, i) => (
              <div key={i} className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl ${stat.bg} group-hover:scale-150 transition-transform duration-500`} />
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{stat.label}</h4>
                    <span className="text-3xl font-black">{stat.val}</span>
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
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6">Traffic & Threat Flow (Mbits/s)</h3>
            <div className="flex-1 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getTrafficData()}>
                  <defs>
                    <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
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

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            <AnimatePresence>
              {packets.length === 0 ? (
                <div className="text-slate-500 text-sm text-center py-10">Awaiting packet stream...</div>
              ) : packets.map((p, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={p.timestamp.toString() + i}
                  className={`p-4 rounded-xl border ${p.is_threat ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-800/50 border-slate-700/50'} text-sm font-mono`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${p.is_threat ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {p.label} {p.confidence}%
                    </span>
                    <span className="text-xs text-slate-500">{p.protocol} | {p.length}B</span>
                  </div>
                  <div className="flex flex-col gap-1 text-slate-300 text-xs">
                    <div className="truncate"><span className="text-slate-500">SRC:</span> {p.src_ip}</div>
                    <div className="truncate"><span className="text-slate-500">DST:</span> {p.dst_ip}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
