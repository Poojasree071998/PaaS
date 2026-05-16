"use client";

import { useState, useEffect } from 'react';
import { 
  Database, 
  Plus, 
  MoreVertical, 
  HardDrive, 
  Cpu, 
  Activity,
  CheckCircle2,
  Lock,
  Copy,
  Check,
  Loader2,
  Trash2,
  X
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface ManagedDatabase {
  id: string;
  name: string;
  type: string;
  version: string;
  status: string;
  connectionString: string;
  dbName: string;
  project?: { name: string };
}

export default function DatabasesPage() {
  const [databases, setDatabases] = useState<ManagedDatabase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('POSTGRES');
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchDatabases();
  }, []);

  const fetchDatabases = async () => {
    try {
      const data = await apiFetch('/api/databases?teamId=default'); // Simplified teamId
      if (data.success) {
        setDatabases(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch databases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName) return;
    setCreating(true);
    try {
      const data = await apiFetch('/api/databases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newName, 
          type: newType,
          teamId: 'default' 
        }),
      });
      if (data.success) {
        // Force refresh the list
        await fetchDatabases();
        setShowCreate(false);
        setNewName('');
        const errorMsg = data.message || (typeof data.error === 'object' ? (data.error.message || JSON.stringify(data.error)) : data.error) || 'Internal Server Error';
        alert('Creation failed: ' + errorMsg);
      }
    } catch (error: any) {
      alert('Failed to create database: ' + (error.message || 'Check if the API is running.'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this database? All data will be lost.')) return;
    try {
      await apiFetch(`/api/databases/${id}`, { method: 'DELETE' });
      setDatabases(databases.filter(db => db.id !== id));
    } catch (error) {
      alert('Failed to delete database.');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-white/20" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 italic">Managed Databases</h1>
          <p className="text-zinc-500">Deploy high-performance databases in seconds on your own platform.</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-white/5"
        >
          <Plus className="w-4 h-4" />
          Provision Database
        </button>
      </div>

      {databases.length === 0 && !showCreate && (
        <div className="flex flex-col items-center justify-center py-20 glass-card border-dashed">
          <Database className="w-12 h-12 text-zinc-700 mb-4" />
          <p className="text-zinc-500 font-medium">No databases provisioned yet.</p>
          <button 
            onClick={() => setShowCreate(true)}
            className="mt-4 text-emerald-500 hover:text-emerald-400 font-bold text-sm flex items-center gap-2"
          >
            Create your first database <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {databases.map((db) => (
          <div key={db.id} className="glass-card p-6 group hover:border-emerald-500/30 transition-all relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => handleDelete(db.id)}
                className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-zinc-500 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Database className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">{db.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5">
                    {db.type} {db.version}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">Running</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Connection String Section */}
            <div className="space-y-2 mb-6">
              <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Connection URL</label>
              <div className="relative group/conn">
                <div className="bg-black/50 border border-white/5 rounded-xl p-3 font-mono text-[11px] text-emerald-500/80 truncate pr-10">
                  {db.connectionString}
                </div>
                <button 
                  onClick={() => copyToClipboard(db.connectionString, db.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-all"
                >
                  {copiedId === db.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 mt-auto">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-zinc-500">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Database Name</span>
                </div>
                <div className="text-xs font-mono text-zinc-300">{db.dbName}</div>
              </div>
              <div className="space-y-1 text-right">
                <div className="flex items-center gap-1.5 text-zinc-500 justify-end">
                  <Activity className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Attached Project</span>
                </div>
                <div className="text-xs font-medium text-white truncate">{db.project?.name || 'Unassigned'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Provisioning Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !creating && setShowCreate(false)} />
          <div className="relative glass-card p-8 w-full max-w-md space-y-6 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">New Database</h2>
              <button onClick={() => setShowCreate(false)} disabled={creating} className="p-2 hover:bg-white/5 rounded-full">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Database Name</label>
                <input 
                  type="text" 
                  placeholder="my-db-instance"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Database Engine</label>
                <div className="grid grid-cols-2 gap-3">
                  {['POSTGRES', 'REDIS', 'MONGODB'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewType(type)}
                      className={`px-4 py-3 rounded-xl border text-xs font-bold transition-all ${newType === type ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-lg shadow-emerald-500/10' : 'bg-white/5 border-white/10 text-zinc-500 hover:border-white/20'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={handleCreate}
              disabled={creating || !newName}
              className="w-full bg-white text-black py-3.5 rounded-xl font-bold hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              {creating ? 'Provisioning...' : 'Provision Database'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

