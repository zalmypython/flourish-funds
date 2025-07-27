import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/apiClient';

export interface BankConnection {
  id: string;
  institutionName: string;
  accounts: Array<{
    accountId: string;
    name: string;
    type: string;
    subtype: string;
    mask: string;
    balance: {
      current: number | null;
      available: number | null;
    };
  }>;
  lastSync: string;
  createdAt: string;
}

export interface TransactionSyncResult {
  newTransactions: Array<{
    transactionId: string;
    accountId: string;
    amount: number;
    date: string;
    name: string;
    merchantName?: string;
    category: string[];
    subcategory?: string;
    pending: boolean;
  }>;
  updatedAccounts: Array<{
    accountId: string;
    name: string;
    balance: {
      current: number | null;
      available: number | null;
    };
  }>;
  errors: string[];
}

export const useBankConnections = () => {
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch user's bank connections
  const fetchConnections = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/api/plaid/connections');
      setConnections(response.data.connections);
    } catch (err) {
      const errorMessage = 'Failed to fetch bank connections';
      setError(errorMessage);
      console.error('Error fetching connections:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Add new bank connection
  const addConnection = useCallback((newConnection: BankConnection) => {
    setConnections(prev => [...prev, newConnection]);
  }, []);

  // Remove bank connection
  const removeConnection = useCallback((connectionId: string) => {
    setConnections(prev => prev.filter(conn => conn.id !== connectionId));
  }, []);

  // Sync specific connection
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

      // Update the connection's lastSync time
      setConnections(prev =>
        prev.map(conn =>
          conn.id === connectionId
            ? { ...conn, lastSync: new Date().toISOString() }
            : conn
        )
      );

      toast({
        title: 'Sync Complete',
        description: `Found ${response.data.newTransactions.length} new transactions`,
      });

      return response.data;
    } catch (err) {
      const errorMessage = 'Failed to sync transactions';
      toast({
        title: 'Sync Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      console.error('Error syncing connection:', err);
      return null;
    }
  }, [user, toast]);

  // Sync all connections
  const syncAllConnections = useCallback(async (): Promise<{
    [connectionId: string]: TransactionSyncResult;
  } | null> => {
    if (!user) return null;

    try {
      const response = await apiClient.post('/api/plaid/sync/all');

      // Update all connections' lastSync time
      setConnections(prev =>
        prev.map(conn => ({
          ...conn,
          lastSync: new Date().toISOString(),
        }))
      );

      const totalNewTransactions = Object.values(response.data.results).reduce(
        (total: number, result: any) => total + result.newTransactions.length,
        0
      );

      toast({
        title: 'Sync Complete',
        description: `Found ${totalNewTransactions} new transactions across all accounts`,
      });

      return response.data.results;
    } catch (err) {
      const errorMessage = 'Failed to sync all connections';
      toast({
        title: 'Sync Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      console.error('Error syncing all connections:', err);
      return null;
    }
  }, [user, toast]);

  // Get total balance across all connected accounts
  const getTotalBalance = useCallback((): number => {
    return connections.reduce((total, connection) => {
      return total + connection.accounts.reduce((connTotal, account) => {
        return connTotal + (account.balance.current || 0);
      }, 0);
    }, 0);
  }, [connections]);

  // Get accounts by type
  const getAccountsByType = useCallback((type: string) => {
    const accounts: Array<{
      connectionId: string;
      institutionName: string;
      account: BankConnection['accounts'][0];
    }> = [];

    connections.forEach(connection => {
      connection.accounts
        .filter(account => account.type.toLowerCase() === type.toLowerCase())
        .forEach(account => {
          accounts.push({
            connectionId: connection.id,
            institutionName: connection.institutionName,
            account,
          });
        });
    });

    return accounts;
  }, [connections]);

  // Initialize
  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

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