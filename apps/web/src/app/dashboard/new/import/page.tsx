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
  const [branch, setBranch] = useState('main');
  const [rootDirectory, setRootDirectory] = useState('./');
  const [loading, setLoading] = useState(false);
  const [envVars, setEnvVars] = useState([{ key: '', value: '' }]);
  const router = useRouter();

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const updateEnvVar = (index: number, field: 'key' | 'value', value: string) => {
    const newVars = [...envVars];
    newVars[index][field] = value;
    setEnvVars(newVars);
  };

  const handleDeploy = async () => {
    if (!url) return;
    setLoading(true);
    
    try {
      let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'deployflow-api';
      
      // 1. Add protocol if missing
      if (!apiUrl.startsWith('http')) {
        apiUrl = `https://${apiUrl}`;
      }

      // 2. Add domain if missing (Render property:host sometimes returns only service name)
      if (!apiUrl.includes('.')) {
        apiUrl = `${apiUrl}.onrender.com`;
      }

      const response = await fetch(`${apiUrl}/api/deployments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          repoUrl: url,
          branch,
          rootDirectory,
          envVars: envVars.filter(v => v.key && v.value)
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        router.push(`/dashboard/deployments/${data.data.id}`);
      }
    } catch (error) {
      console.error('Deployment failed:', error);
      alert(`Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please check if the API is awake at https://deployflow-api.onrender.com`);
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
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 focus-within:border-white/20 transition-colors">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
              <GitBranch className="w-3.5 h-3.5" />
              Default Branch
            </div>
            <input 
              type="text" 
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="bg-transparent border-none p-0 text-sm font-medium text-white focus:ring-0 w-full"
              placeholder="main"
            />
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 focus-within:border-white/20 transition-colors">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
              <Settings className="w-3.5 h-3.5" />
              Root Directory
            </div>
            <input 
              type="text" 
              value={rootDirectory}
              onChange={(e) => setRootDirectory(e.target.value)}
              className="bg-transparent border-none p-0 text-sm font-medium text-white focus:ring-0 w-full"
              placeholder="./"
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <Settings className="w-3.5 h-3.5" />
              Environment Variables
            </h3>
            <button 
              type="button"
              onClick={addEnvVar}
              className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest"
            >
              + Add Variable
            </button>
          </div>
          <div className="space-y-2">
            {envVars.map((v, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <input 
                  type="text" 
                  placeholder="VARIABLE_NAME" 
                  value={v.key}
                  onChange={(e) => updateEnvVar(i, 'key', e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                />
                <input 
                  type="text" 
                  placeholder="value" 
                  value={v.value}
                  onChange={(e) => updateEnvVar(i, 'value', e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-zinc-500 italic">
            Tip: Backend services use these variables to connect to databases and external APIs.
          </p>
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
