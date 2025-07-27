import { useState, useEffect, useCallback } from 'react';
import { useApiAuth } from '@/hooks/useApiAuth';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/apiClient';

export interface BankAccount {
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
  lastUpdated: string;
}

export interface BankConnection {
  id: string;
  userId: string;
  itemId: string;
  institutionId: string;
  institutionName: string;
  accounts: BankAccount[];
  createdAt: string;
  lastSync: string;
  isActive: boolean;
  syncEnabled: boolean;
  syncFrequency: 'manual' | 'daily' | 'weekly';
  lastError?: string;
}

export interface TransactionSyncResult {
  newTransactions: any[];
  updatedAccounts: BankAccount[];
  errors: string[];
}

export const useBankConnections = () => {
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useApiAuth();
  const { toast } = useToast();

  // Fetch bank connections
  const fetchConnections = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/api/plaid/connections');
      setConnections(response.data.connections || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to fetch bank connections';
      setError(errorMessage);
      console.error('Error fetching bank connections:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Add a new bank connection
  const addConnection = useCallback((newConnection: BankConnection) => {
    setConnections(prev => [newConnection, ...prev]);
  }, []);

  // Remove a bank connection
  const removeConnection = useCallback(async (connectionId: string) => {
    if (!user) return;

    try {
      await apiClient.delete(`/api/plaid/connections/${connectionId}`);
      setConnections(prev => prev.filter(conn => conn.id !== connectionId));
      
      toast({
        title: 'Connection Removed',
        description: 'Bank connection has been removed successfully.',
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to remove bank connection';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw new Error(errorMessage);
    }
  }, [user, toast]);

  // Sync transactions for a specific connection
  const syncConnection = useCallback(async (
    connectionId: string,
    startDate?: string,
    endDate?: string
  ): Promise<TransactionSyncResult | null> => {
    if (!user) return null;

    try {
      const response = await apiClient.post(`/api/plaid/connections/${connectionId}/sync`, {
        startDate,
        endDate,
      });

      toast({
        title: 'Sync Complete',
        description: `Successfully synced ${response.data.newTransactions?.length || 0} new transactions.`,
      });

      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to sync transactions';
      toast({
        title: 'Sync Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      throw new Error(errorMessage);
    }
  }, [user, toast]);

  // Sync all connections
  const syncAllConnections = useCallback(async (): Promise<{ [connectionId: string]: TransactionSyncResult } | null> => {
    if (!user) return null;

    try {
      const response = await apiClient.post('/api/plaid/sync/all');
      
      const totalNewTransactions = Object.values(response.data.results || {})
        .reduce((total: number, result: any) => total + (result.newTransactions?.length || 0), 0);

      toast({
        title: 'Sync Complete',
        description: `Successfully synced ${totalNewTransactions} new transactions across all accounts.`,
      });

      return response.data.results;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to sync all connections';
      toast({
        title: 'Sync Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      throw new Error(errorMessage);
    }
  }, [user, toast]);

  // Get total balance across all accounts
  const getTotalBalance = useCallback((): number => {
    return connections.reduce((total, connection) => {
      return total + connection.accounts.reduce((accountTotal, account) => {
        return accountTotal + (account.balance.current || 0);
      }, 0);
    }, 0);
  }, [connections]);

  // Get accounts by type
  const getAccountsByType = useCallback((type: string) => {
    const accounts: BankAccount[] = [];
    connections.forEach(connection => {
      connection.accounts.forEach(account => {
        if (account.type.toLowerCase() === type.toLowerCase()) {
          accounts.push(account);
        }
      });
    });
    return accounts;
  }, [connections]);

  // Initialize
  useEffect(() => {
    if (user) {
      fetchConnections();
    }
  }, [user, fetchConnections]);

  return {
    connections,
    isLoading,
    error,
    fetchConnections,
    addConnection,
    removeConnection,
    syncConnection,
    syncAllConnections,
    getTotalBalance,
    getAccountsByType,
  };
};