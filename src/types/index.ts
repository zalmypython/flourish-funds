import { FirebaseDocument } from '@/hooks/useFirestore';

export interface Transaction extends FirebaseDocument {
  date: string;
  amount: number;
  description: string;
  category: string;
  subcategory?: string;
  accountId: string;
  accountType: 'bank' | 'credit';
  type: 'income' | 'expense' | 'transfer' | 'payment';
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

export interface AccountGoal {
  id: string;
  type: 'savings' | 'spending_limit' | 'balance_maintenance';
  title: string;
  description?: string;
  targetAmount: number;
  currentAmount?: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'paused' | 'expired';
  priority: 'low' | 'medium' | 'high';
}

export interface AccountBonus {
  id: string;
  title: string;
  description: string;
  requirement: string;
  bonusAmount: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'expired';
  progress: number; // 0-100
  requirementType: 'balance' | 'transactions' | 'direct_deposit' | 'spending';
}

export interface BankAccount extends FirebaseDocument {
  name: string;
  type: string;
  initialBalance: number;
  accountNumber: string;
  isActive: boolean;
  createdDate: string;
  closedDate?: string;
  // Enhanced fields
  bankName?: string;
  routingNumber?: string;
  accountPurpose?: string;
  color?: string;
  nickname?: string;
  notes?: string;
  // Goal and bonus tracking
  goals?: AccountGoal[];
  bonuses?: AccountBonus[];
  // Date tracking
  lastTransactionDate?: string;
  statementDate?: string;
  anniversaryDate?: string;
}

export interface CreditCardBonus {
  id: string;
  title: string;
  description: string;
  requirement: string;
  bonusAmount: string; // e.g., "80,000 points" or "$500 cash back"
  spendingRequired: number;
  currentSpending: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'expired';
  category?: string; // e.g., "dining", "travel", "general"
}

export interface CreditCardGoal {
  id: string;
  type: 'utilization' | 'payment' | 'spending' | 'reward_earning';
  title: string;
  description?: string;
  targetAmount: number;
  currentAmount?: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'paused' | 'expired';
  priority: 'low' | 'medium' | 'high';
}

export interface CreditCard extends FirebaseDocument {
  name: string;
  issuer: string;
  type: string;
  limit: number;
  initialBalance: number;
  dueDate: string;
  interestRate: number;
  isActive: boolean;
  bonuses: CreditCardBonus[];
  // Enhanced fields
  annualFee?: number;
  rewardRate?: number;
  color?: string;
  nickname?: string;
  notes?: string;
  statementDate?: string;
  minimumPayment?: number;
  paymentDueDay?: number;
  // Goal tracking
  goals?: CreditCardGoal[];
  // Date tracking
  applicationDate?: string;
  approvalDate?: string;
  lastPaymentDate?: string;
  anniversaryDate?: string;
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