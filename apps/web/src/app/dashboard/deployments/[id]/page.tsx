"use client";

import React, { useEffect, useState, useRef } from 'react';
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
  Folder
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

    socket.on('deployment:status', (newStatus: string) => {
      setStatus(newStatus);
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
          <Loader2 className="w-12 h-12 text-white animate-spin" />
          <p className="text-zinc-500 font-medium animate-pulse">Initializing build logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
            <span>Project: {deployment?.project?.name || 'Loading...'}</span>
            <span>/</span>
            <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {id.substring(0, 8)}</span>
          </div>
          <h1 className="text-2xl font-bold">Deployment Pipeline</h1>
        </div>
        <div className="ml-auto flex gap-3">
          {status === 'READY' && (
            <a 
              href={deployment?.url?.startsWith('/') ? `${window.location.origin}${deployment.url}` : (deployment?.url || '#')} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg font-semibold text-sm hover:bg-zinc-200 transition-all active:scale-95 shadow-lg shadow-white/10"
            >
              Visit Site <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {/* Status Header */}
          <div className="glass-card p-6 flex items-center justify-between border-white/5">
            <div className="flex items-center gap-4">
              {(status === 'BUILDING' || status === 'QUEUED') && <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />}
              {status === 'READY' && <CheckCircle2 className="w-8 h-8 text-emerald-500" />}
              {status === 'ERROR' && <AlertCircle className="w-8 h-8 text-red-500" />}
              <div>
                <h3 className="font-semibold text-lg tracking-tight">{status}</h3>
                <p className="text-sm text-zinc-500">
                  {status === 'READY' ? 'Deployment is ready for production.' : 'Your project is being prepared...'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-zinc-500">Infrastructure</p>
              <p className="text-lg font-mono text-white">Render PaaS</p>
            </div>
          </div>

          {/* Build Info Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-4 border-white/5">
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2 flex items-center gap-2">
                <Settings className="w-3 h-3" /> Build Command
              </p>
              <p className="font-mono text-xs bg-black/40 p-2 rounded border border-white/5 text-zinc-300">
                {deployment?.project?.buildCommand || 'npm run build'}
              </p>
            </div>
            <div className="glass-card p-4 border-white/5">
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2 flex items-center gap-2">
                <Folder className="w-3 h-3" /> Root Directory
              </p>
              <p className="font-mono text-xs bg-black/40 p-2 rounded border border-white/5 text-zinc-300">
                {deployment?.project?.rootDirectory || './'}
              </p>
            </div>
          </div>

          {/* Logs Terminal */}
          <div className="bg-black/50 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden flex flex-col h-[500px] shadow-2xl">
            <div className="bg-white/5 px-4 py-3 flex items-center gap-2 border-b border-white/5">
              <Terminal className="w-4 h-4 text-zinc-500" />
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Build Logs</span>
            </div>
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 font-mono text-sm space-y-2 selection:bg-white/20 scrollbar-thin scrollbar-thumb-white/10"
            >
              {logs.length === 0 && (
                <div className="flex items-center gap-2 text-zinc-600 italic">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Connecting to build stream...
                </div>
              )}
              {logs.map((log) => (
                <div key={log.id} className="flex gap-4 group hover:bg-white/5 rounded px-2 -mx-2 transition-colors py-0.5">
                  <span className="text-zinc-700 select-none w-20 shrink-0 text-xs mt-0.5">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className={cn(
                    "flex-1 break-all",
                    log.level === 'error' ? 'text-red-400' : 
                    log.level === 'warn' ? 'text-amber-400' : 'text-zinc-300'
                  )}>
                    {log.content}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 space-y-6 border-white/5">
            <h3 className="font-semibold text-sm uppercase tracking-widest text-zinc-500 border-b border-white/5 pb-4">Deployment Metadata</h3>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2">Branch</p>
                <div className="flex items-center gap-2 text-sm text-white font-medium">
                  <GitBranch className="w-4 h-4 text-zinc-500" /> {deployment?.project?.branch || 'main'}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2">Repository URL</p>
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 break-all bg-white/5 p-2 rounded">
                  {deployment?.project?.repoUrl || 'Fetching...'}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2">Environment</p>
                <span className="inline-flex text-sm bg-blue-500/10 text-blue-400 px-2 py-1 rounded text-[10px] font-bold border border-blue-500/20 uppercase tracking-widest">
                  Production
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
