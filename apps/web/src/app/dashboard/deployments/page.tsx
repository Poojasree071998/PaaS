"use client";

import React, { useEffect, useState } from 'react';
import { 
  Activity, 
  GitBranch, 
  Clock, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Timer,
  Search,
  Filter,
  Loader2,
  Trash2
} from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import Link from 'next/link';

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeployments = async () => {
      try {
        const response = await fetch(`https://paas-k7nx.onrender.com/api/deployments`);
        
        const data = await response.json();
        if (data.success) {
          setDeployments(data.data);
        }
      } catch (error: any) {
        console.error('Failed to fetch deployments:', error);
        if (error.name === 'AbortError') {
          console.warn('Deployment fetch timed out');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDeployments();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-zinc-500 animate-spin" />
        <p className="text-zinc-500 font-medium">Loading your deployments...</p>
      </div>
    );
  }

    const handleDelete = async (id: string) => {
      if (!window.confirm('Are you sure you want to delete this deployment? This action cannot be undone.')) return;
      
      try {
        const response = await fetch(`https://paas-k7nx.onrender.com/api/deployments/${id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          setDeployments(prev => prev.filter(d => d.id !== id));
        }
      } catch (error) {
        console.error('Failed to delete deployment:', error);
        alert('Failed to delete deployment. Please try again.');
      }
    };

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
                  <th className="px-6 py-4 font-medium">Time</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {deployments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <p className="text-zinc-500">No deployments found yet.</p>
                      <Link href="/dashboard/new" className="text-blue-400 hover:underline mt-2 inline-block">
                        Start your first deployment →
                      </Link>
                    </td>
                  </tr>
                ) : (
                  deployments.map((deployment) => (
                    <tr key={deployment.id} className="group hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{deployment.project?.name || 'Project'}</span>
                            <span className="text-xs text-zinc-500 font-mono">{deployment.id.substring(0, 8)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <GitBranch className="w-3 h-3 text-zinc-500" />
                            <span className="text-xs text-zinc-400">{deployment.branch}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {deployment.status === 'READY' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                              <span className="text-sm text-emerald-500 font-medium">Ready</span>
                            </>
                          ) : deployment.status === 'ERROR' ? (
                            <>
                              <AlertCircle className="w-3.5 h-3.5 text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                              <span className="text-sm text-red-500 font-medium">Error</span>
                            </>
                          ) : (
                            <>
                              <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                              <span className="text-sm text-blue-500 font-medium capitalize">{deployment.status.toLowerCase()}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold uppercase tracking-widest bg-white/5 px-2 py-1 rounded border border-white/5 text-zinc-400">
                          Production
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(deployment.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link 
                            href={`/dashboard/deployments/${deployment.id}`}
                            className="text-xs bg-white text-black px-3 py-1.5 rounded font-bold hover:bg-zinc-200 transition-all active:scale-95 shadow-lg shadow-white/5"
                          >
                            Details
                          </Link>
                          {deployment.url && (
                            <a 
                              href={deployment.url.startsWith('/') ? `${window.location.origin}${deployment.url}` : deployment.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button 
                            onClick={() => handleDelete(deployment.id)}
                            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-zinc-500 hover:text-red-400"
                            title="Delete Deployment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
}
