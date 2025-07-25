import { FirebaseDocument } from '@/hooks/useFirestore';

export interface Transaction extends FirebaseDocument {
  date: string;
  amount: number;
  description: string;
  category: string;
  subcategory?: string;
  accountId: string;
  accountType: 'bank' | 'credit';
  type: 'income' | 'expense' | 'transfer';
  tags?: string[];
  notes?: string;
  isRecurring?: boolean;
  recurringId?: string;
  status: 'pending' | 'cleared' | 'reconciled';
  merchantName?: string;
  location?: string;
}

export interface TransactionCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  subcategories?: string[];
  budgetId?: string;
}

export const DEFAULT_CATEGORIES: TransactionCategory[] = [
  { id: 'food', name: 'Food & Dining', icon: 'UtensilsCrossed', color: '#e74c3c' },
  { id: 'transportation', name: 'Transportation', icon: 'Car', color: '#3498db' },
  { id: 'shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#e67e22' },
  { id: 'entertainment', name: 'Entertainment', icon: 'Gamepad2', color: '#9b59b6' },
  { id: 'bills', name: 'Bills & Utilities', icon: 'FileText', color: '#f39c12' },
  { id: 'healthcare', name: 'Healthcare', icon: 'Heart', color: '#e74c3c' },
  { id: 'income', name: 'Income', icon: 'TrendingUp', color: '#27ae60' },
  { id: 'transfer', name: 'Transfer', icon: 'ArrowRightLeft', color: '#95a5a6' },
  { id: 'other', name: 'Other', icon: 'MoreHorizontal', color: '#7f8c8d' }
];