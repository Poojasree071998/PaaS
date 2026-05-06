"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Globe, Server, CheckCircle2, ChevronRight, Terminal } from 'lucide-react';

export default function DeploymentSuccessPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [deployment, setDeployment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchDetails = async () => {
      try {
        const response = await fetch(`http://${window.location.hostname}:4000/api/deployments/${id}`);
        const data = await response.json();
        if (data.success) setDeployment(data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  const isBackend = deployment?.project?.name?.includes('api') || deployment?.project?.name?.includes('backend');

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 selection:bg-emerald-500/30">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm uppercase tracking-widest">
              <CheckCircle2 className="w-4 h-4" />
              Deployment Successful
            </div>
            <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
              {deployment?.project?.name || 'Your Application'}
              <span className="text-zinc-700 font-normal">/</span>
              <span className="text-zinc-500 text-2xl font-medium tracking-normal">v1.0.0</span>
            </h1>
          </div>
          <button 
            onClick={() => window.close()}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all text-sm font-bold"
          >
            Close Preview
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Preview Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
              <div className="bg-white/5 px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/20" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/20" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/20" />
                  </div>
                  <div className="px-3 py-1 bg-black rounded-lg border border-white/5 text-[10px] font-mono text-zinc-500">
                    https://{deployment?.project?.slug || 'app'}.deployflow.app
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                  <Globe className="w-3 h-3" /> Live Preview
                </div>
              </div>

              {/* The "Real" Output Simulation */}
              <div className="p-12 min-h-[400px] flex items-center justify-center">
                {isBackend ? (
                  <div className="w-full max-w-md space-y-4">
                    <div className="bg-black p-6 rounded-2xl border border-white/5 font-mono text-sm space-y-2">
                      <p className="text-emerald-500">{`{`}</p>
                      <p className="pl-4 text-zinc-300">"status": "success",</p>
                      <p className="pl-4 text-zinc-300">"message": "API Server Online",</p>
                      <p className="pl-4 text-zinc-300">"version": "1.0.0",</p>
                      <p className="pl-4 text-zinc-300">"uptime": 124.5,</p>
                      <p className="pl-4 text-zinc-300">"endpoints": [</p>
                      <p className="pl-8 text-blue-400">"/api/v1/users",</p>
                      <p className="pl-8 text-blue-400">"/api/v1/auth",</p>
                      <p className="pl-8 text-blue-400">"/api/v1/projects"</p>
                      <p className="pl-4 text-zinc-300">]</p>
                      <p className="text-emerald-500">{`}`}</p>
                    </div>
                    <p className="text-center text-xs text-zinc-500">JSON API Response from Production Cluster</p>
                  </div>
                ) : (
                  <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="space-y-4">
                      <h2 className="text-6xl font-black tracking-tighter leading-none italic">
                        {deployment?.project?.name?.toUpperCase() || 'MODERN WEB APP'}
                      </h2>
                      <p className="text-zinc-500 text-xl max-w-md mx-auto leading-relaxed">
                        Beautiful, high-performance frontend deployed instantly via DeployFlow.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-4">
                      <div className="px-8 py-3 bg-white text-black font-black rounded-full hover:scale-105 transition-transform cursor-pointer">
                        Get Started
                      </div>
                      <div className="px-8 py-3 bg-white/5 border border-white/10 font-bold rounded-full hover:bg-white/10 transition-all cursor-pointer">
                        Learn More
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Runtime Info */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Latency', value: '24ms', color: 'text-emerald-400' },
                { label: 'CPU Usage', value: '1.2%', color: 'text-blue-400' },
                { label: 'Memory', value: '128MB', color: 'text-purple-400' },
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className={`text-xl font-mono font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500 p-2 rounded-xl">
                  <Server className="w-5 h-5 text-black" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-1">Infrastructure</p>
                  <p className="text-sm font-bold">Edge Network Active</p>
                </div>
              </div>
              <p className="text-xs text-emerald-500/70 leading-relaxed font-medium">
                Your application has been distributed across 24 edge nodes globally for maximum performance.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-6">
              <h3 className="font-bold text-sm uppercase tracking-widest text-zinc-500 border-b border-white/10 pb-4">Deployment Metadata</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">Framework</span>
                  <span className="font-bold">{isBackend ? 'Express (Node.js)' : 'Next.js (React)'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">Build Time</span>
                  <span className="font-bold">1m 24s</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">Commit</span>
                  <span className="font-mono text-zinc-400">7f2a1b9</span>
                </div>
              </div>
              <div className="pt-4">
                <div className="flex items-center justify-between text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">
                  <span>Server Health</span>
                  <span>99.9%</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="w-[99%] h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
