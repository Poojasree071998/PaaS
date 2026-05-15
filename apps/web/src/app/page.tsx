"use client";

import { 
  Plus, 
  ArrowRight, 
  Globe, 
  Shield, 
  Zap, 
  Activity,
  ChevronRight,
  Terminal,
  Server,
  Cloud
} from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white selection:bg-blue-500/30 selection:text-blue-200 overflow-x-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(30,58,138,0.15),transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,rgba(88,28,135,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-500 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              <Zap className="w-6 h-6 text-black" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase italic">DeployFlow</span>
          </div>
          
          <div className="hidden md:flex items-center gap-10">
            {['Features', 'Pricing', 'Infrastructure', 'API'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-bold text-zinc-500 hover:text-white transition-colors tracking-widest uppercase">
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-widest px-6 py-2">
              Sign In
            </Link>
            <Link href="/register" className="bg-white text-black text-sm font-black px-8 py-3 rounded-2xl hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] uppercase tracking-tighter">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-10 animate-in fade-in slide-in-from-left-8 duration-1000">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Activity className="w-4 h-4 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">v2.4.0 Now Live</span>
            </div>
            
            <h1 className="text-7xl md:text-8xl font-black tracking-tighter leading-[0.9] text-white">
              The Platform <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">for Builders.</span>
            </h1>

            <p className="text-xl text-zinc-500 max-w-xl leading-relaxed font-medium">
              Deploy, scale, and manage your applications with institutional-grade infrastructure. Built for performance, designed for humans.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Link href="/register" className="group w-full sm:w-auto bg-white text-black px-12 py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-white/5">
                Deploy Now <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <button className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-5 rounded-[2rem] border border-white/10 text-white font-bold hover:bg-white/5 transition-all">
                View Source Code
              </button>
            </div>

            <div className="flex items-center gap-8 pt-6">
              <div className="flex -space-x-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-4 border-black bg-zinc-800" />
                ))}
              </div>
              <div className="text-sm text-zinc-500">
                <span className="font-bold text-white tracking-tighter">2,000+</span> teams building today
              </div>
            </div>
          </div>

          <div className="relative animate-in fade-in zoom-in duration-1000 delay-200">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur opacity-20 animate-pulse" />
            <div className="relative bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              <div className="bg-white/5 px-6 py-4 flex items-center justify-between border-b border-white/5">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/20" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/20" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/20" />
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600 italic">Terminal — deployment:init</div>
              </div>
              <div className="p-8 font-mono text-sm space-y-4">
                <div className="flex gap-4">
                  <span className="text-blue-500">$</span>
                  <span className="text-white">deployflow --init</span>
                </div>
                <div className="text-zinc-500 pl-8 leading-relaxed">
                  ✓ Scanning repository <br />
                  ✓ Detected Next.js framework <br />
                  ✓ Provisioning edge node [nyc1] <br />
                  ✓ Injecting environment variables <br />
                  <span className="text-emerald-500">✓ Deployment ready at https://myapp.deployflow.app</span>
                </div>
                <div className="flex gap-4 pt-4">
                  <span className="text-blue-500">$</span>
                  <div className="w-2 h-5 bg-white animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative py-32 px-6 z-10" id="features">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h2 className="text-sm font-black uppercase tracking-[0.4em] text-blue-500">Core Infrastructure</h2>
            <p className="text-5xl font-black tracking-tighter leading-tight">Everything you need to <br /> ship at lightning speed.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              { icon: Globe, title: 'Edge Network', desc: 'Deploy to over 200 cities globally. Your users deserve sub-10ms response times.', color: 'text-blue-400' },
              { icon: Shield, title: 'Enterprise Security', desc: 'AES-256 encryption at rest, automatic SSL, and DDoS protection baked in.', color: 'text-emerald-400' },
              { icon: Zap, title: 'Instant Builds', desc: 'Our specialized build engine optimizes your code in seconds, not minutes.', color: 'text-amber-400' },
              { icon: Terminal, title: 'Powerful CLI', desc: 'Manage your entire infrastructure from the comfort of your terminal.', color: 'text-purple-400' },
              { icon: Server, title: 'Auto-Scaling', desc: 'We handle the traffic spikes. Your app scales up and down automatically.', color: 'text-rose-400' },
              { icon: Cloud, title: 'Cloud Integration', desc: 'Connect to any DB or API with one click. Native support for major providers.', color: 'text-indigo-400' },
            ].map((f, i) => (
              <div key={i} className="group p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all">
                <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform ${f.color}`}>
                  <f.icon className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-black mb-4 tracking-tight">{f.title}</h3>
                <p className="text-zinc-500 leading-relaxed font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 pt-20 pb-10 px-6 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5" />
            <span className="text-lg font-black tracking-tighter uppercase italic">DeployFlow</span>
          </div>
          
          <div className="text-sm text-zinc-600 font-medium">
            © 2024 DeployFlow Infrastructure Inc. All rights reserved.
          </div>

          <div className="flex items-center gap-6">
            <button className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors">
              <Globe className="w-4 h-4" /> {(() => {
                if (typeof window !== 'undefined') {
                  return localStorage.getItem('df_api_url')?.includes('render') ? 'Cloud Node' : 'Local Node';
                }
                return 'Cloud Node';
              })()}
            </button>
            <div className="flex items-center gap-2 text-emerald-500 font-bold uppercase text-[10px] tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All Systems Operational
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
