"use client";

import { 
  Plus, 
  ArrowUpRight, 
  Activity, 
  Box, 
  Zap,
  Clock
} from 'lucide-react';
import Link from 'next/link';

import { useEffect, useState } from 'react';
import { getApiUrl } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardOverview() {
  const [stats, setStats] = useState({ projects: 0, deployments: 0, uptime: '99.9%' });
  const [recentDeployments, setRecentDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`https://paas-k7nx.onrender.com/api/deployments`);
        const data = await response.json();
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
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Overview</h1>
          <p className="text-zinc-500">Welcome back, Nikita. Here's what's happening today.</p>
        </div>
        <Link href="/dashboard/new" className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg font-semibold text-sm hover:bg-zinc-200 transition-colors">
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-l-4 border-blue-500">
          <div className="flex items-center gap-2 text-zinc-500 mb-2">
            <Box className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Active Projects</span>
          </div>
          <div className="text-3xl font-bold">{stats.projects}</div>
          <div className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            +2 this month
          </div>
        </div>
        <div className="glass-card p-6 border-l-4 border-purple-500">
          <div className="flex items-center gap-2 text-zinc-500 mb-2">
            <Zap className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Deployments</span>
          </div>
          <div className="text-3xl font-bold">{stats.deployments}</div>
          <div className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            +18% growth
          </div>
        </div>
        <div className="glass-card p-6 border-l-4 border-amber-500">
          <div className="flex items-center gap-2 text-zinc-500 mb-2">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Uptime</span>
          </div>
          <div className="text-3xl font-bold">{stats.uptime}</div>
          <div className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center gap-1">
            <CheckCircleIcon className="w-3 h-3" />
            All systems normal
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Recent Activity</h2>
            <Link href="/dashboard/deployments" className="text-xs text-zinc-500 hover:text-white transition-colors">
              View all
            </Link>
          </div>
          <div className="glass-card divide-y divide-white/5">
            {recentDeployments.length === 0 ? (
              <div className="p-10 text-center text-zinc-500 text-sm">No recent deployments.</div>
            ) : (
              recentDeployments.map((item, i) => (
                <div key={i} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors group">
                  <div className={`w-2 h-2 rounded-full ${item.status === 'READY' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : item.status === 'ERROR' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{item.project?.name || 'Unknown Project'}</span>
                      <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded border border-white/5 text-zinc-500 uppercase font-bold tracking-tighter">production</span>
                    </div>
                    <div className="text-xs text-zinc-500">
                      {item.status === 'READY' ? 'Successfully deployed' : item.status === 'ERROR' ? 'Deployment failed' : 'Building...'} • {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  <Link 
                    href={`/dashboard/deployments/${item.id}`}
                    className="text-[10px] font-bold uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10"
                  >
                    Logs
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold">Current Usage</h2>
          <div className="glass-card p-6 space-y-6 text-zinc-400">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                <span>Bandwidth</span>
                <span className="text-white">82%</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full w-[82%]" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                <span>Build Minutes</span>
                <span className="text-white">45%</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full w-[45%]" />
              </div>
            </div>
            <div className="pt-4 border-t border-white/5">
              <p className="text-xs italic">You are currently on the <span className="text-white font-bold">Pro Plan</span>. Next billing date: June 1, 2026.</p>
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
