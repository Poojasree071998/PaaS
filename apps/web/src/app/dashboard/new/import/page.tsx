"use client";

import { 
  ArrowRight, 
  ChevronLeft,
  Globe,
  Lock,
  GitBranch,
  Settings,
  Zap,
  Box,
  Plus,
  Server,
  Database
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export default function ImportProjectPage() {
  const [url, setUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [rootDirectory, setRootDirectory] = useState('./');
  const [buildCommand, setBuildCommand] = useState('npm run build');
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [envVars, setEnvVars] = useState([{ key: '', value: '' }]);
  const [detectedFramework, setDetectedFramework] = useState<string | null>(null);
  const [detectedDb, setDetectedDb] = useState<string | null>(null);
  const router = useRouter();
  
  // --- PERSISTENCE LOGIC ---
  useEffect(() => {
    const saved = localStorage.getItem('df_project_draft');
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.url) setUrl(draft.url);
        if (draft.branch) setBranch(draft.branch);
        if (draft.rootDirectory) setRootDirectory(draft.rootDirectory);
        if (draft.buildCommand) setBuildCommand(draft.buildCommand);
        if (draft.envVars) setEnvVars(draft.envVars);
      } catch (e) { console.error('Draft recovery failed'); }
    }
  }, []);

  useEffect(() => {
    const draft = { url, branch, rootDirectory, buildCommand, envVars };
    localStorage.setItem('df_project_draft', JSON.stringify(draft));
  }, [url, branch, rootDirectory, buildCommand, envVars]);

  const linkDatabase = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/databases?teamId=default`);
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Backend returned non-JSON response. Check if the Render service is awake.`);
      }
      
      if (data.success && data.data.length > 0) {
        const db = data.data[0];
        const key = db.type === 'MONGODB' ? 'MONGODB_URI' : 'DATABASE_URL';
        setEnvVars([{ key, value: db.connectionString }, ...envVars.filter(v => v.key !== key && v.key !== '')]);
      } else {
        alert('No managed databases found. Create one in the Databases tab first!');
      }
    } catch (e: any) {
      alert(`Database Link Failed: ${e.message}`);
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
      const res = await fetch(`${getApiUrl()}/api/deployments/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl })
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.warn('Backend returned non-JSON for analysis:', text.substring(0, 50));
        return;
      }

      if (data.success) {
        const analysis = data.data;
        if (analysis.framework) setDetectedFramework(analysis.framework);
        if (analysis.databaseRequired !== 'NONE') setDetectedDb(analysis.databaseRequired);
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
      const response = await fetch(`${getApiUrl()}/api/deployments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          repoUrl: url,
          branch,
          rootDirectory,
          buildCommand,
          envVars: envVars.filter(v => v.key && v.value)
        })
      });
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        const baseUrl = getApiUrl();
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          throw new Error(`The Render backend (${baseUrl}) returned an HTML page. This usually means the service is waking up or there is a configuration error on the backend. Please try again in 30 seconds.`);
        }
        throw new Error(`Invalid JSON response from backend. Raw response starts with: ${text.substring(0, 100)}`);
      }

      if (data.success) {
        localStorage.removeItem('df_project_draft'); // Clear draft on success
        router.push(`/dashboard/deployments/${data.data.id}`);
      } else {
        alert(`API Error: ${data.error?.message || 'Unknown error'}`);
      }

    } catch (error: any) {
      alert(`Deployment failed: ${error.message}`);
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
          <h1 className="text-3xl font-bold tracking-tight text-white">FIXED - Import Repository (v2.4)</h1>
          <p className="text-zinc-500">Last Build: {new Date().toLocaleTimeString()} - Auto-Pilot Active</p>
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
                if (newUrl.startsWith('https://github.com/') && newUrl.split('/').length >= 5) {
                  analyzeUrl(newUrl);
                }
              }}
              disabled={loading}
            />
          </div>
          
          {(detectedFramework || detectedDb) && (
            <div className="flex flex-wrap gap-2 animate-in zoom-in duration-300">
              {detectedFramework && (
                <div className="flex items-center gap-2 bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 text-xs font-bold uppercase tracking-tighter">
                  <Server className="w-3 h-3" /> Framework: {detectedFramework}
                </div>
              )}
              {detectedDb && (
                <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 text-xs font-bold uppercase tracking-tighter">
                  <Database className="w-3 h-3" /> Auto-Provisioning: {detectedDb}
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-zinc-500 flex items-center gap-2">
            <Zap className="w-3 h-3 text-blue-400" />
            Paste a URL to start your zero-config deployment automatically.
          </p>
        </div>

        <div className="pt-2">
          <button 
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
          >
            <Settings className={cn("w-4 h-4 transition-transform", showAdvanced && "rotate-90")} />
            {showAdvanced ? 'Hide Project Settings' : 'Configure Project Settings (Advanced)'}
          </button>

          {showAdvanced && (
            <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Production Branch</label>
                  <div className="relative group/input">
                    <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within/input:text-blue-400 transition-colors" />
                    <input 
                      type="text" 
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-1 focus:ring-blue-500/50 outline-none transition-all text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Root Directory</label>
                  <div className="relative group/input">
                    <Box className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within/input:text-blue-400 transition-colors" />
                    <input 
                      type="text" 
                      value={rootDirectory}
                      onChange={(e) => setRootDirectory(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-1 focus:ring-blue-500/50 outline-none transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Build Command</label>
                <div className="relative group/input">
                  <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within/input:text-blue-400 transition-colors" />
                  <input 
                    type="text" 
                    value={buildCommand}
                    onChange={(e) => setBuildCommand(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-1 focus:ring-blue-500/50 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Environment Variables</label>
                  <button 
                    onClick={linkDatabase}
                    className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20 hover:bg-blue-500/20 transition-all uppercase font-bold"
                  >
                    Link Managed Database
                  </button>
                </div>
                
                <div className="space-y-3">
                  {envVars.map((v, i) => (
                    <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                      <input 
                        type="text" 
                        placeholder="KEY"
                        value={v.key}
                        onChange={(e) => updateEnvVar(i, 'key', e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500/50 outline-none"
                      />
                      <input 
                        type="text" 
                        placeholder="VALUE"
                        value={v.value}
                        onChange={(e) => updateEnvVar(i, 'value', e.target.value)}
                        className="flex-[2] bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500/50 outline-none"
                      />
                    </div>
                  ))}
                  <button 
                    onClick={addEnvVar}
                    className="w-full py-2 border border-dashed border-white/10 rounded-lg text-zinc-500 hover:text-white hover:border-white/20 transition-all text-xs font-medium flex items-center justify-center gap-2"
                  >
                    <Plus className="w-3 h-3" /> Add Variable
                  </button>
                </div>
              </div>
            </div>
          )}
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
        <div className="text-[10px] text-zinc-600 text-center mt-4 uppercase tracking-widest font-bold">
          Version 2.4 (Endpoint: {getApiUrl()})
        </div>
      </div>

      <div className="glass-card p-6 bg-blue-500/5 border-blue-500/20">
        <h3 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
          <Zap className="w-4 h-4" /> Auto-Pilot Mode
        </h3>
        <p className="text-sm text-zinc-400 leading-relaxed">
          DeployFlow automatically scans your code to detect frameworks and database requirements. If your project needs a database, we'll provision one for you automatically.
        </p>
      </div>
    </div>
  );
}
