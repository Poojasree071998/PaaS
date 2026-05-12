"use client";

import { useState } from 'react';
import { 
  CreditCard, 
  ArrowUpRight, 
  Download, 
  Check, 
  Zap,
  ShieldCheck,
  History,
  X,
  Globe,
  Server,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const invoices = [
  { id: 'INV-2026-001', date: 'May 1, 2026', amount: '$49.00', status: 'Paid' },
  { id: 'INV-2026-002', date: 'Apr 1, 2026', amount: '$49.00', status: 'Paid' },
  { id: 'INV-2026-003', date: 'Mar 1, 2026', amount: '$49.00', status: 'Paid' },
];

export default function BillingPage() {
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'enterprise'>('enterprise');
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [successState, setSuccessState] = useState<'none' | 'sales' | 'redirect' | 'cancelled' | 'invoice_all'>('none');

  const handleAction = async (type: 'upgrade' | 'sales' | 'cancel') => {
    setIsProcessing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessing(false);
    
    if (type === 'upgrade') setSuccessState('redirect');
    if (type === 'sales') setSuccessState('sales');
    if (type === 'cancel') setSuccessState('cancelled');

    // Reset success state after a few seconds
    setTimeout(() => {
      setSuccessState('none');
      setIsUpgradeModalOpen(false);
      setIsCancelModalOpen(false);
    }, 3000);
  };

  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate a real browser download
    const element = document.createElement("a");
    const file = new Blob([`Invoice Data for ${id}\nDate: ${new Date().toLocaleDateString()}\nStatus: Paid\nAmount: $49.00`], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    setDownloadingId(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ... existing billing content ... */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Billing</h1>
        <p className="text-zinc-500">Manage your subscription and billing details</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Current Plan */}
          <div className="glass-card p-8 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10">
            <div className="flex items-start justify-between mb-8">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">Current Plan</div>
                <h2 className="text-4xl font-bold">Pro Plan</h2>
                <p className="text-zinc-400 mt-2">Unlimited projects, advanced scaling, and 24/7 support.</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">$49</div>
                <div className="text-xs text-zinc-500 font-medium">per month</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {[
                'Unlimited deployments',
                'Custom domains with SSL',
                'Advanced analytics',
                'Priority support',
                'Automated backups',
                'Team collaboration'
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm text-zinc-300">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Check className="w-3 h-3 text-emerald-500" />
                  </div>
                  {feature}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 pt-6 border-t border-white/10">
              <button 
                onClick={() => setIsUpgradeModalOpen(true)}
                className="bg-white text-black px-6 py-2 rounded-lg font-semibold text-sm hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5"
              >
                Upgrade Plan
              </button>
              <button 
                onClick={() => setIsCancelModalOpen(true)}
                className="text-zinc-400 hover:text-white transition-colors text-sm font-medium"
              >
                Cancel Subscription
              </button>
            </div>
          </div>

          {/* Payment Method */}
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-zinc-400" />
              Payment Method
            </h3>
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-8 bg-zinc-800 rounded flex items-center justify-center font-bold italic text-zinc-500">
                  VISA
                </div>
                <div>
                  <div className="text-sm font-medium">Visa ending in 4242</div>
                  <div className="text-xs text-zinc-500">Expiry 12/28</div>
                </div>
              </div>
              <button 
                onClick={() => setIsEditPaymentModalOpen(true)}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Usage Stats */}
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Usage
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Bandwidth</span>
                  <span className="text-white">84.2 GB / 100 GB</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full w-[84%]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Build Minutes</span>
                  <span className="text-white">420 / 1000</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full w-[42%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Billing History */}
          <div className="glass-card p-6 flex flex-col h-full">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <History className="w-4 h-4 text-zinc-400" />
              Recent Invoices
            </h3>
            <div className="space-y-4">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between group">
                  <div>
                    <div className="text-sm font-medium group-hover:text-white transition-colors">{inv.date}</div>
                    <div className="text-[10px] text-zinc-500 font-bold uppercase">{inv.id}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{inv.amount}</span>
                    <button 
                      onClick={() => handleDownload(inv.id)}
                      disabled={downloadingId !== null}
                      className="p-1 hover:bg-white/10 rounded-md transition-colors disabled:opacity-50"
                    >
                      {downloadingId === inv.id ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 text-zinc-500 hover:text-white transition-colors" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={() => handleAction('sales')} // Reuse handleAction for "view all" simulation
              className="mt-8 text-xs text-center text-zinc-500 hover:text-white transition-colors"
            >
              {isProcessing ? 'Loading History...' : 'View All Invoices'}
            </button>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 flex flex-col md:flex-row h-[600px]">
            {/* Left Side: Plans */}
            <div className="flex-1 p-8 overflow-y-auto space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold">Select a Plan</h2>
                  <p className="text-zinc-500 text-sm mt-1">Choose the best fit for your team.</p>
                </div>
                <button onClick={() => setIsUpgradeModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors md:hidden">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Pro (Current) */}
                <button 
                  onClick={() => setSelectedPlan('pro')}
                  className={cn(
                    "w-full p-6 rounded-2xl border transition-all duration-300 flex items-center justify-between group",
                    selectedPlan === 'pro' 
                      ? "border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.1)]" 
                      : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                      selectedPlan === 'pro' ? "bg-blue-500 text-white" : "bg-blue-500/10 text-blue-400"
                    )}>
                      <Zap className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-white flex items-center gap-2">
                        Pro Plan
                        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-zinc-400 font-black uppercase tracking-tighter">Current</span>
                      </div>
                      <div className="text-xs text-zinc-500">Perfect for small teams and startups.</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">$49</div>
                    <div className="text-[10px] text-zinc-600 uppercase font-bold">monthly</div>
                  </div>
                </button>

                {/* Enterprise (Upgrade) */}
                <button 
                  onClick={() => setSelectedPlan('enterprise')}
                  className={cn(
                    "w-full p-6 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between group relative overflow-hidden",
                    selectedPlan === 'enterprise' 
                      ? "border-blue-500 bg-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.15)]" 
                      : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
                  )}
                >
                  {selectedPlan === 'enterprise' && (
                    <div className="absolute top-0 right-0 px-3 py-1 bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-xl">Selected</div>
                  )}
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-lg",
                      selectedPlan === 'enterprise' ? "bg-blue-600 text-white shadow-blue-500/40" : "bg-blue-500/10 text-blue-400"
                    )}>
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-white">Enterprise</div>
                      <div className="text-xs text-zinc-500">Unlimited scale, security, and SLAs.</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">Custom</div>
                    <div className="text-[10px] text-zinc-600 uppercase font-bold">Contact Sales</div>
                  </div>
                </button>
              </div>

              <div className="space-y-4 pt-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-600">
                  {selectedPlan === 'enterprise' ? 'Enterprise Features' : 'Pro Features'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedPlan === 'enterprise' ? (
                    [
                      { icon: Globe, text: 'Custom Global Edge Nodes' },
                      { icon: Server, text: 'Dedicated Infrastructure' },
                      { icon: ShieldCheck, text: 'Advanced Compliance (SOC2)' },
                      { icon: Zap, text: '0ms Cold Start Guarantee' },
                    ].map((feat, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-zinc-400 animate-in fade-in slide-in-from-left-2 duration-300">
                        <feat.icon className="w-4 h-4 text-blue-500" />
                        {feat.text}
                      </div>
                    ))
                  ) : (
                    [
                      { icon: Zap, text: 'Unlimited Deployments' },
                      { icon: Globe, text: 'Custom Domains' },
                      { icon: Server, text: 'Advanced Scaling' },
                      { icon: ShieldCheck, text: 'Standard SSL' },
                    ].map((feat, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-zinc-400 animate-in fade-in slide-in-from-left-2 duration-300">
                        <feat.icon className="w-4 h-4 text-blue-500" />
                        {feat.text}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Side: Action */}
            <div className="w-full md:w-[320px] bg-white/[0.03] border-l border-white/5 p-8 flex flex-col justify-between">
              <button onClick={() => setIsUpgradeModalOpen(false)} className="hidden md:block self-end p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>

              <div className="space-y-8 text-center md:text-left h-full flex flex-col justify-center">
                {successState !== 'none' ? (
                  <div className="space-y-4 animate-in zoom-in-95 duration-500">
                    <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto md:mx-0 shadow-lg shadow-emerald-500/20">
                      <Check className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {successState === 'sales' ? 'Request Sent!' : 'Success!'}
                      </h3>
                      <p className="text-sm text-zinc-500 leading-relaxed mt-2">
                        {successState === 'sales' 
                          ? 'Our team will reach out within 24 hours to discuss your needs.'
                          : 'Redirecting you to the secure checkout portal...'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-white">
                        {selectedPlan === 'enterprise' ? 'Ready to Scale?' : 'Current Subscription'}
                      </h3>
                      <p className="text-sm text-zinc-500 leading-relaxed">
                        {selectedPlan === 'enterprise' 
                          ? 'Our Enterprise plan is tailored for high-growth applications requiring 99.99% uptime and dedicated support.'
                          : 'You are currently on our most popular plan. Manage your subscription or view billing history below.'}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <button 
                        disabled={isProcessing}
                        onClick={() => handleAction(selectedPlan === 'enterprise' ? 'sales' : 'upgrade')}
                        className={cn(
                          "w-full py-4 rounded-2xl font-bold transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2",
                          selectedPlan === 'enterprise' 
                            ? "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20" 
                            : "bg-white text-black hover:bg-zinc-200 shadow-white/5",
                          isProcessing && "opacity-80 cursor-not-allowed"
                        )}
                      >
                        {isProcessing ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          selectedPlan === 'enterprise' ? 'Contact Sales' : 'Manage Pro Plan'
                        )}
                      </button>
                      <p className="text-[10px] text-zinc-600 text-center uppercase font-bold tracking-widest">
                        {selectedPlan === 'enterprise' ? 'No credit card required for consultation' : 'View invoices in the billing tab'}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-8 border-t border-white/5 text-[10px] text-zinc-500 text-center italic">
                Questions? <span className="text-blue-500 cursor-pointer hover:underline">Chat with our engineering team</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-zinc-950 border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-500 text-center">
            {successState === 'cancelled' ? (
              <div className="space-y-4 animate-in zoom-in-95 duration-500">
                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Subscription Cancelled</h3>
                <p className="text-sm text-zinc-500">Your plan has been successfully cancelled. You will have access until the end of the billing period.</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <History className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Are you sure?</h2>
                <p className="text-zinc-400 text-sm mb-8">
                  You will lose access to unlimited deployments and priority support at the end of your current cycle.
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    disabled={isProcessing}
                    onClick={() => handleAction('cancel')}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Cancellation"}
                  </button>
                  <button 
                    onClick={() => setIsCancelModalOpen(false)}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
                  >
                    Keep My Plan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {isEditPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-zinc-950 border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-500">
            {successState === 'redirect' ? (
              <div className="space-y-4 text-center py-8 animate-in zoom-in-95 duration-500">
                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Payment Updated</h3>
                <p className="text-sm text-zinc-500">Your default payment method has been successfully updated.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-white">Update Payment</h2>
                  <button onClick={() => setIsEditPaymentModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 shadow-inner">
                    <div className="flex justify-between items-start mb-8">
                      <div className="text-xl font-bold italic text-zinc-500">VISA</div>
                      <CreditCard className="w-8 h-8 text-zinc-600" />
                    </div>
                    <div className="text-lg font-mono tracking-widest text-zinc-400 mb-4">
                      **** **** **** 4242
                    </div>
                    <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-600 tracking-tighter">
                      <span>Card Holder</span>
                      <span>Expires</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Card Number</label>
                      <input 
                        type="text" 
                        placeholder="**** **** **** 4242"
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Expiry</label>
                        <input 
                          type="text" 
                          placeholder="MM/YY"
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">CVC</label>
                        <input 
                          type="text" 
                          placeholder="***"
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    disabled={isProcessing}
                    onClick={() => handleAction('upgrade')}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
