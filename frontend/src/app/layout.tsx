import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/components/Toast";
import Sidebar from "@/components/Sidebar";
import BackgroundCanvas from "@/components/BackgroundCanvas";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NIDS Sentinel — Network Intrusion Detection System",
  description:
    "AI-Powered Real-Time Network Intrusion Detection and Threat Analysis Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <ToastProvider>
            <BackgroundCanvas />
            <Sidebar />
            <main className="main-content">{children}</main>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
