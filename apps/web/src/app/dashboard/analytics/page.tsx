"use client";

import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Globe, 
  Timer, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter
} from 'lucide-react';

const stats = [
  { name: 'Total Requests', value: '1.2M', change: '+12.5%', trend: 'up' },
  { name: 'Avg. Latency', value: '42ms', change: '-2.1%', trend: 'down' },
  { name: 'Bandwidth', value: '840 GB', change: '+5.4%', trend: 'up' },
  { name: 'Success Rate', value: '99.99%', change: '+0.01%', trend: 'up' },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Analytics</h1>
          <p className="text-zinc-500">Insights into your platform performance</p>
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-1">
          {['24h', '7d', '30d', '90d'].map((range) => (
            <button 
              key={range}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                range === '7d' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="glass-card p-6">
            <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">{stat.name}</div>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className={`flex items-center gap-0.5 text-xs font-bold ${
                stat.trend === 'up' ? 'text-emerald-500' : 'text-blue-500'
              }`}>
                {stat.trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {stat.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 h-80 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              Request Traffic
            </h3>
            <button className="text-zinc-500 hover:text-white transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 flex items-end justify-between gap-2 px-2">
            {[40, 60, 35, 75, 90, 65, 55, 80, 45, 70, 85, 50].map((height, i) => (
              <div key={i} className="flex-1 bg-blue-500/20 rounded-t-sm group relative cursor-pointer hover:bg-blue-500/40 transition-colors">
                <div 
                  className="absolute bottom-0 inset-x-0 bg-blue-500 rounded-t-sm transition-all duration-500 group-hover:brightness-110" 
                  style={{ height: `${height}%` }}
                />
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {height * 10}k reqs
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
            <span>May 01</span>
            <span>May 07</span>
          </div>
        </div>

        <div className="glass-card p-6 h-80 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-400" />
              Geographic Distribution
            </h3>
          </div>
          <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {[
              { country: 'United States', percentage: 42, color: 'bg-blue-500' },
              { country: 'Germany', percentage: 18, color: 'bg-purple-500' },
              { country: 'United Kingdom', percentage: 12, color: 'bg-indigo-500' },
              { country: 'Japan', percentage: 9, color: 'bg-emerald-500' },
              { country: 'Others', percentage: 19, color: 'bg-zinc-500' },
            ].map((loc) => (
              <div key={loc.country} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-zinc-300">{loc.country}</span>
                  <span className="text-white">{loc.percentage}%</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className={`${loc.color} h-full transition-all duration-1000`} style={{ width: `${loc.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
