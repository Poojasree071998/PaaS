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
  const [step, setStep] = useState(1);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  
  // Settings
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('main');
  const [rootDirectory, setRootDirectory] = useState('./');
  const [buildCommand, setBuildCommand] = useState('npm run build');
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);
  
  const router = useRouter();

  const handleAnalyze = async () => {
    if (!url) return;
    setLoading(true);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/deployments/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: url }),
      });
      const data = await res.json();
      if (data.success) {
        setAnalysis(data.data);
        setBuildCommand(data.data.buildCommand);
        setRootDirectory(data.data.rootDirectory);
        // Pre-fill required env vars
        setEnvVars(data.data.requiredEnvVars.map((k: string) => ({ key: k, value: '' })));
        setName(url.split('/').pop() || 'my-project');
        setStep(2);
      } else {
        alert('Analysis failed: ' + data.message);
      }
    } catch (error) {
      alert('Connection failed. Is the API running?');
    } finally {
      setLoading(false);
    }
  };

  const addEnvVar = () => setEnvVars([...envVars, { key: '', value: '' }]);
  const updateEnvVar = (index: number, field: 'key' | 'value', value: string) => {
    const newVars = [...envVars];
    newVars[index][field] = value;
    setEnvVars(newVars);
  };

  const handleDeploy = async () => {
    setLoading(true);
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/deployments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          repoUrl: url,
          name,
          branch,
          rootDirectory,
          buildCommand,
          envVars: envVars.filter(v => v.key && v.value)
        }),
      });
      const data = await response.json();
      if (data.success) {
        router.push(`/dashboard/deployments/${data.data.id}`);
      }
    } catch (error) {
      alert('Deployment failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10 py-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="p-2 hover:bg-white/10 rounded-full">
          <ChevronLeft className="w-5 h-5 text-zinc-400" />
        </button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {step === 1 ? 'Import Repository' : 'Configure Project'}
          </h1>
          <p className="text-zinc-500">
            {step === 1 ? 'Enter your repository URL to begin the analysis.' : 'Review the detected settings and add required secrets.'}
          </p>
        </div>
      </div>

      {step === 1 ? (
        <div className="glass-card p-8 space-y-8 animate-in slide-in-from-right-4 duration-500">
          <div className="space-y-4">
            <label className="text-sm font-medium text-zinc-300">Repository URL</label>
            <div className="relative group">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
              <input 
                type="text" 
                placeholder="https://github.com/user/repo" 
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white focus:ring-2 focus:ring-blue-500/50 transition-all text-lg"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          </div>
          <button 
            onClick={handleAnalyze}
            disabled={loading || !url}
            className="w-full bg-white text-black py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors"
          >
            {loading ? <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" /> : 'Analyze Project'}
          </button>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          {/* Analysis Results Summary */}
          <div className="glass-card p-6 border-blue-500/20 bg-blue-500/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-blue-400 uppercase tracking-widest">Detected Framework</div>
                <div className="text-lg font-bold text-white">{analysis.framework}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-zinc-500 uppercase">Database Detected</div>
              <div className={`text-sm font-bold ${analysis.databaseRequired !== 'NONE' ? 'text-emerald-400' : 'text-zinc-400'}`}>
                {analysis.databaseRequired}
              </div>
            </div>
          </div>

          <div className="glass-card p-8 space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-zinc-500 tracking-widest">Project Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-zinc-500 tracking-widest">Build Command</label>
                <input type="text" value={buildCommand} onChange={e => setBuildCommand(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm" />
              </div>
            </div>

            {/* Environment Variables Guard */}
            <div className="space-y-4 pt-6 border-t border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white">Environment Variables</h3>
                <button onClick={addEnvVar} className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase">+ Add New</button>
              </div>
              
              {envVars.length > 0 ? (
                <div className="space-y-3">
                  {envVars.map((v, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex-1 relative">
                        <input 
                          type="text" 
                          value={v.key} 
                          onChange={e => updateEnvVar(i, 'key', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm font-mono text-zinc-300 focus:border-blue-500/50"
                          placeholder="VARIABLE_NAME"
                        />
                        {analysis.requiredEnvVars.includes(v.key) && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-amber-500 uppercase bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Required</span>
                        )}
                      </div>
                      <input 
                        type="text" 
                        value={v.value} 
                        onChange={e => updateEnvVar(i, 'value', e.target.value)}
                        className="flex-[1.5] bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-blue-500/50"
                        placeholder="value"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">No variables required for this project.</p>
              )}
            </div>

            <button 
              onClick={handleDeploy}
              disabled={loading || envVars.some(v => analysis.requiredEnvVars.includes(v.key) && !v.value)}
              className="w-full bg-white text-black py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {loading ? <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" /> : 'Trigger Deployment'}
            </button>
            
            {envVars.some(v => analysis.requiredEnvVars.includes(v.key) && !v.value) && (
              <p className="text-center text-xs text-amber-500 font-medium">⚠️ Please provide all required environment variables to continue.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

