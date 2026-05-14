"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { 
  Plus, 
  ExternalLink, 
  GitBranch, 
  Clock,
  ArrowUpRight,
  Search
} from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`${getApiUrl()}/api/projects`);
        const data = await res.json();
        if (data.success) {
          setProjects(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="w-8 h-8 border-4 border-white/5 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Projects</h1>
          <p className="text-zinc-500">Manage and monitor your applications</p>
        </div>
        <Link href="/dashboard/new" className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg font-semibold text-sm hover:bg-zinc-200 transition-colors">
          <Plus className="w-4 h-4" />
          Create New
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search projects..." 
            className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length === 0 ? (
          <div className="col-span-full py-20 text-center glass-card border-dashed">
            <p className="text-zinc-500 mb-4">No projects found. Create your first one to get started!</p>
            <Link href="/dashboard/new" className="text-white hover:underline font-bold">Start Deploying &rarr;</Link>
          </div>
        ) : (
          projects.map((project) => {
            const latestDeploy = project.deployments?.[0];
            const liveUrl = latestDeploy?.url;
            const status = latestDeploy?.status || 'INACTIVE';

            return (
              <div key={project.id} className="glass-card p-6 group hover:border-white/20 transition-all cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                      {project.name[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold group-hover:text-white transition-colors">{project.name}</h3>
                      {liveUrl ? (
                        <a 
                          href={liveUrl} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-500 flex items-center gap-1 hover:text-emerald-400 transition-colors"
                        >
                          Visit Site <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-600">Not deployed yet</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      status === 'READY' ? 'bg-emerald-500/10 text-emerald-500' : 
                      status === 'BUILDING' ? 'bg-amber-500/10 text-amber-500 animate-pulse' : 
                      'bg-white/5 text-zinc-500'
                    }`}>
                      {status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-zinc-400 mt-8">
                  <div className="flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5" />
                    {project.repoBranch}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {latestDeploy ? formatDistanceToNow(new Date(latestDeploy.createdAt), { addSuffix: true }) : 'N/A'}
                  </div>
                  <div className="ml-auto">
                    <span className="bg-white/5 px-2 py-1 rounded border border-white/5 uppercase tracking-tighter">
                      {project.framework}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        <Link href="/dashboard/new" className="border-2 border-dashed border-white/5 rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:border-white/10 transition-colors cursor-pointer group">
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6 text-zinc-400" />
          </div>
          <span className="text-sm font-medium text-zinc-400">Add another project</span>
        </Link>
      </div>
    </div>
  );
}
