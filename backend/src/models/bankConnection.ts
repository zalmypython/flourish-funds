import { EncryptedData } from '../middleware/encryption';

export interface BankConnectionModel {
  id: string;
  userId: string;
  itemId: string;
  accessToken: EncryptedData;
  institutionId: string;
  institutionName: string;
  accounts: PlaidAccountData[];
  createdAt: Date;
  lastSync: Date;
  isActive: boolean;
  syncEnabled: boolean;
  syncFrequency: 'manual' | 'daily' | 'weekly';
  lastError?: string;
  metadata?: Record<string, any>;
}

export interface PlaidAccountData {
  accountId: string;
  name: string;
  type: string;
  subtype: string;
  mask: string;
  balance: {
    available: number | null;
    current: number | null;
    limit: number | null;
    isoCurrencyCode: string;
  };
  institutionName: string;
  lastUpdated: Date;
}

export interface TransactionModel {
  id: string;
  userId: string;
  bankConnectionId: string;
  plaidTransactionId: string;
  accountId: string;
  amount: number;
  date: string;
  name: string;
  merchantName?: string;
  category: string[];
  subcategory?: string;
  internalCategory?: string; // Our app's internal category
  pending: boolean;
  location?: {
    address?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
  metadata?: {
    confidence?: number;
    website?: string;
    logoUrl?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  isHidden: boolean;
  isDeleted: boolean;
  notes?: string;
  tags?: string[];
}

export interface SyncLogModel {
  id: string;
  userId: string;
  bankConnectionId: string;
  syncType: 'manual' | 'automatic' | 'initial';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  transactionsAdded: number;
  transactionsUpdated: number;
  errors: string[];
  metadata?: Record<string, any>;
}