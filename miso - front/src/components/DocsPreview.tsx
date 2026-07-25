import React from 'react';
import { BookOpen, AlertCircle, ShieldAlert, Cpu, Layers, HardDrive, KeyRound, HelpCircle, Terminal } from 'lucide-react';

export default function DocsPreview() {
  const chapters = [
    { id: 'ch1', title: 'Chapter 1: Installation & Setup', icon: <Terminal className="w-4 h-4" /> },
    { id: 'ch2', title: 'Chapter 2: Smart Contract Auditing', icon: <Cpu className="w-4 h-4" /> },
    { id: 'ch3', title: 'Chapter 3: Secure Deployments', icon: <Layers className="w-4 h-4" /> },
    { id: 'ch4', title: 'Chapter 4: MisoHub Integration', icon: <HardDrive className="w-4 h-4" /> },
    { id: 'ch5', title: 'Chapter 5: Revoking System Access', icon: <KeyRound className="w-4 h-4" /> },
    { id: 'ch6', title: 'Chapter 6: CLI Manual & Help', icon: <HelpCircle className="w-4 h-4" /> },
  ];

  const handleScrollToChapter = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section id="docs" className="py-24 relative bg-[#000000] border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Heading */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-white/10 rounded-full text-xs font-semibold text-neutral-400 bg-white/5 tracking-wider uppercase mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            Developer Handbook
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-4">
            Designed to Document.
          </h2>
          <p className="text-neutral-400 max-w-xl mx-auto text-sm sm:text-base">
            Explore MISO’s complete operational guides, pipeline options, and CLI command reference structured in easy-to-read chapters.
          </p>
        </div>

        {/* Blog / Handbook Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Side: Sticky Chapters Index */}
          <div className="lg:col-span-4 sticky top-24 hidden lg:block border border-white/8 bg-[#050505] p-6 rounded-xl">
            <h3 className="text-xs font-mono font-bold tracking-widest text-neutral-500 uppercase mb-4 select-none">
              Table of Chapters
            </h3>
            <nav className="flex flex-col gap-2">
              {chapters.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => handleScrollToChapter(ch.id)}
                  className="flex items-center gap-3 text-left px-3 py-2.5 rounded-lg text-xs font-mono text-neutral-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  <span className="text-neutral-600 group-hover:text-white">{ch.icon}</span>
                  {ch.title}
                </button>
              ))}
            </nav>
            <div className="h-px bg-white/5 my-6" />
            <div className="text-xxs text-neutral-500 font-mono leading-relaxed">
              Reading Time: ~6 mins. Updates and community notes are synced directly with our main repository.
            </div>
          </div>

          {/* Right Side: Scrollable Blog Article Feed */}
          <div className="lg:col-span-8 space-y-24 text-left max-w-3xl selection:bg-white selection:text-black">
            
            {/* Chapter 1 */}
            <article id="ch1" className="scroll-mt-28 space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">CHAPTER 01</span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  Installation & Environment Setup
                </h2>
              </div>
              <p className="text-neutral-400 text-sm leading-relaxed">
                MISO is distributed as a lightweight CLI tool built to unify smart contract development pipelines. 
                Before installing MISO, make sure you have <strong>Node.js (v18+)</strong> and <strong>npm</strong> configured on your system environment.
              </p>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Run the command below in your terminal to install the MISO package globally, allowing execution from any directory context:
              </p>
              
              <div className="p-5 border border-white/8 bg-[#080808] rounded-xl space-y-2">
                <h4 className="text-xxs font-mono text-neutral-500 uppercase tracking-wider">SHELL INSTALLATION</h4>
                <code className="text-xs text-white block select-all font-mono">npm i @ruyam/miso-cli</code>
              </div>

              <p className="text-neutral-400 text-sm leading-relaxed">
                Verify the installation by running a quick version query command:
              </p>

              <div className="p-5 border border-white/8 bg-[#080808] rounded-xl space-y-2">
                <h4 className="text-xxs font-mono text-neutral-500 uppercase tracking-wider">VERIFICATION</h4>
                <code className="text-xs text-white block select-all font-mono">npx miso --version</code>
              </div>
            </article>

            {/* Chapter 2 */}
            <article id="ch2" className="scroll-mt-28 space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">CHAPTER 02</span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  Smart Contract Auditing & AI Configuration
                </h2>
              </div>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Automated auditing forms the defensive core of the MISO compiler workflow. 
                MISO scans program structures, parsing PDA mappings, constraint logic validations, and checking for numeric overflows.
              </p>
              <p className="text-neutral-400 text-sm leading-relaxed">
                You can audit an entire directory, target isolated files, configure AI provider credentials, or track AI token usage for scans.
              </p>

              <div className="space-y-4">
                <div className="p-5 border border-white/8 bg-[#080808] rounded-xl">
                  <h4 className="text-sm font-bold text-white mb-1">Full Project Audit</h4>
                  <p className="text-xs text-neutral-500 mb-3">Scans the entire workspace root automatically detecting smart contracts.</p>
                  <code className="text-xs text-white block select-all font-mono">npx miso scan</code>
                </div>

                <div className="p-5 border border-white/8 bg-[#080808] rounded-xl">
                  <h4 className="text-sm font-bold text-white mb-1">Targeted File Audit</h4>
                  <p className="text-xs text-neutral-500 mb-3">Audits only the selected smart contract paths specified in arguments.</p>
                  <code className="text-xs text-white block select-all font-mono">npx miso scan --file [contract-path1] [contract-path2]</code>
                </div>

                <div className="p-5 border border-white/8 bg-[#080808] rounded-xl">
                  <h4 className="text-sm font-bold text-white mb-1">AI Provider Key Configuration</h4>
                  <p className="text-xs text-neutral-500 mb-3">
                    Input your Groq (<code>gsk_...</code>) or Gemini (<code>AIza...</code>) API key to scan contracts using AI model evaluation. Without an API key, MISO automatically defaults to fast local static analysis.
                  </p>
                  <div className="space-y-2 font-mono">
                    <code className="text-xs text-white block select-all font-mono">npx miso provider</code>
                    <code className="text-xs text-white block select-all font-mono">npx miso provider-[your-api-key]</code>
                  </div>
                </div>

                <div className="p-5 border border-white/8 bg-[#080808] rounded-xl">
                  <h4 className="text-sm font-bold text-white mb-1">Recent Scan Token Usage</h4>
                  <p className="text-xs text-neutral-500 mb-3">Displays token consumption statistics and usage metrics for the most recent scan.</p>
                  <div className="space-y-2 font-mono">
                    <code className="text-xs text-white block select-all font-mono">npx miso usage</code>
                    <code className="text-xs text-white block select-all font-mono">npx miso usage [api-key]</code>
                  </div>
                </div>
              </div>
            </article>

            {/* Chapter 3 */}
            <article id="ch3" className="scroll-mt-28 space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">CHAPTER 03</span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  Verifiable Deployments & Security Gates
                </h2>
              </div>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Deploying compiled smart contracts without safety assurance is risky. MISO handles the signature pipeline and asserts security metrics before code reaches mainnets.
              </p>
              
              <div className="space-y-4">
                <div className="p-5 border border-white/8 bg-[#080808] rounded-xl">
                  <h4 className="text-sm font-bold text-white mb-1">Standard Secure Deploy</h4>
                  <p className="text-xs text-neutral-500 mb-3">Runs full audits first; aborts build and deployment if any security bounds fail.</p>
                  <code className="text-xs text-white block select-all font-mono">npx miso deploy</code>
                </div>

                <div className="p-5 border border-white/8 bg-[#080808] rounded-xl">
                  <h4 className="text-sm font-bold text-white mb-1">Targeted Deploy</h4>
                  <p className="text-xs text-neutral-500 mb-3">Deploys only the chosen compiled smart contract paths.</p>
                  <code className="text-xs text-white block select-all font-mono">npx miso deploy --file [contract-path1] [contract-path2]</code>
                </div>

                <div className="p-5 border border-red-950/20 bg-red-950/5 rounded-xl">
                  <h4 className="text-sm font-bold text-red-400 mb-1 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                    Forced Deployment (Not Recommended)
                  </h4>
                  <p className="text-xs text-neutral-500 mb-3">
                    Forces deployment, skipping all policy checks, vulnerability evaluations, and static audit gates.
                  </p>
                  <code className="text-xs text-red-300 block select-all font-mono bg-black/40 p-2.5 rounded border border-red-900/30">npx miso deploy --force</code>
                </div>
              </div>
            </article>

            {/* Chapter 4 */}
            <article id="ch4" className="scroll-mt-28 space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">CHAPTER 04</span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  MisoHub synchronization & Logs
                </h2>
              </div>
              <p className="text-neutral-400 text-sm leading-relaxed">
                MisoHub provides your team with centralized verification. Saving audit logs to MisoHub allows decentralized protocols to verify smart contracts on-chain.
              </p>

              <div className="space-y-4">
                <div className="p-5 border border-white/8 bg-[#080808] rounded-xl">
                  <h4 className="text-sm font-bold text-white mb-1">Save Entire Workspace</h4>
                  <p className="text-xs text-neutral-500 mb-3">Synchronizes complete audit logs, configuration specs, and proofs to MisoHub.</p>
                  <code className="text-xs text-white block select-all font-mono">npx miso save</code>
                </div>

                <div className="p-5 border border-white/8 bg-[#080808] rounded-xl">
                  <h4 className="text-sm font-bold text-white mb-1">Save Selected Files</h4>
                  <p className="text-xs text-neutral-500 mb-3">Pushes logs targeting only selected smart contract code segments.</p>
                  <code className="text-xs text-white block select-all font-mono">npx miso save --file [contract-path1] [contract-path2]</code>
                </div>

                <div className="p-5 border border-white/8 bg-[#080808] rounded-xl">
                  <h4 className="text-sm font-bold text-white mb-1">Check Audit History</h4>
                  <p className="text-xs text-neutral-500 mb-3">Queries local history and synchronized verification logs from MisoHub.</p>
                  <code className="text-xs text-white block select-all font-mono">npx miso history</code>
                </div>
              </div>
            </article>

            {/* Chapter 5 */}
            <article id="ch5" className="scroll-mt-28 space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">CHAPTER 05</span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  Revoking System Credentials & Keys
                </h2>
              </div>
              <p className="text-neutral-400 text-sm leading-relaxed">
                If you are decommissioning a system or rotating keys, MISO allows complete cleanup. 
                Revoking access wipes all local configurations, deletes stored verification caches, and disconnects the machine from your MisoHub portal.
              </p>

              <div className="p-5 border-l-2 border-red-500 bg-red-950/5 rounded-r-xl flex items-start gap-3 my-4">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="text-xs text-neutral-400">
                  <strong className="text-red-400">Caution:</strong> Wiping credentials destroys local audit logs and disconnects MisoHub history. Recovery requires registering a new device.
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-5 border border-white/8 bg-[#080808] rounded-xl">
                  <h4 className="text-sm font-bold text-white mb-1">Standard Revoke (Interactive)</h4>
                  <p className="text-xs text-neutral-500 mb-3">Prompts for user approval before deleting local caches and keys.</p>
                  <code className="text-xs text-white block select-all font-mono">npx miso revoke</code>
                </div>

                <div className="p-5 border border-white/8 bg-[#080808] rounded-xl">
                  <h4 className="text-sm font-bold text-white mb-1">Forced Revoke (Auto-Confirm)</h4>
                  <p className="text-xs text-neutral-500 mb-3">Cleans the configuration instantly without interactive prompt loops.</p>
                  <div className="space-y-2 font-mono">
                    <code className="text-xs text-white block select-all">npx miso revoke --y</code>
                    <code className="text-xs text-white block select-all">npx miso revoke --yes</code>
                  </div>
                </div>
              </div>
            </article>

            {/* Chapter 6 */}
            <article id="ch6" className="scroll-mt-28 space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">CHAPTER 06</span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  CLI Instruction Manual & Help
                </h2>
              </div>
              <p className="text-neutral-400 text-sm leading-relaxed">
                The command line interface is fully self-documenting. If you forget specific options, need to look up argument formats, or inspect flag constraints, trigger the built-in manual:
              </p>

              <div className="p-5 border border-white/8 bg-[#080808] rounded-xl space-y-4">
                <h4 className="text-xxs font-mono text-neutral-500 uppercase tracking-wider">SHELL MANUAL</h4>
                <code className="text-xs text-white block select-all font-mono">npx miso help</code>
                
                <div className="h-px bg-white/5 my-3" />
                <h4 className="text-xxs font-mono text-neutral-500 uppercase tracking-wider">COMMAND QUICK REFERENCE</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                    <span className="text-white font-bold block mb-1">npx miso scan</span>
                    <span className="text-neutral-400 text-xxs font-sans">Run local static & AI audit scan</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                    <span className="text-white font-bold block mb-1">npx miso provider</span>
                    <span className="text-neutral-400 text-xxs font-sans">Set Groq/Gemini API key for AI scans</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                    <span className="text-white font-bold block mb-1">npx miso usage</span>
                    <span className="text-neutral-400 text-xxs font-sans">View token usage of recent scan</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                    <span className="text-white font-bold block mb-1">npx miso deploy</span>
                    <span className="text-neutral-400 text-xxs font-sans">Gatekeeper security & deployment</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                    <span className="text-white font-bold block mb-1">npx miso save</span>
                    <span className="text-neutral-400 text-xxs font-sans">Sync audit proofs to MisoHub</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                    <span className="text-white font-bold block mb-1">npx miso revoke</span>
                    <span className="text-neutral-400 text-xxs font-sans">Wipe credentials & local caches</span>
                  </div>
                </div>
              </div>
            </article>

          </div>

        </div>

      </div>
    </section>
  );
}
