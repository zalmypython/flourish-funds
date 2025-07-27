import { BaseDocument } from '@/types';

export type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface FrequencyConfig {
  type: FrequencyType;
  interval: number; // e.g., every 2 weeks, every 3 months
  dayOfWeek?: number; // 0-6, for weekly
  dayOfMonth?: number; // 1-31, for monthly
  weekOfMonth?: number; // 1-4, for "first Monday of month"
  monthOfYear?: number; // 1-12, for yearly
  skipWeekends?: boolean;
  endDate?: string;
  customDescription?: string; // e.g., "Every 2nd and 4th Friday"
}

export interface RecurringPayment extends BaseDocument {
  name: string;
  amount: number;
  frequency: FrequencyConfig | string; // Support both new and legacy formats
  nextDueDate: string;
  accountId?: string; // Bank account or credit card ID
  accountType?: 'bank' | 'credit';
  paymentMethod: string; // Legacy support, will be replaced by accountId
  category: string;
  isActive: boolean;
  isAutomatic: boolean;
  lastPaid?: string;
  // Enhanced fields
  description?: string;
  notes?: string;
  paymentHistory?: {
    date: string;
    amount: number;
    transactionId?: string;
    status: 'paid' | 'skipped' | 'failed';
  }[];
  // Variable payment handling
  isVariableAmount?: boolean;
  amountRange?: { min: number; max: number };
  // Notification settings
  reminderDays?: number[];
  skipNotifications?: boolean;
  // Calendar integration
  calendarEventId?: string;
  tags?: string[];
}