import React from 'react';
import { motion } from 'framer-motion';
import { User, Terminal, Database, Laptop, ArrowRightLeft, ArrowDown, ArrowUp, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function Architecture() {
  return (
    <section id="developers" className="py-24 relative bg-[#000000] border-b border-white/5 overflow-hidden">
      <div className="absolute inset-0 bg-dot-grid opacity-10 pointer-events-none" />
      
      {/* Background spotlights */}
      <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-white/2 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-white/2 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        
        {/* Section Heading */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-4"
          >
            System Architecture
          </motion.div>
          
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
            Under the Hood
          </h2>
          
          <p className="text-neutral-400 max-w-xl mx-auto text-base">
            See how security credentials, audit logs, and contract updates flow dynamically across components.
          </p>
        </div>

        {/* Visual Architecture Diagram */}
        <div className="relative border border-white/10 bg-[#050505] p-8 md:p-12 rounded-2xl max-w-4xl mx-auto min-h-[500px] flex flex-col justify-between">
          
          {/* Node 1: Hub (Top Center) */}
          <div className="flex justify-center w-full">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-white/10 rounded-xl blur opacity-30 transition duration-1000 group-hover:opacity-50"></div>
              <div className="relative px-8 py-5 bg-[#0A0A0A] border border-white/15 rounded-xl w-64 text-center">
                <Database className="w-6 h-6 text-white mx-auto mb-2" />
                <h4 className="font-bold tracking-tight text-white uppercase font-mono text-sm">Hub (Neon Database)</h4>
                <p className="text-[10px] text-neutral-500 mt-1">Stores usernames, key hashes, contract states, audit scores, and verification history.</p>
              </div>
            </div>
          </div>

          {/* Node 2 & 3: Frontend & CLI (Middle row) */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-12 my-8 md:my-0">
            
            {/* Left: misohub frontend */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-white/5 rounded-xl blur opacity-30 transition duration-1000"></div>
              <div className="relative px-6 py-5 bg-[#0A0A0A] border border-white/10 rounded-xl w-60 text-center">
                <Laptop className="w-6 h-6 text-white mx-auto mb-2" />
                <h4 className="font-bold tracking-tight text-white uppercase font-mono text-sm">MisoHub Frontend</h4>
                <p className="text-[10px] text-neutral-500 mt-1">Renders user views, contract histories, code inspections, and active deployment tables.</p>
              </div>
            </div>

            {/* Right: terminal cli (Empty / disabled in this codebase) */}
            <div className="relative opacity-40">
              <div className="relative px-6 py-5 bg-[#030303] border border-dashed border-white/10 rounded-xl w-60 text-center">
                <Terminal className="w-6 h-6 text-neutral-500 mx-auto mb-2" />
                <h4 className="font-bold tracking-tight text-neutral-400 uppercase font-mono text-sm">Terminal CLI</h4>
                <div className="mt-1.5 px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-mono text-neutral-500 inline-block uppercase">
                  Not in this codebase
                </div>
                <p className="text-[10px] text-neutral-600 mt-1">External pipeline client for scans, pushes, and deployment executions.</p>
              </div>
            </div>

          </div>

          {/* Node 4: User (Bottom Center) */}
          <div className="flex justify-center w-full">
            <div className="relative px-8 py-5 bg-[#0A0A0A] border border-white/15 rounded-xl w-64 text-center">
              <User className="w-6 h-6 text-white mx-auto mb-2" />
              <h4 className="font-bold tracking-tight text-white uppercase font-mono text-sm">User</h4>
              <p className="text-[10px] text-neutral-500 mt-1">Developer accessing local shells or browser dashboard interfaces.</p>
            </div>
          </div>

          {/* Connectors & Annotations (Responsive descriptions overlay) */}
          <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-left text-neutral-400 font-mono">
            <div className="space-y-3 p-4 bg-white/2 rounded-lg border border-white/5">
              <div className="flex items-center gap-1.5 text-white font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
                Hub &lt;-&gt; MisoHub Frontend
              </div>
              <p className="text-xxs text-neutral-500 leading-relaxed">
                • **User Login**: Sets a username. The system generates a password/key key to verify and login next time.
              </p>
              <p className="text-xxs text-neutral-500 leading-relaxed">
                • **Real-Time Data**: Neon database pushes contract status updates, audits, and deployments to the interface dashboard.
              </p>
            </div>

            <div className="space-y-3 p-4 bg-white/2 rounded-lg border border-white/5 opacity-50">
              <div className="flex items-center gap-1.5 text-neutral-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                Hub &lt;-&gt; Terminal CLI (External System)
              </div>
              <p className="text-xxs text-neutral-600 leading-relaxed">
                • **Registration**: Users can initialize accounts and configure keys/passwords via terminal inputs.
              </p>
              <p className="text-xxs text-neutral-600 leading-relaxed">
                • **Auth Sync**: CLI pushes verification proofs, contract states, and scores to retrieve a session token.
              </p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
