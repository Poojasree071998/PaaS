"use client";

import Link from "next/link";
import { Check, ArrowRight, Zap, Shield, Crown } from "lucide-react";
import { motion } from "framer-motion";

export default function PricingPage() {
  const plans = [
    {
      name: "Starter",
      price: "0",
      description: "Perfect for hobby projects and experiments.",
      features: [
        "3 Projects",
        "1GB Bandwidth/mo",
        "Community Support",
        "Automated SSL",
        "Subdomain Deployment"
      ],
      icon: Zap,
      color: "blue"
    },
    {
      name: "Pro",
      price: "19",
      description: "For professional developers and small teams.",
      features: [
        "Unlimited Projects",
        "50GB Bandwidth/mo",
        "Priority Email Support",
        "Custom Domains",
        "Analytics Dashboard",
        "Enhanced Security"
      ],
      icon: Shield,
      color: "purple",
      featured: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "Mission-critical infrastructure for scale.",
      features: [
        "Dedicated Infrastructure",
        "Unlimited Bandwidth",
        "24/7 Dedicated Support",
        "Custom SLAs",
        "Advanced RBAC",
        "Log Persistence"
      ],
      icon: Crown,
      color: "indigo"
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/30 overflow-hidden relative font-sans">
      {/* Background gradients */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto relative z-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">DF</span>
          </div>
          <span className="text-xl font-bold tracking-tight">DeployFlow</span>
        </Link>
        <Link href="/dashboard" className="text-sm font-medium bg-white/5 border border-white/10 px-4 py-2 rounded-full hover:bg-white/10 transition-colors">
          Go to Dashboard
        </Link>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-24 relative z-10">
        <div className="text-center mb-20">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-bold tracking-tight mb-4"
          >
            Simple, Transparent <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Pricing.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-400 text-lg max-w-2xl mx-auto"
          >
            Choose the plan that's right for you. All plans include automated deployments, global edge network, and free SSL.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <motion.div 
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`glass-card p-8 relative flex flex-col ${plan.featured ? 'ring-2 ring-purple-500/50' : ''}`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                  Most Popular
                </div>
              )}
              
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-xl bg-${plan.color}-500/10 flex items-center justify-center`}>
                  <plan.icon className={`w-5 h-5 text-${plan.color}-400`} />
                </div>
                <h3 className="text-xl font-bold">{plan.name}</h3>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  {plan.price !== "Custom" && <span className="text-zinc-500 text-sm">/mo</span>}
                </div>
                <p className="text-zinc-500 text-sm mt-2">{plan.description}</p>
              </div>

              <div className="space-y-4 mb-10 flex-1">
                {plan.features.map(feature => (
                  <div key={feature} className="flex items-center gap-3 text-sm text-zinc-300">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <Link 
                href="/dashboard"
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  plan.featured 
                    ? 'bg-white text-black hover:bg-zinc-200' 
                    : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                }`}
              >
                {plan.price === "Custom" ? "Contact Sales" : "Get Started"}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-24 text-center">
          <p className="text-zinc-500 text-sm">
            Need something else? <Link href="mailto:support@deployflow.com" className="text-white hover:underline">Contact our support team</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
