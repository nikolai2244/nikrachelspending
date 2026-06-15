import React, { useState, useEffect } from 'react';
import { Transaction, Budget, SheetConfig } from './types';
import { eliteMockTransactions, CATEGORY_STYLING, getCategoryStyle, fetchGoogleSheet, mapGvizToTransactions, smartIsIncome, determineSignContext, processImportedSheetRows } from './utils';
import SheetsLinkCard from './components/SheetsLinkCard';
import StatsView from './components/StatsView';
import EliteLogin from './components/EliteLogin';
import IntimateSlideshow from './components/IntimateSlideshow';
import LiveTransactionsCard from './components/LiveTransactionsCard';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  LayoutGrid,
  History,
  TrendingDown,
  BrainCircuit,
  Settings,
  Shield,
  FileSpreadsheet,
  Globe,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  BriefcaseBusiness,
  AlertOctagon,
  X,
  LogOut,
  Activity,
  Eye,
  EyeOff,
  RefreshCw,
  Cpu
} from 'lucide-react';

export default function App() {
  // 1. Core State Initializers
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    const saved = localStorage.getItem('wealth_app_currentUser');
    if (saved === 'Big Papi' || saved === 'Big Mami' || saved === 'Rachel') {
      return saved === 'Big Mami' ? 'Rachel' : saved;
    }
    // Clear out stale user sessions to force the beautiful new login
    localStorage.removeItem('wealth_app_currentUser');
    return null;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('wealth_app_transactions_v2');
    const parsed = saved ? JSON.parse(saved) : eliteMockTransactions;
    // Programmatically strip any legacy mock data starting with 'm' (e.g., m1, m2) while preserving actual 'manual-' rows.
    return Array.isArray(parsed) 
      ? parsed.filter((t: Transaction) => t && t.id && (!t.id.startsWith('m') || t.id.startsWith('manual-')))
      : [];
  });

  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('wealth_app_budgets');
    if (saved) return JSON.parse(saved);

    // Initial setup matching categories
    return Object.keys(CATEGORY_STYLING)
      .filter((cat) => cat !== 'Income')
      .map((cat) => ({
        category: cat,
        limit: CATEGORY_STYLING[cat].defaultLimit,
        spent: 0,
      }));
  });

  const [sheetConfig, setSheetConfig] = useState<SheetConfig>(() => {
    const saved = localStorage.getItem('wealth_app_sheet_config');
    return saved
      ? JSON.parse(saved)
      : {
          sheetUrl: '',
          sheetId: '',
          dateCol: 'Date',
          categoryCol: 'Category',
          merchantCol: 'Merchant',
          amountCol: 'Amount',
          autoSync: true,
        };
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'allocations'>('overview');

  // Ensure tabs reset when user changes
  useEffect(() => {
    setActiveTab('overview');
  }, [currentUser]);

  // Shared interactive visual filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Custom premium modal confirm state
  const [txToDeleteId, setTxToDeleteId] = useState<string | null>(null);

  // Upgraded Balance Card premium states
  const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(() => {
    return localStorage.getItem('wealth_app_hide_balance') === 'true';
  });
  const [recalibrating, setRecalibrating] = useState(false);
  const [recalPhase, setRecalPhase] = useState('');

  const signContext = determineSignContext(transactions);

  // 2. Synchronize spending limits and cache data as transactions vary
  useEffect(() => {
    // Re-calculate category expenditures spent summary
    const updatedBudgets = budgets.map((b) => {
      const categorySpent = transactions
        .filter(
          (t) =>
            t.category.toLowerCase() === b.category.toLowerCase() &&
            t.amount !== 0 &&
            !smartIsIncome(t, signContext)
        )
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      return {
        ...b,
        spent: Math.round(categorySpent),
      };
    });

    setBudgets(updatedBudgets);
    localStorage.setItem('wealth_app_transactions_v2', JSON.stringify(transactions));
    localStorage.setItem('wealth_app_budgets', JSON.stringify(updatedBudgets));
  }, [transactions]);

  // Sync sheet config changes
  useEffect(() => {
    localStorage.setItem('wealth_app_sheet_config', JSON.stringify(sheetConfig));
  }, [sheetConfig]);

  // Active Google Sheets background sync & periodic polling loop
  useEffect(() => {
    if (!sheetConfig.sheetId || !sheetConfig.autoSync) return;

    const runSyncTask = async () => {
      try {
        const liveTable = await fetchGoogleSheet(sheetConfig.sheetId, sheetConfig.sheetUrl);
        const activeMapping = {
          date: sheetConfig.dateCol || 'Date',
          category: sheetConfig.categoryCol || 'Category',
          merchant: sheetConfig.merchantCol || 'Merchant',
          amount: sheetConfig.amountCol || 'Amount',
        };
        const importedTransactions = mapGvizToTransactions(liveTable, activeMapping);
        if (importedTransactions && importedTransactions.length > 0) {
          const { finalTransactions, foundBudgets } = processImportedSheetRows(importedTransactions);

          if (foundBudgets.length > 0) {
            setBudgets((prev) => {
              const updated = [...prev];
              foundBudgets.forEach((fb) => {
                const idx = updated.findIndex((b) => b.category.toLowerCase() === fb.category.toLowerCase());
                if (idx !== -1) {
                  updated[idx] = { ...updated[idx], limit: fb.limit };
                } else {
                  updated.push({ category: fb.category, limit: fb.limit, spent: 0 });
                }
              });
              return updated;
            });
          }

          setTransactions((prev) => {
            const prevManual = prev.filter((t) => t.source === 'local');
            return [...prevManual, ...finalTransactions];
          });
          setSheetConfig((prev) => ({
            ...prev,
            lastSynced: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }));
        }
      } catch (e) {
        console.warn('Automated background sync feedback:', e);
      }
    };

    // Run first immediately
    runSyncTask();

    // Setup periodic automatic polling (every 20 seconds for immediate UI visual updates)
    const intervalId = setInterval(runSyncTask, 20000);

    return () => clearInterval(intervalId);
  }, [sheetConfig.sheetId, sheetConfig.autoSync]);

  // 3. Transactions CRUD callbacks
  const handleAddTransaction = (newTx: Omit<Transaction, 'id' | 'source'>) => {
    const tx: Transaction = {
      ...newTx,
      id: `manual-${Date.now()}`,
      source: 'local',
    };
    setTransactions((prev) => [tx, ...prev]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTxToDeleteId(id);
  };

  const confirmDelete = () => {
    if (txToDeleteId) {
      setTransactions((prev) => prev.filter((t) => t.id !== txToDeleteId));
      setTxToDeleteId(null);
    }
  };

  const handleTransactionsSynced = (sheetTxs: Transaction[]) => {
    const { finalTransactions, foundBudgets } = processImportedSheetRows(sheetTxs);

    if (foundBudgets.length > 0) {
      setBudgets((prev) => {
        const updated = [...prev];
        foundBudgets.forEach((fb) => {
          const idx = updated.findIndex((b) => b.category.toLowerCase() === fb.category.toLowerCase());
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], limit: fb.limit };
          } else {
            updated.push({ category: fb.category, limit: fb.limit, spent: 0 });
          }
        });
        return updated;
      });
    }

    // Merge: Keep manual transactions, overlay fresh synced sheet rows
    const manualTxs = transactions.filter((t) => t.source === 'local');
    setTransactions([...manualTxs, ...finalTransactions]);
  };

  const handleBudgetLimitChange = (category: string, newLimit: number) => {
    const updated = budgets.map((b) =>
      b.category.toLowerCase() === category.toLowerCase() ? { ...b, limit: newLimit } : b
    );
    setBudgets(updated);
    localStorage.setItem('wealth_app_budgets', JSON.stringify(updated));
  };

  // 4. Auxiliary Metrics Calculations
  // Only recalculate context here if we use local transaction state! Wait we already have signContext
  const calculatedTotalSpending = transactions
    .filter((t) => !smartIsIncome(t, signContext) && t.amount !== 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const calculatedTotalIncome = transactions
    .filter((t) => smartIsIncome(t, signContext))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const sheetTransactions = transactions.filter((t) => t.source === 'sheet');
  const sheetDates = sheetTransactions.map((t) => new Date(t.date).getTime());
  const isNewestAtTop = sheetDates.length >= 2 && sheetDates[0] > sheetDates[sheetDates.length - 1];

  const orderedSheetTxs = isNewestAtTop ? [...sheetTransactions] : [...sheetTransactions].reverse();
  const latestWithBalance = orderedSheetTxs.find((t) => t.balance !== undefined && t.balance !== null && !isNaN(t.balance));

  // Determine currentBalance by trusting the Sheet's explicit balance column first.
  // Fallback to strict ledger summing if no balance column exists.
  let currentBalance = latestWithBalance !== undefined && latestWithBalance.balance !== undefined
    ? latestWithBalance.balance
    : (calculatedTotalIncome - calculatedTotalSpending);

  if (!currentUser) {
    return (
      <EliteLogin 
        onAccessGranted={(user) => {
          setCurrentUser(user);
          localStorage.setItem('wealth_app_currentUser', user);
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans select-none antialiased flex flex-col justify-center py-0 md:py-6 px-0 md:px-6">
      
      {/* Decorative premium radial illumination (desktop only) */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[#00e1ff]/5 rounded-full blur-[150px] pointer-events-none -z-10" />

      {/* Main Responsive Grid Container */}
      <div className="w-full max-w-6xl mx-auto bg-zinc-950 border border-zinc-900 rounded-none md:rounded-[28px] shadow-2xl flex flex-col md:flex-row overflow-hidden relative" style={{ minHeight: 'calc(100vh - 3rem)', minWidth: '320px' }}>
        
        {/* Left Side Sidebar - Displayed on desktop (md and up) */}
        <aside className="hidden md:flex md:w-72 border-r border-zinc-900 bg-black/40 flex-col justify-between p-6 shrink-0 relative z-10">
          <div className="space-y-8">
            {/* Branding Block */}
            <div className="flex items-center gap-3 p-1">
              <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
                <div className="absolute inset-0 rounded-xl bg-zinc-950 border border-zinc-900" />
                <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-tr from-[#00e1ff] to-[#adff00] opacity-40 blur-[3px] animate-pulse" />
                <div className="absolute inset-1 bg-[radial-gradient(#00e1ff_1.5px,transparent_1px)] bg-[size:4px_4px] opacity-40 rounded-lg" />
                <Cpu className="w-4 h-4 text-[#00e1ff] relative z-10 animate-spin" style={{ animationDuration: '10s' }} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-black text-white tracking-tight uppercase font-display">
                    N & R <span className="text-[#adff00] font-mono text-xs">SPENDING</span>
                  </h1>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#adff00] animate-pulse" />
                </div>
              </div>
            </div>

            {/* Desktop Navigation Link Menu */}
            <div className="space-y-1.5">
              <span className="block text-[9px] uppercase font-bold tracking-wider text-zinc-650 px-2.5 mb-2 font-mono">WORKSPACE CORE</span>
              
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer text-xs font-semibold ${
                  activeTab === 'overview' 
                    ? 'bg-[#00e1ff]/10 border border-[#00e1ff]/20 text-[#00e1ff]' 
                    : 'text-zinc-500 hover:text-white border border-transparent'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Dashboard Overview</span>
              </button>

              <button
                onClick={() => setActiveTab('allocations')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer text-xs font-semibold ${
                  activeTab === 'allocations' 
                    ? 'bg-[#00e1ff]/10 border border-[#00e1ff]/20 text-[#00e1ff]' 
                    : 'text-zinc-500 hover:text-white border border-transparent'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Sync & Allocations</span>
              </button>

            </div>
          </div>

          {/* User Session Footer inside Sidebar */}
          <div className="border-t border-zinc-900 pt-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-mono text-[9px] font-bold text-[#00e1ff] uppercase">
                {currentUser ? currentUser.substring(0, 2) : 'VA'}
              </div>
              <div className="min-w-0">
                <span className="block text-[8px] text-zinc-500 font-mono tracking-wider">AUTHORIZED OFFICE</span>
                <span className="block text-xs font-bold text-white truncate max-w-[120px]">{currentUser}</span>
              </div>
            </div>
            
            <button
              onClick={() => {
                setCurrentUser(null);
                localStorage.removeItem('wealth_app_currentUser');
              }}
              className="p-1 px-1.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 hover:border-red-500/30 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
              title="Lock Session"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>

        {/* Content Pane Wrapper */}
        <div id="spending-viewport" className="flex-1 flex flex-col overflow-hidden relative z-10 bg-zinc-950">
          
          {/* Dynamic Island slot for mobile compatibility (hidden on desktop) */}
          <div className="flex justify-center pt-2.5 pb-1 md:hidden">
            <div className="w-24 h-5 bg-black rounded-full border border-zinc-900 shadow-inner flex items-center justify-between px-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00e1ff]/30" />
              <div className="w-3.5 h-1 bg-zinc-900 rounded-full" />
            </div>
          </div>

          {/* Private Advisory Header (displayed ONLY on mobile since desktop layout uses the left sidebar) */}
          <header id="mobile-only-header" className="px-5 pt-3 pb-3 border-b border-zinc-900 bg-zinc-950/80 sticky top-0 backdrop-blur-md z-40 flex items-center justify-between md:hidden">
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                <div className="absolute inset-0 rounded-lg bg-zinc-950 border border-zinc-900" />
                <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-tr from-[#00e1ff] to-[#adff00] opacity-40 blur-[2px] animate-pulse" />
                <Cpu className="w-3.5 h-3.5 text-[#00e1ff] relative z-10" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <h1 className="text-xs font-black text-white tracking-tight uppercase font-display leading-tight">
                    N & R <span className="text-[#adff00] font-mono text-[10px]">SPENDING</span>
                  </h1>
                  <span className="w-1 h-1 rounded-full bg-[#adff00] animate-pulse" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="text-[9px] font-mono font-medium text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-850">
                USD $
              </div>
              <button
                onClick={() => {
                  setCurrentUser(null);
                  localStorage.removeItem('wealth_app_currentUser');
                }}
                className="p-1 px-1.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 hover:border-red-500/30 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                title="Lock Session"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </header>

          {/* Page Inner Container (Tabs content wrapper) */}
          <div className="flex-1 overflow-y-auto px-4 md:px-8 py-5 md:py-6 space-y-6 scrollbar-none pb-28 md:pb-8">
            
            <AnimatePresence mode="wait">
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <motion.div
                  key="tab-overview"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="space-y-6"
                >
                  
                  {/* Active Vision Slideshow - Swapped to the Top of the Dashboard */}
                  <IntimateSlideshow />

                  {/* Top Stats Area Bento Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Upgraded Current Balance Bento Card */}
                    <div className="border border-zinc-900 bg-zinc-950 p-6 rounded-2xl flex flex-col justify-between shadow-xl relative overflow-hidden border-l-2 border-l-[#00e1ff] transition-all duration-300">
                      {/* Glowing decorative ambient background orbits */}
                      <div className="absolute top-0 right-0 w-44 h-44 bg-[#00e1ff]/5 rounded-full blur-3xl pointer-events-none" />
                      <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-[#adff00]/3 rounded-full blur-3xl pointer-events-none" />

                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Activity className="w-3.5 h-3.5 text-[#00e1ff] animate-pulse" />
                            <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase font-mono">CURRENT BALANCE</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {/* Live Heartbeat/Sync Status Tag with loading/pulse states */}
                            <button
                              onClick={() => {
                                if (recalibrating) return;
                                setRecalibrating(true);
                                setRecalPhase('SECURE LINK');
                                setTimeout(() => setRecalPhase('NODE ACCREDIT'), 1000);
                                setTimeout(() => setRecalPhase('BALANCE SYNC'), 2000);
                                setTimeout(() => {
                                  setRecalibrating(false);
                                  setRecalPhase('');
                                }, 3200);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[9px] font-semibold tracking-wider uppercase font-mono border transition-all flex items-center gap-1.5 cursor-pointer ${
                                recalibrating
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-[#00e1ff]/5 hover:bg-[#00e1ff]/15 text-[#00e1ff] border-[#00e1ff]/15 active:scale-[0.95]'
                              }`}
                              title="Recalibrate Connection"
                            >
                              <RefreshCw className={`w-3 h-3 ${recalibrating ? 'animate-spin text-amber-400' : 'text-[#00e1ff]'}`} />
                              <span>
                                {recalibrating ? `${recalPhase}...` : 'Recalibrate'}
                              </span>
                            </button>

                            {/* Privacy Mask Toggle Button */}
                            <button
                              onClick={() => {
                                const newValue = !isBalanceHidden;
                                setIsBalanceHidden(newValue);
                                localStorage.setItem('wealth_app_hide_balance', String(newValue));
                              }}
                              className="p-1 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                              title={isBalanceHidden ? "Reveal Balance" : "Shield Balance"}
                            >
                              {isBalanceHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Giant Core Balance Display */}
                        <div className="flex items-baseline gap-2 mt-4 relative">
                          {isBalanceHidden ? (
                            <div className="h-10 flex items-center">
                              <motion.span 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-2xl font-black font-mono tracking-widest text-[#00e1ff]/40 mt-1 select-none"
                              >
                                $ •••• ••••
                              </motion.span>
                            </div>
                          ) : (
                            <motion.div 
                              initial={{ filter: 'blur(8px)', opacity: 0 }}
                              animate={{ filter: 'blur(0px)', opacity: 1 }}
                              className="flex items-baseline gap-1.5"
                            >
                              <span className="text-4xl font-extrabold font-mono tracking-tight text-white drop-shadow-sm">
                                {currentBalance < 0 ? '-' : ''}${Math.abs(currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="text-xs font-bold text-zinc-500 font-mono tracking-normal">USD</span>
                            </motion.div>
                          )}
                          
                          {/* Live telemetry phase markers */}
                          {recalibrating && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 0.8 }}
                              className="absolute -bottom-6 left-0 text-[8.5px] uppercase font-bold text-amber-500 font-mono tracking-wider"
                            >
                              ⚡ Intersecting ledger hashes...
                            </motion.div>
                          )}
                        </div>
                      </div>

                      {/* Highly Elite Animated Waveform SVG (Satisfies: neat live moving animations requirement) */}
                      <div className="h-8 mt-5 flex items-end relative overflow-hidden rounded-lg bg-zinc-900/10 border border-zinc-900/30 px-2 py-1">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#00e1ff]/0 via-[#00e1ff]/2 to-transparent pointer-events-none" />
                        
                        {/* Interactive Animated Waveform SVG */}
                        <svg className="w-full h-4 text-[#00e1ff]/30" viewBox="0 0 100 20" preserveAspectRatio="none">
                          <path
                            d="M0,10 Q10,18 20,4 T40,15 T60,6 T80,18 T100,10"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                          >
                            <animate
                              attributeName="d"
                              values="M0,10 Q10,18 20,4 T40,15 T60,6 T80,18 T100,10;
                                      M0,10 Q10,2 20,15 T40,4 T60,17 T80,5 T100,10;
                                      M0,10 Q10,18 20,4 T40,15 T60,6 T80,18 T100,10"
                              dur="6s"
                              repeatCount="indefinite"
                            />
                          </path>
                          <path
                            d="M0,10 Q15,4 30,16 T60,4 T90,16 T100,10"
                            fill="none"
                            stroke="#adff00"
                            strokeWidth="1"
                            strokeOpacity="0.4"
                          >
                            <animate
                              attributeName="d"
                              values="M0,10 Q15,4 30,16 T60,4 T90,16 T100,10;
                                      M0,10 Q15,18 30,5 T60,16 T90,5 T100,10;
                                      M0,10 Q15,4 30,16 T60,4 T90,16 T100,10"
                              dur="4s"
                              repeatCount="indefinite"
                            />
                          </path>
                        </svg>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-zinc-900/60 font-mono">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider block">Total Inflows</span>
                          <span className="text-sm font-bold text-[#adff00] flex items-center mt-1.5">
                            <ArrowUpRight className="w-3.5 h-3.5 mr-1 text-[#adff00]" />
                            ${calculatedTotalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider block">MTD Spending</span>
                          <span className="text-sm font-bold text-red-400 flex items-center mt-1.5">
                            <TrendingDown className="w-3.5 h-3.5 mr-1 text-red-400" />
                            ${calculatedTotalSpending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Bento Box: New Live Vault Feed Component */}
                    <LiveTransactionsCard 
                      transactions={transactions} 
                      lastSynced={sheetConfig.lastSynced}
                    />
                  </div>

                  {/* Analytical Interactive Charts */}
                  <StatsView 
                    transactions={transactions} 
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                  />

                  {/* Minimal Sheets Status trigger widget */}
                  <div 
                    onClick={() => setActiveTab('allocations')}
                    className="p-4 rounded-2xl border border-zinc-900 bg-zinc-950 flex items-center justify-between hover:border-zinc-850 cursor-pointer transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#00e1ff]/10 text-[#00e1ff] rounded-xl border border-[#00e1ff]/20">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-white block">Sync & Budgets Setup</span>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {sheetConfig.sheetId ? 'Active spreadsheet linkage' : 'Google Sheets / CSV database offline'}
                        </p>
                      </div>
                    </div>
                    <Settings className="w-4 h-4 text-zinc-700" />
                  </div>

                </motion.div>
              )}

              {/* TAB 3: ALLOCATIONS & ALL SHEET SYNC CONFIGS */}
              {activeTab === 'allocations' && (
                <motion.div
                  key="tab-allocations"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="max-w-xl mx-auto">
                    <SheetsLinkCard
                      config={sheetConfig}
                      onConfigChange={setSheetConfig}
                      onTransactionsSynced={handleTransactionsSynced}
                    />
                  </div>
                </motion.div>
              )}


            </AnimatePresence>

          </div>

          {/* mobile Floating iOS-Style Navigation Tabs Dock (hidden on desktop screens where sidebar is present) */}
          <nav id="mobile-tabs-dock" className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[90%] bg-zinc-900/95 border border-zinc-800/80 rounded-2xl shadow-2xl backdrop-blur-lg px-4 py-2 flex items-center justify-center gap-8 z-45 md:hidden">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex flex-col items-center gap-1.5 p-2 transition-all cursor-pointer ${
                activeTab === 'overview' ? 'text-[#00e1ff]' : 'text-zinc-500 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('allocations')}
              className={`flex flex-col items-center gap-1.5 p-2 transition-all cursor-pointer ${
                activeTab === 'allocations' ? 'text-[#00e1ff]' : 'text-zinc-500 hover:text-white'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Allocations</span>
            </button>

          </nav>

        </div>

      </div>

      {/* CUSTOM LUXURY ALERT DELETE CONFIRMATION MODAL OVERLAY */}
      <AnimatePresence>
        {txToDeleteId !== null && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-zinc-950 border border-zinc-900 w-full max-w-sm p-6 rounded-2xl shadow-2xl space-y-4 text-center relative"
            >
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto">
                <AlertOctagon className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">Remove Ledger Record?</h3>
                <p className="text-xs text-zinc-500">
                  This action clears this transaction row and re-bases your investment surplus projections immediately.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTxToDeleteId(null)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  Keep Record
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-red-650 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  Delete Instantly
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
