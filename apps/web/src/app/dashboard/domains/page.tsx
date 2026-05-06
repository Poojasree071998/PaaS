"use client";

import { useState } from 'react';
import { 
  Plus, 
  Globe, 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  MoreVertical,
  Search
} from 'lucide-react';

const domains = [
  {
    id: '1',
    hostname: 'deployflow.app',
    project: 'deployflow-marketing',
    status: 'Active',
    ssl: 'Valid',
    type: 'Primary',
    createdAt: '2 months ago'
  },
  {
    id: '2',
    hostname: 'api.deployflow.app',
    project: 'deployflow-api',
    status: 'Active',
    ssl: 'Valid',
    type: 'Alias',
    createdAt: '2 months ago'
  },
  {
    id: '3',
    hostname: 'shop.demo.com',
    project: 'ecommerce-frontend',
    status: 'Pending',
    ssl: 'Checking',
    type: 'Custom',
    createdAt: '1 hour ago'
  }
];

export default function DomainsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Domains</h1>
          <p className="text-zinc-500">Manage custom domains and SSL certificates</p>
        </div>
        <button className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg font-semibold text-sm hover:bg-zinc-200 transition-colors">
          <Plus className="w-4 h-4" />
          Add Domain
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Filter domains..." 
            className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-6 py-4 font-medium">Domain</th>
                <th className="px-6 py-4 font-medium">Project</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">SSL</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {domains.map((domain) => (
                <tr key={domain.id} className="group hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Globe className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <div className="font-medium text-white flex items-center gap-2">
                          {domain.hostname}
                          {domain.type === 'Primary' && (
                            <span className="text-[10px] bg-white/10 text-zinc-400 px-1.5 py-0.5 rounded uppercase font-bold">Primary</span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500">{domain.createdAt}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-zinc-300">{domain.project}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {domain.status === 'Active' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-sm text-emerald-500">Active</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-sm text-amber-500">Pending</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Shield className={`w-3.5 h-3.5 ${domain.ssl === 'Valid' ? 'text-blue-400' : 'text-zinc-500'}`} />
                      <span className="text-sm text-zinc-300">{domain.ssl}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
