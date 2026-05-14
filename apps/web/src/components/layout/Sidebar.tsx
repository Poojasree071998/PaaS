"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Layers, 
  Settings, 
  Globe, 
  Database, 
  Activity, 
  CreditCard,
  Plus
} from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/dashboard/projects', icon: Layers },
  { name: 'Deployments', href: '/dashboard/deployments', icon: Activity },
  { name: 'Domains', href: '/dashboard/domains', icon: Globe },
  { name: 'Databases', href: '/dashboard/databases', icon: Database },
  { name: 'Analytics', href: '/dashboard/analytics', icon: Activity },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();

  // --- AUTOMATIC WAKE-UP ENGINE ---
  // Background ping to wake up the API from Render's free-tier sleep
  useEffect(() => {
    const wakeUp = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_VITE_API_BASE || "https://paas-k7nx.onrender.com";
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout for Render cold starts and busy builds
        await fetch(`${API_BASE}/health`, { signal: controller.signal }).catch(() => {});
        clearTimeout(timeoutId);
      } catch (e) {}
    };
    wakeUp();
    // Ping every 10 minutes to keep it alive while the user is active
    const interval = setInterval(wakeUp, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-64 border-r border-white/10 bg-black/50 backdrop-blur-xl h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-black rounded-sm transform rotate-45" />
          </div>
          <span>DeployFlow</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
              pathname === item.href 
                ? "bg-white/10 text-white shadow-lg shadow-white/5" 
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 transition-transform duration-200 group-hover:scale-110",
              pathname === item.href ? "text-white" : "text-zinc-500"
            )} />
            <span className="font-medium text-sm">{item.name}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-700 flex items-center justify-center text-sm font-bold text-white shadow-lg group-hover:scale-105 transition-transform">
            N
          </div>
          <div className="flex flex-col items-start flex-1 min-w-0">
            <span className="text-sm font-medium text-white truncate">Nikita</span>
            <span className="text-xs text-zinc-500 truncate">Pro Plan</span>
          </div>
          <Settings className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
        </button>
      </div>
    </div>
  );
}
