"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { fetchWithAuth, getToken } from "@/lib/auth";
import { getApiUrl } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Filter,
  ZoomIn,
  ZoomOut,
  X,
  MapPin,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

const GEO_URL = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

type ThreatPin = {
  ip: string;
  count: number;
  lat: number;
  lon: number;
  country: string;
  city: string;
  label: string;
  is_blocked: boolean;
};

const THREAT_COLORS: Record<string, string> = {
  DoS: "#06b6d4",
  "DDoS": "#a855f7",
  "DDoS (Ping of Death)": "#ec4899",
  Probe: "#f59e0b",
  "U2R (Root Access)": "#ef4444",
  "R2L (Unauthorized Access)": "#f97316",
  Default: "#8b5cf6",
};

const FILTERS = ["All", "Active", "Resolved", "DoS", "DDoS", "Probe", "U2R", "R2L"];

function getPinColor(pin: ThreatPin): string {
  if (pin.is_blocked) return "#10b981";
  for (const [key, color] of Object.entries(THREAT_COLORS)) {
    if (pin.label.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return THREAT_COLORS.Default;
}

export default function ThreatMap() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const apiUrl = getApiUrl();

  const [pins, setPins] = useState<ThreatPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [selectedPin, setSelectedPin] = useState<ThreatPin | null>(null);
  const [filter, setFilter] = useState("All");
  const [zoom, setZoom] = useState(1.2);
  const [center, setCenter] = useState<[number, number]>([10, 20]);
  const fetchingRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (!getToken()) router.push("/login"); }, [router]);

  const fetchThreats = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      // Get recent 100 alerts — mix of active + blocked
      const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/recent?limit=100`);
      if (!res.ok) return;
      const alerts: Array<{ src_ip: string; label: string; is_blocked: boolean }> = await res.json();

      // Deduplicate by src_ip — track count + whether any are active
      const ipMap = new Map<string, { count: number; label: string; is_blocked: boolean }>();
      for (const a of alerts) {
        const existing = ipMap.get(a.src_ip);
        if (!existing) {
          ipMap.set(a.src_ip, { count: 1, label: a.label, is_blocked: a.is_blocked });
        } else {
          existing.count++;
          // If ANY entry for this IP is unblocked → still active
          if (!a.is_blocked) existing.is_blocked = false;
        }
      }

      // Geolocate up to 40 unique IPs
      const entries = Array.from(ipMap.entries()).slice(0, 40);
      const resolved: ThreatPin[] = [];

      // Validate IPv4 format — skip malformed IPs (e.g. 5-octet mock IPs)
      const isValidIPv4 = (ip: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);

      await Promise.all(
        entries.map(async ([ip, info]) => {
          if (!isValidIPv4(ip)) {
            // Scatter invalid IPs visually without calling the API
            const SCATTER: [number, number][] = [[37,-97],[51,10],[35,105],[-14,-51],[25,55],[1,104]];
            const base = SCATTER[Math.floor(Math.random() * SCATTER.length)];
            resolved.push({ ip, ...info, lat: base[0] + (Math.random()-0.5)*20, lon: base[1] + (Math.random()-0.5)*20, country: "Unknown", city: "Private" });
            return;
          }
          try {
            const geoRes = await fetchWithAuth(`${apiUrl}/api/v1/alerts/geoip/${ip}`);
            const geo = await geoRes.json();
            if (geo?.status === "success" && geo.lat && geo.lon) {
              resolved.push({ ip, ...info, lat: geo.lat, lon: geo.lon, country: geo.country || "Unknown", city: geo.city || "Unknown" });
            } else {
              // Scatter unknown IPs across regions for visual coverage
              const jitter = () => (Math.random() - 0.5) * 30;
              const SCATTER: [number, number][] = [
                [37, -97], [51, 10], [35, 105], [-14, -51], [25, 55], [1, 104]
              ];
              const base = SCATTER[Math.floor(Math.random() * SCATTER.length)];
              resolved.push({ ip, ...info, lat: base[0] + jitter(), lon: base[1] + jitter(), country: "Unknown", city: "Private" });
            }
          } catch {
            resolved.push({ ip, ...info, lat: 0, lon: 0, country: "Unknown", city: "Private" });
          }
        })
      );

      setPins(resolved);
    } catch (e) {
      console.error("map fetch failed:", e);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchThreats();
    const interval = setInterval(fetchThreats, 15000);
    return () => clearInterval(interval);
  }, [fetchThreats]);

  const filteredPins = pins.filter((p) => {
    if (filter === "Active") return !p.is_blocked;
    if (filter === "Resolved") return p.is_blocked;
    if (filter !== "All") return p.label.toLowerCase().includes(filter.toLowerCase());
    return true;
  });

  const activeCount = pins.filter((p) => !p.is_blocked).length;
  const resolvedCount = pins.filter((p) => p.is_blocked).length;
  const countries = new Set(pins.filter((p) => p.country !== "Unknown").map((p) => p.country)).size;

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${isDark ? "bg-[#0d0d1f]" : "bg-gray-50"}`}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className={`shrink-0 border-b px-6 py-4 backdrop-blur-xl ${isDark ? "border-purple-500/20 bg-gradient-to-r from-purple-900/10 via-transparent to-blue-900/10" : "border-purple-400/20 bg-white/80"}`}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          {/* Title + subtitle */}
          <div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-400 to-blue-400 flex items-center gap-2">
              <Globe size={24} className="text-cyan-400" />
              Geo-IP Threat Map
            </h1>
            <p className={`text-xs mt-0.5 ${isDark ? "text-purple-300" : "text-purple-700"}`}>
              Real-time global attack origins · {pins.length} IPs resolved
            </p>
          </div>

          {/* Stats pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${isDark ? "border-red-500/30 bg-red-900/20 text-red-300" : "border-red-300 bg-red-50 text-red-700"}`}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
              </span>
              {activeCount} Active
            </div>
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${isDark ? "border-emerald-500/30 bg-emerald-900/20 text-emerald-300" : "border-emerald-300 bg-emerald-50 text-emerald-700"}`}>
              <ShieldCheck size={12} /> {resolvedCount} Resolved
            </div>
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${isDark ? "border-blue-500/30 bg-blue-900/20 text-blue-300" : "border-blue-300 bg-blue-50 text-blue-700"}`}>
              <Globe size={12} /> {countries} Countries
            </div>
            <button
              onClick={() => { setLoading(true); fetchThreats(); }}
              disabled={loading}
              className={`p-2 rounded-xl border transition-all ${isDark ? "border-purple-500/30 bg-purple-900/20 text-purple-300 hover:bg-purple-900/40" : "border-purple-300 bg-white text-purple-700 hover:bg-purple-50"}`}
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          <Filter size={12} className={`${isDark ? "text-purple-400" : "text-purple-600"} mr-1`} />
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filter === f
                  ? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-md"
                  : isDark
                    ? "border border-purple-500/30 text-purple-300 hover:border-purple-400/60"
                    : "border border-purple-300 text-purple-700 hover:bg-purple-100"
              }`}
            >
              {f}
            </button>
          ))}
          <span className={`ml-auto text-xs font-mono opacity-50 ${isDark ? "text-purple-300" : "text-purple-700"}`}>
            {filteredPins.length} pins shown
          </span>
        </div>
      </div>

      {/* ── Body: map + sidebar ─────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">

        {/* Map canvas */}
        <div className="flex-1 relative min-w-0">
          {loading && pins.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              >
                <Globe size={48} className={`${isDark ? "text-purple-400" : "text-purple-600"} opacity-30`} />
              </motion.div>
              <span className={`text-sm tracking-wider opacity-50 ${isDark ? "text-purple-300" : "text-purple-700"}`}>
                Resolving threat locations…
              </span>
            </div>
          ) : mounted ? (
            <>
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{ scale: 160 }}
                style={{ width: "100%", height: "100%" }}
              >
                <ZoomableGroup
                  zoom={zoom}
                  center={center}
                  onMoveEnd={({ zoom: z, coordinates }) => {
                    setZoom(z);
                    setCenter(coordinates as [number, number]);
                  }}
                >
                  <Geographies geography={GEO_URL}>
                    {({ geographies }) =>
                      geographies.map((geo) => (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={isDark ? "#16163a" : "#dde5f0"}
                          stroke={isDark ? "#2a2a5a" : "#b8c8e0"}
                          strokeWidth={0.35}
                          style={{
                            default: { outline: "none" },
                            hover: { fill: isDark ? "#22225a" : "#c8d8e8", outline: "none", cursor: "grab" },
                            pressed: { outline: "none", cursor: "grabbing" },
                          }}
                        />
                      ))
                    }
                  </Geographies>

                  {filteredPins.map((pin, i) => {
                    const color = getPinColor(pin);
                    const r = Math.max(4, Math.min(9, 4 + pin.count * 0.8));
                    const isSelected = selectedPin?.ip === pin.ip;

                    return (
                      <Marker
                        key={`${pin.ip}-${i}`}
                        coordinates={[pin.lon, pin.lat]}
                        onClick={() => setSelectedPin(isSelected ? null : pin)}
                      >
                        <g style={{ cursor: "pointer" }}>
                          {/* Outer pulse — active threats only */}
                          {!pin.is_blocked && (
                            <circle
                              r={r + 8}
                              fill={color}
                              fillOpacity={0.15}
                            />
                          )}
                          {/* Selection ring */}
                          {isSelected && (
                            <circle r={r + 4} fill="none" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.8} />
                          )}
                          {/* Main dot */}
                          <circle
                            r={r}
                            fill={color}
                            stroke={isDark ? "rgba(255,255,255,0.6)" : "rgba(30,41,59,0.4)"}
                            strokeWidth={1.2}
                            fillOpacity={0.92}
                          />
                          <title>{`${pin.ip} · ${pin.label} · ${pin.city}, ${pin.country} · ${pin.count} hit(s) · ${pin.is_blocked ? "RESOLVED" : "ACTIVE"}`}</title>
                        </g>
                      </Marker>
                    );
                  })}
                </ZoomableGroup>
              </ComposableMap>

              {/* Zoom Controls */}
              <div className="absolute bottom-5 right-5 flex flex-col gap-1.5 z-10">
                <button
                  onClick={() => setZoom((z) => Math.min(z * 1.6, 12))}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-lg transition-all ${isDark ? "border-purple-500/40 bg-slate-900/80 text-white hover:bg-slate-800" : "border-purple-300 bg-white text-purple-900 hover:bg-purple-50"}`}
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  onClick={() => setZoom((z) => Math.max(z / 1.6, 0.5))}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-lg transition-all ${isDark ? "border-purple-500/40 bg-slate-900/80 text-white hover:bg-slate-800" : "border-purple-300 bg-white text-purple-900 hover:bg-purple-50"}`}
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  onClick={() => { setZoom(1.2); setCenter([10, 20]); }}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-lg text-xs font-bold transition-all ${isDark ? "border-purple-500/40 bg-slate-900/80 text-white hover:bg-slate-800" : "border-purple-300 bg-white text-purple-900 hover:bg-purple-50"}`}
                  title="Reset View"
                >
                  ⌂
                </button>
              </div>

              {/* Legend */}
              <div className={`absolute bottom-5 left-5 z-10 rounded-xl border px-4 py-3 shadow-lg text-xs space-y-1.5 ${isDark ? "border-purple-500/30 bg-slate-900/80 text-purple-200" : "border-purple-300 bg-white/90 text-purple-900"}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-2">Legend</p>
                {[
                  { color: "#ef4444", label: "Active (pulsing)" },
                  { color: "#10b981", label: "Resolved" },
                  { color: "#06b6d4", label: "DoS" },
                  { color: "#ec4899", label: "DDoS" },
                  { color: "#f59e0b", label: "Probe" },
                  { color: "#f97316", label: "U2R / R2L" },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                    <span className="opacity-80">{label}</span>
                  </div>
                ))}
              </div>

              {/* Drag hint */}
              <div className={`absolute top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full text-[10px] font-semibold opacity-40 border ${isDark ? "border-purple-500/20 bg-slate-900/60 text-purple-200" : "border-purple-300 bg-white/80 text-purple-700"}`}>
                Drag to pan · Scroll to zoom · Click pin for details
              </div>
            </>
          ) : null}
        </div>

        {/* ── Right sidebar ───────────────────────────────────────────── */}
        <div className={`w-72 shrink-0 border-l flex flex-col min-h-0 ${isDark ? "border-purple-500/20 bg-[#0d0d1f]" : "border-purple-400/20 bg-white"}`}>

          {/* Selected pin detail */}
          <AnimatePresence>
            {selectedPin && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className={`shrink-0 border-b px-5 py-4 ${isDark ? "border-purple-500/20 bg-purple-900/20" : "border-purple-400/20 bg-purple-50"}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`font-bold text-sm flex items-center gap-2 ${isDark ? "text-white" : "text-purple-950"}`}>
                    <MapPin size={14} style={{ color: getPinColor(selectedPin) }} />
                    Threat Detail
                  </h3>
                  <button
                    onClick={() => setSelectedPin(null)}
                    className={`opacity-40 hover:opacity-100 transition-opacity ${isDark ? "text-white" : "text-purple-950"}`}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {[
                    { label: "IP Address", value: selectedPin.ip, mono: true },
                    { label: "Threat Type", value: selectedPin.label, color: getPinColor(selectedPin) },
                    { label: "Location", value: `${selectedPin.city}, ${selectedPin.country}` },
                    { label: "Hit Count", value: String(selectedPin.count) },
                  ].map(({ label, value, mono, color }) => (
                    <div key={label} className="flex justify-between items-center gap-2">
                      <span className={`text-xs opacity-50 shrink-0 ${isDark ? "text-purple-300" : "text-purple-700"}`}>{label}</span>
                      <span
                        className={`text-xs font-semibold text-right truncate ${mono ? "font-mono" : ""} ${isDark ? "text-white" : "text-purple-950"}`}
                        style={color ? { color } : undefined}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center gap-2">
                    <span className={`text-xs opacity-50 ${isDark ? "text-purple-300" : "text-purple-700"}`}>Status</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${selectedPin.is_blocked ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                      {selectedPin.is_blocked ? "✓ RESOLVED" : "⚠ ACTIVE"}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* List header */}
          <div className={`shrink-0 px-5 py-2.5 border-b text-[10px] font-bold uppercase tracking-wider flex items-center justify-between ${isDark ? "border-purple-500/20 text-purple-400" : "border-purple-400/20 text-purple-600"}`}>
            <div className="flex items-center gap-1.5">
              <ShieldAlert size={12} />
              {filter === "All" ? "All Threats" : filter}
            </div>
            <span>{filteredPins.length}</span>
          </div>

          {/* Scrollable threat list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5" style={{ scrollbarWidth: "thin" }}>
            {filteredPins.length === 0 ? (
              <p className={`text-xs text-center py-8 opacity-40 ${isDark ? "text-purple-300" : "text-purple-700"}`}>
                No threats match filter
              </p>
            ) : (
              filteredPins.map((pin, i) => (
                <motion.button
                  key={`list-${pin.ip}-${i}`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedPin(selectedPin?.ip === pin.ip ? null : pin)}
                  className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all ${
                    selectedPin?.ip === pin.ip
                      ? isDark ? "border-purple-400/60 bg-purple-800/40" : "border-purple-400 bg-purple-100"
                      : isDark ? "border-purple-500/20 bg-purple-900/10 hover:border-purple-500/40 hover:bg-purple-900/20" : "border-purple-400/20 bg-white hover:border-purple-400/40 hover:bg-purple-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`font-mono text-xs font-semibold truncate ${isDark ? "text-white" : "text-purple-950"}`}>
                      {pin.ip}
                    </span>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: getPinColor(pin) }} />
                  </div>
                  <div className={`text-[11px] truncate ${isDark ? "text-purple-400" : "text-purple-600"}`}>
                    {pin.label} · {pin.city}, {pin.country}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className={`text-[10px] opacity-50 ${isDark ? "text-purple-300" : "text-purple-700"}`}>
                      {pin.count} hit{pin.count !== 1 ? "s" : ""}
                    </span>
                    <span className={`text-[10px] font-bold ${pin.is_blocked ? "text-emerald-400" : "text-red-400"}`}>
                      {pin.is_blocked ? "RESOLVED" : "ACTIVE"}
                    </span>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
