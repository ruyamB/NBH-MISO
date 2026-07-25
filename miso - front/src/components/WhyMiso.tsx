import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Sliders, CheckSquare } from 'lucide-react';

export default function WhyMiso() {
  return (
    <section id="why-miso" className="py-24 relative bg-[#000000] border-b border-white/5">
      <div className="absolute inset-0 bg-dot-grid opacity-20 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Heading */}
        <div className="max-w-3xl mb-20">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-4"
          >
            Paradigm Shift
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-5xl font-black tracking-tight mb-6"
          >
            Why MISO?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-neutral-400 text-base md:text-lg"
          >
            Solana smart contract deployment is currently fragmented, manual, and error-prone. MISO consolidates discovery, static analysis, AI auditing, and verifiable deployment into a single cohesive system.
          </motion.p>
        </div>

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: Fragmented Workflows */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="border border-white/8 rounded-xl p-8 bg-[#0A0A0A] metallic-card relative overflow-hidden"
          >
            <div className="flex items-center gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-neutral-400" />
              <h3 className="text-lg font-bold text-white">Fragmented Workflows</h3>
            </div>
            
            <p className="text-neutral-400 text-sm leading-relaxed mb-8">
              Existing Solana operations rely on disparate tools for auditing, verification, and deploy scripts, leading to security oversights.
            </p>

            {/* Vertical timeline graphic */}
            <div className="relative border-l border-white/10 ml-3 pl-6 space-y-6">
              <div className="relative">
                <span className="absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full bg-neutral-800 border border-neutral-700" />
                <h4 className="text-xs font-mono text-neutral-400 uppercase tracking-wider mb-1">Step 1: Local Builds</h4>
                <p className="text-neutral-500 text-xs">Unverifiable compiler versions and mismatched environment configs.</p>
              </div>
              <div className="relative">
                <span className="absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full bg-neutral-800 border border-neutral-700" />
                <h4 className="text-xs font-mono text-neutral-400 uppercase tracking-wider mb-1">Step 2: External Audit</h4>
                <p className="text-neutral-500 text-xs">Ad-hoc static scanners or expensive manual audits that delay ship times.</p>
              </div>
              <div className="relative">
                <span className="absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full bg-neutral-800 border border-neutral-700" />
                <h4 className="text-xs font-mono text-neutral-400 uppercase tracking-wider mb-1">Step 3: Upgrades & Deploy</h4>
                <p className="text-neutral-500 text-xs">Manual commands with keypairs exposed in scripts, prone to slippage errors.</p>
              </div>
            </div>
          </motion.div>

          {/* Column 2: MISO Unification */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="border border-white/20 rounded-xl p-8 bg-[#111111] metallic-card relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 px-3 py-1 bg-white text-black text-xxs font-mono font-bold tracking-widest uppercase">
              Unified
            </div>
            
            <div className="flex items-center gap-3 mb-6">
              <Sliders className="w-5 h-5 text-white animate-pulse" />
              <h3 className="text-lg font-bold text-white">MISO Unification</h3>
            </div>
            
            <p className="text-neutral-300 text-sm leading-relaxed mb-8">
              MISO binds the complete lifecycle into one unified, reproducible process. Running a single CLI command handles the logic.
            </p>

            {/* Vertical timeline graphic */}
            <div className="relative border-l border-white/25 ml-3 pl-6 space-y-6">
              <div className="relative">
                <span className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-white border border-black shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                <h4 className="text-xs font-mono text-white uppercase tracking-wider mb-1">Step 1: Automated Discovery</h4>
                <p className="text-neutral-400 text-xs">Instantly maps workspace and dependencies before compilation.</p>
              </div>
              <div className="relative">
                <span className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-white border border-black shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                <h4 className="text-xs font-mono text-white uppercase tracking-wider mb-1">Step 2: AI Security Audit</h4>
                <p className="text-neutral-400 text-xs">Evaluates vulnerabilities locally via AI-based audits and validates evidence.</p>
              </div>
              <div className="relative">
                <span className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-white border border-black shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                <h4 className="text-xs font-mono text-white uppercase tracking-wider mb-1">Step 3: Secure Deploy</h4>
                <p className="text-neutral-400 text-xs">Enforces programmatic policy compliance checks prior to signing releases.</p>
              </div>
            </div>
          </motion.div>

          {/* Column 3: Productivity Gain */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="border border-white/8 rounded-xl p-8 bg-[#0A0A0A] metallic-card relative overflow-hidden"
          >
            <div className="flex items-center gap-3 mb-6">
              <CheckSquare className="w-5 h-5 text-neutral-400" />
              <h3 className="text-lg font-bold text-white">Developer Leverage</h3>
            </div>
            
            <p className="text-neutral-400 text-sm leading-relaxed mb-8">
              MISO drastically enhances velocity while enforcing institutional safety rails, keeping developers highly focused.
            </p>

            {/* Vertical timeline graphic */}
            <div className="relative border-l border-white/10 ml-3 pl-6 space-y-6">
              <div className="relative">
                <span className="absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full bg-neutral-800 border border-neutral-700" />
                <h4 className="text-xs font-mono text-neutral-400 uppercase tracking-wider mb-1">10x Faster Ship Iterations</h4>
                <p className="text-neutral-500 text-xs">Eliminates manual verification step delays. Ship secure binaries daily.</p>
              </div>
              <div className="relative">
                <span className="absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full bg-neutral-800 border border-neutral-700" />
                <h4 className="text-xs font-mono text-neutral-400 uppercase tracking-wider mb-1">Zero Deployment Incidents</h4>
                <p className="text-neutral-500 text-xs">Guards against deploy mistakes, faulty accounts, and compromised compiler flags.</p>
              </div>
              <div className="relative">
                <span className="absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full bg-neutral-800 border border-neutral-700" />
                <h4 className="text-xs font-mono text-neutral-400 uppercase tracking-wider mb-1">Transparent Evidence Audit</h4>
                <p className="text-neutral-500 text-xs">Generates shareable JSON validation reports automatically for security reviewers.</p>
              </div>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
