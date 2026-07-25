import { MessageSquare } from 'lucide-react';

interface FooterProps {
  onNavigate: (section: string) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="bg-black border-t border-white/5 py-16 text-neutral-500 font-sans">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Footer Top Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          
          {/* Logo and Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onNavigate('home')}>
              <div className="w-6 h-6 border border-white/20 rounded bg-[#0A0A0A] flex items-center justify-center">
                <span className="text-white font-mono font-bold text-xs select-none">M.</span>
              </div>
              <span className="text-white font-bold tracking-widest text-sm font-sans">MISO</span>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed max-w-[200px]">
              Git for Solana Programs. The security-focused CI/CD pipeline built for high-throughput chains.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white select-none">Navigation</h4>
            <ul className="space-y-2 text-xs">
              {['Home', 'Docs', 'About'].map((item) => (
                <li key={item}>
                  <button 
                    onClick={() => onNavigate(item === 'About' ? 'why-miso' : item.toLowerCase())}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources & Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white select-none">Resources</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#github" className="hover:text-white transition-colors">GitHub Repository</a>
              </li>
              <li>
                <a href="#docs" className="hover:text-white transition-colors">CLI Reference</a>
              </li>
              <li>
                <a href="#docs" className="hover:text-white transition-colors">Security Policies</a>
              </li>
              <li>
                <a href="#license" className="hover:text-white transition-colors">Apache 2.0 License</a>
              </li>
            </ul>
          </div>

          {/* Connect / Socials */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white select-none">Community</h4>
            <div className="flex items-center gap-3">
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noreferrer"
                className="p-2 border border-white/8 hover:border-white/20 text-neutral-400 hover:text-white rounded bg-[#0A0A0A] hover:bg-[#111111] transition-all"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noreferrer"
                className="p-2 border border-white/8 hover:border-white/20 text-neutral-400 hover:text-white rounded bg-[#0A0A0A] hover:bg-[#111111] transition-all"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a 
                href="https://discord.com" 
                target="_blank" 
                rel="noreferrer"
                className="p-2 border border-white/8 hover:border-white/20 text-neutral-400 hover:text-white rounded bg-[#0A0A0A] hover:bg-[#111111] transition-all"
              >
                <MessageSquare className="w-4 h-4" />
              </a>
            </div>
            <p className="text-[10px] text-neutral-600 mt-2 select-none">
              Questions? Reach out to support or submit issues on GitHub.
            </p>
          </div>

        </div>

        {/* Divider */}
        <div className="h-px bg-white/5 w-full mb-8" />

        {/* Footer Bottom copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-neutral-600 select-none">
          <span>&copy; {new Date().getFullYear()} MISO CLI. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#security" className="hover:text-white transition-colors">Security Disclosure</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
