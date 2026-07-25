import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Shield, CheckCircle2 } from 'lucide-react';

const OUTPUT_LINES = [
  { text: '✓ Discovering Solana programs', delay: 400 },
  { text: '✓ Building program', delay: 800 },
  { text: '✓ Static analysis', delay: 1200 },
  { text: '✓ AI security audit', delay: 1700 },
  { text: '✓ Evidence verification', delay: 2100 },
  { text: '✓ Policy check', delay: 2400 },
  { text: '✓ Deploying to Devnet', delay: 2800 },
  { text: '✓ Success (Program ID: 9x8A...3zF4)', delay: 3200 }
];

export default function TerminalDemo() {
  const [typedText, setTypedText] = useState('');
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [showOutput, setShowOutput] = useState(false);
  const [resetCounter, setResetCounter] = useState(0);

  const command = 'miso push';

  useEffect(() => {
    // Phase 1: Reset state
    setTypedText('');
    setCurrentLineIndex(-1);
    setShowOutput(false);

    // Phase 2: Typing Command
    let charIndex = 0;
    const typingInterval = setInterval(() => {
      if (charIndex < command.length) {
        setTypedText((prev) => prev + command.charAt(charIndex));
        charIndex++;
      } else {
        clearInterval(typingInterval);
        // Phase 3: Wait a bit, then show output lines one by one
        setTimeout(() => {
          setShowOutput(true);
          // Trigger outputs sequentially
          OUTPUT_LINES.forEach((line, index) => {
            setTimeout(() => {
              setCurrentLineIndex(index);
            }, line.delay);
          });
        }, 500);
      }
    }, 120);

    // Phase 4: Wait, then restart whole demo
    const restartTimeout = setTimeout(() => {
      setResetCounter((prev) => prev + 1);
    }, 7500);

    return () => {
      clearInterval(typingInterval);
      clearTimeout(restartTimeout);
    };
  }, [resetCounter]);

  return (
    <section className="py-20 relative bg-[#000000] border-y border-white/5 overflow-hidden">
      <div className="absolute inset-0 bg-dot-grid opacity-30" />
      <div className="absolute -top-40 left-1/4 w-96 h-96 bg-white/2 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-white/2 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 border border-white/10 rounded-full text-xs font-semibold text-neutral-400 bg-white/5 tracking-wider uppercase mb-4"
          >
            <Terminal className="w-3.5 h-3.5" />
            Interactive Demo
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold tracking-tight mb-4"
          >
            One Command to Secure & Deploy
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-neutral-400 max-w-2xl mx-auto text-base md:text-lg"
          >
            Watch the MISO CLI discover programs, build, perform static & AI auditing, verify evidence, check compliance rules, and deploy securely.
          </motion.p>
        </div>

        {/* Layout Grid: Terminal and Rating Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
          
          {/* Left: Terminal Card */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-8 border border-white/10 rounded-xl overflow-hidden shadow-2xl bg-[#0A0A0A] metallic-card group relative"
          >
            {/* Terminal Window Header */}
            <div className="bg-[#111111] px-4 py-3 border-b border-white/8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-neutral-800" />
                <span className="w-3 h-3 rounded-full bg-neutral-800" />
                <span className="w-3 h-3 rounded-full bg-neutral-800" />
              </div>
              <span className="text-xs font-mono text-neutral-400 tracking-wider">miso-cli</span>
              <div className="w-12" /> {/* spacing */}
            </div>

            {/* Terminal Window Body */}
            <div className="p-6 font-mono text-sm min-h-[300px] flex flex-col justify-start align-baseline bg-black/90">
              {/* Input Command Line */}
              <div className="flex items-center gap-2 text-white mb-4">
                <span className="text-neutral-500 font-bold select-none">$</span>
                <span>{typedText}</span>
                <motion.span 
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="w-2 h-4 bg-white"
                />
              </div>

              {/* Output log stack */}
              <div className="flex flex-col gap-2.5 text-neutral-300 font-sans select-none">
                {showOutput && OUTPUT_LINES.map((line, index) => {
                  const isVisible = currentLineIndex >= index;
                  const isSuccess = index === OUTPUT_LINES.length - 1;
                  
                  return (
                    <div 
                      key={index}
                      className={`transition-all duration-300 transform ${
                        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
                      } ${isSuccess ? 'text-white font-semibold' : 'text-neutral-300'}`}
                    >
                      {isVisible && (
                        <div className="flex items-center gap-2.5">
                          {isSuccess ? (
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          ) : (
                            <span className="text-white">•</span>
                          )}
                          <span className="font-mono text-xs md:text-sm">{line.text}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Right: Security Score Card */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="lg:col-span-4 border border-white/10 rounded-xl p-6 bg-[#0A0A0A] metallic-card relative overflow-hidden flex flex-col items-center text-center shadow-xl group hover:border-white/20 transition-all duration-300"
          >
            {/* Soft Ambient Inner Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/2 to-transparent pointer-events-none" />
            
            <Shield className="w-8 h-8 text-white mb-4 animate-float" />
            
            <h3 className="text-lg font-bold text-white mb-2">Program Security</h3>
            <p className="text-neutral-400 text-xs mb-6">MISO AI Policy Evaluation</p>

            {/* Circular Progress Gauge */}
            <div className="relative w-36 h-36 flex items-center justify-center mb-6">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="72"
                  cy="72"
                  r="60"
                  className="stroke-neutral-800"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Foreground Progress Ring */}
                <motion.circle
                  cx="72"
                  cy="72"
                  r="60"
                  className="stroke-white"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 60}
                  initial={{ strokeDashoffset: 2 * Math.PI * 60 }}
                  whileInView={{ strokeDashoffset: 2 * Math.PI * 60 * (1 - 0.98) }}
                  viewport={{ once: true }}
                  transition={{ duration: 2, ease: "easeOut", delay: 0.5 }}
                  strokeLinecap="round"
                />
              </svg>
              {/* Inner score label */}
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-white tracking-tight">98</span>
                <span className="text-neutral-500 text-xxs font-mono">/ 100</span>
              </div>
            </div>

            <div className="px-4 py-1.5 border border-white/10 rounded-full bg-white/5">
              <span className="text-xs font-semibold text-white uppercase tracking-widest glow-text-white">
                Excellent Status
              </span>
            </div>
            
            <p className="text-xs text-neutral-400 mt-4 max-w-[200px]">
              Ready for deploy. All critical policy gates passed successfully.
            </p>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
