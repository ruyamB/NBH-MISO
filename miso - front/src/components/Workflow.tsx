import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FolderGit, ShieldAlert, BadgeCheck, FileSliders, Rocket } from 'lucide-react';

const WORKFLOW_STEPS = [
  { id: 'discover', label: 'Discover', desc: 'Scan and identify programs', icon: <Search className="w-5 h-5" /> },
  { id: 'build', label: 'Build', desc: 'Secure local Rust build', icon: <FolderGit className="w-5 h-5" /> },
  { id: 'audit', label: 'Audit', desc: 'Static & AI vulnerability scans', icon: <ShieldAlert className="w-5 h-5" /> },
  { id: 'verify', label: 'Verify', desc: 'Generate proofs & verify output', icon: <BadgeCheck className="w-5 h-5" /> },
  { id: 'policy', label: 'Policy Check', desc: 'Verify program rules compliance', icon: <FileSliders className="w-5 h-5" /> },
  { id: 'deploy', label: 'Deploy', desc: 'Safely publish to Solana chains', icon: <Rocket className="w-5 h-5" /> }
];

export default function Workflow() {
  const [activeStep, setActiveStep] = useState(0);

  // Auto-cycle active steps for animation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % WORKFLOW_STEPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="workflow" className="py-24 relative bg-[#000000] border-b border-white/5 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-80 h-80 bg-white/2 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/2 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Section Title */}
        <div className="text-center mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-5xl font-black tracking-tight mb-4"
          >
            The MISO Pipeline Workflow
          </motion.h2>
          <p className="text-neutral-400 max-w-2xl mx-auto text-base">
            From local changes to deployed secure program binaries. Every step of our workflow is automated, verified, and policy-gated.
          </p>
        </div>

        {/* Pipeline Visual Container */}
        <div className="relative py-8">
          
          {/* Animated Connecting Line (Desktop) */}
          <div className="hidden lg:block absolute top-[52px] left-[5%] right-[5%] h-[2px] bg-neutral-900 overflow-hidden z-0">
            <motion.div 
              className="h-full bg-gradient-to-r from-transparent via-white to-transparent w-40 absolute"
              animate={{ 
                left: ['-20%', '120%'] 
              }}
              transition={{ 
                duration: 6, 
                repeat: Infinity, 
                ease: 'linear' 
              }}
            />
          </div>

          {/* Workflow Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-8 relative z-10">
            {WORKFLOW_STEPS.map((step, index) => {
              const isActive = activeStep === index;
              const isPast = activeStep > index;

              return (
                <div 
                  key={step.id} 
                  className="flex flex-col items-center text-center group cursor-pointer"
                  onClick={() => setActiveStep(index)}
                >
                  {/* Node Circle */}
                  <div className="relative mb-6">
                    {/* Ring glow indicator */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          layoutId="pulse-ring"
                          className="absolute inset-0 -m-3 border border-white/20 rounded-full"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.2 }}
                          transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                        />
                      )}
                    </AnimatePresence>

                    {/* Outer border/circle */}
                    <div className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all duration-500 relative z-10 ${
                      isActive 
                        ? 'border-white bg-[#0A0A0A] text-white shadow-[0_0_15px_rgba(255,255,255,0.15)] scale-110' 
                        : isPast 
                          ? 'border-neutral-500 bg-[#060606] text-neutral-300' 
                          : 'border-white/10 bg-[#0A0A0A] text-neutral-500 hover:border-white/30 hover:text-neutral-300'
                    }`}>
                      {step.icon}
                    </div>

                    {/* Step order index badge */}
                    <span className={`absolute -bottom-1 -right-1 text-xxs font-mono px-1.5 py-0.5 rounded border transition-colors duration-500 ${
                      isActive 
                        ? 'bg-white text-black border-white' 
                        : 'bg-[#111111] text-neutral-500 border-white/10'
                    }`}>
                      {index + 1}
                    </span>
                  </div>

                  {/* Node Description Text */}
                  <h3 className={`text-base font-bold tracking-tight mb-2 transition-colors duration-300 ${
                    isActive ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'
                  }`}>
                    {step.label}
                  </h3>
                  
                  <p className="text-neutral-500 text-xs px-4 max-w-[200px] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>

        </div>

        {/* Selected Step Deep Dive details */}
        <motion.div 
          key={activeStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-16 p-8 border border-white/8 rounded-xl bg-[#0A0A0A] metallic-card max-w-3xl mx-auto flex flex-col md:flex-row items-center gap-6 shadow-2xl"
        >
          <div className="w-16 h-16 rounded-xl bg-[#111111] border border-white/15 flex items-center justify-center text-white shrink-0 shadow-lg">
            {WORKFLOW_STEPS[activeStep].icon}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
                Stage 0{activeStep + 1}
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-sm font-semibold text-white">
                {WORKFLOW_STEPS[activeStep].label} Process
              </span>
            </div>
            <h4 className="text-lg font-bold text-white mb-2">
              Automated {WORKFLOW_STEPS[activeStep].label} Execution
            </h4>
            <p className="text-neutral-400 text-sm leading-relaxed">
              {activeStep === 0 && "MISO maps your Solana workspace configuration file. It scans all subfolders automatically, locating cargo manifest files, Rust Solana programs, and configurations without manual input."}
              {activeStep === 1 && "Runs reproducible Docker-based builders configured with correct compiler flags, target configurations, and lockfiles to guarantee that the generated SO binary matches the Rust source."}
              {activeStep === 2 && "Runs heuristic static AST analysis combined with neural vulnerability scanners. MISO flags dangerous unchecked accounts, integer overflows, reentrancies, and PDA validation errors."}
              {activeStep === 3 && "Constructs structured evidence metadata proving occurrences of reported vulnerabilities, formatting them into reproducible test benches to verify security bugs."}
              {activeStep === 4 && "Evaluates user-defined config rules (e.g., maximum security score of 95+, mandatory multi-sig, testnet test success) prior to deploying programs to public Solana clusters."}
              {activeStep === 5 && "Secures program upgrades or initial deployments on-chain. Signs transactions, schedules multi-stage deployment processes, and publishes verify tokens automatically."}
            </p>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
