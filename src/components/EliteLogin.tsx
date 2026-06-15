import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Activity, 
  Fingerprint, 
  Terminal, 
  Cpu, 
  AlertCircle,
  Gem,
  LockKeyhole
} from 'lucide-react';

interface EliteLoginProps {
  onAccessGranted: (username: string) => void;
}

interface DecryptMessage {
  text: string;
  status: 'pending' | 'active' | 'done';
}

export default function EliteLogin({ onAccessGranted }: EliteLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // States: 'login' | 'decrypting'
  const [stage, setStage] = useState<'login' | 'decrypting'>('login');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Decrypter terminal simulation logs
  const [currentLogIdx, setCurrentLogIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState<string>('');

  const logs: string[] = [
    'Establishing secure cryptographic session handshake...',
    'Performing multi-factor signature analysis...',
    'Decrypting personal double-entry cash flow ledgers...',
    'Syncing Google GViz cloud cells dynamically...',
    'Grounding luxury budgets assets & surplus matrices...',
    'Initializing private secure family bubble view...'
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const lowerUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    // Two custom elite credentials
    const isBigPapi = lowerUser === 'big papi';
    const isBigMami = lowerUser === 'big mami' || lowerUser === 'rachel';
    const isPassValid = cleanPass === 'TiggsAndOllieMossWard1922!';

    if ((isBigPapi || isBigMami) && isPassValid) {
      setSelectedProfile(isBigPapi ? 'Big Papi' : 'Rachel');
      setStage('decrypting');
    } else {
      setErrorMsg('Access Denied. Cryptographic credentials do not match the secure registrar.');
    }
  };

  // Run Loader Simulation when decrypting
  useEffect(() => {
    if (stage !== 'decrypting') return;

    // Log stepper timer
    const logInterval = setInterval(() => {
      setCurrentLogIdx((prev) => {
        if (prev < logs.length - 1) return prev + 1;
        return prev;
      });
    }, 850);

    // Percentage progress timer
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          clearInterval(logInterval);
          setTimeout(() => {
            onAccessGranted(selectedProfile);
          }, 600);
          return 100;
        }
        return prev + 1;
      });
    }, 45);

    return () => {
      clearInterval(logInterval);
      clearInterval(progressInterval);
    };
  }, [stage, selectedProfile]);


  return (
    <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center p-4 relative overflow-hidden select-none">
      
      {/* Ambient skyray/gator green background nebulas */}
      <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[80%] bg-[#00e1ff]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[80%] bg-[#adff00]/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Cyber Grid Overlay for high-end feeling */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(18,18,18,0.1)_1px,transparent_1px)] bg-[size:20px_20px] opacity-40 pointer-events-none" />

      <main className="w-full max-w-sm rounded-[32px] border border-zinc-900 bg-zinc-950 p-6 shadow-2xl relative overflow-hidden z-10 flex flex-col justify-between" style={{ minHeight: '560px' }}>
        
        <AnimatePresence mode="wait">
          {stage === 'login' ? (
            
            // PANEL 1: ELITE LOGIN CARD
            <motion.div
              key="login-panel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6 flex-1 flex flex-col justify-between"
            >
              {/* Header Badge */}
              <div className="text-center space-y-4">
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  {/* Rotating target rings */}
                  <div className="absolute inset-0 rounded-full border border-dashed border-[#00e1ff]/30 animate-spin" style={{ animationDuration: '10s' }} />
                  <div className="absolute inset-1.5 rounded-full border border-[#adff00]/20 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }} />
                  <div className="absolute inset-3 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-[0_0_15px_rgba(0,225,255,0.1)]">
                    <Cpu className="w-6 h-6 text-[#adff00] animate-pulse" />
                  </div>
                  {/* Orbital corner dots */}
                  <div className="absolute -top-1 -left-1 w-1.5 h-1.5 bg-[#00e1ff] rounded-full animate-ping" />
                  <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-[#adff00] rounded-full animate-ping" style={{ animationDelay: '0.8s' }} />
                </div>
                
                <div className="space-y-1">
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-400 tracking-tight font-display uppercase">
                      N & R <span className="text-[#adff00] font-mono font-bold">SPENDING</span>
                    </span>
                    
                    {/* Visual Graphic HUD Divider */}
                    <div className="flex items-center gap-2 mt-3 w-40 justify-center">
                      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#00e1ff]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00e1ff]" />
                      <div className="w-1 h-3 border-l border-r border-[#adff00]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#adff00]" />
                      <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#adff00]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-3">
                  
                  {/* Username Field */}
                  <div className="space-y-1">
                    <label className="block text-[9px] uppercase font-bold tracking-wider text-zinc-500 font-medium">Secure Access Code</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                        <User className="w-4 h-4 text-[#00e1ff]/80" />
                      </div>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => { setUsername(e.target.value); setErrorMsg(null); }}
                        placeholder="Secure Access Code"
                        className="w-full text-xs pl-9 pr-3 py-2.5 bg-zinc-900/60 border border-zinc-850 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#00e1ff] transition-all focus:ring-1 focus:ring-[#00e1ff]/20"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1">
                    <label className="block text-[9px] uppercase font-bold tracking-wider text-zinc-500 font-medium">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                        <Lock className="w-4 h-4 text-[#00e1ff]/80" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setErrorMsg(null); }}
                        placeholder="Password"
                        className="w-full text-xs pl-9 pr-10 py-2.5 bg-zinc-900/60 border border-zinc-850 rounded-xl text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-[#00e1ff] transition-all focus:ring-1 focus:ring-[#00e1ff]/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                </div>

                {/* Error status block */}
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-650/10 border border-red-500/20 text-xs text-red-400 rounded-xl flex items-start gap-2 leading-relaxed"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    <span>{errorMsg}</span>
                  </motion.div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-[#00e1ff] to-[#adff00] text-black font-extrabold text-xs rounded-xl shadow-lg shadow-[#00e1ff]/15 hover:shadow-[#00e1ff]/25 active:scale-[0.98] hover:brightness-105 transition-all cursor-pointer flex items-center justify-center gap-2 tracking-widest font-display"
                >
                  <LockKeyhole className="w-4 h-4 text-black" />
                  <span>DECRYPT SECURE PORTAL</span>
                </button>
              </form>

              {/* Cryptographic Session Verification Info */}
              <div className="p-3 bg-zinc-900/20 border border-zinc-900 rounded-xl space-y-1.5 text-center">
                <span className="block text-[8px] uppercase font-bold tracking-wider text-zinc-650 font-mono">
                  SECURE CRYPTOGRAPHIC NODE
                </span>
                <p className="text-[9.5px] text-zinc-500 leading-relaxed max-w-[280px] mx-auto">
                  Only registered keys loaded via our encrypted secure registrar can access this portal. Secure backups are active.
                </p>
              </div>

            </motion.div>
          ) : (
            
            // PANEL 2: ELITE SYNC/DECRYPTION LOADER
            <motion.div
              key="loader-panel"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6 flex-1 flex flex-col justify-between"
            >
              {/* Spinning Decrypter Core */}
              <div className="text-center py-6 space-y-4">
                <div className="relative w-20 h-20 mx-auto">
                  {/* Outer glowing gear spinner */}
                  <div className="absolute inset-0 rounded-full border-2 border-t-[#00e1ff] border-r-transparent border-b-[#adff00] border-l-transparent animate-spin" />
                  {/* Inner counter-rotating indicator */}
                  <div className="absolute inset-2 rounded-full border border-dashed border-zinc-700 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '6s' }} />
                  {/* Absolute Center Dot */}
                  <div className="absolute inset-6 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 text-[#00e1ff]">
                    <Activity className="w-5 h-5 animate-pulse" />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-[#00e1ff] tracking-widest font-mono">SECURE MATRIX GENERATED</span>
                  <h3 className="text-sm font-semibold text-white tracking-wide">Syncing Double-Entry Ledger</h3>
                </div>
              </div>

              {/* Real-time Loading Progress meter */}
              <div className="space-y-2 font-mono">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-[#adff00] animate-spin" />
                    <span>Decryption rate:</span>
                  </span>
                  <span className="font-bold text-white">{progress}%</span>
                </div>
                
                {/* Meter line */}
                <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-850">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-[#00e1ff] to-[#adff00]"
                    style={{ width: `${progress}%` }} 
                  />
                </div>
              </div>

              {/* Micro console log ticker */}
              <div className="bg-black/90 p-3.5 rounded-xl border border-zinc-900 flex items-start gap-2.5 font-mono text-[9.5px] leading-relaxed text-zinc-400">
                <Terminal className="w-4 h-4 text-[#00e1ff] shrink-0 mt-0.5" />
                <div className="space-y-1 min-w-0">
                  {logs.slice(0, currentLogIdx + 1).map((log, index) => {
                    const isLast = index === currentLogIdx;
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`${isLast ? 'text-[#adff00] font-bold' : 'text-zinc-600'} truncate`}
                      >
                        {isLast ? '> ' : '✔ '} {log}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Cyber privacy subtext */}
              <div className="text-[9px] text-zinc-600 text-center font-mono flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#adff00]" />
                <span>AES-256 GCM Secure Sandbox Session</span>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
