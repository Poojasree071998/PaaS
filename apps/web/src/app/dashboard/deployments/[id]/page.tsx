"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, useRef, useMemo, use } from 'react';
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
  Timer,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import { apiFetch, getSocketUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Log {
  id: string;
  content: string;
  level: string;
  timestamp: string;
}

export default function DeploymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [logs, setLogs] = useState<Log[]>([]);
  const [status, setStatus] = useState('QUEUED');
  const [loading, setLoading] = useState(true);
  const [deployment, setDeployment] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Real-time Progress Tracking
  const currentStep = useMemo(() => {
    if (status === 'READY') return 4;
    if (status === 'ERROR') return 0;
    
    const lastStepLog = [...logs].reverse().find(l => l.content?.match(/\[(\d)\/4\]/));
    if (lastStepLog && lastStepLog.content) {
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
        const [data, logsData] = await Promise.all([
          apiFetch(`/api/deployments/${id}`),
          apiFetch(`/api/deployments/${id}/logs`)
        ]);

        if (data.success) {
          setDeployment(data.data);
          setStatus(data.data.status);
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

    socket.on('deployment:log', (log: any) => {
      setLogs((prev) => {
        if (prev.some(l => l.id === log.id)) return prev;
        const normalizedLog = {
          id: log.id || Math.random().toString(36).substr(2, 9),
          content: log.content || log.message || '',
          level: (log.level || 'info').toLowerCase(),
          timestamp: log.timestamp || new Date().toISOString()
        };
        return [...prev, normalizedLog];
      });
    });

    socket.on('deployment:status', async (newStatus: string) => {
      setStatus(newStatus);
      // If build finished, re-fetch to get the final URL and metadata
      if (newStatus === 'READY' || newStatus === 'ERROR') {
        const data = await apiFetch(`/api/deployments/${id}`);
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
                  className="group relative flex items-center gap-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-10 py-4 rounded-2xl font-bold text-base hover:scale-[1.02] active:scale-95 transition-all shadow-[0_20px_50px_rgba(37,99,235,0.4)] hover:shadow-[0_20px_60px_rgba(37,99,235,0.6)]"
                >
                  <div className="absolute inset-0 bg-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-center gap-3">
                    <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_#34d399]" />
                    Visit Live Project
                    <ExternalLink className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </div>
                </a>
                
                <button
                  onClick={async () => {
                    const data = await apiFetch(`/api/deployments/${id}/promote`, { method: 'POST' });

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
                  const data = await apiFetch('/api/deployments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      repoUrl: deployment.project.repoUrl,
                      branch: deployment.branch || 'main',
                      buildCommand: deployment.project.buildCommand,
                      rootDirectory: deployment.project.rootDirectory
                    })
                  });

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
          {/* Main Status Display - Redesigned for Clarity */}
          <div className={cn(
            "rounded-3xl border p-8 transition-all duration-700 shadow-2xl",
            status === 'READY' ? "border-emerald-500/30 bg-emerald-500/5 shadow-emerald-500/5" : 
            status === 'ERROR' ? "border-red-500/30 bg-red-500/5 shadow-red-500/5" : 
            "border-blue-500/30 bg-blue-500/5 shadow-blue-500/5"
          )}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500",
                  status === 'READY' ? "bg-emerald-500 scale-110" : 
                  status === 'ERROR' ? "bg-red-500" : 
                  "bg-blue-500 animate-pulse"
                )}>
                  {status === 'READY' ? <CheckCircle2 className="w-8 h-8 text-white" /> : 
                   status === 'ERROR' ? <AlertCircle className="w-8 h-8 text-white" /> : 
                   <Loader2 className="w-8 h-8 text-white animate-spin" />}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-3xl font-black tracking-tight text-white capitalize">
                      {status === 'READY' ? 'Live' : status.toLowerCase() + '...'}
                    </h2>
                    <span className="text-[10px] font-black bg-white/10 px-2 py-0.5 rounded-full text-zinc-400 uppercase tracking-widest">Production</span>
                  </div>
                  <p className="text-zinc-400 font-medium text-lg">
                    {status === 'READY' ? 'Success! Your project is deployed.' : 
                     status === 'ERROR' ? `Failed at Step ${currentStep}: ${
                        currentStep === 1 ? 'Fetching Source' : 
                        currentStep === 2 ? 'Installing Dependencies' : 
                        currentStep === 3 ? 'Building Project' : 'Going Live'
                     }` : 
                     `Step ${currentStep} of 4: ${
                        currentStep === 1 ? 'Fetching Source' : 
                        currentStep === 2 ? 'Installing Dependencies' : 
                        currentStep === 3 ? 'Building Project' : 'Going Live'
                     }`}
                  </p>
                </div>
              </div>

              {status === 'READY' && deployment?.url && (
                <a 
                  href={deployment.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl transition-all flex items-center gap-3 shadow-xl shadow-emerald-500/20 active:scale-95 group"
                >
                  <ExternalLink className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  Visit Site
                </a>
              )}
            </div>

            {/* Error Details & Auto-Retry UI */}
            {status === 'ERROR' && (
              <div className="mt-8 border-t border-red-500/20 pt-6 animate-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" /> Error Details
                </h3>
                <p className="text-red-200/80 mb-6 bg-red-500/5 p-4 rounded-xl border border-red-500/10 font-mono text-sm">
                  {deployment?.errorMessage || 'An unknown system error occurred during the build process.'}
                </p>
                
                <div className="bg-black/30 rounded-xl p-5 border border-white/5">
                  <p className="font-bold text-zinc-300 mb-3 uppercase tracking-wider text-xs">Recommended Fixes</p>
                  <ul className="list-none space-y-2 text-sm text-zinc-400">
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      {deployment?.errorMessage?.toLowerCase().includes('memory') || deployment?.errorMessage?.toLowerCase().includes('heap') ? (
                         <span><b>Memory Limit Exceeded:</b> The build ran out of memory. Ensure you are not running heavy processes like <code>tsc</code> (TypeScript checking) in your build script.</span>
                      ) : deployment?.errorMessage?.toLowerCase().includes('timeout') ? (
                         <span><b>Build Timed Out:</b> The build took too long. Check if your build command gets stuck waiting for user input or enters an infinite loop.</span>
                      ) : deployment?.errorMessage?.toLowerCase().includes('package.json') ? (
                         <span><b>Missing package.json:</b> Ensure your repository has a valid <code>package.json</code> file at the root, or update the Root Directory setting.</span>
                      ) : deployment?.errorMessage?.toLowerCase().includes('git') || deployment?.errorMessage?.toLowerCase().includes('clone') ? (
                         <span><b>Repository Access:</b> Check if your GitHub repository is public or correctly linked. The platform could not clone it.</span>
                      ) : (
                         <span>Scroll down to the <b>System Pipeline Logs</b> terminal below to see the exact error output and stack trace.</span>
                      )}
                    </li>
                    <li className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      <span>Ensure your <code>buildCommand</code> (currently: <code>{deployment?.project?.buildCommand || 'npm run build'}</code>) runs successfully on your local machine.</span>
                    </li>
                  </ul>
                </div>
                
                <div className="mt-6 flex items-center gap-4">
                  <button
                    onClick={async () => {
                      try {
                        const data = await apiFetch('/api/deployments', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            repoUrl: deployment.project.repoUrl,
                            branch: deployment.branch || 'main',
                            buildCommand: deployment.project.buildCommand,
                            rootDirectory: deployment.project.rootDirectory
                          })
                        });

                        if (data.success) {
                          window.location.href = `/dashboard/deployments/${data.data.id}`;
                        } else {
                          alert('Redeploy failed: ' + (data.message || 'Check logs'));
                        }
                      } catch (e) {
                        alert('Failed to trigger redeploy.');
                      }
                    }}
                    className="flex items-center gap-3 bg-red-500/10 text-red-400 border border-red-500/20 px-8 py-3 rounded-xl font-bold text-sm hover:bg-red-500/20 hover:text-red-300 transition-all active:scale-95"
                  >
                    <Zap className="w-4 h-4" /> Try Again
                  </button>
                  <Link 
                    href={`/dashboard/projects/${deployment?.projectId}/settings`}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white px-4 py-2 text-sm transition-colors"
                  >
                    <Settings className="w-4 h-4" /> Check Project Settings
                  </Link>
                </div>
              </div>
            )}

            {/* Visual Progress Bar */}
            {(status === 'BUILDING' || status === 'QUEUED') && (
              <div className="mt-8 space-y-3">
                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-1000 ease-out" 
                    style={{ width: `${(currentStep / 4) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">
                  <span className={cn(currentStep >= 1 && "text-blue-400")}>Fetch</span>
                  <span className={cn(currentStep >= 2 && "text-blue-400")}>Install</span>
                  <span className={cn(currentStep >= 3 && "text-blue-400")}>Build</span>
                  <span className={cn(currentStep >= 4 && "text-blue-400")}>Deploy</span>
                </div>
              </div>
            )}
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
                  <span className="flex items-center gap-1.5"><Timer className="w-3 h-3" /> Live Streaming</span>
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

