import React from 'react';
import { Budget } from '../types';
import { getCategoryStyle, CATEGORY_STYLING } from '../utils';
import { Sparkles, AlertTriangle, CheckCircle, Flame } from 'lucide-react';

interface BudgetCardsProps {
  budgets: Budget[];
  onBudgetChange: (category: string, newLimit: number) => void;
}

export default function BudgetCards({ budgets, onBudgetChange }: BudgetCardsProps) {
  const totalLimit = budgets.reduce((acc, b) => acc + b.limit, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.spent, 0);
  const totalPercent = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Executive total budget health index card */}
      <div className="relative border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 p-5 rounded-2xl shadow-xl overflow-hidden">
        {/* Glow light effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00e1ff]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-xs uppercase font-bold tracking-wider text-zinc-500">Consolidated Allocation Health</h4>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-semibold text-white font-mono">
                ${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-zinc-505">spent of ${totalLimit.toLocaleString()} limit</span>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium py-1 px-2.5 rounded-full ${
              totalPercent > 100 
                ? 'bg-red-500/10 text-red-400 border border-red-500/25' 
                : totalPercent > 80 
                ? 'bg-[#00e1ff]/10 text-[#00e1ff] border border-[#00e1ff]/20' 
                : 'bg-[#adff00]/10 text-[#adff00] border border-[#adff00]/20'
            }`}>
              {totalPercent > 100 ? (
                <>
                  <Flame className="w-3 h-3 shrink-0" />
                  <span>Limit Exceeded</span>
                </>
              ) : totalPercent > 80 ? (
                <>
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>Warning Threshold</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3 h-3 shrink-0" />
                  <span>In Perfect Health</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Global progress meter */}
        <div className="space-y-1.5">
          <div className="w-full bg-zinc-900 rounded-full h-3 overflow-hidden p-0.5 border border-zinc-855/80">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                totalPercent > 100 
                  ? 'bg-gradient-to-r from-red-650 to-red-500 shadow-lg shadow-red-500/10' 
                  : totalPercent > 80 
                  ? 'bg-gradient-to-r from-[#00e1ff]/80 to-[#00e1ff] shadow-lg shadow-[#00e1ff]/10' 
                  : 'bg-gradient-to-r from-[#adff00]/80 to-[#adff00] shadow-lg shadow-[#adff00]/10'
              }`}
              style={{ width: `${Math.min(totalPercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
            <span>0%</span>
            <span>Budget used: {totalPercent.toFixed(1)}%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Grid of category budget configuration adjusters */}
      <div className="space-y-4">
        <h4 className="text-xs uppercase font-bold tracking-widest text-zinc-400 px-1 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#00e1ff]" />
          <span>Category Budgets & thresholds</span>
        </h4>

        <div className="grid gap-3">
          {budgets
            .filter((b) => b.category !== 'Income') // Budget doesn't apply to Income
            .map((b) => {
              const style = getCategoryStyle(b.category);
              const percent = b.limit > 0 ? (b.spent / b.limit) * 105 : 0;
              const isOver = b.spent > b.limit;

              return (
                <div
                  key={b.category}
                  className="p-4 rounded-xl border border-zinc-900 bg-zinc-950 flex flex-col justify-between hover:border-zinc-850/80 transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold py-0.5 px-2 rounded ${style.bgClass} ${style.colorClass} border ${style.borderClass}`}>
                        {b.category}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-zinc-501 font-medium">
                        <strong className="text-white font-mono">${b.spent.toLocaleString()}</strong> of ${b.limit.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Standard Category Progress Bar */}
                  <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        percent > 100 
                          ? 'bg-red-500' 
                          : percent > 80 
                          ? 'bg-[#00e1ff]' 
                          : style.colorClass.replace('text-', 'bg-')
                      }`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>

                  {/* Slider Control to dynamically edit budget allocation */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-zinc-500 shrink-0 font-mono tracking-wide">Adjust Allocation:</span>
                    <input
                      type="range"
                      min="100"
                      max="5000"
                      step="100"
                      value={b.limit}
                      onChange={(e) => onBudgetChange(b.category, parseInt(e.target.value))}
                      className="grow accent-[#00e1ff] cursor-pointer opacity-70 hover:opacity-100 h-1 bg-zinc-900 rounded-lg appearance-none"
                    />
                    <span className="text-[10px] text-white/90 bg-zinc-900 font-mono font-medium px-2 py-0.5 rounded border border-zinc-800">
                      ${b.limit}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
