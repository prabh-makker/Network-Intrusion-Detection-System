"use client";

import React, { useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { fetchWithAuth, getToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { ArrowLeft, Globe, ShieldAlert, BarChart3, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

// Natural Earth world map topojson
const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

type GeoIP = {
    ip: string;
    count: number;
    lat: number;
    lon: number;
    country: string;
    city: string;
};

// Create a color scale for the heatmap dots Based on attack count
const colorScale = scaleLinear<string>()
    .domain([1, 10, 50, 100])
    .range(["#f59e0b", "#f97316", "#ef4444", "#991b1b"]); // Amber to deep Red

export default function ThreatHeatmap() {
    const router = useRouter();
    const [locations, setLocations] = useState<GeoIP[]>([]);
    const [isLightMode, setIsLightMode] = useState(false);
    const [loading, setLoading] = useState(true);

    // Auth Check
    useEffect(() => {
        if (!getToken()) {
            router.push("/login");
        }
    }, [router]);

    useEffect(() => {
        if (isLightMode) {
            document.documentElement.classList.add("light");
        } else {
            document.documentElement.classList.remove("light");
        }
    }, [isLightMode]);

    useEffect(() => {
        const fetchAndResolveIPs = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                // 1. Get Top Sources from our backend
                const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/stats`);
                const data = await res.json();

                if (!data || !data.top_sources) {
                    setLoading(false);
                    return;
                }

                // 2. Resolve them to Coordinates via free IP-API
                const resolvedLocations: GeoIP[] = [];

                // Loop sequentially to avoid hitting rate limits on free IP-API (45 calls/min)
                for (const source of data.top_sources) {
                    try {
                        // Using our backend proxy to avoid CORS issues with ip-api.com
                        const ipRes = await fetchWithAuth(`${apiUrl}/api/v1/alerts/geoip/${source.ip}`);
                        const ipData = await ipRes.json();

                        if (ipData.status === "success") {
                            resolvedLocations.push({
                                ip: source.ip,
                                count: source.count,
                                lat: ipData.lat,
                                lon: ipData.lon,
                                country: ipData.country,
                                city: ipData.city
                            });
                        } else {
                            // Fallback / mock data for internal IPs (like 192.168.x.x)
                            // Random location in the US/Europe so the map isn't completely empty during testing
                            resolvedLocations.push({
                                ip: source.ip,
                                count: source.count,
                                lat: (Math.random() * 40) + 10,
                                lon: (Math.random() * -80) + -40,
                                country: "Unknown (Internal/Mock)",
                                city: "Local Segment"
                            });
                        }
                    } catch (e) {
                        console.error("Failed IP lookup", e);
                    }
                }

                setLocations(resolvedLocations);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };

        fetchAndResolveIPs();
        const interval = setInterval(fetchAndResolveIPs, 15000); // Reload every 15s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen p-6 md:p-8 flex flex-col gap-6">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--glass-border)] pb-6">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="glass-panel p-3 rounded-xl hover:scale-105 transition-transform">
                        <ArrowLeft size={20} className="text-[var(--muted)]" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent flex items-center gap-3">
                            Geo-IP Threat Map <Globe size={28} className="text-cyan-500" />
                        </h1>
                        <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mt-1">
                            Global Origins of Detected Attacks
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

                    <Link href="/alerts" className="glass-panel px-4 py-3 rounded-xl text-sm font-bold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-2">
                        <ShieldAlert size={16} /> Alerts
                    </Link>
                    <Link href="/dashboard" className="glass-panel px-4 py-3 rounded-xl text-sm font-bold text-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-2">
                        <BarChart3 size={16} /> Dashboard
                    </Link>
                </div>
            </header>

            {/* Map Container */}
            <div className="flex-1 glass-panel rounded-2xl relative overflow-hidden flex flex-col md:flex-row">

                {/* Map Rendering */}
                <div className="flex-1 h-[60vh] md:h-auto min-h-[500px]">
                    {loading && locations.length === 0 ? (
                        <div className="h-full w-full flex items-center justify-center text-[var(--muted)]">
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                                <Globe size={48} className="opacity-30" />
                            </motion.div>
                            <span className="ml-3">Resolving Geolocation Targets...</span>
                        </div>
                    ) : (
                        <ComposableMap projection="geoMercator" projectionConfig={{ scale: 140 }}>
                            <Geographies geography={geoUrl}>
                                {({ geographies }) =>
                                    geographies.map((geo) => (
                                        <Geography
                                            key={geo.rsmKey}
                                            geography={geo}
                                            fill="var(--card-bg)"
                                            stroke="var(--glass-border)"
                                            strokeWidth={1}
                                            style={{
                                                default: { outline: "none" },
                                                hover: { fill: "rgba(59, 130, 246, 0.2)", outline: "none" },
                                                pressed: { outline: "none" },
                                            }}
                                        />
                                    ))
                                }
                            </Geographies>

                            {locations.map((loc, i) => (
                                <Marker key={i} coordinates={[loc.lon, loc.lat]}>
                                    <motion.circle
                                        initial={{ r: 0 }}
                                        animate={{ r: [Math.min(12, 4 + loc.count / 5), Math.min(18, 8 + loc.count / 5), Math.min(12, 4 + loc.count / 5)] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        fill={colorScale(loc.count)}
                                        fillOpacity={0.7}
                                        stroke="#fff"
                                        strokeWidth={1}
                                    />
                                    <circle r={Math.min(8, 2 + loc.count / 10)} fill={colorScale(loc.count)} />
                                </Marker>
                            ))}
                        </ComposableMap>
                    )}
                </div>

                {/* Sidebar Info */}
                <div className="w-full md:w-80 border-l border-[var(--glass-border)] bg-[var(--card-bg)] p-6 overflow-y-auto">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--foreground)] mb-6 flex items-center gap-2">
                        <ShieldAlert size={16} className="text-rose-500" />
                        Active Regional Threats
                    </h3>

                    <div className="space-y-4">
                        {locations.length === 0 && !loading && (
                            <p className="text-sm text-[var(--muted)]">No threats successfully geolocated yet.</p>
                        )}
                        {locations.map((loc, i) => (
                            <div key={i} className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl p-4 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <span className="font-mono text-xs font-bold text-[var(--foreground)]">{loc.ip}</span>
                                    <span className="text-xs bg-rose-500/20 text-rose-400 font-bold px-2 py-0.5 rounded-full">{loc.count} Hits</span>
                                </div>
                                <div className="text-xs text-[var(--muted)] font-medium">
                                    {loc.city}, {loc.country}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
