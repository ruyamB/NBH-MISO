import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface PreloaderProps {
  onComplete: () => void;
}

function IsoCube({ cx, cy, active }: { cx: number; cy: number; active: boolean }) {
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.8 }}
      animate={active ? { opacity: 1, scale: 1.05 } : { opacity: 0.15, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Top Face */}
      <path 
        d={`M ${cx} ${cy - 18} L ${cx + 26} ${cy - 5} L ${cx} ${cy + 8} L ${cx - 26} ${cy - 5} Z`} 
        fill="none" 
        stroke="#ffffff" 
        strokeWidth="1.2" 
        strokeLinejoin="round"
        className={active ? "glow-stroke" : ""}
      />
      {/* Left Face */}
      <path 
        d={`M ${cx - 26} ${cy - 5} L ${cx} ${cy + 8} L ${cx} ${cy + 28} L ${cx - 26} ${cy + 15} Z`} 
        fill="none" 
        stroke="#888888" 
        strokeWidth="1.2" 
        strokeLinejoin="round"
      />
      {/* Right Face */}
      <path 
        d={`M ${cx + 26} ${cy - 5} L ${cx} ${cy + 8} L ${cx} ${cy + 28} L ${cx + 26} ${cy + 15} Z`} 
        fill="none" 
        stroke="#444444" 
        strokeWidth="1.2" 
        strokeLinejoin="round"
      />
      {/* Glowing center indicator */}
      {active && (
        <circle cx={cx} cy={cy} r="3" fill="#ffffff" className="animate-ping" />
      )}
    </motion.g>
  );
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const [progress, setProgress] = useState(0);
  const [statusLog, setStatusLog] = useState('[SECURE] Initializing secure sandbox environment...');

  useEffect(() => {
    // Tick percentage from 0 to 100
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        // Random increment speed
        const increment = Math.floor(Math.random() * 4) + 2;
        const next = prev + increment;
        return next > 100 ? 100 : next;
      });
    }, 60);

    return () => clearInterval(timer);
  }, []);

  // Update terminal console status logs based on percentage
  useEffect(() => {
    if (progress < 25) {
      setStatusLog('[SECURE] Initializing secure sandbox environment...');
    } else if (progress < 50) {
      setStatusLog('[NETWORK] Verifying Solana RPC ledger node connection...');
    } else if (progress < 75) {
      setStatusLog('[AUDIT] Discovering workspace cargo files & Rust entrypoints...');
    } else if (progress < 95) {
      setStatusLog('[POLICY] Asserting gatekeeper compliance deployment rules...');
    } else {
      setStatusLog('[READY] Cryptographic verification complete. MISO pipeline ready.');
    }

    if (progress === 100) {
      const exitTimeout = setTimeout(() => {
        onComplete();
      }, 700);
      return () => clearTimeout(exitTimeout);
    }
  }, [progress, onComplete]);

  // Map progress to cube activation
  const cube1Active = progress >= 0;
  const line1Active = progress >= 30;
  const cube2Active = progress >= 45;
  const line2Active = progress >= 70;
  const cube3Active = progress >= 85;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center select-none overflow-hidden">
      
      {/* Dynamic Background Mesh */}
      <div className="absolute inset-0 bg-dot-grid opacity-15 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/2 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm px-6 flex flex-col items-center">
        
        {/* Blockchain Visualizer SVG */}
        <div className="w-full h-36 flex items-center justify-center mb-8">
          <svg className="w-full h-full max-w-[280px]" viewBox="0 0 300 120" fill="none">
            {/* Connecting line 1 */}
            <line 
              x1="76" y1="55" x2="124" y2="55" 
              stroke="#ffffff" 
              strokeWidth="1.2" 
              strokeDasharray="4 4"
              className={`transition-opacity duration-500 ${line1Active ? 'opacity-80 animate-flow-dash' : 'opacity-10'}`}
            />
            {/* Connecting line 2 */}
            <line 
              x1="176" y1="55" x2="224" y2="55" 
              stroke="#ffffff" 
              strokeWidth="1.2" 
              strokeDasharray="4 4"
              className={`transition-opacity duration-500 ${line2Active ? 'opacity-80 animate-flow-dash' : 'opacity-10'}`}
            />

            {/* Blocks */}
            <IsoCube cx={50} cy={60} active={cube1Active} />
            <IsoCube cx={150} cy={60} active={cube2Active} />
            <IsoCube cx={250} cy={60} active={cube3Active} />
          </svg>
        </div>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold font-mono tracking-widest text-white mb-1 uppercase">
            MISO PIPELINE
          </h2>
          <p className="text-neutral-500 text-xxs font-mono uppercase tracking-wider">
            Reproducible Security Pipeline
          </p>
        </div>

        {/* Progress Counter */}
        <div className="w-full bg-white/5 border border-white/5 rounded-lg p-4 font-mono text-center mb-4">
          <div className="text-2xl font-black text-white tracking-tight mb-1">
            {progress}%
          </div>
          <div className="w-full bg-neutral-950 h-1 rounded-full overflow-hidden">
            <motion.div 
              className="bg-white h-full"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Real-time Status Console Output */}
        <div className="w-full h-12 flex items-center justify-center text-center font-mono text-[10px] text-neutral-400 px-4 leading-normal">
          {statusLog}
        </div>

      </div>

      {/* Embedded CSS for SVG flow animation */}
      <style>{`
        @keyframes flowDash {
          to {
            stroke-dashoffset: -20px;
          }
        }
        .animate-flow-dash {
          animation: flowDash 1.5s linear infinite;
        }
        .glow-stroke {
          filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.4));
        }
      `}</style>
    </div>
  );
}
