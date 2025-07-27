export interface PayerRule {
  id: string;
  ruleType: 'exactPayer' | 'partialDescription' | 'amountPattern' | 'accountBased';
  pattern: string;
  description?: string;
  amountRange?: {
    min: number;
    max: number;
  };
  accountId?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface IncomeSource {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: 'salary' | 'freelance' | 'gig' | 'business' | 'investment' | 'gifts' | 'government' | 'other';
  employer?: string;
  expectedMonthlyAmount?: number;
  isActive: boolean;
  color: string;
  icon: string;
  payerRules: PayerRule[];
  linkedTransactionIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IncomeAnalytics {
  totalMonthlyIncome: number;
  incomeBySource: Record<string, number>;
  monthlyTrend: Array<{
    month: string;
    amount: number;
    sourceId: string;
  }>;
  expectedVsActual: Record<string, {
    expected: number;
    actual: number;
    variance: number;
  }>;
}

export const INCOME_SOURCE_TYPES = [
  { value: 'salary', label: 'Salary', icon: 'briefcase', color: '#3b82f6' },
  { value: 'freelance', label: 'Freelance', icon: 'laptop', color: '#8b5cf6' },
  { value: 'gig', label: 'Gig Work', icon: 'car', color: '#f59e0b' },
  { value: 'business', label: 'Business', icon: 'building', color: '#10b981' },
  { value: 'investment', label: 'Investment', icon: 'trending-up', color: '#06b6d4' },
  { value: 'gifts', label: 'Gifts', icon: 'gift', color: '#ec4899' },
  { value: 'government', label: 'Government', icon: 'landmark', color: '#6b7280' },
  { value: 'other', label: 'Other', icon: 'dollar-sign', color: '#64748b' }
] as const;