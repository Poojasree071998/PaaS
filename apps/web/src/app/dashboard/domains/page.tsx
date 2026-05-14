"use client";

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Globe, 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  MoreVertical,
  Search,
  Loader2,
  Trash2,
  X,
  AlertTriangle,
  ChevronDown,
  ShieldCheck
} from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

export default function DomainsPage() {
  const [domains, setDomains] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // New domain form state
  const [newHostname, setNewHostname] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [provisioningId, setProvisioningId] = useState<string | null>(null);
  const [selectedDomainForDns, setSelectedDomainForDns] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [domainsRes, projectsRes] = await Promise.all([
        fetch(`${getApiUrl()}/api/domains`),
        fetch(`${getApiUrl()}/api/projects`)
      ]);

      
      const domainsData = await domainsRes.json();
      const projectsData = await projectsRes.json();

      if (domainsData.success) setDomains(domainsData.data);
      if (projectsData.success) {
        setProjects(projectsData.data);
        if (projectsData.data.length > 0) {
          setSelectedProjectId(projectsData.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHostname || !selectedProjectId) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/domains/${selectedProjectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname: newHostname })
      });
      const data = await res.json();
      if (data.success) {
        setDomains([data.data, ...domains]);
        setIsAddModalOpen(false);
        setNewHostname('');
      } else {
        alert(data.error?.message || 'Failed to add domain');
      }
    } catch (error) {
      alert('Error adding domain');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDomain = async () => {
    if (!deleteConfirmId) return;

    setDeleting(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/domains/${deleteConfirmId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setDomains(domains.filter(d => d.id !== deleteConfirmId));
        setDeleteConfirmId(null);
      }
    } catch (error) {
      alert('Error deleting domain');
    } finally {
      setDeleting(false);
    }
  };

  const handleVerify = async (domainId: string) => {
    setVerifyingId(domainId);
    try {
      const res = await fetch(`${getApiUrl()}/api/domains/${domainId}/verify`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success && data.verified) {
        setDomains(domains.map(d => d.id === domainId ? { ...d, verified: true } : d));
        setSelectedDomainForDns(null);
      } else {
        alert('DNS verification failed. Please ensure records are set correctly.');
      }
    } catch (error) {
      alert('Error verifying domain');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleProvisionSSL = async (domainId: string) => {
    setProvisioningId(domainId);
    try {
      const res = await fetch(`${getApiUrl()}/api/domains/${domainId}/ssl`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setDomains(domains.map(d => d.id === domainId ? { ...d, sslStatus: 'ACTIVE' } : d));
      } else {
        alert('Failed to provision SSL certificate.');
      }
    } catch (error) {
      alert('Error provisioning SSL');
    } finally {
      setProvisioningId(null);
    }
  };

  const filteredDomains = domains.filter(d => 
    d.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.project?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 text-white">Domains</h1>
          <p className="text-zinc-500">Manage custom domains and SSL certificates</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg font-semibold text-sm hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5"
        >
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
            className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            <p className="text-sm text-zinc-500">Loading domains...</p>
          </div>
        ) : filteredDomains.length === 0 ? (
          <div className="py-20 text-center">
            <Globe className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 mb-4 font-medium">No domains found.</p>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="text-white hover:underline font-bold text-sm bg-white/5 px-4 py-2 rounded-lg border border-white/5"
            >
              Add your first domain
            </button>
          </div>
        ) : (
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
                {filteredDomains.map((domain) => (
                  <tr key={domain.id} className="group hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Globe className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                          <div className="font-medium text-white flex items-center gap-2">
                            {domain.hostname}
                            {domain.isPrimary && (
                              <span className="text-[10px] bg-white/10 text-zinc-400 px-1.5 py-0.5 rounded uppercase font-bold">Primary</span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {domain.createdAt ? formatDistanceToNow(new Date(domain.createdAt), { addSuffix: true }) : 'Just now'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-zinc-300">{domain.project?.name || 'Unknown'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {domain.verified ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-sm text-emerald-500">Active</span>
                          </>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                              <span className="text-sm text-amber-500">Pending</span>
                            </div>
                            <button 
                              onClick={() => setSelectedDomainForDns(domain)}
                              className="text-[10px] text-blue-400 hover:underline text-left font-bold uppercase tracking-tighter"
                            >
                              View DNS Settings
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Shield className={`w-3.5 h-3.5 ${domain.sslStatus === 'ACTIVE' ? 'text-blue-400' : 'text-zinc-500'}`} />
                        <span className="text-sm text-zinc-300">{domain.sslStatus}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {domain.verified && domain.sslStatus !== 'ACTIVE' && (
                          <button 
                            onClick={() => handleProvisionSSL(domain.id)}
                            disabled={provisioningId === domain.id}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg text-xs font-bold transition-all border border-blue-500/20 group-hover:scale-105 active:scale-95"
                          >
                            {provisioningId === domain.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <ShieldCheck className="w-3 h-3" />
                            )}
                            Provision SSL
                          </button>
                        )}
                        <a 
                          href={`${getApiUrl()}?__df_host=${domain.hostname}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-xs font-bold transition-all border border-emerald-500/20 group-hover:scale-105 active:scale-95"
                          title="Test this domain locally"
                        >
                          <Globe className="w-3 h-3" />
                          Local Preview
                        </a>
                        <a 
                          href={`https://${domain.hostname}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
                          title="Visit live domain"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button 
                          onClick={() => setDeleteConfirmId(domain.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-zinc-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Domain Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Add Custom Domain</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddDomain} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Hostname</label>
                <input 
                  type="text" 
                  placeholder="example.com" 
                  required
                  value={newHostname}
                  onChange={(e) => setNewHostname(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-white/20 transition-all text-white placeholder:text-zinc-700 font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Target Project</label>
                <div className="relative">
                  <select 
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-white/20 transition-all text-white appearance-none cursor-pointer font-medium hover:bg-white/10"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id} className="bg-[#18181b] text-white">
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none transition-transform group-focus-within:rotate-180" />
                </div>
              </div>

              <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-400/80 leading-relaxed">
                  After adding the domain, you will need to configure your DNS records to point to our servers. We will provide the specific values once the domain is registered.
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-white/10 font-bold text-sm text-zinc-400 hover:bg-white/5 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting || projects.length === 0}
                  className="flex-1 bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-all shadow-lg shadow-white/10 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Domain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-red-500/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">Remove Domain?</h2>
                <p className="text-zinc-500 text-sm">
                  This will stop routing traffic for this domain. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-4 py-3 rounded-xl border border-white/10 font-bold text-sm text-zinc-400 hover:bg-white/5 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteDomain}
                  disabled={deleting}
                  className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/10 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DNS Instructions Modal */}
      {selectedDomainForDns && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h2 className="text-2xl font-bold text-white">DNS Configuration</h2>
                <p className="text-zinc-500 text-sm mt-1">Configure your domain to point to DeployFlow</p>
              </div>
              <button onClick={() => setSelectedDomainForDns(null)} className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">Add the following records to your DNS provider (Cloudflare, GoDaddy, etc.) to verify ownership and route traffic.</p>
                
                <div className="space-y-3">
                  <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">TXT Record (Verification)</span>
                      <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-bold">Required</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm font-mono">
                      <div className="col-span-1 text-zinc-500">Host</div>
                      <div className="col-span-2 text-white">_deployflow-challenge</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm font-mono">
                      <div className="col-span-1 text-zinc-500">Value</div>
                      <div className="col-span-2 text-blue-400 break-all">{selectedDomainForDns.verificationToken}</div>
                    </div>
                  </div>

                  <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">A Record (Traffic)</span>
                      <span className="text-[10px] bg-white/10 text-zinc-500 px-2 py-0.5 rounded-full font-bold">Recommended</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm font-mono">
                      <div className="col-span-1 text-zinc-500">Host</div>
                      <div className="col-span-2 text-white">@</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm font-mono">
                      <div className="col-span-1 text-zinc-500">Value</div>
                      <div className="col-span-2 text-white">76.76.21.21 <span className="text-[10px] text-zinc-600 font-sans italic ml-2">(DeployFlow IP)</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => handleVerify(selectedDomainForDns.id)}
                  disabled={verifyingId === selectedDomainForDns.id}
                  className="flex-[2] bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {verifyingId === selectedDomainForDns.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      Verify DNS Records
                    </>
                  )}
                </button>
                <button 
                  onClick={() => setSelectedDomainForDns(null)}
                  className="flex-1 border border-white/10 font-bold py-4 rounded-2xl hover:bg-white/5 transition-all text-zinc-400 hover:text-white"
                >
                  Close
                </button>
              </div>

              <p className="text-center text-[10px] text-zinc-600 uppercase font-bold tracking-widest">
                DNS propagation can take up to 24 hours but usually takes a few minutes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
