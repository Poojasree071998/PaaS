"use client";

import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  ChevronLeft, 
  ExternalLink, 
  GitBranch, 
  Hash, 
  Terminal,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

interface Log {
  id: string;
  content: string;
  level: 'info' | 'warn' | 'error';
  timestamp: string;
}

export default function DeploymentPage({ params }: { params: { id: string } }) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [status, setStatus] = useState('BUILDING');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = io('http://localhost:4000');
    
    socket.emit('subscribe', params.id);

    socket.on('log', (log: Log) => {
      setLogs((prev) => [...prev, log]);
    });

    socket.on('status', (newStatus: string) => {
      setStatus(newStatus);
    });

    return () => {
      socket.disconnect();
    };
  }, [params.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
            <span>Project: ecommerce-frontend</span>
            <span>/</span>
            <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {params.id.substring(0, 8)}</span>
          </div>
          <h1 className="text-2xl font-bold">Manual Deployment</h1>
        </div>
        <div className="ml-auto flex gap-3">
          {status === 'READY' && (
            <button className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg font-semibold text-sm">
              Visit Site <ExternalLink className="w-4 h-4" />
            </button>
          )}
          <button className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg text-sm transition-colors">
            Redeploy
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {/* Status Header */}
          <div className="glass-card p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {status === 'BUILDING' && <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />}
              {status === 'READY' && <CheckCircle2 className="w-8 h-8 text-emerald-500" />}
              {status === 'FAILED' && <AlertCircle className="w-8 h-8 text-red-500" />}
              <div>
                <h3 className="font-semibold text-lg">{status}</h3>
                <p className="text-sm text-zinc-500">
                  {status === 'BUILDING' ? 'Your project is being built...' : 'Deployment is ready for production.'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Duration</p>
              <p className="text-2xl font-mono">01:24</p>
            </div>
          </div>

          {/* Logs Terminal */}
          <div className="bg-zinc-950 rounded-xl border border-white/10 overflow-hidden flex flex-col h-[500px]">
            <div className="bg-zinc-900 px-4 py-2 flex items-center gap-2 border-b border-white/5">
              <Terminal className="w-4 h-4 text-zinc-500" />
              <span className="text-xs font-mono text-zinc-400">Build Logs</span>
            </div>
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1 selection:bg-white/20"
            >
              {logs.length === 0 && (
                <div className="text-zinc-600 italic">Waiting for logs...</div>
              )}
              {logs.map((log) => (
                <div key={log.id} className="flex gap-4 group">
                  <span className="text-zinc-700 select-none w-20 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
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
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-semibold border-b border-white/10 pb-2">Deployment Details</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Branch</p>
                <div className="flex items-center gap-2 text-sm">
                  <GitBranch className="w-4 h-4" /> main
                </div>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Commit</p>
                <div className="flex items-center gap-2 text-sm font-mono text-zinc-300">
                  <Hash className="w-3.5 h-3.5" /> 7f2a1b9
                </div>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Environment</p>
                <span className="text-sm bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded text-[10px] font-bold">PRODUCTION</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
