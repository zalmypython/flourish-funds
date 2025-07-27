import React, { useState, useEffect } from 'react';
import { useApiAuth } from '@/hooks/useApiAuth';
import { useTransactions, Transaction as PlaidTransaction } from '@/hooks/useTransactions';
import { useBankConnections } from '@/hooks/useBankConnections';
import { useToast } from '@/hooks/use-toast';
import { TransactionList } from '@/components/TransactionList';
import { PlaidLinkButton } from '@/components/PlaidLinkButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Banknote,
  CreditCard,
  Users,
  RotateCcw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';

export const PlaidTransactions = () => {
  const { user } = useApiAuth();
  const { toast } = useToast();
  const {
    transactions,
    summary,
    syncLogs,
    isLoading: transactionsLoading,
    error: transactionsError,
    fetchTransactions,
    fetchSummary,
    fetchSyncLogs,
    updateTransactionCategory,
    updateTransactionVisibility,
  } = useTransactions();

  const {
    connections,
    isLoading: connectionsLoading,
    error: connectionsError,
    syncConnection,
    syncAllConnections,
    getTotalBalance,
  } = useBankConnections();

  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30');

  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchSummary();
      fetchSyncLogs();
    }
  }, [user, fetchTransactions, fetchSummary, fetchSyncLogs]);

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      await syncAllConnections();
      // Refresh transactions after sync
      await fetchTransactions();
      await fetchSummary();
      await fetchSyncLogs();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([
      fetchTransactions(),
      fetchSummary(),
      fetchSyncLogs(),
    ]);
  };

  const totalBalance = getTotalBalance();
  const hasConnections = connections.length > 0;
  const recentSyncLog = syncLogs[0];

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Please sign in to view your transactions.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            {hasConnections 
              ? 'View and manage your automatically imported transactions'
              : 'Connect your bank accounts to automatically import transactions'
            }
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {hasConnections && (
            <>
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={transactionsLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${transactionsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={handleSyncAll}
                disabled={isSyncing || connectionsLoading}
              >
                <RotateCcw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync All'}
              </Button>
            </>
          )}
          <PlaidLinkButton 
            onSuccess={() => {
              handleRefresh();
              toast({
                title: 'Success',
                description: 'Bank account connected successfully!',
              });
            }}
          />
        </div>
      </div>

      {/* Connection Status & Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected Accounts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connections.length}</div>
            <p className="text-xs text-muted-foreground">
              {connections.length === 0 ? 'No accounts connected' : 'Bank connections active'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Across all accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${summary?.totalIncome?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${summary?.totalExpenses?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Sync Status */}
      {recentSyncLog && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4" />
              Last Sync Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {recentSyncLog.status === 'completed' && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
                {recentSyncLog.status === 'failed' && (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                {recentSyncLog.status === 'running' && (
                  <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                )}
                <span className="text-sm">
                  {recentSyncLog.status === 'completed' && 'Last sync completed'}
                  {recentSyncLog.status === 'failed' && 'Last sync failed'}
                  {recentSyncLog.status === 'running' && 'Sync in progress'}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(recentSyncLog.startedAt), 'MMM dd, yyyy HH:mm')}
              </div>
            </div>
            {recentSyncLog.status === 'completed' && (
              <div className="mt-2 text-sm text-muted-foreground">
                Added {recentSyncLog.transactionsAdded} new transactions, 
                updated {recentSyncLog.transactionsUpdated} existing
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {!hasConnections ? (
        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Connect your bank accounts to automatically import and categorize your transactions.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <CreditCard className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Connected Accounts</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Connect your bank accounts, credit cards, and other financial institutions to get started.
              Your data is encrypted and secure.
            </p>
            <PlaidLinkButton 
              onSuccess={() => {
                handleRefresh();
                toast({
                  title: 'Success',
                  description: 'Bank account connected successfully!',
                });
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="transactions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="transactions">All Transactions</TabsTrigger>
            <TabsTrigger value="connections">Bank Connections</TabsTrigger>
            <TabsTrigger value="sync-logs">Sync History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="transactions" className="space-y-4">
            <TransactionList
              transactions={transactions}
              isLoading={transactionsLoading}
              onUpdateCategory={updateTransactionCategory}
              onToggleVisibility={updateTransactionVisibility}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="connections" className="space-y-4">
            <div className="grid gap-4">
              {connections.map((connection) => (
                <Card key={connection.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{connection.institutionName}</CardTitle>
                      <Badge variant="outline">
                        {connection.accounts.length} account{connection.accounts.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <CardDescription>
                      Last synced: {format(new Date(connection.lastSync), 'MMM dd, yyyy HH:mm')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {connection.accounts.map((account) => (
                        <div key={account.accountId} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <div className="font-medium">{account.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {account.type} • {account.subtype} • ****{account.mask}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              ${account.balance.current?.toFixed(2) || '0.00'}
                            </div>
                            {account.balance.available !== null && (
                              <div className="text-sm text-muted-foreground">
                                ${account.balance.available.toFixed(2)} available
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Separator className="my-4" />
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => syncConnection(connection.id)}
                        disabled={isSyncing}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Sync
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="sync-logs" className="space-y-4">
            <div className="space-y-2">
              {syncLogs.map((log) => (
                <Card key={log.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {log.status === 'completed' && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        {log.status === 'failed' && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        {log.status === 'running' && (
                          <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                        )}
                        <div>
                          <div className="font-medium capitalize">{log.syncType} Sync</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(log.startedAt), 'MMM dd, yyyy HH:mm')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={log.status === 'completed' ? 'default' : 
                                   log.status === 'failed' ? 'destructive' : 'secondary'}
                        >
                          {log.status}
                        </Badge>
                        {log.status === 'completed' && (
                          <div className="text-sm text-muted-foreground mt-1">
                            +{log.transactionsAdded} transactions
                          </div>
                        )}
                      </div>
                    </div>
                    {log.errors.length > 0 && (
                      <div className="mt-2 text-sm text-red-600">
                        {log.errors.join(', ')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};