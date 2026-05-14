import Link from "next/link";
import { Home } from "lucide-react";

export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <h1 className="text-9xl font-black tracking-tighter mb-4 opacity-20">404</h1>
      <h2 className="text-3xl font-bold mb-6">Page Not Found</h2>
      <p className="text-zinc-500 max-w-md mb-10 leading-relaxed">
        The page you are looking for doesn't exist or has been moved to another URL.
      </p>
      
      <div className="flex items-center gap-4">
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
