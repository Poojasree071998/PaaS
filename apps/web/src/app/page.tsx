"use client";

import Link from "next/link";
import { getApiUrl } from "@/lib/api";
import { motion } from "framer-motion";
import { Rocket, Code, Globe, Zap, Shield, ArrowRight, Layers, Box } from "lucide-react";

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };
...
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/30 overflow-hidden relative font-sans">
      {/* Background gradients */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/4 -right-64 w-[600px] h-[600px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">DeployFlow</span>
        </div>
        <div className="flex items-center gap-6">
          <Link 
            href="https://paas-k7nx.onrender.com/api/docs" 
            target="_blank"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Documentation
          </Link>
          <Link href="/pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Pricing
          </Link>
          <Link 
            href="/dashboard" 
            className="text-sm font-medium bg-white text-black px-4 py-2 rounded-full hover:bg-zinc-200 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-32 pb-24 relative z-10">
        <motion.div 
          className="flex flex-col items-center text-center max-w-4xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-300 mb-8 backdrop-blur-sm">
            <Zap className="w-4 h-4 text-blue-400" />
            <span>DeployFlow 2.0 is now live</span>
          </motion.div>

          <motion.h1 
            variants={itemVariants}
            className="text-6xl md:text-8xl font-bold tracking-tighter leading-tight mb-8"
          >
            Deploy your code <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              in seconds.
            </span>
          </motion.h1>

          <motion.p 
            variants={itemVariants}
            className="text-xl md:text-2xl text-zinc-400 mb-12 max-w-2xl leading-relaxed"
          >
            The production-grade platform for modern full-stack applications. Push to Git, and we'll handle the rest.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-4">
            <Link 
              href="/dashboard"
              className="flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full text-lg font-medium hover:bg-zinc-200 hover:scale-105 active:scale-95 transition-all"
            >
              Start Deploying <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              href="https://github.com"
              target="_blank"
              className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-white/10 transition-all"
            >
              <Code className="w-5 h-5" /> Import from GitHub
            </Link>
          </motion.div>
        </motion.div>

        {/* Features grid */}
        <motion.div 
          className="grid md:grid-cols-3 gap-6 mt-40"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {[
            {
              icon: Globe,
              title: "Global Edge Network",
              description: "Your app is deployed to our global edge network, ensuring ultra-low latency for users worldwide."
            },
            {
              icon: Box,
              title: "Any Framework",
              description: "Native support for Next.js, React, Vue, Svelte, Node, Python, and custom Dockerfiles."
            },
            {
              icon: Shield,
              title: "Automated SSL & Custom Domains",
              description: "We automatically provision and renew Let's Encrypt certificates for all your custom domains."
            }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              variants={itemVariants}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-zinc-400 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
