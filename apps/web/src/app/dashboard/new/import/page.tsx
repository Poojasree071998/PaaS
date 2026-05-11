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
import { getApiUrl } from '@/lib/api';
import { useState } from 'react';

export default function ImportProjectPage() {
  const [url, setUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [rootDirectory, setRootDirectory] = useState('./');
  const [buildCommand, setBuildCommand] = useState('npm run build');
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [envVars, setEnvVars] = useState([{ key: '', value: '' }]);
  const router = useRouter();

  const linkDatabase = async () => {
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/databases?teamId=default`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        const db = data.data[0];
        const key = db.type === 'MONGODB' ? 'MONGODB_URI' : 'DATABASE_URL';
        setEnvVars([{ key, value: db.connectionString }, ...envVars.filter(v => v.key !== key && v.key !== '')]);
      } else {
        alert('No managed databases found. Create one in the Databases tab first!');
      }
    } catch (e) {
      alert('Failed to fetch databases.');
    }
  };

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const updateEnvVar = (index: number, field: 'key' | 'value', value: string) => {
    const newVars = [...envVars];
    newVars[index][field] = value;
    setEnvVars(newVars);
  };

  const analyzeUrl = async (repoUrl: string) => {
    if (!repoUrl || !repoUrl.startsWith('https://github.com/')) return;
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/deployments/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl })
      });
      const data = await res.json();
      if (data.success) {
        const analysis = data.data;
        if (analysis.buildCommand) setBuildCommand(analysis.buildCommand);
        if (analysis.rootDirectory) setRootDirectory(analysis.rootDirectory);
        
        // Pre-fill environment variables found in .env or code
        const vars = analysis.requiredEnvVars.map((key: string) => ({
          key,
          value: analysis.detectedEnv[key] || ''
        }));
        if (vars.length > 0) setEnvVars(vars);
      }
    } catch (e) {
      console.warn('Auto-analysis failed:', e);
    }
  };

  const handleDeploy = async () => {
    if (!url) return;
    setLoading(true);
    
    try {
      const apiUrl = getApiUrl();
      console.log('🚀 Triggering deployment at:', `${apiUrl}/api/deployments`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout for Render cold starts and busy builds

      const response = await fetch(`${apiUrl}/api/deployments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          repoUrl: url,
          branch,
          rootDirectory,
          buildCommand,
          envVars: envVars.filter(v => v.key && v.value)
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const data = await response.json();
      
      if (data.success) {
        router.push(`/dashboard/deployments/${data.data.id}`);
      } else {
        alert(`API Error: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Deployment failed:', error);
      if (error.name === 'AbortError') {
        alert('Request timed out. The API might be sleeping or unreachable. Please try again in 30 seconds.');
      } else {
        alert(`Deployment failed: ${error.message}. Please check if the API is awake at ${getApiUrl()}`);
      }
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
              onChange={(e) => {
                const newUrl = e.target.value;
                setUrl(newUrl);
                // Auto-analyze and trigger if it looks like a valid repo URL
                if (newUrl.startsWith('https://github.com/') && newUrl.split('/').length >= 5 && !loading) {
                  analyzeUrl(newUrl);
                  // Small delay to allow user to finish typing
                  setTimeout(() => {
                    const btn = document.getElementById('deploy-btn');
                    if (btn && !btn.hasAttribute('disabled')) btn.click();
                  }, 2000);
                }
              }}
              disabled={loading}
            />
          </div>
          <p className="text-xs text-zinc-500 flex items-center gap-2">
            <Zap className="w-3 h-3 text-blue-400" />
            Paste a URL to start your zero-error deployment automatically.
          </p>
        </div>

        {/* All settings are now handled automatically in the background */}
        
        <button 
          id="deploy-btn"
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
