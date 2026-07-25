import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, LogOut, History, ChevronRight, Copy, Check, Lock, ArrowUpRight, Plus, RotateCw, Eye, EyeOff } from 'lucide-react';

interface ContractVersion {
  id?: number;
  version: string;
  deployed_at: string;
  audit_score: number;
  commit_hash: string;
  verified_by: string;
  status: 'active' | 'archived';
  code_snippet: string;
}

interface Toast {
  message: string;
  type: 'error' | 'success' | 'info';
  id: number;
}

export default function HubPage() {
  const [username, setUsername] = useState('');
  const [authKey, setAuthKey] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [copied, setCopied] = useState(false);
  const [versions, setVersions] = useState<ContractVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<ContractVersion | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [newVersionInput, setNewVersionInput] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { message, type, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const API_BASE = "http://localhost:3001/api";

  // Generate deterministic 8-char key based on username
  const generateKeyForUser = (userStr: string): string => {
    if (!userStr.trim()) return '';
    let hash = 0;
    const cleanUser = userStr.trim();
    for (let i = 0; i < cleanUser.length; i++) {
      hash = cleanUser.charCodeAt(i) + ((hash << 5) - hash);
    }
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    for (let i = 0; i < 8; i++) {
      const idx = Math.abs((hash + i * 37)) % chars.length;
      key += chars[idx];
    }
    return key;
  };

  // Fetch versions from database
  const fetchVersions = async (user: string) => {
    try {
      const res = await fetch(`${API_BASE}/versions/${user}`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
        if (data.length > 0) {
          setSelectedVersion(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch versions from backend", err);
    }
  };

  // Restore session
  useEffect(() => {
    const savedUser = localStorage.getItem('miso_hub_user');
    const savedKey = localStorage.getItem('miso_hub_key');

    if (savedUser && savedKey) {
      setUsername(savedUser);
      setAuthKey(savedKey);
      setIsRegistered(true);
      setIsLoggedIn(true);
      fetchVersions(savedUser);
    }
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    const cleanUser = username.trim();
    
    try {
      // Check if user exists in db
      const checkRes = await fetch(`${API_BASE}/users/check/${cleanUser}`);
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.exists) {
          setIsNewUser(false);
          setIsRegistered(true);
        } else {
          // New user signup
          const generated = generateKeyForUser(username);
          setAuthKey(generated);
          setIsNewUser(true);
          setIsRegistered(true);
        }
      }
    } catch (err) {
      showToast("Failed to connect to authentication server. Make sure server is running.", "error");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = inputKey.trim();
    const cleanUser = username.trim();

    if (isNewUser) {
      if (cleanKey === authKey) {
        try {
          const res = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: cleanUser, auth_key: authKey })
          });
          if (res.ok) {
            setIsLoggedIn(true);
            localStorage.setItem('miso_hub_user', cleanUser);
            localStorage.setItem('miso_hub_key', authKey);
            fetchVersions(cleanUser);
            showToast("Successfully registered and logged in!", "success");
          }
        } catch (err) {
          showToast("Failed to connect to authentication server.", "error");
        }
      } else {
        showToast('Invalid password! Please enter the correct generated password.', 'error');
      }
    } else {
      // Existing user: check key against login verification endpoint
      try {
        const res = await fetch(`${API_BASE}/users/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUser, auth_key: cleanKey })
        });
        if (res.ok) {
          setIsLoggedIn(true);
          localStorage.setItem('miso_hub_user', cleanUser);
          localStorage.setItem('miso_hub_key', cleanKey);
          fetchVersions(cleanUser);
          showToast("Successfully logged in!", "success");
        } else {
          showToast('Incorrect password! Access denied.', 'error');
        }
      } catch (err) {
        showToast("Failed to connect to authentication server.", "error");
      }
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(authKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem('miso_hub_user');
    localStorage.removeItem('miso_hub_key');
    setIsLoggedIn(false);
    setIsRegistered(false);
    setIsNewUser(false);
    setUsername('');
    setAuthKey('');
    setInputKey('');
    setVersions([]);
    setSelectedVersion(null);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchVersions(username);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleSimulateDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    const verInput = newVersionInput.trim();
    if (!verInput) return;
    setIsDeploying(true);

    try {
      const res = await fetch(`${API_BASE}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          version: verInput,
          deployed_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
          audit_score: Math.floor(Math.random() * 5) + 95, // 95 - 100
          commit_hash: Math.random().toString(16).substring(2, 10),
          verified_by: 'MISO Pipeline Validator',
          status: 'active',
          code_snippet: `// Deployed Version: ${verInput}\n// Fully compiled and validated program.\nuse anchor_lang::prelude::*;\n\n// Address and accounts initialized successfully.`
        })
      });
      
      if (res.ok) {
        await fetchVersions(username);
        setNewVersionInput('');
        showToast(`Version ${verInput} successfully deployed!`, "success");
      }
    } catch (err) {
      showToast("Failed to record version on backend server.", "error");
    } finally {
      setIsDeploying(false);
    }
  };

  const handleNavigate = (id: string) => {
    window.location.href = `/#${id}`;
  };

  return (
    <div className="bg-[#000000] min-h-screen text-white relative flex flex-col justify-between">
      <Navbar activeSection="hub" onNavigate={handleNavigate} />
      
      <main className="pt-24 flex-grow px-6 max-w-7xl mx-auto w-full pb-16">
        <AnimatePresence mode="wait">
          {!isLoggedIn ? (
            <motion.div 
              key="auth-container"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto my-12 p-8 border border-white/8 bg-[#050505] rounded-2xl shadow-2xl relative z-10"
            >
              <div className="flex flex-col items-center text-center space-y-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-white">
                  Access MISO Hub
                </h2>
                <p className="text-neutral-400 text-xs">
                  Create or enter your developer account credentials to inspect smart contract versions.
                </p>
              </div>

              {!isRegistered ? (
                // Step 1: Sign up / Enter Username
                <form onSubmit={handleRegister} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xxs font-mono uppercase tracking-wider text-neutral-500 block text-left">
                      Username / Organization
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. SOLANA_DEV"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-white/8 focus:border-white/30 rounded-lg p-3 text-sm font-mono text-white outline-none transition-all"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-white hover:bg-neutral-200 text-black font-semibold p-3 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                // Step 2: Show unique code and ask for verification
                <form onSubmit={handleLogin} className="space-y-6">
                  {isNewUser ? (
                    <div className="p-4 border border-white/8 bg-[#0A0A0A] rounded-lg space-y-3 text-left">
                      <span className="text-xxs font-mono uppercase tracking-wider text-neutral-400 block font-bold">
                        New Account Detected
                      </span>
                      <p className="text-xs text-neutral-400 leading-normal">
                        We generated a secure password for your fresh user account. Copy and use this password below to complete registration.
                      </p>
                      <div className="p-3 border border-white/5 bg-black rounded-lg space-y-2">
                        <span className="text-xxs font-mono uppercase tracking-wider text-neutral-500 block">
                          Your Generated Password
                        </span>
                        <div className="flex items-center justify-between">
                          <code className="text-lg font-mono font-bold tracking-widest text-white">{authKey}</code>
                          <button 
                            type="button"
                            onClick={handleCopyKey}
                            className="p-2 border border-white/8 hover:bg-white/5 rounded-md text-neutral-400 hover:text-white transition-colors cursor-pointer"
                          >
                            {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border border-white/8 bg-[#0A0A0A] rounded-lg space-y-2 text-left">
                      <span className="text-xxs font-mono uppercase tracking-wider text-neutral-400 block font-bold font-mono">
                        User Account Found
                      </span>
                      <p className="text-xs text-neutral-400 leading-normal font-sans">
                        Welcome back! The username <strong className="text-white font-mono">{username}</strong> is registered. Please enter your password below to log in.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2 text-left">
                    <label className="text-xxs font-mono uppercase tracking-wider text-neutral-500 block">
                      {isNewUser ? "Verify Password" : "Password"}
                    </label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder={isNewUser ? "Enter the generated password" : "Enter your password"}
                        value={inputKey}
                        onChange={(e) => setInputKey(e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-white/8 focus:border-white/30 rounded-lg p-3 pr-10 text-sm font-mono text-white tracking-widest outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsRegistered(false)}
                      className="w-1/3 border border-white/8 hover:bg-white/5 text-neutral-400 hover:text-white font-medium p-3 text-sm rounded-lg transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button 
                      type="submit"
                      className="w-2/3 bg-white hover:bg-neutral-200 text-black font-bold p-3 text-sm rounded-lg transition-colors cursor-pointer"
                    >
                      {isNewUser ? "Register & Access Hub" : "Access Hub"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          ) : (
            // Logged In: Version Control Hub
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Hub Top Panel */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-white/8 pb-8">
                <div className="space-y-1">
                  <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    MISO HUB PORTAL
                  </span>
                  <h1 className="text-3xl font-extrabold text-white tracking-tight">
                    Welcome back, <span className="underline decoration-white/20">{username}</span>
                  </h1>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 border border-white/8 hover:border-white/20 text-neutral-400 hover:text-white bg-[#0A0A0A] hover:bg-[#111111] px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider font-mono cursor-pointer transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    LOGOUT
                  </button>
                </div>
              </div>

              {/* Grid: List of Versions vs Code/Details */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Side: Version Feed */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* Simulate Deployment Box */}
                  <div className="border border-white/8 bg-[#050505] p-5 rounded-xl space-y-4">
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-white" />
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Simulate New Deployment</span>
                    </div>
                    <form onSubmit={handleSimulateDeploy} className="flex gap-2">
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. v2.2.0" 
                        value={newVersionInput}
                        onChange={(e) => setNewVersionInput(e.target.value)}
                        disabled={isDeploying}
                        className="flex-grow bg-[#0A0A0A] border border-white/8 focus:border-white/30 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none transition-all disabled:opacity-50"
                      />
                      <button 
                        type="submit" 
                        disabled={isDeploying}
                        className="bg-white hover:bg-neutral-200 text-black text-xs font-bold font-mono px-4 py-2 rounded-lg cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isDeploying ? 'SCANNING...' : 'DEPLOY'}
                      </button>
                    </form>
                  </div>

                  {/* Versions List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-mono font-bold tracking-widest text-neutral-500 uppercase flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5" />
                        Contract Version History
                      </h3>
                      <button 
                        onClick={handleManualRefresh}
                        disabled={isRefreshing}
                        title="Sync with Database"
                        className={`p-1.5 rounded-md border border-white/5 hover:border-white/15 bg-[#0A0A0A] text-neutral-400 hover:text-white transition-all cursor-pointer ${
                          isRefreshing ? 'animate-spin' : ''
                        }`}
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>
                    </div>

                    {versions.length === 0 ? (
                      <div className="p-8 border border-dashed border-white/10 rounded-xl text-center text-neutral-500 text-xs font-mono">
                        No contract versions deployed yet. Enter a version tag above to deploy one.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {versions.map((ver) => (
                          <div 
                            key={ver.version}
                            onClick={() => setSelectedVersion(ver)}
                            className={`p-4 border rounded-xl flex items-center justify-between text-left cursor-pointer transition-all ${
                              selectedVersion?.version === ver.version
                                ? 'border-white bg-[#111111] shadow-lg'
                                : 'border-white/5 bg-[#080808] hover:border-white/20'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-bold text-white">{ver.version}</span>
                                {ver.status === 'active' && (
                                  <span className="text-[10px] font-mono font-bold text-black bg-white px-1.5 py-0.2 rounded">
                                    ACTIVE
                                  </span>
                                )}
                              </div>
                              <span className="text-xxs text-neutral-500 font-mono block">Deployed: {ver.deployed_at}</span>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="text-xs font-mono text-neutral-400 block">Audit Score</span>
                                <span className={`text-sm font-bold font-mono ${ver.audit_score >= 98 ? 'text-white' : 'text-neutral-400'}`}>
                                  {ver.audit_score}/100
                                </span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-neutral-600" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Version Details & Code Viewer */}
                <div className="lg:col-span-7 space-y-6">
                  {selectedVersion ? (
                    <div className="border border-white/8 bg-[#050505] rounded-xl overflow-hidden shadow-2xl">
                      {/* Header */}
                      <div className="bg-[#0A0A0A] px-5 py-4 border-b border-white/8 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-white">{selectedVersion.version}</span>
                            <span className="text-xxs text-neutral-500 font-mono">commit: {selectedVersion.commit_hash}</span>
                          </div>
                          <span className="text-[10px] text-neutral-500 block">Verified by: {selectedVersion.verified_by}</span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-neutral-400 block uppercase font-mono">Audit Score Status</span>
                          <span className="text-lg font-black text-white font-mono">{selectedVersion.audit_score}/100</span>
                        </div>
                      </div>

                      {/* Code block */}
                      <div className="p-6 bg-black font-mono text-xs overflow-x-auto text-left leading-relaxed text-neutral-300">
                        <pre>{selectedVersion.code_snippet}</pre>
                      </div>

                      {/* Footer */}
                      <div className="bg-[#0A0A0A] p-4 border-t border-white/8 flex items-center justify-between">
                        <span className="text-xxs text-neutral-500 font-mono">Status: {selectedVersion.status.toUpperCase()}</span>
                        <a 
                          href={`https://solscan.io/tx/${selectedVersion.commit_hash}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xxs text-neutral-400 hover:text-white flex items-center gap-1 font-mono transition-colors"
                        >
                          Solscan Receipt <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 border border-white/5 bg-[#050505] rounded-xl flex items-center justify-center text-neutral-500 text-xs font-mono">
                      Select a version to inspect details and source code.
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer onNavigate={handleNavigate} />

      {/* Toaster UI Popup Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border bg-[#0D0D0D]/90 backdrop-blur-md shadow-2xl text-xs font-mono font-semibold tracking-wider text-white ${
                toast.type === 'error'
                  ? 'border-red-500/20 shadow-red-500/5'
                  : toast.type === 'success'
                  ? 'border-emerald-500/20 shadow-emerald-500/5'
                  : 'border-white/10 shadow-white/5'
              }`}
              style={{
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              }}
            >
              <span className={`w-2 h-2 rounded-full ${
                toast.type === 'error'
                  ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                  : toast.type === 'success'
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                  : 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]'
              } animate-pulse`} />
              <span>{toast.message}</span>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="ml-4 hover:text-white/60 transition-colors text-neutral-500 font-bold cursor-pointer"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
