export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  category: string;
  merchant: string;
  amount: number;
  notes?: string;
  source?: 'local' | 'sheet';
  balance?: number;
}

export interface Budget {
  category: string;
  limit: number;
  spent: number;
}

export interface SheetConfig {
  sheetUrl: string;
  sheetId: string;
  apiKey?: string;
  dateCol: string;
  categoryCol: string;
  merchantCol: string;
  amountCol: string;
  lastSynced?: string;
  autoSync: boolean;
}

export interface AiInsight {
  summary: string;
  topSaves: {
    category: string;
    tips: string;
    impact: string; // "High", "Medium", "Low"
  }[];
  budgetAlerts: {
    title: string;
    description: string;
    level: 'warning' | 'info' | 'critical';
  }[];
  financialScore: number; // 0 - 100 elite score
}
