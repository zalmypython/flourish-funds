import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CreditCard, Link2, CheckCircle, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useApiAuth } from '@/hooks/useApiAuth';

interface BankAccount {
  accountId: string;
  name: string;
  type: string;
  subtype: string;
  mask: string;
  institutionName: string;
}

interface CreditCard {
  id: string;
  name: string;
  issuer: string;
  isActive: boolean;
}

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

interface PlaidAccountMapperProps {
  bankAccounts: BankAccount[];
  creditCards: CreditCard[];
  onMappingCreated?: () => void;
}

export const PlaidAccountMapper: React.FC<PlaidAccountMapperProps> = ({
  bankAccounts,
  creditCards,
  onMappingCreated
}) => {
  const [mappings, setMappings] = useState<CreditCardMapping[]>([]);
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMappings, setSelectedMappings] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { user } = useApiAuth();
  
  const apiClient = {
    get: async (url: string) => {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' }
      });
      return { data: await response.json() };
    },
    post: async (url: string, data: any) => {
      const response = await fetch(url, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return { data: await response.json() };
    },
    delete: async (url: string) => {
      const response = await fetch(url, { method: 'DELETE' });
      return { data: await response.json() };
    }
  };

  // Filter to credit accounts only
  const creditAccounts = bankAccounts.filter(acc => 
    acc.type.toLowerCase().includes('credit') || 
    acc.subtype.toLowerCase().includes('credit') ||
    acc.name.toLowerCase().includes('credit')
  );

  useEffect(() => {
    fetchMappings();
    fetchSuggestions();
  }, [bankAccounts, creditCards]);

  const fetchMappings = async () => {
    try {
      const response = await apiClient.get('/api/plaid/mappings');
      setMappings(response.data.mappings || []);
    } catch (error) {
      console.error('Error fetching mappings:', error);
    }
  };

  const fetchSuggestions = async () => {
    if (creditAccounts.length === 0 || creditCards.length === 0) return;

    try {
      const response = await apiClient.post('/api/plaid/mappings/suggestions', {
        plaidAccounts: creditAccounts,
        creditCards: creditCards.filter(card => card.isActive)
      });
      setSuggestions(response.data.suggestions || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const createMapping = async (plaidAccountId: string, creditCardId: string) => {
    const plaidAccount = creditAccounts.find(acc => acc.accountId === plaidAccountId);
    const creditCard = creditCards.find(card => card.id === creditCardId);

    if (!plaidAccount || !creditCard) {
      toast({
        title: "Error",
        description: "Invalid account or credit card selection",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/api/plaid/mappings', {
        plaidAccountId,
        plaidAccountName: plaidAccount.name,
        creditCardId,
        creditCardName: creditCard.name,
        institutionName: plaidAccount.institutionName
      });

      toast({
        title: "Success",
        description: "Credit card mapping created successfully",
      });

      await fetchMappings();
      onMappingCreated?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to create mapping",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteMapping = async (mappingId: string) => {
    setLoading(true);
    try {
      await apiClient.delete(`/api/plaid/mappings/${mappingId}`);
      
      toast({
        title: "Success",
        description: "Mapping deleted successfully",
      });

      await fetchMappings();
      onMappingCreated?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to delete mapping",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualMapping = async (plaidAccountId: string) => {
    const creditCardId = selectedMappings[plaidAccountId];
    if (!creditCardId) return;

    await createMapping(plaidAccountId, creditCardId);
    setSelectedMappings(prev => ({ ...prev, [plaidAccountId]: '' }));
  };

  const getUnmappedAccounts = () => {
    const mappedAccountIds = new Set(mappings.map(m => m.plaidAccountId));
    return creditAccounts.filter(acc => !mappedAccountIds.has(acc.accountId));
  };

  if (creditAccounts.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No credit card accounts found in your Plaid connections. 
          Make sure you've connected your credit card accounts through Plaid.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Existing Mappings */}
      {mappings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Linked Credit Cards
            </CardTitle>
            <CardDescription>
              Your Plaid credit card accounts linked to credit cards in the system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mappings.map(mapping => (
              <div key={mapping.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium">{mapping.plaidAccountName}</div>
                    <div className="text-sm text-muted-foreground">
                      {mapping.institutionName} → {mapping.creditCardName}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Linked
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMapping(mapping.id)}
                    disabled={loading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Smart Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-blue-600" />
              Smart Suggestions
            </CardTitle>
            <CardDescription>
              AI-suggested mappings based on account and card names
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map(suggestion => (
              <div key={suggestion.plaidAccountId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium">{suggestion.plaidAccountName}</div>
                    <div className="text-sm text-muted-foreground">
                      Suggested: {suggestion.suggestedCreditCardName}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {Math.round(suggestion.confidence * 100)}% match
                  </Badge>
                  <Button
                    onClick={() => createMapping(suggestion.plaidAccountId, suggestion.suggestedCreditCardId)}
                    disabled={loading}
                    size="sm"
                  >
                    Link
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Manual Mapping */}
      {getUnmappedAccounts().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Unmapped Credit Accounts
            </CardTitle>
            <CardDescription>
              Manually link these Plaid accounts to your credit cards to enable reward tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {getUnmappedAccounts().map(account => (
              <div key={account.accountId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium">{account.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {account.institutionName} • ••••{account.mask}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedMappings[account.accountId] || ''}
                    onValueChange={(value) => setSelectedMappings(prev => ({ ...prev, [account.accountId]: value }))}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select credit card" />
                    </SelectTrigger>
                    <SelectContent>
                      {creditCards.filter(card => card.isActive).map(card => (
                        <SelectItem key={card.id} value={card.id}>
                          {card.name} ({card.issuer})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => handleManualMapping(account.accountId)}
                    disabled={loading || !selectedMappings[account.accountId]}
                    size="sm"
                  >
                    Link
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {getUnmappedAccounts().length === 0 && suggestions.length === 0 && mappings.length > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            All your credit card accounts are properly linked! 
            Transactions from these accounts will now automatically earn rewards and track bonuses.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
