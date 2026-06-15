import React, { useState, useEffect } from 'react';
import { Transaction, Budget } from '../types';
import { AiInsight } from "@/server";
import { getCategoryStyle, smartIsIncome, determineSignContext } from '../utils';
import { Sparkles, BrainCircuit, RefreshCw, Star, AlertTriangle, ShieldCheck, TrendingUp, Info } from 'lucide-react';

interface InsightsViewProps {
  transactions: Transaction[];
  budgets: Budget[];
}

export default function InsightsView({ transactions, budgets }: InsightsViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<AiInsight | null>(null);

  const fetchAiInsights = async (force: boolean = false) => {
    // Attempt local load first to conserve quota unless forced
    if (!force) {
      const cached = localStorage.getItem('wealth_app_insights');
      if (cached) {
        try {
          setInsights(JSON.parse(cached));
          return;
        } catch { }
      }
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, budgets }),
      });

      if (!response.ok) {
        const errDetails = await response.json();
        // If the server tells us the key is missing, handle gracefully to avoid breaking the UI!
        if (errDetails.missingKey) {
          throw new Error('MISSING_KEY');
        }
        throw new Error(errDetails.error || 'The intelligence server encountered an exception.');
      }

      const data = await response.json();
      setInsights(data);
      localStorage.setItem('wealth_app_insights', JSON.stringify(data));
    } catch (err: any) {
      console.warn('AI compilation fell back to premium offline simulation:', err);
      // Failsafe offline premium simulated generator
      const offlineFallback = compileSimulatedInsights(transactions, budgets);
      setInsights(offlineFallback);

      if (err.message === 'MISSING_KEY') {
        setError('GEMINI_API_KEY is missing. Providing premium simulated offline analysis. Configure secrets in [Settings > Secrets] to connect live.');
      } else {
        setError(' intelligence server offline. Displaying premium simulated allocation analysis.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAiInsights();
  }, [transactions]); // Regenerate when portfolio changes

  const getImpactColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'high': return 'text-[#adff00] bg-[#adff00]/10 border-[#adff00]/25';
      case 'medium': return 'text-[#00e1ff] bg-[#00e1ff]/10 border-[#00e1ff]/20';
      default: return 'text-zinc-400 bg-zinc-900/60 border-zinc-800';
    }
  };

  const getAlertIconAndStyles = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical':
        return {
          bgClass: 'bg-red-500/5 border-red-500/20 text-red-400',
          title: 'Critical Outflow'
        };
      case 'warning':
        return {
          bgClass: 'bg-[#adff00]/5 border-[#adff00]/20 text-[#adff00]',
          title: 'Allocation Warning'
        };
      default:
        return {
          bgClass: 'bg-[#00e1ff]/5 border-[#00e1ff]/20 text-[#00e1ff]',
          title: 'Portfolio Trend'
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner for simulated flow */}
      {error && (
        <div className="p-3.5 rounded-xl bg-[#00e1ff]/5 text-[#00e1ff]/90 text-xs border border-[#00e1ff]/10 flex items-start gap-2.5 leading-relaxed">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary Intelligence Core Controller */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-[#00e1ff]" />
          <h3 className="font-semibold text-white text-base">Gemini Portfolio Intelligence</h3>
        </div>
        <button
          onClick={() => fetchAiInsights(true)}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg border border-zinc-900 bg-zinc-950 text-[#00e1ff] hover:text-[#00e1ff]/80 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Regenerate Insights</span>
        </button>
      </div>

      {loading ? (
        /* Elite Loading Skeletor */
        <div className="border border-zinc-900 bg-zinc-950 p-6 rounded-2xl flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-2 border-[#00e1ff]/20 animate-ping absolute" />
            <BrainCircuit className="w-10 h-10 text-[#00e1ff] animate-pulse" />
          </div>
          <div>
            <h4 className="text-zinc-200 font-medium text-sm">Consulting Private Office AI...</h4>
            <p className="text-xs text-zinc-500 mt-1">Aggregating allocations and ledger history benchmarks</p>
          </div>
        </div>
      ) : insights ? (
        <div className="space-y-6">
          {/* Wealth Score Circular Radial Widget */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
            <div className="md:col-span-4 p-5 rounded-2xl border border-zinc-900 bg-zinc-950 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00e1ff] to-[#adff00]" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Advisory Wealth Index</span>

              {/* Circular Dial */}
              <div className="relative mt-5 flex items-center justify-center">
                {/* Score Dial track */}
                <svg className="w-28 h-28 transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="46"
                    stroke="#18181b"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="46"
                    stroke="#00e1ff"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 46}
                    strokeDashoffset={2 * Math.PI * 46 * (1 - insights.financialScore / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                {/* Score typography */}
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-semibold text-white font-mono">{insights.financialScore}</span>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-500">Score</span>
                </div>
              </div>

              <div className="mt-4 text-[10px] text-zinc-400 font-medium tracking-wide flex items-center gap-1">
                <ShieldCheck className="w-4.5 h-4.5 text-[#adff00]" />
                <span>Premium Allocations Confirmed</span>
              </div>
            </div>

            {/* Executive concierge summary */}
            <div className="md:col-span-8 p-5 rounded-2xl border border-zinc-900 bg-zinc-950 shadow-lg flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 flex items-center gap-1.5 mb-2">
                  <Star className="w-3 h-3 text-[#00e1ff]" />
                  <span>Private Wealth Concierge Summary</span>
                </span>
                <blockquote className="text-zinc-200 text-xs italic leading-relaxed pt-1 border-l-2 border-[#00e1ff]/40 pl-3">
                  "{insights.summary}"
                </blockquote>
              </div>
              <div className="text-[10px] text-zinc-500 font-mono mt-3 text-right">
                Family Office Intel • Powered by Gemini 3.5
              </div>
            </div>
          </div>

          {/* Tips and saving advice list */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase font-bold tracking-wider text-zinc-400 px-1">Tailored High-Impact saves</h4>
            <div className="grid gap-3">
              {insights.topSaves.map((save, sIdx) => {
                const badgeStyle = getImpactColor(save.impact);
                return (
                  <div
                    key={`save-${sIdx}`}
                    className="p-4 rounded-xl border border-zinc-900 bg-zinc-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-zinc-850/80 transition-all duration-200"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white bg-zinc-900 px-2.5 py-0.5 rounded border border-zinc-850">
                          {save.category}
                        </span>
                        <span className={`text-[10px] uppercase tracking-wider font-bold py-0.5 px-2 rounded-full border ${badgeStyle}`}>
                          {save.impact} Save
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed pr-2">{save.tips}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Budget Alerts List */}
          {insights.budgetAlerts && insights.budgetAlerts.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-bold tracking-wider text-zinc-400 px-1">Allocation deviations</h4>
              <div className="grid gap-3">
                {insights.budgetAlerts.map((alert, aIdx) => {
                  const styles = getAlertIconAndStyles(alert.level);
                  return (
                    <div
                      key={`alert-${aIdx}`}
                      className={`p-3 rounded-xl border flex items-start gap-3 ${styles.bgClass}`}
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-xs font-semibold">{alert.title}</h5>
                        <p className="text-[11px] text-zinc-500 leading-relaxed mt-0.5">{alert.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-12 p-6 rounded-2xl border border-zinc-900 bg-zinc-950/60 text-center">
          <BrainCircuit className="w-8 h-8 text-zinc-650 mx-auto mb-2" />
          <p className="text-zinc-500 text-xs">Ledger analysis pending. Trigger generation above.</p>
        </div>
      )}
    </div>
  );
}

/**
 * Failsafe offline intelligence compilation generator to simulate perfect advice based on current transactions and limits.
 * Protects runtime availability if Gemini SDK is missing keys or backend isn't available.
 */
function compileSimulatedInsights(transactions: Transaction[], budgets: Budget[]): AiInsight {
  const signContext = determineSignContext(transactions);

  const outboundTransactions = transactions.filter((t) => {
    return !smartIsIncome(t, signContext) && t.amount !== 0;
  });
  const totalSpent = outboundTransactions.reduce((acc, t) => acc + Math.abs(t.amount), 0);

  // Group by spending
  const expensesByCategory: Record<string, number> = {};
  outboundTransactions.forEach((t) => {
    expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + Math.abs(t.amount);
  });

  // Calculate highest spent category
  const sortedSpent = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]);
  const primeSpendingCategory = sortedSpent[0]?.[0] || 'Entertainment';
  const primeSpentSum = sortedSpent[0]?.[1] || 0;

  // Let's check which categories broke their budgets
  const brokenCategories: string[] = [];
  budgets.forEach((b) => {
    if (b.spent > b.limit) {
      brokenCategories.push(b.category);
    }
  });

  // Compose dynamic advice matching user state
  let sum = '';
  const saves: { category: string; tips: string; impact: string }[] = [];
  const alerts: { title: string; description: string; level: 'critical' | 'warning' | 'info' }[] = [];
  let score = 84;

  if (brokenCategories.length > 0) {
    sum = `Your financial allocations demonstrate high luxury with dynamic wealth growth. However, expenditure patterns in ${brokenCategories.join(' and ')} have exceeded target limits. Immediate re-balancing of your private accounts is recommended to secure optimal long-term savings rates and asset appreciation interest.`;
    score = 72;

    brokenCategories.forEach((cat) => {
      alerts.push({
        title: `${cat} Allocation Deviation`,
        description: `Your spending in ${cat} exceeded targeted allowance limits. Consider moving funds or capping secondary retail invoices.`,
        level: 'critical',
      });
    });
  } else {
    sum = `Outstanding portfolio control. Your expenditure ledger complies 100% with all established budgets. Maintaining this elite standard will produce a beautiful investable cash surplus this month, positioning your liquid net capital to capitalize on high-yielding growth opportunities.`;
    score = 95;

    alerts.push({
      title: 'Optimal Allocation Shield',
      description: 'Your budgets are in pristine operational status. Active savings curve targets achieved.',
      level: 'info',
    });
  }

  // Savings advice
  saves.push({
    category: primeSpendingCategory,
    tips: `Optimize secondary invoices under your high-velocity ${primeSpendingCategory} accounts. Subdividing major merchant bills (such as Whole Foods or premium wellness bookings) into strict limits can secure up to $150 in surplus cash flow.`,
    impact: 'High',
  });

  saves.push({
    category: 'Utilities',
    tips: `Consolidate duplicative cloud invoices (like Amazon Web Services or digital luxury news publications) into joint corporate subscription bundles to optimize overhead fees.`,
    impact: 'Medium',
  });

  return {
    summary: sum,
    topSaves: saves,
    budgetAlerts: alerts,
    financialScore: score,
  };
}
