"use client";

export const dynamic = "force-dynamic";

import { 
  Plus, 
  ArrowUpRight, 
  Activity, 
  Box, 
  Zap,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight,
  Globe,
  GitBranch
} from 'lucide-react';
import Link from 'next/link';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardOverview() {
  const [stats, setStats] = useState({ projects: 0, deployments: 0, uptime: '99.9%' });
  const [recentDeployments, setRecentDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await apiFetch('/api/deployments');
        if (data.success) {
          const deps = data.data;
          setRecentDeployments(deps.slice(0, 4));
          
          // Calculate stats
          const uniqueProjects = new Set(deps.map((d: any) => d.projectId)).size;
          setStats({
            projects: uniqueProjects,
            deployments: deps.length,
            uptime: '100%'
          });
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-zinc-500 mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Command Center</span>
            <div className="w-1 h-1 rounded-full bg-zinc-700" />
            <span className="text-[10px] font-bold text-zinc-600 italic">v2.4.0</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white">Dashboard</h1>
          <p className="text-zinc-400 mt-2 text-lg">Welcome back. Your platform is operating at <span className="text-emerald-400 font-bold">100% capacity</span>.</p>
        </div>
        <Link href="/dashboard/new" className="group relative px-8 py-3 bg-white text-black font-black rounded-2xl hover:bg-zinc-200 transition-all flex items-center gap-3 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-white/50 to-blue-500/0 -translate-x-full group-hover:animate-shimmer" />
          <Plus className="w-5 h-5" /> New Project
        </Link>
      </div>

      {/* Hero Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Projects', value: stats.projects, icon: Box, color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/5', trend: '+2 this week' },
          { label: 'Active Deployments', value: stats.deployments, icon: Zap, color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5', trend: '12m avg build' },
          { label: 'System Uptime', value: stats.uptime, icon: Activity, color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', trend: 'Healthy' },
        ].map((stat, i) => (
          <div key={i} className={`relative group overflow-hidden rounded-3xl border ${stat.border} ${stat.bg} p-8 transition-all hover:scale-[1.02] active:scale-[0.98]`}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <stat.icon className="w-24 h-24 rotate-12" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-lg ${stat.bg} ${stat.color} border ${stat.border}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{stat.label}</span>
              </div>
              <div className="text-4xl font-black text-white mb-2">{stat.value}</div>
              <div className={`text-[10px] font-bold ${stat.color} uppercase tracking-tighter flex items-center gap-1`}>
                <ArrowUpRight className="w-3 h-3" /> {stat.trend}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main: Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black text-white flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Recent Activity
            </h2>
            <Link href="/dashboard/deployments" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all">View History</Link>
          </div>
          
          <div className="rounded-3xl border border-white/5 bg-white/[0.02] overflow-hidden divide-y divide-white/5">
            {recentDeployments.length === 0 ? (
              <div className="p-20 text-center text-zinc-600 italic">No activity detected yet.</div>
            ) : (
              recentDeployments.map((item, i) => (
                <Link 
                  key={i} 
                  href={`/dashboard/deployments/${item.id}`}
                  className="p-6 flex items-center gap-6 hover:bg-white/[0.04] transition-all group"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                    item.status === 'READY' ? 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white' : 
                    item.status === 'ERROR' ? 'bg-rose-500/10 text-rose-500 group-hover:bg-rose-500 group-hover:text-white' : 
                    'bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white'
                  }`}>
                    {item.status === 'READY' ? <CheckCircleIcon className="w-6 h-6" /> : 
                     item.status === 'ERROR' ? <AlertCircle className="w-6 h-6" /> : <Loader2 className="w-6 h-6 animate-spin" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-black text-white group-hover:translate-x-1 transition-transform inline-block">{item.project?.name || 'Unknown Project'}</span>
                      <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded-full border border-white/10 text-zinc-500 uppercase font-black tracking-widest">production</span>
                    </div>
                    <div className="text-xs text-zinc-500 flex items-center gap-2">
                      <Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-[10px] font-black uppercase tracking-widest ${
                      item.status === 'READY' ? 'text-emerald-500' : 
                      item.status === 'ERROR' ? 'text-rose-500' : 'text-blue-500'
                    }`}>
                      {item.status}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Sidebar: Performance & Plan */}
        <div className="space-y-10">
          <div className="space-y-6">
            <h2 className="text-xl font-black text-white px-2">Platform Health</h2>
            <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8 space-y-8">
              {[
                { label: 'Bandwidth Usage', value: '82%', color: 'bg-blue-500', shadow: 'shadow-blue-500/20' },
                { label: 'Build Minutes', value: '45%', color: 'bg-purple-500', shadow: 'shadow-purple-500/20' },
                { label: 'Storage (SSD)', value: '12%', color: 'bg-emerald-500', shadow: 'shadow-emerald-500/20' },
              ].map((meter, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{meter.label}</span>
                    <span className="text-sm font-black text-white">{meter.value}</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                    <div className={`h-full ${meter.color} ${meter.shadow} rounded-full transition-all duration-1000 shadow-lg`} style={{ width: meter.value }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative rounded-[2rem] bg-zinc-900 border border-white/5 p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-black text-white mb-2">Pro Plan</h3>
              <p className="text-xs text-zinc-500 mb-8 leading-relaxed">You are currently using the advanced features of the Pro Plan.</p>
              <button className="w-full py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/10">
                Manage Billing
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
