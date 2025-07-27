import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { InsurancePolicy, InsuranceClaim, InsuranceDocument } from '@/types';
import { apiClient } from '@/lib/apiClient';
import { toast } from 'sonner';

export function useInsurance() {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [documents, setDocuments] = useState<InsuranceDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all insurance data
  const fetchInsuranceData = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const [policiesRes, claimsRes] = await Promise.all([
        apiClient.get('/api/insurance/policies'),
        apiClient.get('/api/insurance/claims')
      ]);

      setPolicies(policiesRes.data);
      setClaims(claimsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch insurance data');
      toast.error('Failed to load insurance data');
    } finally {
      setLoading(false);
    }
  };

  // Policy management
  const createPolicy = async (policyData: Omit<InsurancePolicy, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'linkedTransactionIds'>) => {
    try {
      const response = await apiClient.post('/api/insurance/policies', policyData);
      const newPolicy = response.data;
      setPolicies(prev => [...prev, newPolicy]);
      toast.success('Insurance policy created successfully');
      return newPolicy;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to create policy';
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const updatePolicy = async (policyId: string, updates: Partial<InsurancePolicy>) => {
    try {
      const response = await apiClient.put(`/api/insurance/policies/${policyId}`, updates);
      const updatedPolicy = response.data;
      setPolicies(prev => prev.map(p => p.id === policyId ? updatedPolicy : p));
      toast.success('Policy updated successfully');
      return updatedPolicy;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to update policy';
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const linkTransactionToPolicy = async (policyId: string, transactionId: string) => {
    try {
      await apiClient.post(`/api/insurance/policies/${policyId}/link-transaction`, {
        transactionId
      });
      
      // Update local state
      setPolicies(prev => prev.map(p => 
        p.id === policyId 
          ? { ...p, linkedTransactionIds: [...p.linkedTransactionIds, transactionId] }
          : p
      ));
      
      toast.success('Transaction linked to policy');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to link transaction';
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
  };

  // Claim management
  const createClaim = async (claimData: Omit<InsuranceClaim, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'linkedTransactionIds' | 'documentIds'>) => {
    try {
      const response = await apiClient.post('/api/insurance/claims', claimData);
      const newClaim = response.data;
      setClaims(prev => [...prev, newClaim]);
      toast.success('Insurance claim created successfully');
      return newClaim;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to create claim';
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const updateClaimStatus = async (claimId: string, status: InsuranceClaim['status'], paidAmount?: number) => {
    try {
      const response = await apiClient.put(`/api/insurance/claims/${claimId}/status`, {
        status,
        paidAmount
      });
      const updatedClaim = response.data;
      setClaims(prev => prev.map(c => c.id === claimId ? updatedClaim : c));
      toast.success('Claim status updated');
      return updatedClaim;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to update claim status';
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
  };

  // Document management
  const uploadDocument = async (file: File, documentData: {
    type: InsuranceDocument['type'];
    policyId?: string;
    claimId?: string;
  }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', documentData.type);
      if (documentData.policyId) formData.append('policyId', documentData.policyId);
      if (documentData.claimId) formData.append('claimId', documentData.claimId);

      const response = await apiClient.post('/api/insurance/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const newDocument = response.data;
      setDocuments(prev => [...prev, newDocument]);
      toast.success('Document uploaded successfully');
      return newDocument;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to upload document';
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const fetchPolicyDocuments = async (policyId: string) => {
    try {
      const response = await apiClient.get(`/api/insurance/policies/${policyId}/documents`);
      return response.data;
    } catch (err: any) {
      toast.error('Failed to fetch policy documents');
      return [];
    }
  };

  const fetchClaimDocuments = async (claimId: string) => {
    try {
      const response = await apiClient.get(`/api/insurance/claims/${claimId}/documents`);
      return response.data;
    } catch (err: any) {
      toast.error('Failed to fetch claim documents');
      return [];
    }
  };

  // Analytics
  const getInsuranceAnalytics = () => {
    const activePolicies = policies.filter(p => p.status === 'active');
    const totalMonthlyPremiums = activePolicies.reduce((sum, policy) => {
      const monthlyPremium = policy.billingCycle === 'monthly' ? policy.premium :
                            policy.billingCycle === 'quarterly' ? policy.premium / 3 :
                            policy.billingCycle === 'semi-annual' ? policy.premium / 6 :
                            policy.premium / 12;
      return sum + monthlyPremium;
    }, 0);

    const totalCoverage = activePolicies.reduce((sum, policy) => sum + (policy.coverageAmount || 0), 0);
    const totalClaimsPaid = claims.filter(c => c.status === 'paid').reduce((sum, claim) => sum + (claim.paidAmount || 0), 0);
    const pendingClaims = claims.filter(c => ['submitted', 'under_review'].includes(c.status));

    return {
      activePolicies: activePolicies.length,
      totalPolicies: policies.length,
      totalMonthlyPremiums,
      totalAnnualPremiums: totalMonthlyPremiums * 12,
      totalCoverage,
      totalClaimsPaid,
      pendingClaims: pendingClaims.length,
      totalClaims: claims.length
    };
  };

  useEffect(() => {
    fetchInsuranceData();
  }, [user]);

  return {
    // Data
    policies,
    claims,
    documents,
    loading,
    error,
    
    // Actions
    fetchInsuranceData,
    createPolicy,
    updatePolicy,
    linkTransactionToPolicy,
    createClaim,
    updateClaimStatus,
    uploadDocument,
    fetchPolicyDocuments,
    fetchClaimDocuments,
    
    // Analytics
    getInsuranceAnalytics
  };
}