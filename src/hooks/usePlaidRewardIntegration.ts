import { useState, useEffect } from 'react';
import { useApiAuth } from './useApiAuth';
import { useBankConnections } from './useBankConnections';
import { useToast } from './use-toast';

interface CreditCardMapping {
  id: string;
  plaidAccountId: string;
  plaidAccountName: string;
  creditCardId: string;
  creditCardName: string;
  institutionName: string;
  isActive: boolean;
}

interface MappingSuggestion {
  plaidAccountId: string;
  plaidAccountName: string;
  suggestedCreditCardId: string;
  suggestedCreditCardName: string;
  confidence: number;
}

export const usePlaidRewardIntegration = () => {
  const [mappings, setMappings] = useState<CreditCardMapping[]>([]);
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useApiAuth();
  
  const apiClient = {
    get: (url: string) => fetch(url).then(r => r.json()),
    post: (url: string, data: any) => fetch(url, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json()),
    put: (url: string, data: any) => fetch(url, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json()),
    delete: (url: string) => fetch(url, { method: 'DELETE' }).then(r => r.json())
  };
  const { connections } = useBankConnections();
  const { toast } = useToast();

  const fetchMappings = async () => {
    if (!user) return;

    try {
      const response = await apiClient.get('/api/plaid/mappings');
      setMappings(response.data.mappings || []);
    } catch (error: any) {
      setError(error.message || 'Failed to fetch mappings');
      console.error('Error fetching mappings:', error);
    }
  };

  const fetchSuggestions = async (creditCards: Array<{ id: string; name: string; issuer: string }>) => {
    if (!user || !connections.length || !creditCards.length) return;

    try {
      // Get all credit card accounts from all connections
      const allAccounts = connections.flatMap(conn => 
        conn.accounts
          .filter(acc => 
            acc.type.toLowerCase().includes('credit') || 
            acc.subtype?.toLowerCase().includes('credit') ||
            acc.name.toLowerCase().includes('credit')
          )
          .map(acc => ({
            accountId: acc.accountId,
            name: acc.name,
            type: acc.type,
            institutionName: conn.institutionName
          }))
      );

      if (allAccounts.length === 0) return;

      const response = await apiClient.post('/api/plaid/mappings/suggestions', {
        plaidAccounts: allAccounts,
        creditCards
      });

      setSuggestions(response.data.suggestions || []);
    } catch (error: any) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const createMapping = async (
    plaidAccountId: string,
    plaidAccountName: string,
    creditCardId: string,
    creditCardName: string,
    institutionName: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      await apiClient.post('/api/plaid/mappings', {
        plaidAccountId,
        plaidAccountName,
        creditCardId,
        creditCardName,
        institutionName
      });

      toast({
        title: "Success",
        description: "Credit card mapping created successfully. Plaid transactions will now calculate rewards!",
      });

      await fetchMappings();
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create mapping';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateMapping = async (
    mappingId: string,
    updates: {
      creditCardId?: string;
      creditCardName?: string;
      isActive?: boolean;
    }
  ) => {
    setLoading(true);
    setError(null);

    try {
      await apiClient.put(`/api/plaid/mappings/${mappingId}`, updates);

      toast({
        title: "Success",
        description: "Mapping updated successfully",
      });

      await fetchMappings();
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update mapping';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteMapping = async (mappingId: string) => {
    setLoading(true);
    setError(null);

    try {
      await apiClient.delete(`/api/plaid/mappings/${mappingId}`);

      toast({
        title: "Success",
        description: "Mapping deleted successfully",
      });

      await fetchMappings();
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete mapping';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getMappedCreditCards = () => {
    return mappings.filter(m => m.isActive).map(m => m.creditCardId);
  };

  const getUnmappedCreditAccounts = () => {
    const mappedAccountIds = new Set(mappings.map(m => m.plaidAccountId));
    
    return connections.flatMap(conn => 
      conn.accounts
        .filter(acc => 
          (acc.type.toLowerCase().includes('credit') || 
           acc.subtype?.toLowerCase().includes('credit') ||
           acc.name.toLowerCase().includes('credit')) &&
          !mappedAccountIds.has(acc.accountId)
        )
        .map(acc => ({
          ...acc,
          institutionName: conn.institutionName,
          connectionId: conn.id
        }))
    );
  };

  const isCreditCardMapped = (creditCardId: string) => {
    return mappings.some(m => m.creditCardId === creditCardId && m.isActive);
  };

  const getIntegrationStatus = () => {
    const totalCreditAccounts = connections.flatMap(conn => 
      conn.accounts.filter(acc => 
        acc.type.toLowerCase().includes('credit') || 
        acc.subtype?.toLowerCase().includes('credit') ||
        acc.name.toLowerCase().includes('credit')
      )
    ).length;

    const mappedAccounts = mappings.filter(m => m.isActive).length;

    return {
      totalCreditAccounts,
      mappedAccounts,
      unmappedAccounts: totalCreditAccounts - mappedAccounts,
      integrationPercentage: totalCreditAccounts > 0 ? (mappedAccounts / totalCreditAccounts) * 100 : 0,
      isFullyIntegrated: totalCreditAccounts > 0 && mappedAccounts === totalCreditAccounts
    };
  };

  // Auto-fetch mappings when user is available
  useEffect(() => {
    if (user) {
      fetchMappings();
    }
  }, [user]);

  return {
    mappings,
    suggestions,
    loading,
    error,
    fetchMappings,
    fetchSuggestions,
    createMapping,
    updateMapping,
    deleteMapping,
    getMappedCreditCards,
    getUnmappedCreditAccounts,
    isCreditCardMapped,
    getIntegrationStatus
  };
};