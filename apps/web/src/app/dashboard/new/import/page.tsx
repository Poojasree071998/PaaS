"use client";

import { 
  ArrowRight, 
  ChevronLeft,
  Globe,
  Lock,
  GitBranch,
  Settings,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ImportProjectPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDeploy = async () => {
    if (!url) return;
    setLoading(true);
    
    try {
      // For this demo, we'll use a simplified trigger
      // In a real app, this would create the project first
      const response = await fetch('http://localhost:4000/api/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: url }),
      });
      
      const data = await response.json();
      if (data.success) {
        router.push(`/dashboard/deployments/${data.data.id}`);
      }
    } catch (error) {
      console.error('Deployment failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 py-10">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/new" className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ChevronLeft className="w-5 h-5 text-zinc-400" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import Repository</h1>
          <p className="text-zinc-500">Provide a public repository URL to get started.</p>
        </div>
      </div>

      <div className="glass-card p-8 space-y-8">
        <div className="space-y-4">
          <label className="text-sm font-medium text-zinc-300">Repository URL</label>
          <div className="relative group">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
            <input 
              type="text" 
              placeholder="https://github.com/user/repo" 
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-lg"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
            />
          </div>
          <p className="text-xs text-zinc-500 flex items-center gap-2">
            <Lock className="w-3 h-3" />
            Private repositories require GitHub/GitLab authorization.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
              <GitBranch className="w-3.5 h-3.5" />
              Default Branch
            </div>
            <div className="text-sm font-medium">main</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
              <Settings className="w-3.5 h-3.5" />
              Root Directory
            </div>
            <div className="text-sm font-medium">/ (Root)</div>
          </div>
        </div>

        <button 
          onClick={handleDeploy}
          disabled={loading || !url}
          className="w-full bg-white text-black py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Zap className="w-5 h-5 fill-current" />
              Deploy to Production <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>

      <div className="glass-card p-6 bg-blue-500/5 border-blue-500/20">
        <h3 className="font-semibold text-blue-400 mb-2">How it works</h3>
        <p className="text-sm text-zinc-400 leading-relaxed">
          DeployFlow will automatically detect your framework, install dependencies, and build your project. Once deployed, you'll get a generated URL and can connect your own custom domain.
        </p>
      </div>
    </div>
  );
}
