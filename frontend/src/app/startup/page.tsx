"use client";

import dynamic from "next/dynamic";
import { ReactNode } from "react";

// Dynamically import the startup content with SSR disabled
const StartupContent = dynamic(() => import("./startup-content"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen w-full bg-[var(--background)] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mb-4"></div>
        <p className="text-green-400 font-mono">Initializing system...</p>
      </div>
    </div>
  ),
});

export default function SystemStartupPage(): ReactNode {
  return <StartupContent />;
}
