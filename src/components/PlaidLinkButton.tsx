import React, { useCallback, useState } from 'react';
import { usePlaidLink, PlaidLinkOnSuccess, PlaidLinkOnExit } from 'react-plaid-link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useApiAuth } from '@/hooks/useApiAuth';
import { Loader2, LinkIcon, Building2 } from 'lucide-react';
import apiClient from '@/lib/apiClient';

interface PlaidLinkButtonProps {
  onSuccess?: (connection: any) => void;
  onExit?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
}

export const PlaidLinkButton: React.FC<PlaidLinkButtonProps> = ({
  onSuccess,
  onExit,
  disabled = false,
  className = '',
  variant = 'default',
}) => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useApiAuth();

  // Initialize Plaid Link
  const initializePlaidLink = useCallback(async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to connect your bank account.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post('/api/plaid/link/token');
      setLinkToken(response.data.linkToken);
    } catch (error) {
      console.error('Error creating link token:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to initialize bank connection. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  // Handle successful connection
  const handleOnSuccess: PlaidLinkOnSuccess = useCallback(
    async (publicToken, metadata) => {
      setIsLoading(true);
      try {
        const response = await apiClient.post('/api/plaid/link/exchange', {
          publicToken,
        });

        toast({
          title: 'Bank Connected Successfully',
          description: `Connected to ${metadata.institution?.name || 'your bank'}`,
        });

        onSuccess?.(response.data.connection);
      } catch (error) {
        console.error('Error exchanging public token:', error);
        toast({
          title: 'Connection Failed',
          description: 'Failed to complete bank connection. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess, toast]
  );

  // Handle connection exit/cancellation
  const handleOnExit: PlaidLinkOnExit = useCallback(
    (error, metadata) => {
      if (error) {
        console.error('Plaid Link error:', error);
        toast({
          title: 'Connection Cancelled',
          description: 'Bank connection was cancelled or failed.',
          variant: 'destructive',
        });
      }
      onExit?.();
    },
    [onExit, toast]
  );

  // Configure Plaid Link
  const config = {
    token: linkToken,
    onSuccess: handleOnSuccess,
    onExit: handleOnExit,
  };

  const { open, ready } = usePlaidLink(config);

  // Handle button click
  const handleClick = useCallback(async () => {
    if (!linkToken) {
      await initializePlaidLink();
      return;
    }
    
    if (ready) {
      open();
    }
  }, [linkToken, ready, open, initializePlaidLink]);

  // Auto-open when link token is ready
  React.useEffect(() => {
    if (linkToken && ready && !isLoading) {
      open();
    }
  }, [linkToken, ready, open, isLoading]);

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isLoading}
      variant={variant}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <LinkIcon className="w-4 h-4 mr-2" />
      )}
      {isLoading ? 'Connecting...' : 'Connect Bank Account'}
    </Button>
  );
};

// Bank Connection Status Component
interface BankConnectionCardProps {
  connection: {
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
  };
  onSync?: (connectionId: string) => void;
  onRemove?: (connectionId: string) => void;
}

export const BankConnectionCard: React.FC<BankConnectionCardProps> = ({
  connection,
  onSync,
  onRemove,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await apiClient.post(`/api/plaid/connections/${connection.id}/sync`);
      toast({
        title: 'Sync Complete',
        description: 'Account data has been updated.',
      });
      onSync?.(connection.id);
    } catch (error) {
      console.error('Error syncing connection:', error);
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync account data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRemove = async () => {
    try {
      await apiClient.delete(`/api/plaid/connections/${connection.id}`);
      toast({
        title: 'Bank Disconnected',
        description: 'Bank account has been disconnected.',
      });
      onRemove?.(connection.id);
    } catch (error) {
      console.error('Error removing connection:', error);
      toast({
        title: 'Disconnection Failed',
        description: 'Failed to disconnect bank account. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const lastSyncDate = new Date(connection.lastSync).toLocaleDateString();

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Building2 className="w-8 h-8 text-primary" />
          <div>
            <h3 className="font-semibold">{connection.institutionName}</h3>
            <p className="text-sm text-muted-foreground">
              Last sync: {lastSyncDate}
            </p>
          </div>
        </div>
        <Badge variant="secondary">Connected</Badge>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium text-sm">Connected Accounts:</h4>
        {connection.accounts.map((account) => (
          <div
            key={account.accountId}
            className="flex justify-between items-center p-2 bg-muted/50 rounded"
          >
            <div>
              <span className="font-medium">{account.name}</span>
              <span className="text-sm text-muted-foreground ml-2">
                ••••{account.mask}
              </span>
            </div>
            <div className="text-right">
              <div className="font-medium">
                ${account.balance.current?.toFixed(2) || '0.00'}
              </div>
              {account.balance.available !== null && (
                <div className="text-sm text-muted-foreground">
                  Available: ${account.balance.available.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex space-x-2">
        <Button onClick={handleSync} disabled={isSyncing} size="sm">
          {isSyncing ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            'Sync Now'
          )}
        </Button>
        <Button onClick={handleRemove} variant="outline" size="sm">
          Disconnect
        </Button>
      </div>
    </div>
  );
};