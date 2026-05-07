"use client";

import { useState } from 'react';
import { 
  Save, 
  Plus, 
  Trash2, 
  Lock, 
  Eye, 
  EyeOff,
  Upload,
  AlertCircle
} from 'lucide-react';

interface EnvVar {
  id: string;
  key: string;
  value: string;
  target: string;
  isLocked: boolean;
}

export default function SettingsPage() {
  const [envVars, setEnvVars] = useState<EnvVar[]>([
    { id: '1', key: 'DATABASE_URL', value: 'postgresql://...', target: 'production', isLocked: true },
    { id: '2', key: 'NEXT_PUBLIC_ANALYTICS_ID', value: 'ua-12345', target: 'production', isLocked: false },
  ]);

  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  const toggleValue = (id: string) => {
    setShowValues(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = () => {
    alert('Changes saved successfully! Your project configuration has been updated.');
  };

  const handleBulkImport = () => {
    alert('Bulk import started. Please select your .env file.');
  };

  const addEnvVar = () => {
    const newId = (envVars.length + 1).toString();
    setEnvVars([...envVars, { id: newId, key: 'NEW_VARIABLE', value: '', target: 'production', isLocked: false }]);
  };

  return (
    <div className="space-y-10 max-w-4xl animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Project Settings</h1>
        <p className="text-zinc-500">Configure your project environment and behavior.</p>
      </div>

      {/* General Settings */}
      <section className="glass-card p-8 space-y-6">
        <h2 className="text-xl font-semibold">General</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Project Name</label>
            <input 
              type="text" 
              defaultValue="ecommerce-frontend"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-white/20 outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Framework Preset</label>
            <select className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 outline-none">
              <option>Next.js</option>
              <option>React</option>
              <option>Vue.js</option>
              <option>Tailwind CSS</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Root Directory</label>
            <input 
              type="text" 
              placeholder="./"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Node.js Version</label>
            <input 
              type="text" 
              defaultValue="20.x"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 outline-none"
            />
          </div>
        </div>
        <div className="pt-4 border-t border-white/5 flex justify-end">
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 bg-white text-black px-6 py-2 rounded-lg font-bold hover:bg-zinc-200 transition-all"
          >
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </section>

      {/* Environment Variables */}
      <section className="glass-card p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Environment Variables</h2>
            <p className="text-sm text-zinc-500 mt-1">Variables defined here will be available during build and runtime.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleBulkImport}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm border border-white/10 transition-all"
            >
              <Upload className="w-4 h-4" /> Bulk Import
            </button>
            <button 
              onClick={addEnvVar}
              className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg font-bold text-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Add Variable
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {envVars.map((v) => (
            <div key={v.id} className="flex items-center gap-3 bg-black/40 border border-white/5 p-3 rounded-lg group">
              <div className="flex-1 font-mono text-sm">{v.key}</div>
              <div className="flex-[2] flex items-center gap-2">
                <input 
                  type={showValues[v.id] ? "text" : "password"} 
                  value={v.value} 
                  readOnly 
                  className="bg-transparent border-none outline-none font-mono text-sm text-zinc-400 flex-1"
                />
                <button 
                  onClick={() => toggleValue(v.id)}
                  className="p-1.5 hover:bg-white/5 rounded text-zinc-500 hover:text-white transition-colors"
                >
                  {showValues[v.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="w-24 text-xs font-bold uppercase text-zinc-500">{v.target}</div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors">
                  <Lock className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-red-500/10 rounded text-zinc-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-500">Security Note</p>
            <p className="text-amber-500/80">Environment variables are encrypted at rest using AES-256 and are only decrypted during the build process.</p>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="glass-card p-8 border-red-500/20">
        <h2 className="text-xl font-semibold text-red-500 mb-4">Danger Zone</h2>
        <div className="p-6 border border-red-500/20 bg-red-500/5 rounded-xl flex items-center justify-between">
          <div>
            <h3 className="font-bold">Delete Project</h3>
            <p className="text-sm text-zinc-500">The project will be permanently deleted, including all deployments and settings.</p>
          </div>
          <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg shadow-red-600/20">
            Delete Project
          </button>
        </div>
      </section>
    </div>
  );
}
