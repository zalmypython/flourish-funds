import { useState, useEffect, useCallback } from 'react';
import { useApiAuth } from '@/hooks/useApiAuth';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/apiClient';

export interface Transaction {
  id: string;
  plaidTransactionId?: string;
  userId: string;
  bankConnectionId?: string;
  accountId: string;
  amount: number;
  date: string;
  name?: string;
  description?: string;
  merchantName?: string;
  category: string[];
  subcategory?: string;
  internalCategory?: string;
  pending?: boolean;
  location?: {
    address?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
  isHidden?: boolean;
  isManual?: boolean;
  notes?: string;
  tags?: string[];
  type?: 'income' | 'expense' | 'transfer';
  accountType?: 'bank' | 'credit';
  status?: 'pending' | 'cleared' | 'reconciled';
}

export interface TransactionSummary {
  totalTransactions: number;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  categoryBreakdown: { [category: string]: number };
  timeRange: {
    startDate?: string;
    endDate?: string;
  };
}

export interface SyncLog {
  id: string;
  userId: string;
  bankConnectionId: string;
  syncType: 'manual' | 'automatic' | 'initial';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  transactionsAdded: number;
  transactionsUpdated: number;
  errors: string[];
  metadata?: Record<string, any>;
}

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useApiAuth();
  const { toast } = useToast();

  // Fetch transactions
  const fetchTransactions = useCallback(async (options: {
    bankConnectionId?: string;
    accountId?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
    includeHidden?: boolean;
  } = {}) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response = await apiClient.get(`/api/transactions?${params.toString()}`);
      setTransactions(response.data || []);
    } catch (err) {
      const errorMessage = 'Failed to fetch transactions';
      setError(errorMessage);
      console.error('Error fetching transactions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch transaction summary
  const fetchSummary = useCallback(async (options: {
    bankConnectionId?: string;
    startDate?: string;
    endDate?: string;
  } = {}) => {
    if (!user) return;

    try {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response = await apiClient.get(`/api/transactions/summary?${params.toString()}`);
      setSummary(response.data);
    } catch (err) {
      console.error('Error fetching transaction summary:', err);
    }
  }, [user]);

  // Fetch sync logs
  const fetchSyncLogs = useCallback(async (limit: number = 20) => {
    if (!user) return;

    try {
      const response = await apiClient.get(`/api/transactions/sync-logs?limit=${limit}`);
      setSyncLogs(response.data || []);
    } catch (err) {
      console.error('Error fetching sync logs:', err);
    }
  }, [user]);

  // Update transaction category
  const updateTransactionCategory = useCallback(async (
    transactionId: string,
    category: string
  ): Promise<void> => {
    if (!user) return;

    try {
      const response = await apiClient.put(`/api/transactions/${transactionId}/category`, {
        category,
      });

      // Update local state
      setTransactions(prev =>
        prev.map(transaction =>
          transaction.id === transactionId
            ? { ...transaction, internalCategory: category }
            : transaction
        )
      );

      toast({
        title: 'Category Updated',
        description: 'Transaction category has been updated successfully.',
      });
    } catch (err) {
      const errorMessage = 'Failed to update transaction category';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw new Error(errorMessage);
    }
  }, [user, toast]);

  // Update transaction visibility
  const updateTransactionVisibility = useCallback(async (
    transactionId: string,
    isHidden: boolean
  ): Promise<void> => {
    if (!user) return;

    try {
      const response = await apiClient.put(`/api/transactions/${transactionId}/visibility`, {
        isHidden,
      });

      // Update local state
      setTransactions(prev =>
        prev.map(transaction =>
          transaction.id === transactionId
            ? { ...transaction, isHidden }
            : transaction
        )
      );

      toast({
        title: isHidden ? 'Transaction Hidden' : 'Transaction Shown',
        description: `Transaction has been ${isHidden ? 'hidden' : 'shown'}.`,
      });
    } catch (err) {
      const errorMessage = 'Failed to update transaction visibility';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw new Error(errorMessage);
    }
  }, [user, toast]);

  // Get transactions by date range
  const getTransactionsByDateRange = useCallback((
    startDate: string,
    endDate: string
  ) => {
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return transactionDate >= start && transactionDate <= end;
    });
  }, [transactions]);

  // Get transactions by category
  const getTransactionsByCategory = useCallback((category: string) => {
    return transactions.filter(transaction => 
      transaction.internalCategory === category
    );
  }, [transactions]);

  // Get spending by category
  const getSpendingByCategory = useCallback(() => {
    const spending: { [category: string]: number } = {};
    
    transactions.forEach(transaction => {
      if (transaction.amount < 0) { // Expenses only
        const category = transaction.internalCategory || 'other';
        spending[category] = (spending[category] || 0) + Math.abs(transaction.amount);
      }
    });

    return spending;
  }, [transactions]);

  // Get monthly spending trend
  const getMonthlySpendingTrend = useCallback((months: number = 6) => {
    const monthlyData: { [month: string]: { income: number; expenses: number } } = {};
    
    transactions.forEach(transaction => {
      const month = new Date(transaction.date).toISOString().slice(0, 7); // YYYY-MM
      
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expenses: 0 };
      }

      if (transaction.amount > 0) {
        monthlyData[month].income += transaction.amount;
      } else {
        monthlyData[month].expenses += Math.abs(transaction.amount);
      }
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-months)
      .map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
        net: data.income - data.expenses,
      }));
  }, [transactions]);

  // Initialize
  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchSummary();
      fetchSyncLogs();
    }
  }, [user, fetchTransactions, fetchSummary, fetchSyncLogs]);

  return {
    transactions,
    summary,
    syncLogs,
    isLoading,
    error,
    fetchTransactions,
    fetchSummary,
    fetchSyncLogs,
    updateTransactionCategory,
    updateTransactionVisibility,
    getTransactionsByDateRange,
    getTransactionsByCategory,
    getSpendingByCategory,
    getMonthlySpendingTrend,
  };
};