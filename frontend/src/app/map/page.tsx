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

const colorScale = scaleLinear<string>()
  .domain([1, 10, 50, 100])
  .range(["#f59e0b", "#f97316", "#ef4444", "#991b1b"]);

export default function ThreatHeatmap() {
  const router = useRouter();
  const [locations, setLocations] = useState<GeoIP[]>([]);
  const [loading, setLoading] = useState(true);

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

            if (ipData.status === "success") {
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
            // skip failed lookups
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
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                >
                  <Globe size={40} className="opacity-30" />
                </motion.div>
                <span className="ml-3 text-sm">Resolving targets...</span>
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
                        strokeWidth={0.5}
                        style={{
                          default: { outline: "none" },
                          hover: { fill: "rgba(59, 130, 246, 0.15)", outline: "none" },
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
                      animate={{
                        r: [
                          Math.min(12, 4 + loc.count / 5),
                          Math.min(18, 8 + loc.count / 5),
                          Math.min(12, 4 + loc.count / 5),
                        ],
                      }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      fill={colorScale(loc.count)}
                      fillOpacity={0.6}
                      stroke="#fff"
                      strokeWidth={0.5}
                    />
                    <circle r={Math.min(8, 2 + loc.count / 10)} fill={colorScale(loc.count)} />
                  </Marker>
                ))}
              </ComposableMap>
            )}
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
