import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Shield, FileText, DollarSign, Clock, Plus, AlertCircle } from 'lucide-react';
import { InsurancePolicy, InsuranceClaim } from '@/types';

interface InsuranceDashboardProps {
  policies: InsurancePolicy[];
  claims: InsuranceClaim[];
  onCreatePolicy: () => void;
  onCreateClaim: () => void;
  onViewPolicy: (policy: InsurancePolicy) => void;
  onViewClaim: (claim: InsuranceClaim) => void;
}

export function InsuranceDashboard({ 
  policies, 
  claims, 
  onCreatePolicy, 
  onCreateClaim,
  onViewPolicy,
  onViewClaim 
}: InsuranceDashboardProps) {
  const activePolicies = policies.filter(p => p.status === 'active');
  const totalMonthlyPremiums = activePolicies.reduce((sum, policy) => {
    const monthlyPremium = policy.billingCycle === 'monthly' ? policy.premium :
                          policy.billingCycle === 'quarterly' ? policy.premium / 3 :
                          policy.billingCycle === 'semi-annual' ? policy.premium / 6 :
                          policy.premium / 12;
    return sum + monthlyPremium;
  }, 0);

  const totalCoverage = activePolicies.reduce((sum, policy) => sum + (policy.coverageAmount || 0), 0);
  const pendingClaims = claims.filter(c => ['submitted', 'under_review'].includes(c.status));
  const paidClaims = claims.filter(c => c.status === 'paid');
  const totalClaimsPaid = paidClaims.reduce((sum, claim) => sum + (claim.paidAmount || 0), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      case 'expired': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getClaimStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-500';
      case 'under_review': return 'bg-yellow-500';
      case 'approved': return 'bg-green-500';
      case 'denied': return 'bg-red-500';
      case 'paid': return 'bg-green-600';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePolicies.length}</div>
            <p className="text-xs text-muted-foreground">
              {policies.length - activePolicies.length} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Premiums</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalMonthlyPremiums.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ${(totalMonthlyPremiums * 12).toFixed(2)} annually
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Coverage</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalCoverage.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {activePolicies.length} policies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Claims Activity</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingClaims.length}</div>
            <p className="text-xs text-muted-foreground">
              Pending · ${totalClaimsPaid.toFixed(2)} paid
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="policies" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="claims">Claims</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button onClick={onCreatePolicy} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Policy
            </Button>
            <Button onClick={onCreateClaim} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              File Claim
            </Button>
          </div>
        </div>

        <TabsContent value="policies" className="space-y-4">
          <div className="grid gap-4">
            {policies.map((policy) => (
              <Card key={policy.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onViewPolicy(policy)}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{policy.policyName}</CardTitle>
                      <CardDescription>
                        {policy.provider} · {policy.type} · #{policy.policyNumber}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(policy.status)}>
                      {policy.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Premium</p>
                      <p className="font-semibold">${policy.premium} {policy.billingCycle}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Coverage</p>
                      <p className="font-semibold">
                        {policy.coverageAmount ? `$${policy.coverageAmount.toLocaleString()}` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Deductible</p>
                      <p className="font-semibold">
                        {policy.deductible ? `$${policy.deductible.toLocaleString()}` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Next Due</p>
                      <p className="font-semibold">
                        {new Date(policy.premiumSchedule.nextDueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="claims" className="space-y-4">
          <div className="grid gap-4">
            {claims.map((claim) => (
              <Card key={claim.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onViewClaim(claim)}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">Claim #{claim.claimNumber}</CardTitle>
                      <CardDescription>
                        {claim.description} · {new Date(claim.dateOfLoss).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge className={getClaimStatusColor(claim.status)}>
                      {claim.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Claim Amount</p>
                      <p className="font-semibold">${claim.claimAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Approved Amount</p>
                      <p className="font-semibold">
                        {claim.approvedAmount ? `$${claim.approvedAmount.toLocaleString()}` : 'Pending'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Paid Amount</p>
                      <p className="font-semibold">
                        {claim.paidAmount ? `$${claim.paidAmount.toLocaleString()}` : 'Not paid'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Management</CardTitle>
              <CardDescription>
                Upload and manage your insurance documents, EOBs, and bills
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Document management coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}