import React from 'react';
import { motion } from 'framer-motion';
import { Terminal, BookOpen, ArrowUpRight } from 'lucide-react';

interface CTAProps {
  onNavigate: (section: string) => void;
}

export default function CTA({ onNavigate }: CTAProps) {
  return (
    <section className="py-28 relative bg-[#000000] border-b border-white/5 overflow-hidden">
      {/* Background Lighting Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/2 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-dot-grid opacity-10 pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
        
        {/* Soft Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1 border border-white/10 rounded-full text-xxs font-mono text-neutral-400 bg-white/5 uppercase tracking-widest mb-6"
        >
          Secure Operations
        </motion.div>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-6xl font-black tracking-tight text-white mb-6 leading-tight"
        >
          Ready to secure your <br/>
          Solana programs?
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-neutral-400 text-sm md:text-base max-w-xl mx-auto mb-10 leading-relaxed"
        >
          Protect your program keys, prevent reentrancy, ensure account validation, and run reproducible CI/CD deployments through one command.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {/* Action 1: Install CLI */}
          <button
            onClick={() => onNavigate('home')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 border border-white bg-white text-black font-semibold text-sm rounded-lg hover:bg-neutral-200 transition-all duration-300 shadow-xl cursor-pointer group hover:shadow-white/5"
          >
            <Terminal className="w-4 h-4" />
            Install CLI
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>

          {/* Action 2: Read Documentation */}
          <button
            onClick={() => onNavigate('docs')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 border border-white/8 hover:border-white/20 text-neutral-300 hover:text-white bg-[#0A0A0A] hover:bg-[#111111] font-semibold text-sm rounded-lg transition-all duration-300 cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            Read Documentation
          </button>
        </motion.div>

      </div>
    </section>
  );
}
