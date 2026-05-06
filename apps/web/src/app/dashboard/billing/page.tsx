"use client";

import { 
  CreditCard, 
  ArrowUpRight, 
  Download, 
  Check, 
  Zap,
  ShieldCheck,
  History
} from 'lucide-react';

const invoices = [
  { id: 'INV-2026-001', date: 'May 1, 2026', amount: '$49.00', status: 'Paid' },
  { id: 'INV-2026-002', date: 'Apr 1, 2026', amount: '$49.00', status: 'Paid' },
  { id: 'INV-2026-003', date: 'Mar 1, 2026', amount: '$49.00', status: 'Paid' },
];

export default function BillingPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
              <button className="bg-white text-black px-6 py-2 rounded-lg font-semibold text-sm hover:bg-zinc-200 transition-colors">
                Upgrade Plan
              </button>
              <button className="text-zinc-400 hover:text-white transition-colors text-sm font-medium">
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
              <button className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
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
                <div key={inv.id} className="flex items-center justify-between group cursor-pointer">
                  <div>
                    <div className="text-sm font-medium group-hover:text-white transition-colors">{inv.date}</div>
                    <div className="text-[10px] text-zinc-500 font-bold uppercase">{inv.id}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{inv.amount}</span>
                    <Download className="w-4 h-4 text-zinc-500 hover:text-white transition-colors" />
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-8 text-xs text-center text-zinc-500 hover:text-white transition-colors">
              View All Invoices
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
