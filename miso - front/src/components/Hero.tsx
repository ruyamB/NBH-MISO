import { motion } from 'framer-motion';
import { ArrowRight, Terminal, BookOpen, ShieldCheck } from 'lucide-react';
import ThreeEmblem from './ThreeEmblem';

interface HeroProps {
  onNavigate: (section: string) => void;
}

export default function Hero({ onNavigate }: HeroProps) {
  return (
    <section id="home" className="pt-32 pb-20 relative bg-black overflow-hidden border-b border-white/5">
      {/* Background ambient noise/grid */}
      <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
      
      {/* Dynamic spotlights in background */}
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-white/2 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-10 w-[300px] h-[300px] bg-white/2 rounded-full blur-[100px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero Left Content (Cols 1-6) */}
          <div className="lg:col-span-6 space-y-8 text-left">
            
            {/* Small Badge */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 text-xxs font-mono text-neutral-400 tracking-wider uppercase font-semibold"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
              Powered by Solana
            </motion.div>

            {/* Huge Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.05] text-white font-sans"
            >
              Build Secure. <br />
              Ship with <span className="bg-gradient-to-r from-white via-neutral-300 to-neutral-400 bg-clip-text text-transparent font-extrabold">Confidence.</span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-neutral-400 text-sm sm:text-base leading-relaxed max-w-xl"
            >
              MISO is the developer-first CLI that discovers, audits, verifies, and deploys Solana smart contracts through one reproducible, secure pipeline.
            </motion.p>

            {/* Call to Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row items-center gap-4 pt-2"
            >
              <button 
                onClick={() => onNavigate('docs')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 border border-white bg-white text-black font-semibold text-sm rounded-lg hover:bg-neutral-200 transition-all duration-300 shadow-lg hover:shadow-white/5 cursor-pointer group"
              >
                Get Started
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button 
                onClick={() => onNavigate('docs')}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 border border-white/10 hover:border-white/20 text-neutral-300 hover:text-white bg-[#0A0A0A] hover:bg-[#111111] font-semibold text-sm rounded-lg transition-all duration-300 cursor-pointer group"
              >
                Read Docs
                <BookOpen className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
              </button>
            </motion.div>

            {/* Logos of Trust Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="pt-12 border-t border-white/5 space-y-4"
            >
              <p className="text-xxs font-mono text-neutral-500 uppercase tracking-wider font-bold">
                MAINTAINED BY SOLANA DEVELOPERS
              </p>
              
              <div className="flex items-center flex-wrap gap-x-4 sm:gap-x-6 gap-y-2.5 text-neutral-500 text-xs select-none">
                
                {/* Solana */}
                <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                  <svg className="w-3.5 h-3 fill-current text-white" viewBox="0 0 24 24">
                    <path d="M0 3.822l3.56 3.56h16.88L24 3.822H3.56zM24 12.178l-3.56-3.56H3.56L0 12.178h20.44zM0 20.178l3.56 3.56h16.88l3.56-3.56H3.56z"/>
                  </svg>
                  <span className="font-sans font-extrabold tracking-wider text-[11px] text-white">SOLANA</span>
                </div>

                <span className="text-neutral-800 text-xxs font-light">|</span>

                {/* Anchor */}
                <div className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
                  <span className="text-xs">⚓</span>
                  <span className="font-sans font-bold text-[11px] text-white tracking-wide">anchor</span>
                </div>

                <span className="text-neutral-800 text-xxs font-light">|</span>

                {/* Rust */}
                <div className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
                  <svg className="w-3.5 h-3.5 fill-current text-white" viewBox="0 0 24 24">
                    <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 18c-3.313 0-6-2.687-6-6s2.687-6 6-6 6 2.687 6 6-2.687 6-6 6z"/>
                  </svg>
                  <span className="font-sans font-bold text-[11px] text-white tracking-wide">Rust</span>
                </div>

                <span className="text-neutral-800 text-xxs font-light">|</span>

                {/* Jito */}
                <div className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
                  <span className="font-sans font-extrabold text-[11px] text-white tracking-wide">Jito</span>
                </div>

              </div>
            </motion.div>

          </div>

          {/* Hero Right Content (Cols 7-12) */}
          <div className="lg:col-span-6 relative flex items-center justify-center w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg mx-auto flex items-center justify-center p-2 sm:p-4"
            >
              <ThreeEmblem />
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
