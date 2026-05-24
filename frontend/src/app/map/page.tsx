"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
  useMapContext,
} from "react-simple-maps";
import { fetchWithAuth, getToken } from "@/lib/auth";
import { getApiUrl } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  RefreshCw,
  Filter,
  ZoomIn,
  ZoomOut,
  X,
  Building2,
  Wifi,
  BarChart3,
  Crosshair,
  Radio,
  Search,
  Ban,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

const GEO_URL = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";
const TARGET_COORDS: [number, number] = [-77.4, 38.9];
const REFRESH_INTERVAL = 15;

// ─── Types ────────────────────────────────────────────────────────────────────
type ThreatPin = {
  ip: string;
  alertId: string;
  count: number;
  lat: number;
  lon: number;
  country: string;
  countryCode: string;
  region: string;
  isp: string;
  org: string;
  city: string;
  label: string;
  is_blocked: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const THREAT_COLORS: Record<string, string> = {
  DoS: "#06b6d4",
  DDoS: "#a855f7",
  Probe: "#f59e0b",
  U2R: "#ef4444",
  R2L: "#f97316",
  Default: "#8b5cf6",
};
const FILTERS = ["All", "Active", "Resolved", "DoS", "DDoS", "Probe", "U2R", "R2L"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getPinColor(pin: ThreatPin): string {
  if (pin.is_blocked) return "#10b981";
  for (const [key, color] of Object.entries(THREAT_COLORS)) {
    if (pin.label.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return THREAT_COLORS.Default;
}

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌐";
  return Array.from(code.toUpperCase())
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join("");
}

function normCountry(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(the|of|and|republic|democratic|people's|federation|islamic|united states of america)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countriesMatch(geoName: string, pinCountry: string): boolean {
  if (!pinCountry || pinCountry === "Unknown") return false;
  const g = normCountry(geoName);
  const p = normCountry(pinCountry);
  if (g === p || g.includes(p) || p.includes(g)) return true;
  const gFirst = g.split(" ")[0];
  const pFirst = p.split(" ")[0];
  if (gFirst.length > 4 && (gFirst === pFirst || gFirst.startsWith(pFirst) || pFirst.startsWith(gFirst))) return true;
  return false;
}

// ─── Countdown Ring ───────────────────────────────────────────────────────────
function CountdownRing({ value, max = REFRESH_INTERVAL, isDark }: { value: number; max?: number; isDark: boolean }) {
  const r = 11;
  const circumference = 2 * Math.PI * r;
  const progress = value / max;
  const dashOffset = circumference * (1 - progress);
  const color = value <= 3 ? "#ef4444" : value <= 7 ? "#f59e0b" : "#a78bfa";

  return (
    <div
      className={`relative w-10 h-10 flex items-center justify-center rounded-xl border ${isDark ? "border-purple-500/30 bg-purple-900/20" : "border-purple-300 bg-white"}`}
      title={`Next refresh in ${value}s`}
    >
      <svg className="absolute inset-0 -rotate-90 w-full h-full" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="2" opacity="0.12" />
        <circle
          cx="20" cy="20" r={r}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.5s" }}
        />
      </svg>
      <span className="text-[10px] font-bold font-mono z-10" style={{ color }}>{value}s</span>
    </div>
  );
}

// ─── AttackArcs ───────────────────────────────────────────────────────────────
function AttackArcs({ pins }: { pins: ThreatPin[] }) {
  const { path } = useMapContext();
  const activePins = pins.filter((p) => !p.is_blocked);
  return (
    <g>
      {activePins.map((pin, i) => {
        const color = getPinColor(pin);
        const lineData = { type: "LineString" as const, coordinates: [[pin.lon, pin.lat], TARGET_COORDS] };
        const d = path(lineData) || "";
        const dur = `${1.2 + (i % 7) * 0.35}s`;
        const arcId = `arc-path-${pin.ip.replace(/\./g, "-")}-${i}`;
        return (
          <g key={arcId}>
            <path d={d} fill="none" stroke={color} strokeWidth={0.6} strokeOpacity={0.22} strokeDasharray="4 5" />
            <path id={arcId} d={d} fill="none" stroke="none" />
            <circle r={2} fill={color} fillOpacity={0.9}>
              <animateMotion dur={dur} repeatCount="indefinite">
                <mpath href={`#${arcId}`} />
              </animateMotion>
            </circle>
          </g>
        );
      })}
    </g>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
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
  const [showArcs, setShowArcs] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"threats" | "countries">("threats");
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [blockingIp, setBlockingIp] = useState<string | null>(null);
  const [blockToast, setBlockToast] = useState<{ ip: string; success: boolean } | null>(null);

  const [tooltip, setTooltip] = useState<{
    x: number; y: number;
    pin?: ThreatPin;
    country?: string;
    countryStats?: { count: number; active: number };
  } | null>(null);

  const fetchingRef = useRef(false);
  const nextFetchAtRef = useRef(Date.now() + REFRESH_INTERVAL * 1000);
  const searchRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (!getToken()) router.push("/login"); }, [router]);

  // ── Countdown tick ───────────────────────────────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => {
      const remaining = Math.max(0, Math.round((nextFetchAtRef.current - Date.now()) / 1000));
      setCountdown(remaining);
    }, 500);
    return () => clearInterval(tick);
  }, []);

  // ── Data fetch ───────────────────────────────────────────────────────────
  const fetchThreats = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    nextFetchAtRef.current = Date.now() + REFRESH_INTERVAL * 1000;
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/recent?limit=100`);
      if (!res.ok) return;
      const alerts: Array<{ id: string; src_ip: string; label: string; is_blocked: boolean }> = await res.json();

      const ipMap = new Map<string, { count: number; label: string; is_blocked: boolean; alertId: string }>();
      for (const a of alerts) {
        const existing = ipMap.get(a.src_ip);
        if (!existing) {
          ipMap.set(a.src_ip, { count: 1, label: a.label, is_blocked: a.is_blocked, alertId: a.id });
        } else {
          existing.count++;
          if (!a.is_blocked) existing.is_blocked = false;
        }
      }

      const entries = Array.from(ipMap.entries()).slice(0, 40);
      const resolved: ThreatPin[] = [];
      const isValidIPv4 = (ip: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);

      await Promise.all(
        entries.map(async ([ip, info]) => {
          if (!isValidIPv4(ip)) {
            const SCATTER: [number, number][] = [[37, -97], [51, 10], [35, 105], [-14, -51], [25, 55], [1, 104]];
            const base = SCATTER[Math.floor(Math.random() * SCATTER.length)];
            resolved.push({ ip, ...info, lat: base[0] + (Math.random() - 0.5) * 20, lon: base[1] + (Math.random() - 0.5) * 20, country: "Unknown", countryCode: "", city: "Private", region: "", isp: "", org: "" });
            return;
          }
          try {
            const geoRes = await fetchWithAuth(`${apiUrl}/api/v1/alerts/geoip/${ip}`);
            const geo = await geoRes.json();
            if (geo?.status === "success" && geo.lat && geo.lon) {
              resolved.push({ ip, ...info, lat: geo.lat, lon: geo.lon, country: geo.country || "Unknown", countryCode: geo.countryCode || "", city: geo.city || "Unknown", region: geo.regionName || geo.region || "", isp: geo.isp || "", org: geo.org || geo.as || "" });
            } else {
              const jitter = () => (Math.random() - 0.5) * 30;
              const SCATTER: [number, number][] = [[37, -97], [51, 10], [35, 105], [-14, -51], [25, 55], [1, 104]];
              const base = SCATTER[Math.floor(Math.random() * SCATTER.length)];
              resolved.push({ ip, ...info, lat: base[0] + jitter(), lon: base[1] + jitter(), country: "Unknown", countryCode: "", city: "Private", region: "", isp: "", org: "" });
            }
          } catch {
            resolved.push({ ip, ...info, lat: 0, lon: 0, country: "Unknown", countryCode: "", city: "Private", region: "", isp: "", org: "" });
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
    const interval = setInterval(fetchThreats, REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [fetchThreats]);

  // ── Block IP ─────────────────────────────────────────────────────────────
  const handleBlock = useCallback(async (pin: ThreatPin) => {
    if (!pin.alertId || pin.is_blocked || blockingIp) return;
    setBlockingIp(pin.ip);
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/${pin.alertId}/block`, { method: "POST" });
      if (res.ok) {
        setPins((prev) => prev.map((p) => p.ip === pin.ip ? { ...p, is_blocked: true } : p));
        setSelectedPin((prev) => prev?.ip === pin.ip ? { ...prev, is_blocked: true } : prev);
        setBlockToast({ ip: pin.ip, success: true });
      } else {
        setBlockToast({ ip: pin.ip, success: false });
      }
    } catch {
      setBlockToast({ ip: pin.ip, success: false });
    } finally {
      setBlockingIp(null);
      setTimeout(() => setBlockToast(null), 3500);
    }
  }, [apiUrl, blockingIp]);

  // ── Derived stats ────────────────────────────────────────────────────────
  const countryStats = useMemo(() => {
    const map = new Map<string, { count: number; active: number; code: string; name: string }>();
    for (const pin of pins) {
      if (pin.country === "Unknown") continue;
      const ex = map.get(pin.country) || { count: 0, active: 0, code: pin.countryCode, name: pin.country };
      map.set(pin.country, { count: ex.count + pin.count, active: ex.active + (pin.is_blocked ? 0 : 1), code: pin.countryCode || ex.code, name: pin.country });
    }
    return map;
  }, [pins]);

  const maxCountryCount = useMemo(() => Math.max(1, ...Array.from(countryStats.values()).map((v) => v.count)), [countryStats]);
  const topCountries = useMemo(() => Array.from(countryStats.entries()).sort((a, b) => b[1].count - a[1].count), [countryStats]);
  const activeCount = pins.filter((p) => !p.is_blocked).length;
  const resolvedCount = pins.filter((p) => p.is_blocked).length;
  const uniqueCountries = countryStats.size;

  // ── Filtered pins (includes search) ─────────────────────────────────────
  const filteredPins = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    return pins.filter((p) => {
      if (s) {
        const match = p.ip.toLowerCase().includes(s) || p.country.toLowerCase().includes(s) || p.city.toLowerCase().includes(s) || p.label.toLowerCase().includes(s) || p.isp.toLowerCase().includes(s);
        if (!match) return false;
      }
      if (countryFilter && !countriesMatch(countryFilter, p.country) && p.country !== countryFilter) return false;
      if (filter === "Active") return !p.is_blocked;
      if (filter === "Resolved") return p.is_blocked;
      if (filter !== "All") return p.label.toLowerCase().includes(filter.toLowerCase());
      return true;
    });
  }, [pins, searchTerm, countryFilter, filter]);

  // ── Search auto-pan (debounced) ──────────────────────────────────────────
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!searchTerm.trim()) return;
    searchRef.current = setTimeout(() => {
      if (filteredPins.length === 0) return;
      // Pan to first match
      const pin = filteredPins[0];
      setCenter([pin.lon, pin.lat]);
      setZoom(filteredPins.length === 1 ? 5 : 3);
      setSelectedPin(pin);
    }, 500);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [searchTerm, filteredPins]);

  // ── Geography fill ───────────────────────────────────────────────────────
  function geoFill(geoName: string): string {
    for (const [name, data] of countryStats.entries()) {
      if (countriesMatch(geoName, name)) {
        const intensity = Math.min(1, data.count / maxCountryCount);
        if (data.active > 0) return isDark ? `rgba(239,68,68,${0.12 + intensity * 0.38})` : `rgba(220,38,38,${0.08 + intensity * 0.25})`;
        return isDark ? `rgba(16,185,129,${0.08 + intensity * 0.18})` : `rgba(16,185,129,${0.05 + intensity * 0.12})`;
      }
    }
    return isDark ? "#16163a" : "#dde5f0";
  }

  function geoHoverFill(geoName: string): string {
    for (const [name] of countryStats.entries()) {
      if (countriesMatch(geoName, name)) return isDark ? "#2d1f4a" : "#c8b8e8";
    }
    return isDark ? "#22225a" : "#c8d8e8";
  }

  const handlePinEnter = (e: React.MouseEvent, pin: ThreatPin) => setTooltip({ x: e.clientX, y: e.clientY, pin });
  const handlePinMove = (e: React.MouseEvent) => setTooltip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : null);
  const handlePinLeave = () => setTooltip(null);

  const fitToThreats = () => {
    const valid = filteredPins.filter((p) => p.lat !== 0 || p.lon !== 0);
    if (!valid.length) return;
    const lons = valid.map((p) => p.lon), lats = valid.map((p) => p.lat);
    setCenter([(Math.min(...lons) + Math.max(...lons)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2]);
    setZoom(2);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={`h-screen flex flex-col overflow-hidden ${isDark ? "bg-[#0d0d1f]" : "bg-gray-50"}`}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={`shrink-0 border-b px-6 py-3 backdrop-blur-xl ${isDark ? "border-purple-500/20 bg-gradient-to-r from-purple-900/10 via-transparent to-blue-900/10" : "border-purple-400/20 bg-white/80"}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-400 to-blue-400 flex items-center gap-2">
              <Globe size={22} className="text-cyan-400" />
              Geo-IP Threat Map
            </h1>
            <p className={`text-xs mt-0.5 ${isDark ? "text-purple-300" : "text-purple-700"}`}>
              Real-time global attack origins · {pins.length} IPs resolved · {uniqueCountries} countries
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Stat pills */}
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
              <Globe size={12} /> {uniqueCountries} Countries
            </div>

            {/* Arcs toggle */}
            <button
              onClick={() => setShowArcs((s) => !s)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${showArcs ? isDark ? "border-purple-400/60 bg-purple-800/40 text-purple-200" : "border-purple-400 bg-purple-100 text-purple-800" : isDark ? "border-purple-500/20 bg-transparent text-purple-400" : "border-purple-300 text-purple-600"}`}
            >
              <Radio size={12} /> Arcs
            </button>

            {/* Fit */}
            <button
              onClick={fitToThreats}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${isDark ? "border-cyan-500/30 bg-cyan-900/20 text-cyan-300 hover:bg-cyan-900/40" : "border-cyan-300 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"}`}
            >
              <Crosshair size={12} /> Fit
            </button>

            {/* Country filter badge */}
            {countryFilter && (
              <button onClick={() => setCountryFilter(null)} className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${isDark ? "border-amber-500/40 bg-amber-900/30 text-amber-300" : "border-amber-400 bg-amber-50 text-amber-700"}`}>
                <X size={12} /> {countryFilter}
              </button>
            )}

            {/* Countdown ring */}
            <CountdownRing value={countdown} isDark={isDark} />

            {/* Manual refresh */}
            <button
              onClick={() => { setLoading(true); fetchThreats(); }}
              disabled={loading}
              className={`p-2 rounded-xl border transition-all ${isDark ? "border-purple-500/30 bg-purple-900/20 text-purple-300 hover:bg-purple-900/40" : "border-purple-300 bg-white text-purple-700 hover:bg-purple-50"}`}
              title="Refresh now"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ── Filter row + search ────────────────────────────────────── */}
        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
          {/* Search input */}
          <div className="relative">
            <Search size={11} className={`absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? "text-purple-400" : "text-purple-500"}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search IP, country, city…"
              className={`pl-7 pr-7 py-1 rounded-lg text-xs border outline-none w-52 transition-all ${isDark ? "bg-purple-900/20 border-purple-500/30 text-white placeholder-purple-600 focus:border-purple-400/60" : "bg-white border-purple-300 text-purple-950 placeholder-purple-400 focus:border-purple-400"}`}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className={`absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity ${isDark ? "text-purple-300" : "text-purple-600"}`}>
                <X size={10} />
              </button>
            )}
          </div>

          <div className={`w-px h-4 ${isDark ? "bg-purple-500/30" : "bg-purple-300"}`} />

          <Filter size={12} className={`${isDark ? "text-purple-400" : "text-purple-600"}`} />
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${filter === f ? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-md" : isDark ? "border border-purple-500/30 text-purple-300 hover:border-purple-400/60" : "border border-purple-300 text-purple-700 hover:bg-purple-100"}`}
            >
              {f}
            </button>
          ))}

          <span className={`ml-auto text-xs font-mono opacity-50 ${isDark ? "text-purple-300" : "text-purple-700"}`}>
            {filteredPins.length} pins{searchTerm ? ` matching "${searchTerm}"` : ""}
          </span>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">

        {/* Map canvas */}
        <div className="flex-1 relative min-w-0">
          {loading && pins.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }}>
                <Globe size={48} className={`${isDark ? "text-purple-400" : "text-purple-600"} opacity-30`} />
              </motion.div>
              <span className={`text-sm tracking-wider opacity-50 ${isDark ? "text-purple-300" : "text-purple-700"}`}>Resolving threat locations…</span>
            </div>
          ) : mounted ? (
            <>
              <ComposableMap projection="geoMercator" projectionConfig={{ scale: 160 }} style={{ width: "100%", height: "100%" }}>
                <ZoomableGroup zoom={zoom} center={center} onMoveEnd={({ zoom: z, coordinates }) => { setZoom(z); setCenter(coordinates as [number, number]); }}>

                  {/* Country heatmap */}
                  <Geographies geography={GEO_URL}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const geoName: string = geo.properties?.name ?? "";
                        const isCountryFiltered = countryFilter ? countriesMatch(geoName, countryFilter) || geoName === countryFilter : false;
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={geoFill(geoName)}
                            stroke={isCountryFiltered ? "#f59e0b" : isDark ? "#2a2a5a" : "#b8c8e0"}
                            strokeWidth={isCountryFiltered ? 1.5 : 0.35}
                            style={{
                              default: { outline: "none" },
                              hover: { fill: geoHoverFill(geoName), outline: "none", cursor: "pointer" },
                              pressed: { outline: "none", cursor: "grabbing" },
                            }}
                            onMouseEnter={(e: React.MouseEvent) => {
                              const stats = Array.from(countryStats.entries()).find(([name]) => countriesMatch(geoName, name));
                              setTooltip({ x: e.clientX, y: e.clientY, country: geoName, countryStats: stats ? { count: stats[1].count, active: stats[1].active } : undefined });
                            }}
                            onMouseMove={(e: React.MouseEvent) => setTooltip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                            onMouseLeave={() => setTooltip(null)}
                            onClick={() => {
                              const hasThreats = Array.from(countryStats.keys()).some((name) => countriesMatch(geoName, name));
                              if (hasThreats) setCountryFilter((prev) => prev === geoName ? null : geoName);
                            }}
                          />
                        );
                      })
                    }
                  </Geographies>

                  {/* Attack arcs */}
                  {showArcs && filteredPins.length > 0 && <AttackArcs pins={filteredPins} />}

                  {/* Target marker */}
                  {showArcs && (
                    <Marker coordinates={TARGET_COORDS}>
                      <g>
                        <circle r={7} fill="#a78bfa" fillOpacity={0.15} />
                        <circle r={4} fill="#a78bfa" fillOpacity={0.4} stroke="#fff" strokeWidth={1} />
                        <circle r={1.5} fill="#fff" />
                        <title>Protected System · Virginia, US</title>
                      </g>
                    </Marker>
                  )}

                  {/* Threat pins */}
                  {filteredPins.map((pin, i) => {
                    const color = getPinColor(pin);
                    const r = Math.max(4, Math.min(10, 4 + pin.count * 0.9));
                    const isSelected = selectedPin?.ip === pin.ip;
                    const isSearchMatch = searchTerm && (pin.ip.toLowerCase().includes(searchTerm.toLowerCase()) || pin.country.toLowerCase().includes(searchTerm.toLowerCase()));

                    return (
                      <Marker
                        key={`${pin.ip}-${i}`}
                        coordinates={[pin.lon, pin.lat]}
                        onClick={() => { setSelectedPin(isSelected ? null : pin); setTooltip(null); }}
                      >
                        <g
                          style={{ cursor: "pointer" }}
                          onMouseEnter={(e) => handlePinEnter(e as unknown as React.MouseEvent, pin)}
                          onMouseMove={(e) => handlePinMove(e as unknown as React.MouseEvent)}
                          onMouseLeave={handlePinLeave}
                        >
                          {/* Search highlight pulse */}
                          {isSearchMatch && (
                            <circle r={r + 14} fill="#fff" fillOpacity={0.12} />
                          )}
                          {/* Active pulse rings */}
                          {!pin.is_blocked && (
                            <>
                              <circle r={r + 10} fill={color} fillOpacity={0.08} />
                              <circle r={r + 5} fill={color} fillOpacity={0.12} />
                            </>
                          )}
                          {/* Selection ring */}
                          {isSelected && <circle r={r + 5} fill="none" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.85} />}
                          {/* Main dot */}
                          <circle r={r} fill={color} stroke={isDark ? "rgba(255,255,255,0.7)" : "rgba(30,41,59,0.4)"} strokeWidth={1.2} fillOpacity={0.93} />
                          {/* Hit count badge */}
                          {pin.count >= 3 && (
                            <text textAnchor="middle" y={0.5} fontWeight="bold" fill="white" style={{ pointerEvents: "none", fontSize: `${Math.max(5, r - 1)}px` }}>
                              {pin.count}
                            </text>
                          )}
                        </g>
                      </Marker>
                    );
                  })}
                </ZoomableGroup>
              </ComposableMap>

              {/* Search no-results banner */}
              <AnimatePresence>
                {searchTerm && filteredPins.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`absolute top-3 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full text-xs font-semibold border shadow ${isDark ? "border-amber-500/40 bg-amber-900/80 text-amber-300" : "border-amber-400 bg-amber-50 text-amber-700"}`}
                  >
                    No pins match "{searchTerm}"
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Block success / fail toast */}
              <AnimatePresence>
                {blockToast && (
                  <motion.div
                    initial={{ opacity: 0, y: 24, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 24, scale: 0.95 }}
                    className={`absolute bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl border shadow-2xl text-xs font-semibold flex items-center gap-2 ${blockToast.success ? isDark ? "border-emerald-500/40 bg-emerald-900/90 text-emerald-300" : "border-emerald-400 bg-emerald-50 text-emerald-700" : isDark ? "border-red-500/40 bg-red-900/90 text-red-300" : "border-red-400 bg-red-50 text-red-700"}`}
                  >
                    {blockToast.success ? <ShieldCheck size={14} /> : <X size={14} />}
                    {blockToast.success ? `✓ ${blockToast.ip} blocked & quarantined` : `✗ Failed to block ${blockToast.ip}`}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Hint bar (no-search state) */}
              {!searchTerm && (
                <div className={`absolute top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full text-[10px] font-semibold opacity-40 border ${isDark ? "border-purple-500/20 bg-slate-900/60 text-purple-200" : "border-purple-300 bg-white/80 text-purple-700"}`}>
                  Drag · Scroll zoom · Click pin for details · Click country to filter
                </div>
              )}

              {/* Zoom controls */}
              <div className="absolute bottom-5 right-5 flex flex-col gap-1.5 z-10">
                <button onClick={() => setZoom((z) => Math.min(z * 1.6, 12))} className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-lg transition-all ${isDark ? "border-purple-500/40 bg-slate-900/80 text-white hover:bg-slate-800" : "border-purple-300 bg-white text-purple-900 hover:bg-purple-50"}`} title="Zoom In"><ZoomIn size={14} /></button>
                <button onClick={() => setZoom((z) => Math.max(z / 1.6, 0.5))} className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-lg transition-all ${isDark ? "border-purple-500/40 bg-slate-900/80 text-white hover:bg-slate-800" : "border-purple-300 bg-white text-purple-900 hover:bg-purple-50"}`} title="Zoom Out"><ZoomOut size={14} /></button>
                <button onClick={() => { setZoom(1.2); setCenter([10, 20]); }} className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-lg text-xs font-bold transition-all ${isDark ? "border-purple-500/40 bg-slate-900/80 text-white hover:bg-slate-800" : "border-purple-300 bg-white text-purple-900 hover:bg-purple-50"}`} title="Reset View">⌂</button>
              </div>

              {/* Legend */}
              <div className={`absolute bottom-5 left-5 z-10 rounded-xl border px-3.5 py-3 shadow-xl text-xs space-y-1.5 ${isDark ? "border-purple-500/30 bg-slate-900/85 text-purple-200" : "border-purple-300 bg-white/92 text-purple-900"}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-2">Legend</p>
                {[{ color: "#ef4444", label: "Active threat" }, { color: "#10b981", label: "Resolved" }, { color: "#06b6d4", label: "DoS" }, { color: "#a855f7", label: "DDoS" }, { color: "#f59e0b", label: "Probe" }, { color: "#f97316", label: "U2R / R2L" }, { color: "#a78bfa", label: "Protected target" }].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                    <span className="opacity-80">{label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-1 pt-1 border-t border-white/10">
                  <span className="w-5 h-0 border-b border-dashed shrink-0" style={{ borderColor: "#06b6d4" }} />
                  <span className="opacity-80">Attack arc</span>
                </div>
                <div className="border-t border-white/10 mt-1 pt-1.5 space-y-0.5">
                  <div className="flex items-center gap-1.5"><span className="w-4 h-2 rounded shrink-0" style={{ background: "rgba(239,68,68,0.35)" }} /><span className="opacity-70 text-[10px]">Country: active</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-4 h-2 rounded shrink-0" style={{ background: "rgba(16,185,129,0.2)" }} /><span className="opacity-70 text-[10px]">Country: resolved</span></div>
                </div>
              </div>

              {/* Floating tooltip */}
              <AnimatePresence>
                {tooltip && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.1 }}
                    className={`pointer-events-none fixed z-50 rounded-xl border shadow-2xl px-3.5 py-2.5 text-xs max-w-[220px] ${isDark ? "border-purple-500/40 bg-slate-900/95 text-white" : "border-purple-300 bg-white/98 text-slate-900"}`}
                    style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
                  >
                    {tooltip.pin ? (
                      <>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-base">{countryFlag(tooltip.pin.countryCode)}</span>
                          <span className="font-bold font-mono">{tooltip.pin.ip}</span>
                          <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tooltip.pin.is_blocked ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                            {tooltip.pin.is_blocked ? "RESOLVED" : "ACTIVE"}
                          </span>
                        </div>
                        <div className="space-y-0.5 opacity-80">
                          <div style={{ color: getPinColor(tooltip.pin) }} className="font-semibold">{tooltip.pin.label}</div>
                          <div>📍 {tooltip.pin.city}, {tooltip.pin.country}</div>
                          {tooltip.pin.region && <div>🗺 {tooltip.pin.region}</div>}
                          {tooltip.pin.isp && <div className="truncate">🌐 {tooltip.pin.isp}</div>}
                          <div>⚡ {tooltip.pin.count} hit{tooltip.pin.count !== 1 ? "s" : ""}</div>
                        </div>
                      </>
                    ) : tooltip.country ? (
                      <>
                        <div className="font-bold mb-1">
                          {(() => {
                            const entry = Array.from(countryStats.entries()).find(([name]) => countriesMatch(tooltip.country!, name));
                            const code = entry?.[1]?.code || "";
                            return <span className="flex items-center gap-1.5">{code && <span className="text-base">{countryFlag(code)}</span>}{tooltip.country}</span>;
                          })()}
                        </div>
                        {tooltip.countryStats ? (
                          <div className="space-y-0.5 opacity-80">
                            <div>🎯 {tooltip.countryStats.count} total hits</div>
                            <div className={tooltip.countryStats.active > 0 ? "text-red-400" : "text-emerald-400"}>
                              {tooltip.countryStats.active > 0 ? `⚠ ${tooltip.countryStats.active} active` : "✓ All resolved"}
                            </div>
                            <div className={`text-[10px] mt-1 ${isDark ? "text-purple-300" : "text-purple-600"}`}>Click to filter</div>
                          </div>
                        ) : <div className="opacity-50 text-[10px]">No threats from this country</div>}
                      </>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : null}
        </div>

        {/* ── Right sidebar ─────────────────────────────────────────────── */}
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
                    <span className="text-lg">{countryFlag(selectedPin.countryCode)}</span>
                    Threat Detail
                  </h3>
                  <button onClick={() => setSelectedPin(null)} className={`opacity-40 hover:opacity-100 transition-opacity ${isDark ? "text-white" : "text-purple-950"}`}>
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-2">
                  {/* Status */}
                  <div className={`flex justify-center py-1.5 rounded-lg font-bold text-xs ${selectedPin.is_blocked ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                    {selectedPin.is_blocked ? "✓ RESOLVED / QUARANTINED" : "⚠ ACTIVE THREAT"}
                  </div>

                  {[
                    { label: "IP Address", value: selectedPin.ip, mono: true },
                    { label: "Threat Type", value: selectedPin.label, color: getPinColor(selectedPin) },
                    { label: "City", value: selectedPin.city },
                    { label: "Region", value: selectedPin.region || "—" },
                    { label: "Country", value: selectedPin.country },
                    { label: "Hit Count", value: `${selectedPin.count} hit${selectedPin.count !== 1 ? "s" : ""}` },
                  ].map(({ label, value, mono, color }) => (
                    <div key={label} className="flex justify-between items-start gap-2">
                      <span className={`text-[11px] opacity-50 shrink-0 ${isDark ? "text-purple-300" : "text-purple-700"}`}>{label}</span>
                      <span className={`text-[11px] font-semibold text-right break-all ${mono ? "font-mono" : ""} ${isDark ? "text-white" : "text-purple-950"}`} style={color ? { color } : undefined}>{value}</span>
                    </div>
                  ))}

                  {selectedPin.isp && (
                    <div className={`flex items-start gap-1.5 pt-1 mt-1 border-t ${isDark ? "border-purple-500/20" : "border-purple-400/20"}`}>
                      <Wifi size={10} className="mt-0.5 shrink-0 opacity-50" />
                      <span className={`text-[10px] opacity-70 break-all ${isDark ? "text-purple-300" : "text-purple-700"}`}>{selectedPin.isp}</span>
                    </div>
                  )}
                  {selectedPin.org && selectedPin.org !== selectedPin.isp && (
                    <div className="flex items-start gap-1.5">
                      <Building2 size={10} className="mt-0.5 shrink-0 opacity-50" />
                      <span className={`text-[10px] opacity-70 break-all ${isDark ? "text-purple-300" : "text-purple-700"}`}>{selectedPin.org}</span>
                    </div>
                  )}

                  <div className={`text-[10px] font-mono opacity-40 text-center pt-1 ${isDark ? "text-purple-300" : "text-purple-700"}`}>
                    {selectedPin.lat.toFixed(2)}°, {selectedPin.lon.toFixed(2)}°
                  </div>

                  {/* ── Block Button ─────────────────────────────────── */}
                  {!selectedPin.is_blocked ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleBlock(selectedPin)}
                      disabled={!!blockingIp}
                      className={`w-full mt-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all disabled:opacity-50 ${isDark ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30" : "bg-red-50 hover:bg-red-100 text-red-600 border-red-300"}`}
                    >
                      {blockingIp === selectedPin.ip ? (
                        <><RefreshCw size={12} className="animate-spin" /> Blocking…</>
                      ) : (
                        <><Ban size={12} /> Block This IP</>
                      )}
                    </motion.button>
                  ) : (
                    <div className={`w-full mt-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border ${isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border-emerald-300"}`}>
                      <ShieldCheck size={12} /> Already Blocked
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sidebar tabs */}
          <div className={`shrink-0 flex border-b ${isDark ? "border-purple-500/20" : "border-purple-400/20"}`}>
            {(["threats", "countries"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSidebarTab(tab)}
                className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${sidebarTab === tab ? isDark ? "bg-purple-900/30 text-purple-300 border-b-2 border-purple-400" : "bg-purple-50 text-purple-700 border-b-2 border-purple-500" : isDark ? "text-purple-500 hover:text-purple-400" : "text-purple-400 hover:text-purple-600"}`}
              >
                {tab === "threats" ? <><ShieldAlert size={11} /> Threats</> : <><BarChart3 size={11} /> Countries</>}
              </button>
            ))}
          </div>

          {/* Threats list */}
          {sidebarTab === "threats" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5" style={{ scrollbarWidth: "thin" }}>
              {filteredPins.length === 0 ? (
                <p className={`text-xs text-center py-8 opacity-40 ${isDark ? "text-purple-300" : "text-purple-700"}`}>
                  {searchTerm ? `No results for "${searchTerm}"` : "No threats match filter"}
                </p>
              ) : (
                filteredPins.map((pin, i) => (
                  <motion.div key={`list-${pin.ip}-${i}`} className="group relative">
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setSelectedPin(selectedPin?.ip === pin.ip ? null : pin)}
                      className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all cursor-pointer ${selectedPin?.ip === pin.ip ? isDark ? "border-purple-400/60 bg-purple-800/40" : "border-purple-400 bg-purple-100" : isDark ? "border-purple-500/20 bg-purple-900/10 hover:border-purple-500/40 hover:bg-purple-900/20" : "border-purple-400/20 bg-white hover:border-purple-400/40 hover:bg-purple-50"}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm shrink-0">{countryFlag(pin.countryCode)}</span>
                          <span className={`font-mono text-xs font-semibold truncate ${isDark ? "text-white" : "text-purple-950"}`}>{pin.ip}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/* Inline block button */}
                          {!pin.is_blocked && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleBlock(pin); }}
                              disabled={!!blockingIp}
                              className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg ${isDark ? "bg-red-900/40 text-red-400 hover:bg-red-900/60" : "bg-red-50 text-red-500 hover:bg-red-100"}`}
                              title={`Block ${pin.ip}`}
                            >
                              {blockingIp === pin.ip ? <RefreshCw size={10} className="animate-spin" /> : <Ban size={10} />}
                            </button>
                          )}
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: getPinColor(pin) }} />
                        </div>
                      </div>
                      <div className={`text-[11px] truncate ${isDark ? "text-purple-400" : "text-purple-600"}`}>{pin.label} · {pin.city}, {pin.country}</div>
                      {pin.isp && <div className={`text-[10px] truncate opacity-50 ${isDark ? "text-purple-300" : "text-purple-700"}`}>{pin.isp}</div>}
                      <div className="flex items-center justify-between mt-0.5">
                        <span className={`text-[10px] opacity-50 ${isDark ? "text-purple-300" : "text-purple-700"}`}>{pin.count} hit{pin.count !== 1 ? "s" : ""}</span>
                        <span className={`text-[10px] font-bold ${pin.is_blocked ? "text-emerald-400" : "text-red-400"}`}>{pin.is_blocked ? "RESOLVED" : "ACTIVE"}</span>
                      </div>
                    </motion.div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* Countries list */}
          {sidebarTab === "countries" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: "thin" }}>
              {topCountries.length === 0 ? (
                <p className={`text-xs text-center py-8 opacity-40 ${isDark ? "text-purple-300" : "text-purple-700"}`}>No country data yet</p>
              ) : (
                topCountries.map(([name, data], i) => {
                  const barPct = Math.round((data.count / maxCountryCount) * 100);
                  const isFiltered = countryFilter === name;
                  return (
                    <motion.button
                      key={name}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setCountryFilter(isFiltered ? null : name)}
                      className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all ${isFiltered ? isDark ? "border-amber-400/60 bg-amber-900/30" : "border-amber-400 bg-amber-50" : isDark ? "border-purple-500/20 bg-purple-900/10 hover:border-purple-500/40 hover:bg-purple-900/20" : "border-purple-400/20 bg-white hover:border-purple-400/40 hover:bg-purple-50"}`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm shrink-0">{countryFlag(data.code)}</span>
                        <div className="min-w-0 flex-1"><div className={`text-xs font-semibold truncate ${isDark ? "text-white" : "text-purple-950"}`}>{name}</div></div>
                        <div className="shrink-0 text-right">
                          <span className={`text-xs font-bold ${isDark ? "text-white" : "text-purple-950"}`}>{data.count}</span>
                          <span className={`text-[10px] opacity-50 ml-1 ${isDark ? "text-purple-300" : "text-purple-700"}`}>hits</span>
                        </div>
                      </div>
                      <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? "bg-purple-900/50" : "bg-purple-100"}`}>
                        <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: data.active > 0 ? "linear-gradient(90deg,#ef4444,#f97316)" : "linear-gradient(90deg,#10b981,#06b6d4)" }} />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className={`text-[10px] ${data.active > 0 ? "text-red-400" : "text-emerald-400"}`}>{data.active > 0 ? `${data.active} active` : "all resolved"}</span>
                        <span className={`text-[10px] opacity-40 ${isDark ? "text-purple-300" : "text-purple-700"}`}>#{i + 1}</span>
                      </div>
                    </motion.button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
