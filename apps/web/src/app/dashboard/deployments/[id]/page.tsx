"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import { 
  ChevronLeft, 
  ExternalLink, 
  GitBranch, 
  Hash, 
  Terminal,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Settings,
  Folder,
  Zap,
  Clock,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import { getApiUrl, getSocketUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Log {
  id: string;
  content: string;
  level: string;
  timestamp: string;
}

export default function DeploymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [logs, setLogs] = useState<Log[]>([]);
  const [status, setStatus] = useState('QUEUED');
  const [loading, setLoading] = useState(true);
  const [deployment, setDeployment] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Real-time Progress Tracking
  const currentStep = useMemo(() => {
    if (status === 'READY') return 4;
    if (status === 'ERROR') return 0;
    
    const lastStepLog = [...logs].reverse().find(l => l.content.match(/\[(\d)\/4\]/));
    if (lastStepLog) {
      const match = lastStepLog.content.match(/\[(\d)\/4\]/);
      return match ? parseInt(match[1]) : 1;
    }
    return 1;
  }, [logs, status]);

  const steps = [
    { id: 1, name: 'Clone', icon: Folder },
    { id: 2, name: 'Install', icon: Zap },
    { id: 3, name: 'Build', icon: Settings },
    { id: 4, name: 'Deploy', icon: ExternalLink },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = getApiUrl();
        const [depRes, logsRes] = await Promise.all([
          fetch(`${apiUrl}/api/deployments/${id}`),
          fetch(`${apiUrl}/api/deployments/${id}/logs`)
        ]);
        
        const depData = await depRes.json();
        const logsData = await logsRes.json();
        
        if (depData.success) {
          setDeployment(depData.data);
          setStatus(depData.data.status);
        }
        if (logsData.success) {
          setLogs(logsData.data.map((l: any) => ({
            id: l.id,
            content: l.message,
            level: l.level.toLowerCase(),
            timestamp: l.timestamp
          })));
        }
      } catch (error) {
        console.error('Failed to fetch deployment data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const socketUrl = getSocketUrl();
    const socket = io(socketUrl);
    socket.emit('join:deployment', id);

    socket.on('deployment:log', (log: Log) => {
      setLogs((prev) => {
        if (prev.some(l => l.id === log.id)) return prev;
        return [...prev, log];
      });
    });

    socket.on('deployment:status', async (newStatus: string) => {
      setStatus(newStatus);
      // If build finished, re-fetch to get the final URL and metadata
      if (newStatus === 'READY' || newStatus === 'ERROR') {
        const apiUrl = getApiUrl();
        const res = await fetch(`${apiUrl}/api/deployments/${id}`);
        const data = await res.json();
        if (data.success) setDeployment(data.data);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-white/5 border-t-white rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white animate-pulse" />
            </div>
          </div>
          <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-[10px]">Initializing Pipeline</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">
              <span className="hover:text-white transition-colors cursor-default">{deployment?.project?.name}</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-zinc-600 font-mono flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded italic">
                <Hash className="w-3 h-3" /> {id.substring(0, 8)}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tighter">Deployment Pipeline</h1>
          </div>
        </div>

        {(status === 'READY' || status === 'ERROR') && (
          <div className="flex flex-wrap gap-4">
            {status === 'READY' && (
              <>
                <a 
                  href={deployment?.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 bg-white text-black px-8 py-3 rounded-2xl font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:shadow-[0_20px_50px_rgba(255,255,255,0.2)]"
                >
                  Open Live Site <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </a>
                
                <button
                  onClick={async () => {
                    const apiUrl = getApiUrl();
                    const res = await fetch(`${apiUrl}/api/deployments/${id}/promote`, { method: 'POST' });
                    const data = await res.json();
                    if (data.success) {
                      alert('Successfully promoted to production!');
                    }
                  }}
                  className="flex items-center gap-3 bg-zinc-900 text-white border border-white/10 px-8 py-3 rounded-2xl font-bold text-sm hover:bg-zinc-800 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
                >
                  Promote to Production <ArrowUpRight className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              onClick={async () => {
                try {
                  const apiUrl = getApiUrl();
                  const res = await fetch(`${apiUrl}/api/deployments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      repoUrl: deployment.project.repoUrl,
                      branch: deployment.branch || 'main',
                      buildCommand: deployment.project.buildCommand,
                      rootDirectory: deployment.project.rootDirectory
                    })
                  });
                  const data = await res.json();
                  if (data.success) {
                    window.location.href = `/dashboard/deployments/${data.data.id}`;
                  } else {
                    alert('Redeploy failed: ' + (data.message || 'Check logs'));
                  }
                } catch (e) {
                  alert('Failed to trigger redeploy.');
                }
              }}
              className="flex items-center gap-3 bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-blue-500 transition-all shadow-[0_20px_50px_rgba(37,99,235,0.2)]"
            >
              <Zap className="w-4 h-4" /> Redeploy
            </button>
          </div>
        )}
      </div>

      {/* Real-time Step Progress Tracker */}
      <div className="glass-card p-2 bg-white/[0.02] border-white/5">
        <div className="grid grid-cols-4 gap-2">
          {steps.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <div key={step.id} className={cn(
                "relative p-4 rounded-xl border transition-all duration-500 flex flex-col items-center justify-center gap-2 overflow-hidden",
                isActive ? "bg-white/10 border-white/20 scale-105 z-10 shadow-xl" : 
                isCompleted ? "bg-emerald-500/5 border-emerald-500/20 opacity-60" : "bg-transparent border-white/5 opacity-30"
              )}>
                {isActive && (
                  <div className="absolute bottom-0 left-0 h-1 bg-blue-500 animate-[shimmer_2s_infinite]" style={{ width: '100%' }} />
                )}
                <step.icon className={cn(
                  "w-5 h-5",
                  isActive ? "text-blue-400 animate-bounce" : isCompleted ? "text-emerald-500" : "text-zinc-500"
                )} />
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  isActive ? "text-white" : "text-zinc-500"
                )}>
                  {step.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          {/* Main Status Display */}
          <div className={cn(
            "glass-card p-8 border-l-8 transition-all duration-700",
            status === 'READY' ? "border-emerald-500 bg-emerald-500/5" : 
            status === 'ERROR' ? "border-red-500 bg-red-500/5" : "border-amber-500 bg-amber-500/5"
          )}>
            <div className="flex items-start justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
                    status === 'READY' ? "bg-emerald-500" : status === 'ERROR' ? "bg-red-500" : "bg-amber-500"
                  )}>
                    {status === 'READY' ? <CheckCircle2 className="w-7 h-7 text-white" /> : 
                     status === 'ERROR' ? <AlertCircle className="w-7 h-7 text-white" /> : 
                     <Loader2 className="w-7 h-7 text-white animate-spin" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold">{status}</h2>
                      <span className="text-[10px] font-black bg-white/10 px-2 py-0.5 rounded-full text-zinc-400 uppercase tracking-tighter">Production</span>
                    </div>
                    <p className="text-zinc-400 font-medium">
                      {status === 'READY' ? 'Your latest changes are now live globally.' : 
                       status === 'ERROR' ? 'The build process encountered an error.' : 
                       `Executing Step ${currentStep} of 4...`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-8 text-right">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Region</p>
                  <p className="font-bold text-white">Global (Anycast)</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Engine</p>
                  <p className="font-bold text-white flex items-center gap-2 justify-end">
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> Turbo-Build
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Terminal Logs */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-emerald-500/20 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000"></div>
            <div className="relative bg-[#09090b] rounded-2xl border border-white/10 overflow-hidden flex flex-col h-[600px] shadow-2xl">
              <div className="bg-white/5 px-6 py-4 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/20" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/20" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/20" />
                  </div>
                  <div className="h-4 w-px bg-white/10 mx-2" />
                  <Terminal className="w-4 h-4 text-zinc-500" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">System Pipeline Logs</span>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                  <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Live Streaming</span>
                </div>
              </div>
              
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-8 font-mono text-[13px] leading-relaxed space-y-1.5 scrollbar-thin scrollbar-thumb-white/10"
              >
                {logs.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-700 italic">
                    <div className="w-8 h-8 border-2 border-white/5 border-t-white/20 rounded-full animate-spin" />
                    <p>Connecting to secure build node...</p>
                  </div>
                )}
                {logs.map((log) => {
                  const isStep = log.content.includes('[') && log.content.includes('/4]');
                  const isSuccess = log.content.includes('✅') || log.content.includes('SUCCESS');
                  
                  return (
                    <div key={log.id} className={cn(
                      "flex gap-6 group rounded px-4 -mx-4 transition-all py-1 border-l-2 border-transparent",
                      isStep && "bg-white/5 border-l-blue-500 my-4 py-3 font-bold text-blue-50",
                      isSuccess && "bg-emerald-500/5 border-l-emerald-500 text-emerald-50",
                      log.level === 'error' && "bg-red-500/5 border-l-red-500 text-red-100"
                    )}>
                      <span className="text-zinc-800 select-none w-24 shrink-0 text-xs tabular-nums mt-0.5">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 1 })}
                      </span>
                      <span className={cn(
                        "flex-1 break-all whitespace-pre-wrap",
                        log.level === 'error' ? 'text-red-400' : 
                        log.level === 'warn' ? 'text-amber-400' : 
                        isStep ? 'text-white' : 
                        isSuccess ? 'text-emerald-400' : 'text-zinc-400'
                      )}>
                        {log.content}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
          <div className="glass-card p-6 space-y-8 border-white/5">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-600 border-b border-white/5 pb-4">Pipeline Details</h3>
            
            <div className="space-y-6">
              <div className="group">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2 group-hover:text-zinc-300 transition-colors">Project Source</p>
                <div className="flex items-center gap-3 text-sm text-white font-bold bg-white/5 p-3 rounded-xl border border-white/5 group-hover:border-white/10 transition-all">
                  <GitBranch className="w-4 h-4 text-emerald-500" /> 
                  <span className="truncate">{deployment?.project?.repoUrl?.split('/').pop()}</span>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2">Build Environment</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs bg-white/5 p-2 rounded-lg border border-white/5">
                    <span className="text-zinc-500">Runtime</span>
                    <span className="text-white font-bold italic">Node.js 20.x</span>
                  </div>
                  <div className="flex items-center justify-between text-xs bg-white/5 p-2 rounded-lg border border-white/5">
                    <span className="text-zinc-500">Framework</span>
                    <span className="text-white font-bold uppercase tracking-tighter">{deployment?.project?.framework || 'Auto'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em] mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Nodes
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className={cn(
                      "h-1 rounded-full",
                      i < 5 ? "bg-emerald-500/40" : "bg-white/5"
                    )} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 border-white/5 bg-blue-500/5">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" /> Fast Refresh
            </h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              This deployment is protected by our global edge network. Your assets are automatically cached in 200+ cities for sub-10ms response times.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

