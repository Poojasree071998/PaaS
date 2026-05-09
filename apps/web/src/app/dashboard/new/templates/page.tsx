"use client";

import { 
  ArrowRight, 
  Search,
  Layout,
  Zap,
  Flame,
  Wind,
  Box,
  ChevronLeft
} from 'lucide-react';
import Link from 'next/link';

import { useRouter } from 'next/navigation';

const templates = [
  {
    name: 'Next.js Commerce',
    description: 'A high-performance ecommerce template built with Next.js and Tailwind CSS.',
    framework: 'Next.js',
    icon: Zap,
    color: 'text-blue-400',
    repoUrl: 'https://github.com/vercel/commerce'
  },
  {
    name: 'React Dashboard',
    description: 'Premium admin dashboard with interactive charts and dark mode.',
    framework: 'React',
    icon: Layout,
    color: 'text-emerald-400',
    repoUrl: 'https://github.com/creativetimofficial/argon-dashboard-react'
  },
  {
    name: 'Astro Blog',
    description: 'Ultra-fast documentation and blog template with built-in search.',
    framework: 'Astro',
    icon: Flame,
    color: 'text-orange-500',
    repoUrl: 'https://github.com/withastro/astro/tree/main/examples/blog'
  },
  {
    name: 'Vite + Vue Starter',
    description: 'Lightning fast Vue 3 starter with Pinia and Vue Router.',
    framework: 'Vue',
    icon: Wind,
    color: 'text-emerald-500',
    repoUrl: 'https://github.com/vuejs/vitesse'
  },
  {
    name: 'Express API Server',
    description: 'Scalable Node.js backend with JWT auth and Prisma integration.',
    framework: 'Express',
    icon: Box,
    color: 'text-zinc-400',
    repoUrl: 'https://github.com/Poojasree071998/PaaS' // Example
  },
  {
    name: 'FastAPI Backend',
    description: 'Modern, fast (high-performance) web framework for building APIs with Python.',
    framework: 'Python',
    icon: Zap,
    color: 'text-teal-400',
    repoUrl: 'https://github.com/tiangolo/full-stack-fastapi-postgresql'
  }
];

export default function TemplatesPage() {
  const router = useRouter();

  const handleSelectTemplate = (repoUrl: string) => {
    const encodedUrl = encodeURIComponent(repoUrl);
    router.push(`/dashboard/new?url=${encodedUrl}`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 py-10">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/new" className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ChevronLeft className="w-5 h-5 text-zinc-400" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clone a Template</h1>
          <p className="text-zinc-500">Jumpstart your project with our curated collection.</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input 
          type="text" 
          placeholder="Search templates..." 
          className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div 
            key={template.name} 
            onClick={() => handleSelectTemplate(template.repoUrl)}
            className="glass-card p-6 group hover:border-white/20 transition-all cursor-pointer flex flex-col"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <template.icon className={`w-6 h-6 ${template.color}`} />
              </div>
              <div>
                <h3 className="font-bold group-hover:text-white transition-colors">{template.name}</h3>
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">{template.framework}</span>
              </div>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed mb-6 flex-1">
              {template.description}
            </p>
            <button className="w-full py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2">
              Select Template <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
