import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { apiClient } from '../lib/apiClient';
import { IncomeSource, PayerRule, IncomeAnalytics } from '../types';
import { useToast } from './use-toast';

export const useIncomeSources = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all income sources
  const {
    data: incomeSources = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['incomeSources', user?.id],
    queryFn: async () => {
      const response = await apiClient.get('/income-sources');
      return response.data;
    },
    enabled: !!user?.id,
  });

  // Create income source mutation
  const createIncomeSourceMutation = useMutation({
    mutationFn: async (data: Omit<IncomeSource, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'payerRules' | 'linkedTransactionIds'>) => {
      const response = await apiClient.post('/income-sources', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomeSources', user?.id] });
      toast({
        title: "Success",
        description: "Income source created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.error || "Failed to create income source",
      });
    },
  });

  // Update income source mutation
  const updateIncomeSourceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<IncomeSource> }) => {
      const response = await apiClient.put(`/income-sources/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomeSources', user?.id] });
      toast({
        title: "Success",
        description: "Income source updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.error || "Failed to update income source",
      });
    },
  });

  // Delete income source mutation
  const deleteIncomeSourceMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/income-sources/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomeSources', user?.id] });
      toast({
        title: "Success",
        description: "Income source deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.error || "Failed to delete income source",
      });
    },
  });

  // Create payer rule mutation
  const createPayerRuleMutation = useMutation({
    mutationFn: async ({ incomeSourceId, ruleData }: { 
      incomeSourceId: string; 
      ruleData: Omit<PayerRule, 'id' | 'userId' | 'createdAt' | 'updatedAt'> 
    }) => {
      const response = await apiClient.post(`/income-sources/${incomeSourceId}/payer-rules`, ruleData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomeSources', user?.id] });
      toast({
        title: "Success",
        description: "Payer rule created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.error || "Failed to create payer rule",
      });
    },
  });

  // Link transaction to income source mutation
  const linkTransactionMutation = useMutation({
    mutationFn: async ({ incomeSourceId, transactionId }: { incomeSourceId: string; transactionId: string }) => {
      const response = await apiClient.post(`/income-sources/${incomeSourceId}/link-transaction`, { transactionId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomeSources', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id] });
      toast({
        title: "Success",
        description: "Transaction linked to income source",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.error || "Failed to link transaction",
      });
    },
  });

  // Find matching income source for transaction
  const findMatchingIncomeSource = async (transaction: any): Promise<string | null> => {
    try {
      const response = await apiClient.post('/income-sources/find-match', { transaction });
      return response.data.matchingIncomeSourceId;
    } catch (error) {
      console.error('Failed to find matching income source:', error);
      return null;
    }
  };

  // Get income analytics
  const useIncomeAnalytics = (startDate?: Date, endDate?: Date) => {
    return useQuery({
      queryKey: ['incomeAnalytics', user?.id, startDate, endDate],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate.toISOString());
        if (endDate) params.append('endDate', endDate.toISOString());
        
        const response = await apiClient.get(`/income-sources/analytics?${params.toString()}`);
        return response.data as IncomeAnalytics;
      },
      enabled: !!user?.id,
    });
  };

  // Helper functions
  const getIncomeSourcesByType = (type: IncomeSource['type']) => {
    return incomeSources.filter((source: IncomeSource) => source.type === type);
  };

  const getActiveIncomeSources = () => {
    return incomeSources.filter((source: IncomeSource) => source.isActive);
  };

  const getTotalExpectedMonthlyIncome = () => {
    return incomeSources.reduce((total: number, source: IncomeSource) => {
      return total + (source.expectedMonthlyAmount || 0);
    }, 0);
  };

  return {
    // Data
    incomeSources,
    isLoading,
    error,
    
    // Mutations
    createIncomeSource: createIncomeSourceMutation.mutate,
    updateIncomeSource: updateIncomeSourceMutation.mutate,
    deleteIncomeSource: deleteIncomeSourceMutation.mutate,
    createPayerRule: createPayerRuleMutation.mutate,
    linkTransaction: linkTransactionMutation.mutate,
    
    // Loading states
    isCreating: createIncomeSourceMutation.isPending,
    isUpdating: updateIncomeSourceMutation.isPending,
    isDeleting: deleteIncomeSourceMutation.isPending,
    isCreatingRule: createPayerRuleMutation.isPending,
    isLinking: linkTransactionMutation.isPending,
    
    // Helper functions
    findMatchingIncomeSource,
    getIncomeSourcesByType,
    getActiveIncomeSources,
    getTotalExpectedMonthlyIncome,
    useIncomeAnalytics,
  };
};