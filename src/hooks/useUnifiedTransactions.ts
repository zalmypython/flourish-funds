import { useState, useEffect } from 'react';
import { Transaction } from '@/types';
import { useApiAuth } from './useApiAuth';
import { useTransactions } from './useTransactions';

export interface UnifiedTransaction extends Transaction {
  source: 'manual' | 'plaid';
  rewardAmount?: number;
  rewardType?: 'cashback' | 'points' | 'miles';
  bonusProgress?: Array<{
    bonusId: string;
    bonusTitle: string;
    contribution: number;
  }>;
}

export const useUnifiedTransactions = () => {
  const [unifiedTransactions, setUnifiedTransactions] = useState<UnifiedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useApiAuth();
  const { 
    transactions: manualTransactions, 
    fetchTransactions: fetchManualTransactions,
    isLoading: manualLoading 
  } = useTransactions();
  
  const apiClient = {
    get: (url: string) => fetch(url).then(r => r.json())
  };

  const fetchPlaidTransactions = async (options: {
    page?: number;
    limit?: number;
    category?: string;
    startDate?: string;
    endDate?: string;
    accountId?: string;
  } = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.category) params.append('category', options.category);
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);
      if (options.accountId) params.append('accountId', options.accountId);

      const response = await apiClient.get(`/api/transactions/plaid?${params}`);
      return response.data.transactions || [];
    } catch (error) {
      console.error('Error fetching Plaid transactions:', error);
      return [];
    }
  };

  const fetchUnifiedTransactions = async (options: {
    page?: number;
    limit?: number;
    category?: string;
    startDate?: string;
    endDate?: string;
    includeManual?: boolean;
    includePlaid?: boolean;
  } = {}) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { includeManual = true, includePlaid = true, ...fetchOptions } = options;
      
      const promises: Promise<any[]>[] = [];
      
      if (includeManual) {
        promises.push(fetchManualTransactions(fetchOptions).then(() => manualTransactions));
      }
      
      if (includePlaid) {
        promises.push(fetchPlaidTransactions(fetchOptions));
      }

      const results = await Promise.all(promises);
      
      let allTransactions: UnifiedTransaction[] = [];
      
      if (includeManual && results[0]) {
        allTransactions = allTransactions.concat(
          results[0].map((tx: Transaction) => ({
            ...tx,
            source: 'manual' as const
          }))
        );
      }
      
      if (includePlaid) {
        const plaidIndex = includeManual ? 1 : 0;
        if (results[plaidIndex]) {
          allTransactions = allTransactions.concat(
            results[plaidIndex].map((tx: any) => ({
              ...tx,
              source: 'plaid' as const,
              // Map Plaid transaction structure to our Transaction interface
              id: tx.id,
              date: tx.date,
              amount: Math.abs(tx.amount),
              description: tx.name || tx.description,
              category: tx.internalCategory || tx.category?.[0] || 'other',
              accountId: tx.creditCardId || tx.accountId,
              accountType: tx.creditCardId ? 'credit' : 'bank',
              type: tx.amount > 0 ? 'expense' : 'income',
              merchantName: tx.merchantName,
              location: tx.location?.address || tx.location,
              status: tx.pending ? 'pending' : 'cleared',
              plaidTransactionId: tx.plaidTransactionId,
              bankConnectionId: tx.bankConnectionId
            }))
          );
        }
      }

      // Sort by date (newest first)
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setUnifiedTransactions(allTransactions);
    } catch (error: any) {
      setError(error.message || 'Failed to fetch transactions');
      console.error('Error fetching unified transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionsBySource = (source: 'manual' | 'plaid') => {
    return unifiedTransactions.filter(tx => tx.source === source);
  };

  const getTransactionsByCategory = (category: string) => {
    return unifiedTransactions.filter(tx => tx.category === category);
  };

  const getTransactionsByDateRange = (startDate: string, endDate: string) => {
    return unifiedTransactions.filter(tx => 
      tx.date >= startDate && tx.date <= endDate
    );
  };

  const getTotalRewardsEarned = (
    startDate?: string,
    endDate?: string
  ): { cashback: number; points: number; miles: number } => {
    let transactions = unifiedTransactions;
    
    if (startDate && endDate) {
      transactions = getTransactionsByDateRange(startDate, endDate);
    }

    return transactions.reduce(
      (totals, tx) => {
        if (tx.rewardAmount && tx.rewardType) {
          totals[tx.rewardType] += tx.rewardAmount;
        }
        return totals;
      },
      { cashback: 0, points: 0, miles: 0 }
    );
  };

  const getSpendingByCategory = (startDate?: string, endDate?: string) => {
    let transactions = unifiedTransactions.filter(tx => tx.type === 'expense');
    
    if (startDate && endDate) {
      transactions = transactions.filter(tx => 
        tx.date >= startDate && tx.date <= endDate
      );
    }

    return transactions.reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {} as Record<string, number>);
  };

  // Auto-fetch on user change
  useEffect(() => {
    if (user) {
      fetchUnifiedTransactions();
    }
  }, [user]);

  return {
    unifiedTransactions,
    loading: loading || manualLoading,
    error,
    fetchUnifiedTransactions,
    getTransactionsBySource,
    getTransactionsByCategory,
    getTransactionsByDateRange,
    getTotalRewardsEarned,
    getSpendingByCategory,
    refresh: () => fetchUnifiedTransactions()
  };
};