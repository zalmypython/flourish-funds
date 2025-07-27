export interface BaseDocument {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionDocument {
  id: string;
  filename: string;
  originalName: string;
  fileType: 'image/jpeg' | 'image/png' | 'application/pdf' | 'image/heic';
  fileSize: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  source: 'camera' | 'files' | 'drag-drop';
}

export interface Transaction extends BaseDocument {
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
  documents?: TransactionDocument[];
  isRecurring?: boolean;
  recurringId?: string;
  status: 'pending' | 'cleared' | 'reconciled';
  merchantName?: string;
  merchant?: string;
  location?: string;
  // Simplified transfer tracking - single transaction approach
  fromAccountId?: string;
  fromAccountType?: 'bank' | 'credit';
  toAccountId?: string;
  toAccountType?: 'bank' | 'credit';
  // Receipt and location data
  receiptUrl?: string;
  gpsLocation?: {
    latitude: number;
    longitude: number;
  };
  // Plaid integration fields
  plaidTransactionId?: string;
  plaidAccountId?: string;
  bankConnectionId?: string;
  source?: 'manual' | 'plaid';
  rewardEarned?: number;
  // Insurance linking fields
  insurancePolicyId?: string;
  insuranceClaimId?: string;
  insuranceType?: 'premium' | 'claim_payment' | 'deductible' | 'copay' | 'coinsurance';
  // Income source linking
  incomeSourceId?: string;
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

export interface BankAccount extends BaseDocument {
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
  // Cached balance for performance
  currentBalance: number;
  lastBalanceUpdate: string;
}

export interface RewardRedemption {
  id: string;
  date: string;
  amount: number;
  type: 'cashback' | 'points' | 'miles';
  description?: string;
  redemptionMethod?: string; // e.g., "statement credit", "direct deposit", "check"
}

export interface CreditCardBonus {
  id: string;
  title: string;
  description: string;
  requirement: string;
  bonusAmount: string; // e.g., "80,000 points" or "$500 cash back"
  bonusValue?: number; // Estimated cash value
  spendingRequired: number;
  currentSpending: number;
  startDate: string;
  endDate: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'paid_out' | 'expired';
  category?: string; // e.g., "dining", "travel", "general"
  categoryMultiplier?: number; // e.g., 3x points for dining
  dateCompleted?: string;
  datePaidOut?: string;
  actualValueReceived?: number;
  notes?: string;
  rewardType: 'cashback' | 'points' | 'miles';
  actualRewardAmount?: number;
  // Enhanced bonus tracking
  spendingByCategory?: { [category: string]: number };
  autoTracking: boolean; // Whether to automatically track progress
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

export interface CreditCard extends BaseDocument {
  name: string;
  issuer: string;
  type: string;
  limit: number;
  initialBalance: number;
  dueDate: string;
  interestRate: number;
  isActive: boolean;
  bonuses: CreditCardBonus[];
  // Enhanced fields for churning
  annualFee?: number;
  annualFeeWaived?: boolean;
  annualFeeWaivedFirstYear?: boolean;
  nextAnnualFeeDate?: string;
  rewardRate?: number;
  color?: string;
  nickname?: string;
  notes?: string;
  statementDate?: string;
  minimumPayment?: number;
  paymentDueDay?: number;
  // Goal tracking
  goals?: CreditCardGoal[];
  // Enhanced date tracking for churning
  applicationDate?: string;
  approvalDate?: string;
  accountOpenDate?: string;
  accountCloseDate?: string;
  lastPaymentDate?: string;
  anniversaryDate?: string;
  // Status tracking
  accountStatus: 'active' | 'inactive' | 'closed' | 'pending_approval' | 'denied';
  closureReason?: string;
  // Business rules tracking
  eligibleForSignupBonus?: boolean;
  lastSignupBonusDate?: string;
  churningNotes?: string;
  // Cached balance for performance
  currentBalance: number;
  lastBalanceUpdate: string;
  // Enhanced balance tracking
  statementBalance: number;
  minimumPaymentDue: number;
  nextStatementDate: string;
  paymentReminderDays: number;
  lastStatementDate?: string;
  autoPayEnabled?: boolean;
  autoPayAmount?: number;
  // Enhanced rewards and cash back tracking
  cashBackBalance: number;
  categoryRewards: { [category: string]: { type: 'cashback' | 'points' | 'miles'; rate: number; ratio?: string } };
  rewardType: 'cashback' | 'points' | 'miles';
  redemptionHistory: RewardRedemption[];
  // Reward earning history
  rewardHistory: {
    id: string;
    date: string;
    transactionId: string;
    category: string;
    amount: number;
    rewardType: 'cashback' | 'points' | 'miles';
    rewardEarned: number;
    description?: string;
  }[];
}

export interface NotificationPreferences extends BaseDocument {
  emailNotifications: boolean;
  pushNotifications: boolean;
  balanceReminders: boolean;
  paymentReminders: boolean;
  bonusAlerts: boolean;
  utilizationWarnings: boolean;
  reminderDays: number[];
  emailAddress?: string;
  notificationTime: string; // HH:MM format
}

export interface NotificationLog extends BaseDocument {
  type: 'balance_due' | 'high_utilization' | 'payment_reminder' | 'bonus_alert' | 'late_payment';
  cardId: string;
  title: string;
  message: string;
  sentAt: string;
  emailSent: boolean;
  dismissed: boolean;
  priority: 'low' | 'medium' | 'high';
}

// Stock Portfolio Types
export interface Stock {
  symbol: string;
  name: string;
  sector?: string;
  currentPrice: number;
  lastUpdated: Date;
  change?: number;
  changePercent?: number;
}

export interface StockHolding extends BaseDocument {
  stockSymbol: string;
  stockName: string;
  shares: number;
  averageCostBasis: number;
  totalValue: number;
  accountId: string; // Bank account used for purchases
}

export interface StockTransaction extends BaseDocument {
  type: 'buy' | 'sell';
  stockSymbol: string;
  stockName: string;
  shares: number;
  price: number;
  fees: number;
  totalAmount: number;
  accountId: string; // Bank account affected
  transactionId?: string; // Link to regular transaction
  date: string;
}

export interface Portfolio {
  holdings: StockHolding[];
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dailyChange: number;
  dailyChangePercent: number;
}

// Insurance Types
export interface InsurancePolicy {
  id: string;
  userId: string;
  policyNumber: string;
  provider: string;
  type: 'health' | 'auto' | 'home' | 'life' | 'disability' | 'other';
  policyName: string;
  premium: number;
  billingCycle: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  deductible?: number;
  coverageAmount?: number;
  effectiveDate: string;
  expirationDate: string;
  status: 'active' | 'inactive' | 'cancelled' | 'expired';
  linkedTransactionIds: string[];
  premiumSchedule: {
    nextDueDate: string;
    lastPaidDate?: string;
    autoPayEnabled: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface InsuranceClaim {
  id: string;
  userId: string;
  policyId: string;
  claimNumber: string;
  dateOfLoss: string;
  claimAmount: number;
  approvedAmount?: number;
  paidAmount?: number;
  status: 'submitted' | 'under_review' | 'approved' | 'denied' | 'paid' | 'closed';
  description: string;
  linkedTransactionIds: string[];
  documentIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InsuranceDocument {
  id: string;
  userId: string;
  policyId?: string;
  claimId?: string;
  type: 'policy' | 'eob' | 'bill' | 'claim_form' | 'receipt' | 'other';
  filename: string;
  url: string;
  uploadDate: string;
  size: number;
  mimeType: string;
}

// Income Source Types
export interface PayerRule extends BaseDocument {
  ruleType: 'exactPayer' | 'partialDescription' | 'amountPattern' | 'accountBased';
  pattern: string;
  description?: string;
  amountRange?: {
    min: number;
    max: number;
  };
  accountId?: string;
  isActive: boolean;
}

export interface IncomeSource extends BaseDocument {
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

export interface IncomeNotification extends BaseDocument {
  type: 'uncategorized_income';
  transactionId: string;
  title: string;
  message: string;
  dismissed: boolean;
  priority: 'low' | 'medium' | 'high';
}

export const INCOME_SOURCE_TYPES = [
  { value: 'salary', label: 'Salary', icon: 'Briefcase', color: '#3b82f6' },
  { value: 'freelance', label: 'Freelance', icon: 'Laptop', color: '#8b5cf6' },
  { value: 'gig', label: 'Gig Work', icon: 'Car', color: '#f59e0b' },
  { value: 'business', label: 'Business', icon: 'Building', color: '#10b981' },
  { value: 'investment', label: 'Investment', icon: 'TrendingUp', color: '#06b6d4' },
  { value: 'gifts', label: 'Gifts', icon: 'Gift', color: '#ec4899' },
  { value: 'government', label: 'Government', icon: 'Landmark', color: '#6b7280' },
  { value: 'other', label: 'Other', icon: 'DollarSign', color: '#64748b' }
] as const;

export const DEFAULT_CATEGORIES: TransactionCategory[] = [
  { id: 'food', name: 'Food & Dining', icon: 'UtensilsCrossed', color: '#e74c3c' },
  { id: 'transportation', name: 'Transportation', icon: 'Car', color: '#3498db' },
  { id: 'shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#e67e22' },
  { id: 'entertainment', name: 'Entertainment', icon: 'Gamepad2', color: '#9b59b6' },
  { id: 'bills', name: 'Bills & Utilities', icon: 'FileText', color: '#f39c12' },
  { id: 'healthcare', name: 'Healthcare', icon: 'Heart', color: '#e74c3c' },
  { id: 'insurance', name: 'Insurance', icon: 'Shield', color: '#8b5cf6', subcategories: ['Health Insurance', 'Auto Insurance', 'Home Insurance', 'Life Insurance'] },
  { id: 'income', name: 'Income', icon: 'TrendingUp', color: '#27ae60' },
  { id: 'stocks', name: 'Stocks', icon: 'TrendingUp', color: '#8b5cf6' },
  { id: 'transfer', name: 'Transfer', icon: 'ArrowRightLeft', color: '#95a5a6' },
  { id: 'other', name: 'Other', icon: 'MoreHorizontal', color: '#7f8c8d' }
];