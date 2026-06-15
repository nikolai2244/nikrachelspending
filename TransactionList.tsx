import React, { useState } from 'react';
import { Transaction } from '../types';
import { getCategoryStyle, isIncomeTransaction } from '../utils';
import {
  Utensils,
  Home,
  Car,
  Tv,
  ShoppingBag,
  HeartPulse,
  Zap,
  TrendingUp,
  Sparkles,
  Plus,
  Search,
  Calendar,
  Tag,
  Trash2,
  FileSpreadsheet,
  X,
  CreditCard,
  User,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';

// Dynamic mapping of string categories to Lucide components
const CATEGORY_ICONS: Record<string, React.ComponentType<any>> = {
  Food: Utensils,
  Housing: Home,
  Transport: Car,
  Entertainment: Tv,
  Shopping: ShoppingBag,
  Health: HeartPulse,
  Utilities: Zap,
  Income: TrendingUp,
  Other: Sparkles,
};

interface TransactionListProps {
  transactions: Transaction[];
  onAddTransaction: (newTx: Omit<Transaction, 'id' | 'source'>) => void;
  onDeleteTransaction: (id: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
}

export default function TransactionList({
  transactions,
  onAddTransaction,
  onDeleteTransaction,
  selectedCategory,
  setSelectedCategory,
}: TransactionListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Form Fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Food');
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Filtering Logic
  const filtered = transactions.filter((t) => {
    const matchesSearch =
      t.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory =
      selectedCategory === 'All' ||
      t.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant || !amount) return;

    // Expenditures are logged as positive on the ledger unless the category represents Income, in which case we store negative.
    const numericAmount = parseFloat(amount);
    const finalAmount = category === 'Income' ? -Math.abs(numericAmount) : Math.abs(numericAmount);

    onAddTransaction({
      date,
      category,
      merchant,
      amount: finalAmount,
      notes: notes.trim() || undefined,
    });

    // Reset Form states
    setMerchant('');
    setAmount('');
    setNotes('');
    setIsAdding(false);
  };

  // Extract distinct categories dynamically to assist filtering choice
  const uniqueCategories = ['All', ...Array.from(new Set(transactions.map((t) => t.category)))];

  return (
    <div className="space-y-4">
      {/* Search Header and Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative grow">
          <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-zinc-600" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search merchants or notes..."
            className="w-full text-sm pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-900 rounded-xl focus:outline-none focus:border-[#00e1ff]/50 text-white placeholder-zinc-600 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              let csvContent = "data:text/csv;charset=utf-8,Date,Merchant,Category,Amount,Notes\n";
              transactions.forEach(tx => {
                const row = [
                  tx.date,
                  `"${tx.merchant.replace(/"/g, '""')}"`,
                  tx.category,
                  tx.amount,
                  `"${tx.notes ? tx.notes.replace(/"/g, '""') : ''}"`
                ].join(",");
                csvContent += row + "\n";
              });
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `transactions_export.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-sm font-semibold rounded-xl cursor-pointer select-none transition-colors"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#00e1ff] hover:bg-[#00e1ff]/80 text-black text-sm font-semibold rounded-xl cursor-pointer shadow-lg shadow-[#00e1ff]/15 select-none transition-colors"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Horizontal pill list of spending categories triggers */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
        {uniqueCategories.map((cat) => {
          const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
          const style = getCategoryStyle(cat);
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs py-1.5 px-3 rounded-full font-medium transition-all cursor-pointer whitespace-nowrap border select-none ${
                isSelected
                  ? 'bg-[#00e1ff] text-black border-[#00e1ff]'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-900 hover:text-white'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Add Manual Form Panel Popup */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-900 w-full max-w-md p-5 rounded-2xl shadow-2xl relative space-y-4 animate-fade-in animate-scale-up">
            <button
              onClick={() => setIsAdding(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#00e1ff]" />
                <span>Log Custom Ledger Entry</span>
              </h3>
              <p className="text-xs text-zinc-500">Record payments manually to capture raw offline allocations</p>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-550 mb-1">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-zinc-650" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs py-2 pl-9 pr-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#00e1ff]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-550 mb-1">Category</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-2.5 w-4 h-4 text-zinc-650" />
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full text-xs py-2 pl-9 pr-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-[#00e1ff]"
                    >
                      {Object.keys(CATEGORY_ICONS).map((catName) => (
                        <option key={catName} value={catName}>
                          {catName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-550 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="25.00"
                    className="w-full text-xs py-2 px-3.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-[#00e1ff]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-550 mb-1">Merchant / Description</label>
                <input
                  type="text"
                  required
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder="e.g. Blue Bottle Coffee"
                  className="w-full text-xs py-2 px-3.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-[#00e1ff]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-550 mb-1">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional context on expenditures..."
                  rows={2}
                  className="w-full text-xs py-2 px-3.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-655 focus:outline-none focus:border-[#00e1ff] resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="w-1/2 py-2 px-4 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white text-xs font-semibold select-none transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 px-4 rounded-xl bg-[#00e1ff] hover:bg-[#00e1ff]/80 text-black text-xs font-semibold shadow-lg shadow-[#00e1ff]/10 select-none transition-colors"
                >
                  Log Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Structured Ledger rows grouped by day */}
      <div className="border border-zinc-900 bg-zinc-950 rounded-2xl overflow-hidden shadow-xl">
        {filtered.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="p-3 bg-zinc-900 border border-zinc-850 rounded-full inline-block mb-3 text-zinc-600">
              <CreditCard className="w-6 h-6" />
            </div>
            <p className="text-zinc-500 text-sm">No ledger entries filtered. Clear criteria or write new rows.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-900">
            {filtered
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((tx) => {
                const style = getCategoryStyle(tx.category);
                const IconComponent = CATEGORY_ICONS[tx.category] || Sparkles;
                const isIncome = isIncomeTransaction(tx.amount, tx.category, tx.merchant);

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 bg-zinc-950 hover:bg-zinc-900/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      {/* Interactive dynamic category logo */}
                      <div className={`p-2.5 rounded-xl border shrink-0 ${style.bgClass} ${style.colorClass} ${style.borderClass}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      
                      <div className="min-w-0">
                        <span className="block font-semibold text-zinc-100 text-sm truncate max-w-[150px] sm:max-w-xs">{tx.merchant}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-zinc-500 font-mono">{tx.date}</span>
                          <span className="text-[10px] text-zinc-600">•</span>
                          <span className="text-[10px] text-zinc-400 tracking-wide font-medium">{tx.category}</span>
                          <span className="text-[10px] text-zinc-600">•</span>
                          
                          {/* Sync origin icon indicators */}
                          {tx.source === 'sheet' ? (
                            <span className="inline-flex items-center text-[9px] text-[#adff00] font-medium font-mono gap-0.5">
                              <FileSpreadsheet className="w-2.5 h-2.5" /> Sheets
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[9px] text-zinc-500 font-medium font-mono gap-0.5">
                              <User className="w-2.5 h-2.5" /> Manual
                            </span>
                          )}
                        </div>
                        {tx.notes && (
                          <p className="text-[11px] text-zinc-500 italic mt-1 font-mono leading-relaxed truncate max-w-[150px] sm:max-w-xs">
                            "{tx.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className={`text-sm font-semibold font-mono flex items-center justify-end ${isIncome ? 'text-[#adff00]' : 'text-zinc-200'}`}>
                          {isIncome ? (
                            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                          )}
                          ${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <button
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="text-zinc-700 hover:text-red-400 p-1 rounded-lg hover:bg-zinc-900 transition-all cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
