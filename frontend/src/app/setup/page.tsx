"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();

  useEffect(() => {
    // Auto-setup: Get token from backend and store it
    const setup = async () => {
      try {
        const res = await fetch("http://localhost:8001/api/v1/login/access-token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "username=admin&password=admin123",
        });

        const data = await res.json();
        if (data.access_token) {
          localStorage.setItem("nids_token", data.access_token);
          localStorage.setItem("nids_username", "admin");
          console.log("✓ Setup complete - token stored");

          // Redirect to dashboard
          setTimeout(() => router.push("/dashboard"), 500);
        } else {
          console.error("Setup failed:", data);
        }
      } catch (error) {
        console.error("Setup error:", error);
      }
    };

    setup();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Setting up NIDS...</h1>
        <p className="text-slate-300">Authenticating and loading dashboard...</p>
      </div>
    </div>
  );
}
