import React from 'react';
import { motion } from 'motion/react';
import { Transaction } from '../types';
import { getCategoryStyle, smartIsIncome, determineSignContext } from '../utils';
import { 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileSpreadsheet, 
  User,
  Sparkles,
  HelpCircle,
  Eye,
  CheckCircle2
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface LiveTransactionsCardProps {
  transactions: Transaction[];
  lastSynced?: string;
}

export default function LiveTransactionsCard({ transactions, lastSynced }: LiveTransactionsCardProps) {
  const signContext = determineSignContext(transactions);

  // Take the most recent 15 transactions by date
  const latestTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 15);

  const getIconComponent = (iconName: string) => {
    // Dynamically retrieve the Lucide icon or fallback
    const IconComp = (LucideIcons as any)[iconName];
    return IconComp ? <IconComp className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />;
  };

  return (
    <div 
      id="live-transactions-card" 
      className="border border-zinc-900 bg-zinc-950 p-5 rounded-2xl shadow-xl relative overflow-hidden flex flex-col transition-all duration-300"
    >
      {/* Decorative pulse glow in early feed */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#adff00]/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header section with live feed indicators */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
        <div className="flex items-center gap-2">
          {/* Pulsing high tech active system indicator */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#adff00]/80 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#adff00]"></span>
          </span>
          <div>
            <h3 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase">TRANSACTIONS</h3>
            <p className="text-[9px] text-zinc-500 font-mono">Last 15 ledger entries</p>
          </div>
        </div>

        {/* Sync telemetry meta */}
        <div className="flex items-center gap-1.5 bg-zinc-900/60 px-2 py-0.5 rounded border border-zinc-850">
          <span className="text-[8.5px] font-mono text-zinc-400">
            {lastSynced ? `Synced: ${lastSynced}` : 'Local Database'}
          </span>
          <CheckCircle2 className="w-2.5 h-2.5 text-[#adff00]" />
        </div>
      </div>

      {latestTransactions.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
          <div className="p-3 bg-zinc-900/45 rounded-xl border border-zinc-850">
            <History className="w-5 h-5 text-zinc-650" />
          </div>
          <div>
            <h4 className="text-xs font-medium text-zinc-400">Transactions Ledger is Empty</h4>
            <p className="text-[10px] text-zinc-650 mt-0.5">Please import a spreadsheet or add transactions manually below.</p>
          </div>
        </div>
      ) : (
        /* Scrollable Feed lists with beautiful custom scroll bar and subtle micro interactions */
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-900/70">
          {latestTransactions.map((tx, idx) => {
            const isIncome = smartIsIncome(tx, signContext);
            const style = getCategoryStyle(tx.category);
            const amtAbs = Math.abs(tx.amount);

            return (
              <motion.div
                key={tx.id || idx}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, delay: idx * 0.02 }}
                className="group flex items-center justify-between p-2 py-2.5 rounded-xl bg-zinc-950/20 hover:bg-zinc-900/40 border border-zinc-950 hover:border-zinc-900/70 transition-all duration-200"
              >
                {/* Left side: Category Icon & details */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-xl ${style.bgClass} border ${style.borderClass} ${style.colorClass} flex items-center justify-center shrink-0`}>
                    {getIconComponent(style.icon)}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-white group-hover:text-[#00e1ff] transition-colors truncate max-w-[150px] md:max-w-[190px]">
                      {tx.merchant}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] font-medium text-zinc-500 bg-zinc-900 px-1.5 py-0.2 rounded font-mono border border-zinc-850">
                        {tx.category}
                      </span>
                      {/* Origin Tag */}
                      <div className="flex items-center gap-1">
                        {tx.source === 'sheet' ? (
                          <div className="flex items-center gap-0.5 text-[8px] font-mono uppercase bg-[#00e1ff]/5 border border-[#00e1ff]/15 text-[#00e1ff]/70 px-1 rounded-sm">
                            <FileSpreadsheet className="w-2 h-2 text-[#00e1ff]/70" />
                            <span>Transaction made by Sheet</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-0.5 text-[8px] font-mono uppercase bg-[#adff00]/5 border border-[#adff00]/15 text-[#adff00]/70 px-1 rounded-sm">
                            <User className="w-2 h-2 text-[#adff00]/70" />
                            <span>Transaction made by Local</span>
                          </div>
                        )}
                      </div>
                      <span className="text-[9.5px] font-mono text-zinc-650">
                        {tx.date}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side: Amount and sync source */}
                <div className="flex flex-col items-end shrink-0 pl-2">
                  <span className={`text-xs font-mono font-bold tracking-tight ${isIncome ? 'text-[#adff00]' : 'text-zinc-200'}`}>
                    {isIncome ? '+' : '-'}${amtAbs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
