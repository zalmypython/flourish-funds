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
  autoLinkingRules: {
    merchantPatterns: string[];
    amountTolerance: number;
    categoryFilters: string[];
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