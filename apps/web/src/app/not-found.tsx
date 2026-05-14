"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-red-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      <h1 className="text-9xl font-black tracking-tighter mb-4 opacity-20">404</h1>
      <h2 className="text-3xl font-bold mb-6">Page Not Found</h2>
      <p className="text-zinc-500 max-w-md mb-10 leading-relaxed">
        The page you are looking for doesn't exist or has been moved to another URL.
      </p>
      
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <button 
          onClick={() => window.history.back()}
          className="flex items-center gap-2 bg-white/5 border border-white/10 px-6 py-3 rounded-xl font-medium hover:bg-white/10 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
        <Link 
          href="/"
          className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-medium hover:bg-zinc-200 transition-all"
        >
          <Home className="w-4 h-4" /> Return Home
        </Link>
      </div>
    </div>
  );
}
