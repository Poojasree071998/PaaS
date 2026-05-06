"use client";

import { 
  Globe, 
  Plus, 
  ArrowRight, 
  Search,
  Code,
  Box
} from 'lucide-react';
import Link from 'next/link';

export default function NewProjectPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 py-10">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Let's build something new.</h1>
        <p className="text-zinc-500 text-lg">Import an existing repository or start from a template.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* GitHub Import */}
        <div className="glass-card p-8 group hover:border-white/20 transition-all cursor-pointer flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Code className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Import from Git</h2>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
            Connect your GitHub, GitLab, or Bitbucket account to import your code.
          </p>
          <button className="w-full bg-white text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors">
            Continue with GitHub <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Templates */}
        <Link href="/dashboard/new/templates" className="glass-card p-8 group hover:border-white/20 transition-all cursor-pointer flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Box className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Start with a Template</h2>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
            Choose from a collection of pre-configured templates for Next.js, Vite, and more.
          </p>
          <div className="w-full bg-white/5 border border-white/10 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors">
            View Templates <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>

      {/* Manual Import */}
      <Link href="/dashboard/new/import" className="glass-card p-6 flex items-center justify-between group cursor-pointer hover:border-white/20 transition-all">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
            <Globe className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <div className="font-semibold">Import Third-Party Repository</div>
            <div className="text-xs text-zinc-500">Import using a public repository URL</div>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
      </Link>

      <div className="text-center pt-8">
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-white transition-colors underline underline-offset-4">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
