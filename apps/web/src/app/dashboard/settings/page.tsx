"use client";

import { useState, useEffect } from 'react';
import { 
  Save, 
  Plus, 
  Trash2, 
  Lock, 
  Eye, 
  EyeOff,
  Upload,
  AlertCircle,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { getApiUrl } from '@/lib/api';

interface EnvVar {
  id?: string;
  key: string;
  value: string;
  environment: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  framework: string;
  nodeVersion: string;
  rootDirectory: string;
  envVars: EnvVar[];
}

export default function SettingsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [showValues, setShowValues] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/projects`);
      const data = await res.json();
      if (data.success) {
        setProjects(data.data);
        if (data.data.length > 0) {
          setSelectedProjectId(data.data[0].id);
          fetchProjectSettings(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectSettings = async (id: string) => {
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/projects/${id}`);
      const data = await res.json();
      if (data.success) {
        setEnvVars(data.data.envVars || []);
      }
    } catch (error) {
      console.error('Failed to fetch project settings:', error);
    }
  };

  const handleProjectChange = (id: string) => {
    setSelectedProjectId(id);
    fetchProjectSettings(id);
  };

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '', environment: 'ALL' }]);
  };

  const updateEnvVar = (index: number, field: keyof EnvVar, value: string) => {
    const updated = [...envVars];
    updated[index] = { ...updated[index], [field]: value };
    setEnvVars(updated);
  };

  const removeEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedProjectId) return;
    setSaving(true);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/projects/${selectedProjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ envVars }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Settings saved! Your next deployment will use these variables.');
      }
    } catch (error) {
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-white/20" />
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-4xl animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Project Settings</h1>
          <p className="text-zinc-500">Configure your project environment and behavior.</p>
        </div>
        
        {/* Project Selector */}
        <div className="relative group">
          <select 
            value={selectedProjectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="appearance-none bg-white/5 border border-white/10 rounded-lg px-4 py-2 pr-10 outline-none hover:bg-white/10 transition-all cursor-pointer text-sm font-semibold"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        </div>
      </div>

      {/* Environment Variables */}
      <section className="glass-card p-8 space-y-6 border-l-4 border-emerald-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              Environment Variables
              <span className="text-[10px] bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20">Active</span>
            </h2>
            <p className="text-sm text-zinc-500 mt-1">Add your MongoDB URIs, API keys, and other secrets here.</p>
          </div>
          <button 
            onClick={addEnvVar}
            className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-zinc-200 transition-all shadow-lg shadow-white/5"
          >
            <Plus className="w-4 h-4" /> Add Variable
          </button>
        </div>

        <div className="space-y-3">
          {envVars.length === 0 && (
            <div className="text-center p-10 border border-dashed border-white/10 rounded-xl text-zinc-500 text-sm italic">
              No environment variables defined yet.
            </div>
          )}
          {envVars.map((v, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/5 p-3 rounded-xl group hover:border-white/20 transition-all">
              <input 
                placeholder="KEY (e.g. MONGODB_URI)"
                value={v.key}
                onChange={(e) => updateEnvVar(i, 'key', e.target.value)}
                className="flex-1 bg-transparent border-none outline-none font-mono text-sm placeholder:text-zinc-700"
              />
              <div className="flex-[2] flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                <input 
                  type={showValues[i] ? "text" : "password"} 
                  value={v.value} 
                  placeholder="VALUE"
                  onChange={(e) => updateEnvVar(i, 'value', e.target.value)}
                  className="bg-transparent border-none outline-none font-mono text-sm text-emerald-500 flex-1 placeholder:text-emerald-900"
                />
                <button 
                  onClick={() => setShowValues(prev => ({ ...prev, [i]: !prev[i] }))}
                  className="p-1 text-zinc-500 hover:text-white transition-colors"
                >
                  {showValues[i] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button 
                onClick={() => removeEnvVar(i)}
                className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-600 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-500">Deployment Required</p>
            <p className="text-amber-500/70">Changes to environment variables will take effect after your next deployment.</p>
          </div>
        </div>

        <div className="pt-6 border-t border-white/5 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-white text-black px-8 py-2.5 rounded-lg font-bold hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </div>
      </section>

      {/* Security Note */}
      <section className="glass-card p-6 bg-blue-500/5 border-blue-500/10">
        <div className="flex items-center gap-3 text-blue-400">
          <Lock className="w-5 h-5" />
          <h3 className="font-bold">Security & Encryption</h3>
        </div>
        <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
          Your environment variables are encrypted at rest using AES-256-GCM. They are only decrypted in the build environment during the deployment phase and are injected as standard process environment variables.
        </p>
      </section>
    </div>
  );
}

