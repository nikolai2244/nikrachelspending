// types.ts
export type Transaction = {
  id: string;
  date: string;
  category: string;
  merchant: string;
  amount: number;
  balance?: number;
  notes?: string;
  source?: string; // 'sheet' | 'local' etc.
};
