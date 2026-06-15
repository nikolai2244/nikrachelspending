import React from 'react';
import { Transaction } from '../types';
import { getCategoryStyle, smartIsIncome, determineSignContext } from '../utils';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown,
  ArrowDownLeft, 
  ArrowUpRight, 
  PiggyBank, 
  Filter, 
  X, 
  Calendar, 
  Tag, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface StatsViewProps {
  transactions: Transaction[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
}

export default function StatsView({ 
  transactions, 
  selectedCategory, 
  setSelectedCategory, 
  selectedDate, 
  setSelectedDate 
}: StatsViewProps) {
  const signContext = determineSignContext(transactions);

  // 1. Calculate Core Financial Metrics
  const totalIncome = transactions
    .filter((t) => smartIsIncome(t, signContext))
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const totalSpent = transactions
    .filter((t) => !smartIsIncome(t, signContext) && t.amount !== 0)
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const netSavings = totalIncome - totalSpent;

  // Determine dynamic weekly inflows (last 7 days of ledger based on latest transaction anchor)
  const parseNormalizedTime = (dateStr: string) => {
    if (!dateStr) return 0;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])).getTime();
    }
    return new Date(dateStr).getTime();
  };

  const latestTxTime = transactions.length > 0
    ? Math.max(...transactions.map(t => parseNormalizedTime(t.date)))
    : parseNormalizedTime('2026-06-14');

  const sevenDaysAgoTime = latestTxTime - (7 * 24 * 60 * 60 * 1000);

  const weeklyInflows = transactions
    .filter((t) => {
      if (!smartIsIncome(t, signContext)) return false;
      const tTime = parseNormalizedTime(t.date);
      return tTime >= sevenDaysAgoTime && tTime <= latestTxTime;
    })
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const weeklyInflowCount = transactions
    .filter((t) => {
      if (!smartIsIncome(t, signContext)) return false;
      const tTime = parseNormalizedTime(t.date);
      return tTime >= sevenDaysAgoTime && tTime <= latestTxTime;
    }).length;

  // 1.5 Calculate Month-over-Month
  const anchorDateObj = new Date(latestTxTime);
  const currentMonth = anchorDateObj.getMonth();
  const currentYear = anchorDateObj.getFullYear();
  
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const currentMonthSpending = transactions
    .filter(t => {
      if (smartIsIncome(t, signContext) || t.amount === 0) return false;
      const d = new Date(parseNormalizedTime(t.date));
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const lastMonthSpending = transactions
    .filter(t => {
      if (smartIsIncome(t, signContext) || t.amount === 0) return false;
      const d = new Date(parseNormalizedTime(t.date));
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    })
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const momChange = lastMonthSpending === 0 ? 0 : ((currentMonthSpending - lastMonthSpending) / lastMonthSpending) * 100;
  const isMomGood = momChange <= 0; // Less spending is good

  // 2. Format Category breakdown for Recharts Pie
  const categoryTotals: Record<string, number> = {};
  transactions
    .filter((t) => !smartIsIncome(t, signContext) && t.amount !== 0)
    .forEach((t) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount);
    });

  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({
    name,
    value: parseFloat(value.toFixed(2)),
    color: getCategoryStyle(name).accentHex,
  }));

  // 3. Chronological Daily spend trend for Recharts Bar
  const dailyTotals: Record<string, number> = {};
  
  // Anchor to the latest transaction date (not today's date) so bars always reflect real data
  const anchorDate = new Date(latestTxTime);
  const last10Days = Array.from({ length: 10 }).map((_, i) => {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  last10Days.forEach(dateStr => {
    dailyTotals[dateStr] = 0;
  });

  // Accumulate spending into the anchored date buckets
  transactions
    .filter((t) => !smartIsIncome(t, signContext) && t.amount !== 0)
    .forEach((t) => {
      const amt = Math.abs(t.amount);
      if (dailyTotals[t.date] !== undefined) {
        dailyTotals[t.date] = (dailyTotals[t.date] || 0) + amt;
      }
    });

  const barData = Object.entries(dailyTotals)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([date, amount]) => {
      const monthDay = date.split('-').slice(1).join('/'); // convert 2026-06-12 to "06/12"
      return {
        date: monthDay,
        fullDate: date,
        spending: parseFloat(amount.toFixed(2)),
      };
    });

  // Filter transactions for instant local breakdown on tap
  const hasActiveFilters = selectedCategory !== 'All' || selectedDate !== null;
  const interactiveFilteredTxs = transactions.filter(t => {
    const matchesCat = selectedCategory === 'All' || t.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesDate = selectedDate === null || t.date === selectedDate;
    return matchesCat && matchesDate;
  });

  return (
    <div className="space-y-6">
      {/* KPI Highlight Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl border border-zinc-900 bg-zinc-950 flex flex-col justify-between shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] uppercase font-bold tracking-wider font-display">Cumulative Inflows</span>
            <div className="p-1.5 rounded-lg bg-[#adff00]/10 text-[#adff00]">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-lg font-semibold font-mono text-white">
              ${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="text-[9px] text-zinc-500 mt-1 font-mono">All-time spreadsheet inflows</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-zinc-900 bg-zinc-950 flex flex-col justify-between shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] uppercase font-bold tracking-wider font-display">Cumulative Outflows</span>
            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-lg font-semibold font-mono text-white">
              ${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="text-[9px] text-zinc-500 mt-1 font-mono">All-time visual expenses</p>
          </div>
        </div>

        {/* Brand New Visual Weekly Inflows Dashboard Card */}
        <div className="p-4 rounded-2xl border border-zinc-900 bg-zinc-950 flex flex-col justify-between shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#00e1ff]/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] uppercase font-bold tracking-wider font-display">Weekly Inflows (7D)</span>
            <div className="p-1 px-2 rounded-lg bg-[#00e1ff]/10 text-[#00e1ff] flex items-center gap-1 font-mono text-[9px] font-bold border border-[#00e1ff]/15">
              <Sparkles className="w-2.5 h-2.5" />
              <span>{weeklyInflowCount} Synced Row{weeklyInflowCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-lg font-extrabold font-mono text-[#00e1ff]">
              ${weeklyInflows.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            
            {/* Cool visual progress line indicator */}
            <div className="mt-2 flex flex-col gap-1">
              <div className="h-1 w-full bg-zinc-90 w-full bg-zinc-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#00e1ff] to-[#adff00] transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min((weeklyInflows / (totalIncome || 1)) * 100, 100)}%` }}
                />
              </div>
              <p className="text-[8px] text-zinc-500 font-mono flex items-center justify-between">
                <span>7-Day Weight</span>
                <span>{((weeklyInflows / (totalIncome || 1)) * 100).toFixed(0)}% of total</span>
              </p>
            </div>
          </div>
        </div>

        {/* MoM Comparison Card */}
        <div className="p-4 rounded-2xl border border-zinc-900 bg-zinc-950 flex flex-col justify-between shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] uppercase font-bold tracking-wider font-display">Current Month Spend</span>
            <div className={`p-1.5 rounded-lg ${isMomGood ? 'bg-[#adff00]/10 text-[#adff00]' : 'bg-red-500/10 text-red-400'}`}>
              {isMomGood ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-lg font-semibold font-mono text-white">
              ${currentMonthSpending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-[10px] font-mono font-bold ${isMomGood ? 'text-[#adff00]' : 'text-red-400'}`}>
                {momChange > 0 ? '+' : ''}{momChange.toFixed(1)}%
              </span>
              <span className="text-[9px] text-zinc-500 font-mono">vs last month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Filter Status Bar */}
      {hasActiveFilters && (
        <div className="p-3 bg-zinc-900/90 border border-[#00e1ff]/30 rounded-xl flex items-center justify-between shadow-inner animate-pulse-slow">
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            <Filter className="w-3.5 h-3.5 text-[#00e1ff]" />
            <span>Interactive Filters:</span>
            {selectedCategory !== 'All' && (
              <span className="bg-[#adff00]/10 border border-[#adff00]/20 text-[#adff00] text-[10px] font-semibold font-mono px-2 py-0.5 rounded-md flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {selectedCategory}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedCategory('All')} />
              </span>
            )}
            {selectedDate !== null && (
              <span className="bg-[#00e1ff]/10 border border-[#00e1ff]/20 text-[#00e1ff] text-[10px] font-semibold font-mono px-2 py-0.5 rounded-md flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {selectedDate}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedDate(null)} />
              </span>
            )}
          </div>
          <button 
            onClick={() => {
              setSelectedCategory('All');
              setSelectedDate(null);
            }}
            className="text-[10px] uppercase font-bold text-zinc-400 hover:text-white transition-colors"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Grid of charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Pie allocation chart */}
        <div className="p-5 rounded-2xl border border-zinc-900 bg-zinc-950/60 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-zinc-400 px-1 font-display">Visual Allocation</h4>
              <p className="text-[9px] text-zinc-500 px-1">Click slice to query category</p>
            </div>
            {selectedCategory !== 'All' && (
              <span className="text-[9px] text-[#adff00] font-bold bg-[#adff00]/10 px-1.5 py-0.5 rounded font-mono">
                FILTER ACTIVE
              </span>
            )}
          </div>
          {pieData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-zinc-600 text-xs text-center border border-dashed border-zinc-900 rounded-xl">
              <TrendingUp className="w-6 h-6 mb-2 text-zinc-700" />
              <span>No allocations found.</span>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    className="cursor-pointer"
                    onClick={(entry) => {
                      if (entry && entry.payload) {
                        const clickedCat = entry.payload.name;
                        setSelectedCategory(selectedCategory === clickedCat ? 'All' : clickedCat);
                      }
                    }}
                  >
                    {pieData.map((entry, index) => {
                      const isSelected = selectedCategory.toLowerCase() === entry.name.toLowerCase();
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                          stroke={isSelected ? '#ffffff' : '#09090b'}
                          strokeWidth={isSelected ? 2.5 : 1}
                          fillOpacity={selectedCategory === 'All' || isSelected ? 1.0 : 0.4}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                    itemStyle={{ color: '#ffffff', fontSize: '12px', fontFamily: 'monospace' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconSize={8}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '10px', color: '#a1a1aa', marginTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bar Spend Trend timeline */}
        <div className="p-5 rounded-2xl border border-zinc-900 bg-zinc-950/60 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-zinc-400 px-1 font-display">Daily Accumulation</h4>
              <p className="text-[9px] text-zinc-500 px-1">Click bar to target daily entries</p>
            </div>
            {selectedDate !== null && (
              <span className="text-[9px] text-[#00e1ff] font-bold bg-[#00e1ff]/10 px-1.5 py-0.5 rounded font-mono">
                DATE ACTIVE
              </span>
            )}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={barData} 
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const fullD = e.activePayload[0].payload.fullDate;
                    setSelectedDate(selectedDate === fullD ? null : fullD);
                  }
                }}
              >
                <XAxis
                  dataKey="date"
                  stroke="#52525b"
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#52525b"
                  tick={{ fill: '#71717a', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                  labelStyle={{ color: '#a1a1aa', fontSize: '11px', fontFamily: 'monospace' }}
                  itemStyle={{ color: '#adff00', fontSize: '12px', fontFamily: 'monospace' }}
                />
                <Bar dataKey="spending" fill="#00e1ff" radius={[4, 4, 0, 0]} className="cursor-pointer">
                  {barData.map((entry, index) => {
                    const isSelected = selectedDate === entry.fullDate;
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={isSelected ? '#adff00' : '#00e1ff'} 
                        fillOpacity={selectedDate === null || isSelected ? 1.0 : 0.35}
                        stroke={isSelected ? '#ffffff' : 'none'}
                        strokeWidth={1}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Dynamic Local Filtered Details panel (Saves jumping tabs!) */}
      {hasActiveFilters && (
        <div className="p-4 border border-zinc-900 bg-zinc-950 rounded-2xl shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#00e1ff]" />
              <span className="text-xs font-semibold text-white">Targeted Live Breakdown</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded">
              {interactiveFilteredTxs.length} Record{interactiveFilteredTxs.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-zinc-900/60 scrollbar-none pr-1">
            {interactiveFilteredTxs.length === 0 ? (
              <p className="text-[11px] text-zinc-600 text-center py-6 font-mono">No matching records during this frame.</p>
            ) : (
              interactiveFilteredTxs.map(tx => {
                const style = getCategoryStyle(tx.category);
                const isIncome = smartIsIncome(tx, signContext);
                return (
                  <div key={tx.id} className="flex items-center justify-between py-2.5 text-xs">
                    <div className="min-w-0 pr-2">
                      <span className="font-semibold text-zinc-200 block truncate">{tx.merchant}</span>
                      <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 mt-0.5 font-mono">
                        <span>{tx.date}</span>
                        <span>•</span>
                        <span className={style.colorClass}>{tx.category}</span>
                      </div>
                    </div>
                    <span className={`font-mono font-semibold shrink-0 ${isIncome ? 'text-[#adff00]' : 'text-zinc-300'}`}>
                      {isIncome ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
