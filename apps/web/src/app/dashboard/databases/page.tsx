"use client";

import { 
  Database, 
  Plus, 
  MoreVertical, 
  HardDrive, 
  Cpu, 
  Activity,
  CheckCircle2,
  Lock
} from 'lucide-react';

const databases = [
  {
    id: '1',
    name: 'main-postgres',
    type: 'PostgreSQL',
    version: '16.2',
    status: 'Active',
    usage: '1.2 GB / 5 GB',
    project: 'deployflow-api',
    region: 'us-east-1'
  },
  {
    id: '2',
    name: 'cache-redis',
    type: 'Redis',
    version: '7.2',
    status: 'Active',
    usage: '256 MB / 1 GB',
    project: 'deployflow-api',
    region: 'us-east-1'
  }
];

export default function DatabasesPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Databases</h1>
          <p className="text-zinc-500">Managed high-performance databases</p>
        </div>
        <button 
          onClick={() => alert('Database creation initiated! Our managed service is provisioning your new instance.')}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg font-semibold text-sm hover:bg-zinc-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Database
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {databases.map((db) => (
          <div key={db.id} className="glass-card p-6 group hover:border-white/20 transition-all cursor-pointer relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-500 hover:text-white">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Database className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{db.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 font-medium uppercase tracking-tighter bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                    {db.type} {db.version}
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-emerald-500 font-bold uppercase">{db.status}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-6 mt-auto">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-zinc-500">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Storage</span>
                </div>
                <div className="text-sm font-medium text-white">{db.usage.split(' / ')[0]}</div>
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full w-[24%]" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-zinc-500">
                  <Cpu className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">CPU Usage</span>
                </div>
                <div className="text-sm font-medium text-white">4%</div>
              </div>
              <div className="space-y-1 text-right">
                <div className="flex items-center gap-1.5 text-zinc-500 justify-end">
                  <Activity className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Project</span>
                </div>
                <div className="text-sm font-medium text-white truncate">{db.project}</div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Lock className="w-3 h-3" />
                Connection Encrypted
              </div>
              <button className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors">
                View Credentials
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
