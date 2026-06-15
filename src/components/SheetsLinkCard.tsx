import React, { useState, useRef } from 'react';
import { Transaction } from '../types';
import { SheetConfig } from "@/server";
import { extractSpreadsheetId, fetchGoogleSheet, mapGvizToTransactions } from '../utils';
import {
  FileSpreadsheet,
  RefreshCw,
  HelpCircle,
  Check,
  Info,
  Upload,
  Database,
  CloudLightning,
  Sparkles,
  FileText,
  AlertTriangle
} from 'lucide-react';

interface SheetsLinkCardProps {
  config: SheetConfig;
  onConfigChange: (newConfig: SheetConfig) => void;
  onTransactionsSynced: (transactions: Transaction[]) => void;
}

export default function SheetsLinkCard({
  config,
  onConfigChange,
  onTransactionsSynced,
}: SheetsLinkCardProps) {
  const [activeTab, setActiveTab] = useState<'cloud' | 'csv'>('cloud');

  // Cloud Config state
  const [urlInput, setUrlInput] = useState(config.sheetUrl);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Column mapper controls
  const [dateCol, setDateCol] = useState(config.dateCol);
  const [categoryCol, setCategoryCol] = useState(config.categoryCol);
  const [merchantCol, setMerchantCol] = useState(config.merchantCol);
  const [amountCol, setAmountCol] = useState(config.amountCol);

  // CSV Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setUrlInput(rawVal);
    const extractedId = extractSpreadsheetId(rawVal);

    onConfigChange({
      ...config,
      sheetUrl: rawVal,
      sheetId: extractedId,
    });
  };

  const handleTestAndSync = async () => {
    if (!config.sheetId) {
      setSyncError('Please supply a valid Google Sheet URL or key.');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(false);

    try {
      const liveTable = await fetchGoogleSheet(config.sheetId, config.sheetUrl || urlInput);
      const activeMapping = {
        date: dateCol || 'A',
        category: categoryCol || 'B',
        merchant: merchantCol || 'C',
        amount: amountCol || 'D',
      };

      const importedTransactions = mapGvizToTransactions(liveTable, activeMapping);

      onTransactionsSynced(importedTransactions);

      onConfigChange({
        ...config,
        sheetUrl: urlInput,
        sheetId: config.sheetId,
        dateCol,
        categoryCol,
        merchantCol,
        amountCol,
        lastSynced: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });

      if (importedTransactions.length === 0) {
        setSyncError("Spreadsheet linked successfully, but no transactions were parsed. Double-check your table's columns and ensure they match 'Date', 'Category', 'Merchant', and 'Amount'.");
      } else {
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 3000);
      }
    } catch (err: any) {
      console.error('Sheet fetching error:', err);
      setSyncError(err.message || 'Failed to sync with spreadsheet.');
    } finally {
      setIsSyncing(false);
    }
  };

  // CSV Parser with header detection and mapping defaults
  const handleCSVTextParse = (text: string) => {
    setCsvError(null);
    setCsvSuccess(null);

    try {
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length < 2) {
        throw new Error('CSV file should have at least some headers and one transaction row.');
      }

      // Simple CSV Splitter that respects quotes
      const splitCsvRow = (rowStr: string): string[] => {
        const result: string[] = [];
        let curVal = '';
        let insideQuote = false;
        for (let i = 0; i < rowStr.length; i++) {
          const char = rowStr[i];
          if (char === '"') {
            insideQuote = !insideQuote;
          } else if (char === ',' && !insideQuote) {
            result.push(curVal.trim().replace(/^"|"$/g, ''));
            curVal = '';
          } else {
            curVal += char;
          }
        }
        result.push(curVal.trim().replace(/^"|"$/g, ''));
        return result;
      };

      const headers = splitCsvRow(lines[0]).map(h => h.toLowerCase().trim());

      // Attempt to guess columns
      let dateIdx = headers.findIndex(h => h.includes('date') || h.includes('time'));
      let categoryIdx = headers.findIndex(h => h.includes('category') || h.includes('group') || h.includes('cat'));
      let merchantIdx = headers.findIndex(h => h.includes('merchant') || h.includes('store') || h.includes('desc') || h.includes('details') || h.includes('payee') || h.includes('item'));
      let amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('cost') || h.includes('price') || h.includes('spent') || h.includes('value'));

      // Fallbacks
      if (dateIdx === -1) dateIdx = 0;
      if (categoryIdx === -1) categoryIdx = Math.min(1, headers.length - 1);
      if (merchantIdx === -1) merchantIdx = Math.min(2, headers.length - 1);
      if (amountIdx === -1) amountIdx = Math.min(3, headers.length - 1);

      const parsedTxs: Transaction[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = splitCsvRow(lines[i]);
        if (cols.length < Math.max(dateIdx, categoryIdx, merchantIdx, amountIdx) + 1) {
          continue; // row empty or missing items
        }

        const rawDate = cols[dateIdx];
        const rawCategory = cols[categoryIdx] || 'Other';
        const rawMerchant = cols[merchantIdx] || 'Generic Merchant';
        const rawAmount = cols[amountIdx];

        // Format Date
        let cleanDate = new Date().toISOString().split('T')[0];
        try {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            cleanDate = d.toISOString().split('T')[0];
          }
        } catch { }

        // Format Amount
        let numAmount = parseFloat(rawAmount.replace(/[^0-9.-]/g, '')) || 0;

        parsedTxs.push({
          id: `csv-${i}-${Date.now()}`,
          date: cleanDate,
          category: rawCategory.trim() || 'Other',
          merchant: rawMerchant.trim() || 'Merchant',
          amount: numAmount,
          source: 'sheet', // marks it as synchronized
        });
      }

      if (parsedTxs.length === 0) {
        throw new Error('Failed to parse any transactions from the CSV. Please ensure column formatting aligns.');
      }

      onTransactionsSynced(parsedTxs);
      setCsvSuccess(`Successfully loaded ${parsedTxs.length} records! Your elite dashboard is live with CSV ledger flows.`);
    } catch (e: any) {
      setCsvError(e.message || 'Failed to map CSV headings.');
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          if (evt.target?.result) {
            handleCSVTextParse(evt.target.result as string);
          }
        };
        reader.readAsText(file);
      } else {
        setCsvError('Please drop a valid .csv spreadsheet file.');
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          handleCSVTextParse(evt.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div id="sheets-sync-card" className="border border-zinc-900 bg-zinc-950 p-5 rounded-2xl shadow-2xl transition-all duration-300">

      {/* Tab Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-900 rounded-xl mb-4 border border-zinc-850">
        <button
          onClick={() => setActiveTab('cloud')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 px-3 rounded-lg font-semibold transition-all cursor-pointer ${activeTab === 'cloud'
              ? 'bg-zinc-950 text-white shadow-md border border-zinc-800'
              : 'text-zinc-400 hover:text-zinc-200'
            }`}
        >
          <CloudLightning className="w-3.5 h-3.5 text-[#00e1ff]" />
          <span>Google Sheets</span>
        </button>
        <button
          onClick={() => setActiveTab('csv')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 px-3 rounded-lg font-semibold transition-all cursor-pointer ${activeTab === 'csv'
              ? 'bg-zinc-950 text-white shadow-md border border-zinc-800'
              : 'text-zinc-400 hover:text-zinc-200'
            }`}
        >
          <Database className="w-3.5 h-3.5 text-[#adff00]" />
          <span>Upload CSV</span>
        </button>
      </div>

      {activeTab === 'cloud' ? (
        // GOOGLE SHEETS ACTIVE VIEW
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4.5 h-4.5 text-[#00e1ff]" />
              <h3 className="font-semibold text-white text-sm">Google Sheets Live Sync</h3>
            </div>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="text-zinc-555 hover:text-white transition-colors"
              title="Setup Guide"
            >
              <HelpCircle className="w-4.5 h-4.5 text-zinc-500" />
            </button>
          </div>

          {showGuide && (
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-900 text-[11px] text-zinc-400 space-y-2.5 leading-relaxed font-sans">
              <div className="flex items-start gap-1 text-[#adff00] font-semibold">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Quick sharing instructions</span>
              </div>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Open your tracker Sheet in Google.</li>
                <li>Tap the gold <strong className="text-zinc-200">Share</strong> button.</li>
                <li>Set access to <strong className="text-zinc-200">"Anyone with the link can view"</strong> (crucial).</li>
                <li>Copy/paste spreadsheet URL down below.</li>
              </ol>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Spreadsheet URL</label>
              <input
                type="text"
                value={urlInput}
                onChange={handleUrlChange}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full text-xs py-2 px-3 bg-zinc-900 border border-zinc-850 rounded-xl text-zinc-100 placeholder-zinc-655 focus:outline-none focus:border-[#00e1ff] transition-all"
              />
              {config.sheetId && (
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-506">
                  <span className="truncate max-w-[80%] font-mono">ID: {config.sheetId}</span>
                  <span className="text-[#adff00] flex items-center gap-0.5 font-bold font-mono">Shared <Check className="w-3 h-3" /></span>
                </div>
              )}
            </div>

            {/* Column mappings */}
            <div className="bg-zinc-900/40 border border-zinc-900/80 p-3 rounded-xl space-y-3">
              <span className="block text-xs font-semibold text-zinc-300">Spreadsheet Headers Mapping</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-1">Date</label>
                  <input
                    type="text"
                    value={dateCol}
                    onChange={(e) => setDateCol(e.target.value)}
                    placeholder="Date / A"
                    className="w-full text-xs py-1.5 px-2 bg-zinc-900 border border-zinc-850 rounded-lg text-zinc-200 focus:outline-none focus:border-[#00e1ff]/50"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-1">Category</label>
                  <input
                    type="text"
                    value={categoryCol}
                    onChange={(e) => setCategoryCol(e.target.value)}
                    placeholder="Category / B"
                    className="w-full text-xs py-1.5 px-2 bg-zinc-900 border border-zinc-850 rounded-lg text-zinc-200 focus:outline-none focus:border-[#00e1ff]/50"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-1">Merchant</label>
                  <input
                    type="text"
                    value={merchantCol}
                    onChange={(e) => setMerchantCol(e.target.value)}
                    placeholder="Merchant / C"
                    className="w-full text-xs py-1.5 px-2 bg-zinc-900 border border-zinc-850 rounded-lg text-zinc-200 focus:outline-none focus:border-[#00e1ff]/50"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-1">Amount</label>
                  <input
                    type="text"
                    value={amountCol}
                    onChange={(e) => setAmountCol(e.target.value)}
                    placeholder="Amount / D"
                    className="w-full text-xs py-1.5 px-2 bg-zinc-900 border border-zinc-850 rounded-lg text-zinc-200 focus:outline-none focus:border-[#00e1ff]/50"
                  />
                </div>
              </div>
            </div>

            {/* Status alerts */}
            {syncError && (
              <div className="p-3 text-xs bg-red-500/5 border border-red-500/20 text-red-400 rounded-xl flex items-start gap-2 leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{syncError}</span>
              </div>
            )}

            {config.lastSynced && !syncError && (
              <div className="text-[10px] text-zinc-500 flex items-center justify-between px-1 font-mono">
                <span>Last live synced: <strong>{config.lastSynced}</strong></span>
                <span className="text-[#adff00] font-bold">Auto-sync armed</span>
              </div>
            )}

            <button
              onClick={handleTestAndSync}
              disabled={isSyncing || !config.sheetId}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-semibold text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[#00e1ff] hover:bg-[#00e1ff]/85 text-black shadow-lg shadow-[#00e1ff]/10"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synchronizing Cloud Rows...</span>
                </>
              ) : syncSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 animate-bounce" />
                  <span>Synchronized Perfectly!</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Google Sheet Link</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        // OFFLINE CSV LEDGER IMPORTER DRAG AND DROP ZONE
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4.5 h-4.5 text-[#adff00]" />
              <h3 className="font-semibold text-white text-sm">Offline CSV Importer</h3>
            </div>
            <span className="text-[10px] uppercase font-semibold text-zinc-500 bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded font-mono">Local-First</span>
          </div>

          {/* Interactive touch & drag-and-drop box */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer p-6 border border-dashed rounded-2xl flex flex-col items-center justify-center text-center space-y-3 transition-all ${isDragging
                ? 'border-[#00e1ff] bg-[#00e1ff]/5 shadow-inner'
                : 'border-zinc-850 hover:border-[#00e1ff]/30 bg-zinc-950 hover:bg-zinc-900/30'
              }`}
          >
            <div className="p-3 bg-zinc-900/80 rounded-full border border-zinc-800 text-zinc-400 group-hover:text-white transition-colors">
              <Upload className={`w-6 h-6 ${isDragging ? 'animate-bounce' : ''}`} />
            </div>
            <div>
              <span className="block text-xs font-semibold text-zinc-300">Drag & drop your Ledger CSV bank export here</span>
              <p className="text-[10px] text-zinc-550 mt-1">or tap anywhere to manually pick from directories</p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* CSV Mapping advice */}
          <div className="p-3 rounded-xl bg-zinc-900/30 border border-zinc-900 text-[10px] text-zinc-500 leading-relaxed font-mono">
            💡 Guesses layout automatically: First column as <span className="text-[#adff00]">Date</span>, then <span className="text-[#adff00]">Category</span>, then <span className="text-[#adff00]">Merchant</span>, and fourth column as <span className="text-[#adff00]">Amount</span>.
          </div>

          {csvError && (
            <div className="p-3 text-xs bg-red-500/5 border border-red-500/20 text-red-500 rounded-xl flex items-start gap-2 leading-relaxed font-mono">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{csvError}</span>
            </div>
          )}

          {csvSuccess && (
            <div className="p-3.5 text-xs bg-[#adff00]/10 border border-[#adff00]/20 text-[#adff00] rounded-xl flex items-start gap-2 leading-relaxed">
              <Check className="w-4 h-4 shrink-0 mt-0.5 text-[#adff00] animate-bounce" />
              <span>{csvSuccess}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
