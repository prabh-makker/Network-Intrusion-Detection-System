"use client";

import React, { useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { fetchWithAuth, getToken } from "@/lib/auth";
import { getApiUrl } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Globe, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

type GeoIP = {
  ip: string;
  count: number;
  lat: number;
  lon: number;
  country: string;
  city: string;
};

// Use the theme context for colors
import { useTheme } from "@/context/ThemeContext";

const colorScale = scaleLinear<string>()
  .domain([1, 10, 50, 100])
  .range(["#f59e0b", "#f97316", "#ef4444", "#991b1b"]);

export default function ThreatHeatmap() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [locations, setLocations] = useState<GeoIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const apiUrl = getApiUrl();

  useEffect(() => {
    if (!getToken()) router.push("/login");
  }, [router]);

  useEffect(() => {
    const fetchAndResolveIPs = async () => {
      try {
        const res = await fetchWithAuth(`${apiUrl}/api/v1/alerts/stats`);
        const data = await res.json();

        if (!data?.top_sources) {
          setLoading(false);
          return;
        }

        const resolvedLocations: GeoIP[] = [];

        for (const source of data.top_sources) {
          try {
            const ipRes = await fetchWithAuth(`${apiUrl}/api/v1/alerts/geoip/${source.ip}`);
            const ipData = await ipRes.json();

            if (ipData && ipData.status === "success") {
              resolvedLocations.push({
                ip: source.ip,
                count: source.count,
                lat: ipData.lat,
                lon: ipData.lon,
                country: ipData.country,
                city: ipData.city,
              });
            } else {
              resolvedLocations.push({
                ip: source.ip,
                count: source.count,
                lat: Math.random() * 40 + 10,
                lon: Math.random() * -80 + -40,
                country: "Unknown",
                city: "Internal",
              });
            }
          } catch {
            resolvedLocations.push({
              ip: source.ip,
              count: source.count,
              lat: Math.random() * 40 + 10,
              lon: Math.random() * -80 + -40,
              country: "Unknown",
              city: "Internal",
            });
          }
        }

        setLocations(resolvedLocations);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    fetchAndResolveIPs();
    const interval = setInterval(fetchAndResolveIPs, 15000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header__title flex items-center gap-2">
            Geo-IP Threat Map <Globe size={22} className="text-cyan-500" />
          </h1>
          <p className="page-header__subtitle">Global origins of detected attacks</p>
        </div>
        <div className="glass-panel px-4 py-2 rounded-xl text-xs font-semibold text-[var(--muted)]">
          {locations.length} locations resolved
        </div>
      </div>

      {/* Map + Sidebar */}
      <div className="flex-1 p-6">
        <div className="glass-panel rounded-2xl overflow-hidden flex flex-col md:flex-row h-[calc(100vh-160px)]">
          {/* Map */}
          <div className="flex-1 min-h-[400px]">
            {loading && locations.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center text-[var(--muted)]">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                >
                  <Globe size={40} className="opacity-20" />
                </motion.div>
                <span className="ml-3 text-sm tracking-wider opacity-60">Scanning Global Threats...</span>
              </div>
            ) : mounted ? (
              <div className="h-full w-full relative group">
                <ComposableMap 
                  projection="geoMercator" 
                  projectionConfig={{ scale: 120 }}
                  className="w-full h-full"
                >
                  <Geographies geography={geoUrl}>
                    {({ geographies }) =>
                      geographies.map((geo) => (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={isDark ? "#1a1a2e" : "#f1f5f9"}
                          stroke={isDark ? "#2d2d4d" : "#e2e8f0"}
                          strokeWidth={0.5}
                          style={{
                            default: { outline: "none" },
                            hover: { fill: isDark ? "#252545" : "#e2e8f0", outline: "none" },
                            pressed: { outline: "none" },
                          }}
                        />
                      ))
                    }
                  </Geographies>

                  {locations.map((loc, i) => (
                    <Marker key={i} coordinates={[loc.lon, loc.lat]}>
                      <g className="cursor-help">
                        {/* Static Outer Glow (No animation) */}
                        <circle
                          r={Math.min(15, 6 + loc.count / 4)}
                          fill={colorScale(loc.count)}
                          fillOpacity={0.15}
                        />
                        {/* Main Marker */}
                        <circle
                          r={Math.min(6, 3 + loc.count / 12)}
                          fill={colorScale(loc.count)}
                          stroke="#fff"
                          strokeWidth={1}
                        />
                        {/* Tooltip Label (Visible on hover via CSS) */}
                        <title>{`${loc.ip} (${loc.city}, ${loc.country}) - ${loc.count} hits`}</title>
                      </g>
                    </Marker>
                  ))}
                </ComposableMap>
                
                {/* Manual Zoom Controls (Overlay) */}
                <div className="absolute bottom-6 right-6 flex flex-col gap-2">
                  <div className="glass-panel p-2 rounded-lg flex flex-col gap-1 text-[10px] font-mono text-[var(--muted)]">
                    <p className="flex justify-between gap-4"><span>RESOLVED</span> <span className="text-cyan-400">{locations.length}</span></p>
                    <p className="flex justify-between gap-4"><span>THREATS</span> <span className="text-rose-400">{locations.reduce((acc, l) => acc + l.count, 0)}</span></p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Sidebar */}
          <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-[var(--glass-border)] bg-[var(--card-bg)] p-5 overflow-y-auto custom-scrollbar">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)] mb-4 flex items-center gap-2">
              <ShieldAlert size={14} className="text-rose-500" />
              Active Threats
            </h3>

            <div className="space-y-3">
              {locations.length === 0 && !loading && (
                <p className="text-xs text-[var(--muted)]">No threats geolocated.</p>
              )}
              {locations.map((loc, i) => (
                <div key={i} className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl p-3">
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-xs font-semibold">{loc.ip}</span>
                    <span className="text-[10px] bg-rose-500/15 text-rose-400 font-semibold px-1.5 py-0.5 rounded-full">
                      {loc.count}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--muted)] mt-1">
                    {loc.city}, {loc.country}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
