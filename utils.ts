import { Transaction } from './types';

/**
 * Robust check if a category refers to income.
 */
export function isIncomeCategory(category: string): boolean {
  const cat = String(category || '').toLowerCase().trim();
  const incomeTerms = [
    'income', 'salary', 'dividend', 'interest', 'deposit', 
    'payout', 'refund', 'inflow', 'wage', 'bonus', 'payroll', 
    'equity', 'venmo inflow', 'stripe payout', 'zelle inflow'
  ];
  return incomeTerms.some(term => cat.includes(term));
}

/**
 * Determines check if transaction is an income ingress.
 */
/**
 * Determines check if transaction is an income ingress.
 */
export function isIncomeTransaction(amount: number, category: string, merchant?: string): boolean {
  if (isIncomeCategory(category)) return true;
  if (merchant && isIncomeCategory(merchant)) return true;
  return false;
}

export type SignContext = 'all_positive' | 'positive_is_income' | 'negative_is_income';

export function determineSignContext(transactions: Transaction[]): SignContext {
  const hasNegative = transactions.some(t => t.amount < 0);
  if (!hasNegative) return 'all_positive';

  const knownIncome = transactions.filter(t => isIncomeCategory(t.category) || (t.merchant && isIncomeCategory(t.merchant)));
  if (knownIncome.length > 0) {
    const negInc = knownIncome.filter(t => t.amount < 0).length;
    const posInc = knownIncome.filter(t => t.amount > 0).length;
    if (negInc > posInc) return 'negative_is_income';
    if (posInc > negInc) return 'positive_is_income';
  }

  return 'positive_is_income'; // default assumption for mixed sign ledgers
}

export function smartIsIncome(tx: Transaction, context: SignContext): boolean {
  if (context === 'positive_is_income') {
    return tx.amount > 0;
  } else if (context === 'negative_is_income') {
    return tx.amount < 0;
  }
  return isIncomeTransaction(tx.amount, tx.category, tx.merchant);
}

/**
 * Extracts the 44-character character Spreadsheet ID from any raw Google Sheets URL.
 */
export function extractSpreadsheetId(url: string): string {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : url.trim();
}

/**
 * Robust parsing helper to extract standard numeric amounts across multiple formatting locales.
 */
export function robustParseFloat(val: any): number {
  if (typeof val === 'number') return val;
  if (val === null || val === undefined) return 0;
  
  let str = String(val).trim();
  if (!str) return 0;

  // Handle parenthesis negative notation and minus signs anywhere (e.g. $-124.50 or (124.50))
  const isNegative = str.includes('-') || (str.startsWith('(') && str.endsWith(')'));
  
  // Remove currency characters and parentheses
  let cleaned = str.replace(/[()$€£%\s]/g, '');

  // Detect comma as decimal mark vs thousand separator
  if (cleaned.includes(',')) {
    const lastCommaIdx = cleaned.lastIndexOf(',');
    const lastDotIdx = cleaned.lastIndexOf('.');
    if (lastDotIdx === -1 || lastCommaIdx > lastDotIdx) {
      // It's European style where comma is decimal. E.g. "1.250,50" or "1250,50"
      // Remove all dots first (they are thousand separators)
      cleaned = cleaned.replace(/\./g, '');
      // Replace last comma with dot
      cleaned = cleaned.substring(0, lastCommaIdx) + '.' + cleaned.substring(lastCommaIdx + 1);
    } else {
      // Comma is thousand separator e.g. "1,250.50". Just strip commas.
      cleaned = cleaned.replace(/,/g, '');
    }
  }

  let num = parseFloat(cleaned) || 0;
  return isNegative && num > 0 ? -num : num;
}

/**
 * Clears raw string dates or serialized spreadsheet date values into standard YYYY-MM-DD formats.
 */
export function parseRawDateString(str: string): string {
  if (!str) return new Date().toISOString().split('T')[0];
  const trimmed = str.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  
  // Handing the common gviz serialization: "Date(2026,5,12)" or "Date(2026,5,12,0,0,0)" -> Note that months in gviz are 0-indexed!
  const match = trimmed.match(/Date\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (match) {
    const y = parseInt(match[1]);
    const m = parseInt(match[2]) + 1; // convert to 1-indexed month
    const d = parseInt(match[3]);
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  try {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {}
  
  return new Date().toISOString().split('T')[0];
}

/**
 * Parses Google Sheets GViz Table API output into structured Transactions
 */
export function mapGvizToTransactions(
  table: any,
  mappings: { date: string; category: string; merchant: string; amount: string }
): Transaction[] {
  if (!table || !table.cols || !table.rows) return [];

  const cleanStr = (s: any) => String(s || '').toLowerCase().trim();

  // Determine if the first row is actually a header row containing labels rather than data
  let headerRowOffset = 0;
  const firstRowCells = table.rows[0]?.c || [];
  const firstRowValues = firstRowCells.map((cell: any) => cell ? cleanStr(cell.v) : '');

  const targetDateTerms = ['date', 'time', 'when', 'timestamp', 'day'];
  const targetCategoryTerms = ['category', 'cat', 'group', 'type', 'class', 'allocation'];
  const targetMerchantTerms = ['merchant', 'vendor', 'payee', 'store', 'description', 'desc', 'name', 'item', 'details', 'recipient', 'transaction', 'where', 'expense name', 'deposit name', 'payee name'];
  const targetAmountTerms = ['amount', 'price', 'cost', 'spent', 'val', 'value', 'total', 'charge', 'dr', 'cr', 'expense', 'deposit', 'withdrawal'];
  const targetBalanceTerms = ['balance', 'running', 'current', 'remaining'];

  // A resilient helper to match mapped columns back to sheet indexes
  const findColIndex = (colSpec: string, terms: string[]): number => {
    const spec = cleanStr(colSpec);

    // 1. Check direct exact match with metadata columns (label or id)
    let idx = table.cols.findIndex(
      (c: any) => cleanStr(c.label) === spec || cleanStr(c.id) === spec
    );
    if (idx !== -1) return idx;

    // 2. Direct letter index mapping (A = 0, B = 1, etc.)
    if (colSpec.length === 1 && spec >= 'a' && spec <= 'z') {
      const charIdx = spec.charCodeAt(0) - 97;
      if (charIdx >= 0 && charIdx < table.cols.length) return charIdx;
    }

    // Support "col a", "column a", etc.
    const letterMatch = spec.match(/(?:column|col)?\s*([a-z])$/i);
    if (letterMatch && letterMatch[1]) {
      const charIdx = letterMatch[1].toLowerCase().charCodeAt(0) - 97;
      if (charIdx >= 0 && charIdx < table.cols.length) return charIdx;
    }

    // Support 1-based index numbers like "1", "2"
    if (/^\d+$/.test(spec)) {
      const numIdx = parseInt(spec, 10) - 1;
      if (numIdx >= 0 && numIdx < table.cols.length) return numIdx;
    }

    // 3. Fuzzy search in columns metadata
    idx = table.cols.findIndex((c: any) => {
      const label = cleanStr(c.label);
      return label && (label === spec || terms.some(t => label.includes(t)));
    });
    if (idx !== -1) return idx;

    // 4. Try matching labels from the first row if present
    idx = firstRowValues.findIndex((val: string) => val === spec || terms.some(t => val.includes(t)));
    if (idx !== -1) return idx;

    return -1;
  };

  let dateIdx = findColIndex(mappings.date, targetDateTerms);
  let categoryIdx = findColIndex(mappings.category, targetCategoryTerms);
  let merchantIdx = findColIndex(mappings.merchant, targetMerchantTerms);
  let amountIdx = findColIndex(mappings.amount, targetAmountTerms);
  let balanceIdx = findColIndex('balance', targetBalanceTerms);

  // Check if first row is surely a header row so we can skip it
  const isFirstRowHeader = firstRowValues.some((val: string) => 
    targetDateTerms.some(t => val.includes(t)) || 
    targetCategoryTerms.some(t => val.includes(t)) ||
    targetMerchantTerms.some(t => val.includes(t)) ||
    targetAmountTerms.some(t => val.includes(t)) ||
    targetBalanceTerms.some(t => val.includes(t))
  );

  if (isFirstRowHeader) {
    headerRowOffset = 1;
  }

  // Smart fallbacks to ensure columns are mapped to unique, separate columns
  if (dateIdx === -1) dateIdx = 0;
  if (categoryIdx === -1) categoryIdx = table.cols.length > 1 ? 1 : 0;
  if (merchantIdx === -1) merchantIdx = table.cols.length > 2 ? 2 : 0;
  if (amountIdx === -1) amountIdx = table.cols.length > 3 ? 3 : (table.cols.length > 1 ? table.cols.length - 1 : 0);

  // Eliminate collision if possible
  if (amountIdx === dateIdx && table.cols.length > 1) {
    amountIdx = table.cols.length - 1;
  }

  const parsedTransactions: Transaction[] = [];

  table.rows.forEach((row: any, rIdx: number) => {
    // Skip header row if identified
    if (rIdx < headerRowOffset) return;
    if (!row || !row.c) return;

    const cellVal = (idx: number) => {
      const cell = row.c[idx];
      if (!cell) return null;
      if (cell.v !== undefined && cell.v !== null) return cell.v;
      return cell.f !== undefined && cell.f !== null ? cell.f : null;
    };

    const rawDate = cellVal(dateIdx);
    const rawCategory = cellVal(categoryIdx);
    const rawMerchant = cellVal(merchantIdx);
    const rawAmount = cellVal(amountIdx);
    const rawBalance = balanceIdx !== -1 ? cellVal(balanceIdx) : null;

    // Skip entirely empty row
    if (rawDate === null && rawAmount === null && rawMerchant === null) return;

    const formattedDate = parseRawDateString(String(rawDate || ''));
    const formattedAmount = robustParseFloat(rawAmount);
    
    // Parse balance if it exists
    let formattedBalance: number | undefined;
    if (rawBalance !== null && String(rawBalance).trim() !== '') {
      formattedBalance = robustParseFloat(rawBalance);
    }

    const cleanCategory = String(rawCategory || 'Other').trim();
    const cleanMerchant = String(rawMerchant || 'Merchant').trim();

    parsedTransactions.push({
      id: `sheet-${rIdx}-${Date.now()}`,
      date: formattedDate,
      category: cleanCategory || 'Other',
      merchant: cleanMerchant || 'Generic Merchant',
      amount: formattedAmount,
      balance: formattedBalance,
      source: 'sheet',
    });
  });

  return parsedTransactions;
}

/**
 * Fetches sheet data using our custom backend secure proxy route.
 * Bypasses client-side web CORS restrictions and provides actionable security rule tips.
 */
export async function fetchGoogleSheet(sheetId: string, sheetUrl?: string): Promise<any> {
  const queryParams = new URLSearchParams();
  queryParams.append('sheetId', sheetId);
  if (sheetUrl) {
    queryParams.append('sheetUrl', sheetUrl);
  }
  // Prevent browser caching
  queryParams.append('t', Date.now().toString());

  const url = `/api/proxy-sheet?${queryParams.toString()}`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Spreadsheet Sync failed with HTTP status ${res.status}`);
  }

  return await res.json();
}

/**
 * Clean State Initializer: No mock transactions pre-loaded.
 */
export const eliteMockTransactions: Transaction[] = [
  { id: 'manual-1', merchant: 'Collins', category: 'Food', amount: -7.00, date: '2026-06-03', notes: 'Nik - Breakfast', source: 'local' },
  { id: 'manual-2', merchant: 'PFCU', category: 'Bill', amount: -337.00, date: '2026-06-03', notes: 'Rachel - Car Payment', source: 'local' },
  { id: 'manual-3', merchant: 'El Car Wash', category: 'Misc', amount: -5.00, date: '2026-06-04', notes: 'Nik - Car Wash', source: 'local' },
  { id: 'manual-4', merchant: 'Collins Pay', category: 'Income', amount: 1000.00, date: '2026-06-04', notes: 'Rachel - Collins Pay', source: 'local' },
  { id: 'manual-5', merchant: 'Credit Card', category: 'Bill', amount: -148.00, date: '2026-06-04', notes: 'Rachel - Credit Card', source: 'local' },
  { id: 'manual-6', merchant: 'Paypal', category: 'Bill', amount: -77.00, date: '2026-06-05', notes: 'Rachel - Credit Card', source: 'local' },
  { id: 'manual-7', merchant: 'Dress', category: 'Misc', amount: -24.00, date: '2026-06-05', notes: 'Rachel - Dress', source: 'local' },
  { id: 'manual-8', merchant: 'Drink', category: 'Food', amount: -10.00, date: '2026-06-05', notes: 'Rachel - Drink', source: 'local' },
  { id: 'manual-9', merchant: 'US1 Golf Center', category: 'Misc', amount: -13.00, date: '2026-06-05', notes: 'Nik - Driving Range', source: 'local' },
  { id: 'manual-10', merchant: 'cumberland', category: 'Misc', amount: -11.00, date: '2026-06-06', notes: 'Nik - Energy Drinks', source: 'local' },
  { id: 'manual-11', merchant: 'Cumberland', category: 'Gas', amount: -31.00, date: '2026-06-06', notes: 'Nik - Gas', source: 'local' },
  { id: 'manual-12', merchant: 'Cumberland', category: 'Bill', amount: -36.00, date: '2026-06-06', notes: 'Nik - Gas', source: 'local' },
  { id: 'manual-13', merchant: 'Hywayze', category: 'Misc', amount: -27.00, date: '2026-06-07', notes: 'Nik - Schmoke', source: 'local' },
  { id: 'manual-14', merchant: 'Winn-dixie', category: 'Bill', amount: -93.00, date: '2026-06-07', notes: 'Nik - Groceries', source: 'local' },
  { id: 'manual-15', merchant: 'Publix', category: 'Bill', amount: -52.00, date: '2026-06-08', notes: 'Nik - Groceries', source: 'local' },
  { id: 'manual-16', merchant: 'Grocery', category: 'Food', amount: -90.00, date: '2026-06-08', notes: 'Nik - Grocery', source: 'local' },
  { id: 'manual-17', merchant: 'Grocery', category: 'Food', amount: -28.00, date: '2026-06-08', notes: 'Nik - Grocery', source: 'local' },
  { id: 'manual-18', merchant: 'Hywyaze', category: 'Misc', amount: -21.00, date: '2026-06-09', notes: 'Nik - Hywayze', source: 'local' },
  { id: 'manual-19', merchant: 'Lint Roller / Drink', category: 'Misc', amount: -11.00, date: '2026-06-09', notes: 'Nik - Lint Roller / Drink', source: 'local' },
  { id: 'manual-20', merchant: 'Lunch', category: 'Food', amount: -20.00, date: '2026-06-09', notes: 'Rachel - Lunch', source: 'local' },
  { id: 'manual-21', merchant: 'Marlins Game', category: 'Entertainment', amount: -6.50, date: '2026-06-09', notes: 'Nik - Marlins Game', source: 'local' },
  { id: 'manual-22', merchant: 'Marlins Game', category: 'Entertainment', amount: -25.00, date: '2026-06-09', notes: 'Nik - Marlins Game', source: 'local' },
  { id: 'manual-23', merchant: 'Meal', category: 'Food', amount: -30.00, date: '2026-06-10', notes: 'Rachel - Meal', source: 'local' },
  { id: 'manual-24', merchant: 'Netflix', category: 'Bill', amount: -22.00, date: '2026-06-11', notes: 'Rachel - Netflix', source: 'local' },
  { id: 'manual-25', merchant: 'Nik', category: 'Other', amount: -430.00, date: '2026-06-11', notes: 'Rachel - Nik', source: 'local' },
  { id: 'manual-26', merchant: 'Pants', category: 'Misc', amount: -26.00, date: '2026-06-11', notes: 'Rachel - Pants', source: 'local' },
  { id: 'manual-27', merchant: 'Paycheck', category: 'Income', amount: 720.00, date: '2026-06-11', notes: 'Rachel - Paycheck', source: 'local' },
  { id: 'manual-28', merchant: 'Phone Case', category: 'Shopping', amount: -83.00, date: '2026-06-12', notes: 'Rachel - Phone Case', source: 'local' },
  { id: 'manual-29', merchant: 'School Money', category: 'Income', amount: 928.00, date: '2026-06-12', notes: 'Rachel - School Money', source: 'local' },
  { id: 'manual-30', merchant: 'PBU', category: 'Bill', amount: -146.24, date: '2026-06-12', notes: 'Rachel - Utilities', source: 'local' },
  
  // Missing transaction identified from the screenshot
  { id: 'manual-31', merchant: 'Nik', category: 'Lend', amount: -140.00, date: '2026-06-08', notes: 'Rachel - Lent', source: 'local' }
];

/**
 * Core spending categories config with rich color tokens and styling classes.
 */
export const CATEGORY_STYLING: Record<
  string,
  {
    colorClass: string;
    bgClass: string;
    borderClass: string;
    icon: string;
    defaultLimit: number;
    accentHex: string;
  }
> = {
  Food: {
    colorClass: 'text-[#adff00]',
    bgClass: 'bg-[#adff00]/10',
    borderClass: 'border-[#adff00]/25',
    icon: 'Utensils',
    defaultLimit: 600,
    accentHex: '#adff00',
  },
  Housing: {
    colorClass: 'text-[#00e1ff]',
    bgClass: 'bg-[#00e1ff]/10',
    borderClass: 'border-[#00e1ff]/25',
    icon: 'Home',
    defaultLimit: 2500,
    accentHex: '#00e1ff',
  },
  Transport: {
    colorClass: 'text-[#adff00]',
    bgClass: 'bg-[#adff00]/10',
    borderClass: 'border-[#adff00]/25',
    icon: 'Car',
    defaultLimit: 350,
    accentHex: '#adff00',
  },
  Entertainment: {
    colorClass: 'text-[#ff0099]',
    bgClass: 'bg-[#ff0099]/10',
    borderClass: 'border-[#ff0099]/25',
    icon: 'Tv',
    defaultLimit: 500,
    accentHex: '#ff0099',
  },
  Shopping: {
    colorClass: 'text-[#ff00e5]',
    bgClass: 'bg-[#ff00e5]/10',
    borderClass: 'border-[#ff00e5]/25',
    icon: 'ShoppingBag',
    defaultLimit: 400,
    accentHex: '#ff00e5',
  },
  Health: {
    colorClass: 'text-[#ff2e63]',
    bgClass: 'bg-[#ff2e63]/10',
    borderClass: 'border-[#ff2e63]/25',
    icon: 'HeartPulse',
    defaultLimit: 300,
    accentHex: '#ff2e63',
  },
  Utilities: {
    colorClass: 'text-[#00e1ff]',
    bgClass: 'bg-[#00e1ff]/10',
    borderClass: 'border-[#00e1ff]/25',
    icon: 'Zap',
    defaultLimit: 250,
    accentHex: '#00e1ff',
  },
  Income: {
    colorClass: 'text-[#39ff14]',
    bgClass: 'bg-[#39ff14]/10',
    borderClass: 'border-[#39ff14]/25',
    icon: 'TrendingUp',
    defaultLimit: 0,
    accentHex: '#39ff14',
  },
  Other: {
    colorClass: 'text-zinc-400',
    bgClass: 'bg-zinc-400/10',
    borderClass: 'border-zinc-800',
    icon: 'Sparkles',
    defaultLimit: 300,
    accentHex: '#a1a1aa',
  },
};

export function getCategoryStyle(category: string) {
  const norm = Object.keys(CATEGORY_STYLING).find(
    (key) => key.toLowerCase() === category.toLowerCase()
  );
  return norm ? CATEGORY_STYLING[norm] : CATEGORY_STYLING.Other;
}

/**
 * Detects Google Drive share links or IDs, and converts them to direct file download streams.
 * If not matching, returns the original URL.
 */
export function convertDriveUrlToDirect(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();

  // If they passed a raw Google Drive ID or dynamic ID itself
  if (/^[a-zA-Z0-9_-]{19,80}$/.test(trimmed) && !trimmed.includes('http') && !trimmed.includes('.') && !trimmed.includes('/')) {
    return `https://lh3.googleusercontent.com/d/${trimmed}`;
  }

  // Handle all google.com subdomains (drive.google.com, docs.google.com, etc.)
  if (trimmed.includes('google.com')) {
    // 1. Matches: /file/d/FILE_ID or /d/FILE_ID or /folders/FILE_ID
    const dMatch = trimmed.match(/\/(?:file\/)?d\/([a-zA-Z0-9_-]{19,80})/);
    if (dMatch && dMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${dMatch[1]}`;
    }

    // 2. Matches: ?id=FILE_ID or &id=FILE_ID
    const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{19,80})/);
    if (idMatch && idMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
    }
  }

  return trimmed;
}

/**
 * Sweeps parsed sheet transactions for budget definitions.
 * Filters them out into category budgets, keeping ledger entries clean.
 */
export function processImportedSheetRows(imported: Transaction[]) {
  const finalTransactions: Transaction[] = [];
  const foundBudgets: { category: string; limit: number }[] = [];

  const knownCategories = ['Food', 'Housing', 'Transport', 'Entertainment', 'Shopping', 'Health', 'Utilities', 'Other'];

  imported.forEach((tx) => {
    const categoryLower = tx.category.toLowerCase();
    const merchantLower = tx.merchant.toLowerCase();
    const notesLower = (tx.notes || '').toLowerCase();

    // Check if this row is a budget/limit setting row rather than a standard expense
    const isBudgetDef = 
      categoryLower.includes('budget') || 
      categoryLower.includes('limit') ||
      merchantLower.includes('budget limit') ||
      merchantLower.includes('budget target') ||
      notesLower.includes('budget limit') ||
      notesLower.includes('budget override') ||
      categoryLower === 'budget' ||
      categoryLower === 'limit';

    if (isBudgetDef) {
      let targetCat = '';
      
      // 1. Try finding a known category substring in the merchant text (e.g. "Food Budget" contains "food")
      const matchedMerchantCat = knownCategories.find(cat => merchantLower.includes(cat.toLowerCase()));
      if (matchedMerchantCat) {
        targetCat = matchedMerchantCat;
      } else {
        // 2. Try notes
        const matchedNotesCat = knownCategories.find(cat => notesLower.includes(cat.toLowerCase()));
        if (matchedNotesCat) {
          targetCat = matchedNotesCat;
        } else {
          // 3. Fallback: sanitize merchant name (e.g. "Food" or custom)
          const cleaned = tx.merchant.replace(/budget/i, '').replace(/limit/i, '').trim();
          targetCat = cleaned || 'Other';
        }
      }

      // Standardize casing (e.g. "Food")
      const finalCategoryName = knownCategories.find(cat => cat.toLowerCase() === targetCat.toLowerCase()) || 
        (targetCat.charAt(0).toUpperCase() + targetCat.slice(1));

      const numLimit = Math.abs(tx.amount);
      if (finalCategoryName && !isNaN(numLimit) && numLimit > 0) {
        foundBudgets.push({
          category: finalCategoryName,
          limit: numLimit
        });
      }
    } else {
      finalTransactions.push(tx);
    }
  });

  return { finalTransactions, foundBudgets };
}
