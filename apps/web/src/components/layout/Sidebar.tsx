"use client";

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
        <button className="w-full flex items-center justify-center gap-2 bg-white text-black py-2.5 rounded-lg font-semibold text-sm hover:bg-zinc-200 transition-colors shadow-lg active:scale-[0.98]">
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>
    </div>
  );
}
