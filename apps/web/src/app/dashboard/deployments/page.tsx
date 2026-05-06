"use client";

import { 
  Activity, 
  GitBranch, 
  Clock, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Timer,
  Search,
  Filter
} from 'lucide-react';
import Link from 'next/link';

const deployments = [
  {
    id: 'd123456',
    project: 'deployflow-api',
    branch: 'main',
    commit: 'feat: add websocket logging',
    status: 'Ready',
    time: '2m ago',
    duration: '45s',
    env: 'Production'
  },
  {
    id: 'd123457',
    project: 'ecommerce-frontend',
    branch: 'production',
    commit: 'fix: checkout bug',
    status: 'Ready',
    time: '15m ago',
    duration: '1m 20s',
    env: 'Production'
  },
  {
    id: 'd123458',
    project: 'marketing-site',
    branch: 'feat/new-landing',
    commit: 'chore: update hero assets',
    status: 'Error',
    time: '1h ago',
    duration: '2m 10s',
    env: 'Preview'
  },
  {
    id: 'd123459',
    project: 'deployflow-api',
    branch: 'main',
    commit: 'initial commit',
    status: 'Ready',
    time: '3h ago',
    duration: '30s',
    env: 'Production'
  }
];

export default function DeploymentsPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Deployments</h1>
          <p className="text-zinc-500">History of all deployments across your projects</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Filter deployments..." 
            className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
          />
        </div>
        <button className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors">
          <Filter className="w-4 h-4 text-zinc-500" />
          Filter
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-6 py-4 font-medium">Deployment</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Environment</th>
                <th className="px-6 py-4 font-medium">Duration</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {deployments.map((deployment) => (
                <tr key={deployment.id} className="group hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{deployment.project}</span>
                        <span className="text-xs text-zinc-500 font-mono">{deployment.id}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <GitBranch className="w-3 h-3 text-zinc-500" />
                        <span className="text-xs text-zinc-400">{deployment.branch}</span>
                        <span className="text-[10px] text-zinc-600 truncate max-w-[200px]">"{deployment.commit}"</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {deployment.status === 'Ready' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          <span className="text-sm text-emerald-500 font-medium">Ready</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                          <span className="text-sm text-red-500 font-medium">Error</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold uppercase tracking-widest bg-white/5 px-2 py-1 rounded border border-white/5 text-zinc-400">
                      {deployment.env}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Timer className="w-3.5 h-3.5" />
                      <span className="text-xs">{deployment.duration}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-1">
                      <Clock className="w-3 h-3" />
                      {deployment.time}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link 
                        href={`/dashboard/deployments/${deployment.id}`}
                        className="text-xs bg-white text-black px-3 py-1.5 rounded font-bold hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5 active:scale-95 transition-transform"
                      >
                        Details
                      </Link>
                      <a 
                        href={`https://${deployment.project}.deployflow.app`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white active:scale-95 transition-transform"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
