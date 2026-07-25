import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Terminal, FileCode, Play } from 'lucide-react';

interface CodeSnippet {
  id: string;
  name: string;
  filename: string;
  lang: string;
  code: string;
}

const SNIPPETS: CodeSnippet[] = [
  {
    id: 'install',
    name: 'Installation',
    filename: 'terminal',
    lang: 'bash',
    code: `# Install the MISO CLI package
npm i @ruyam/miso-cli`
  },
  {
    id: 'init',
    name: 'Initialization',
    filename: 'terminal',
    lang: 'bash',
    code: `# Scan and analyze your Solana project
npx miso scan`
  },
  {
    id: 'push',
    name: 'Deployment',
    filename: 'terminal',
    lang: 'bash',
    code: `# Deploy your smart contracts securely
npx miso deploy`
  }
];

export default function CodeWindow() {
  const [activeTab, setActiveTab] = useState('install');
  const [copied, setCopied] = useState(false);

  const activeSnippet = SNIPPETS.find((s) => s.id === activeTab) || SNIPPETS[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeSnippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-24 relative bg-[#000000] border-b border-white/5 overflow-hidden">
      <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-white/2 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Section header */}
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-5xl font-black tracking-tight mb-4"
          >
            Simple Integration
          </motion.h2>
          <p className="text-neutral-400 max-w-xl mx-auto text-base">
            No heavy configuration, no complex setup. Install the CLI, declare your policy bounds, and deploy safely.
          </p>
        </div>

        {/* Code Mock Editor Wrapper */}
        <div className="max-w-3xl mx-auto border border-white/10 rounded-xl overflow-hidden shadow-2xl bg-[#0A0A0A] metallic-card">
          
          {/* Header containing tabs and action buttons */}
          <div className="bg-[#111111] px-4 py-2.5 border-b border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            {/* Tabs list */}
            <div className="flex items-center gap-1">
              {SNIPPETS.map((snippet) => (
                <button
                  key={snippet.id}
                  onClick={() => {
                    setActiveTab(snippet.id);
                    setCopied(false);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono tracking-tight transition-all duration-200 cursor-pointer ${
                    activeTab === snippet.id
                      ? 'bg-white/10 text-white font-semibold'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {snippet.name}
                </button>
              ))}
            </div>

            {/* File info + Copy Action */}
            <div className="flex items-center justify-between sm:justify-end gap-4">
              <span className="text-xs font-mono text-neutral-500 flex items-center gap-1.5 select-none">
                {activeSnippet.filename.includes('.') ? (
                  <FileCode className="w-3.5 h-3.5" />
                ) : (
                  <Terminal className="w-3.5 h-3.5" />
                )}
                {activeSnippet.filename}
              </span>
              
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1 border border-white/8 rounded-md bg-[#0A0A0A] hover:bg-[#111111] hover:border-white/20 transition-all text-xs text-neutral-400 hover:text-white cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-white" />
                    <span className="font-mono">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span className="font-mono">Copy</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Editor Body */}
          <div className="p-6 font-mono text-xs md:text-sm bg-black/90 overflow-x-auto min-h-[180px] flex justify-between select-text leading-relaxed">
            
            {/* Syntax Highlight Lines */}
            <div className="w-full text-left">
              <AnimatePresence mode="wait">
                <motion.pre
                  key={activeTab}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="text-neutral-300 whitespace-pre-wrap font-mono"
                >
                  {/* Parsing snippet for custom inline styling (monochrome-friendly) */}
                  {activeSnippet.code.split('\n').map((line, idx) => {
                    if (line.startsWith('#')) {
                      return <span key={idx} className="block text-neutral-600">{line}</span>;
                    }
                    // Simple highlighting for key CLI operations or strings
                    const formattedLine = line
                      .replace(/(cargo install|miso init|miso push|miso --version)/g, '<span class="text-white font-bold">$1</span>')
                      .replace(/(--locked|--cluster|--verify)/g, '<span class="text-neutral-400 font-semibold">$1</span>')
                      .replace(/("devnet"|"mainnet-beta"|\[program\.security\])/g, '<span class="text-neutral-300 font-semibold">$1</span>');

                    return (
                      <span
                        key={idx}
                        className="block"
                        dangerouslySetInnerHTML={{ __html: formattedLine }}
                      />
                    );
                  })}
                </motion.pre>
              </AnimatePresence>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
