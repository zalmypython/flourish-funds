import { InsurancePolicy, InsuranceClaim, InsuranceDocument } from '../models/insurancePolicy';
import { auditLog } from '../middleware/auditLogger';

class InsuranceService {
  private policies: InsurancePolicy[] = [];
  private claims: InsuranceClaim[] = [];
  private documents: InsuranceDocument[] = [];

  // Policy Management
  async createPolicy(userId: string, policyData: Omit<InsurancePolicy, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'linkedTransactionIds'>): Promise<InsurancePolicy> {
    const policy: InsurancePolicy = {
      id: `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      ...policyData,
      linkedTransactionIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.policies.push(policy);
    
    auditLog({
      action: 'insurance_policy_created',
      userId,
      resourceId: policy.id,
      details: { policyType: policy.type, provider: policy.provider }
    });

    return policy;
  }

  async getUserPolicies(userId: string): Promise<InsurancePolicy[]> {
    return this.policies.filter(policy => policy.userId === userId);
  }

  async getPolicyById(userId: string, policyId: string): Promise<InsurancePolicy | null> {
    const policy = this.policies.find(p => p.id === policyId && p.userId === userId);
    return policy || null;
  }

  async updatePolicy(userId: string, policyId: string, updates: Partial<InsurancePolicy>): Promise<InsurancePolicy | null> {
    const policyIndex = this.policies.findIndex(p => p.id === policyId && p.userId === userId);
    if (policyIndex === -1) return null;

    this.policies[policyIndex] = {
      ...this.policies[policyIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    auditLog({
      action: 'insurance_policy_updated',
      userId,
      resourceId: policyId,
      details: { updatedFields: Object.keys(updates) }
    });

    return this.policies[policyIndex];
  }

  async linkTransactionToPolicy(userId: string, policyId: string, transactionId: string): Promise<boolean> {
    const policy = await this.getPolicyById(userId, policyId);
    if (!policy) return false;

    if (!policy.linkedTransactionIds.includes(transactionId)) {
      policy.linkedTransactionIds.push(transactionId);
      policy.updatedAt = new Date().toISOString();

      auditLog({
        action: 'transaction_linked_to_policy',
        userId,
        resourceId: policyId,
        details: { transactionId }
      });
    }

    return true;
  }

  // Claim Management
  async createClaim(userId: string, claimData: Omit<InsuranceClaim, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'linkedTransactionIds' | 'documentIds'>): Promise<InsuranceClaim> {
    const claim: InsuranceClaim = {
      id: `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      ...claimData,
      linkedTransactionIds: [],
      documentIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.claims.push(claim);
    
    auditLog({
      action: 'insurance_claim_created',
      userId,
      resourceId: claim.id,
      details: { policyId: claim.policyId, claimAmount: claim.claimAmount }
    });

    return claim;
  }

  async getUserClaims(userId: string): Promise<InsuranceClaim[]> {
    return this.claims.filter(claim => claim.userId === userId);
  }

  async getClaimById(userId: string, claimId: string): Promise<InsuranceClaim | null> {
    const claim = this.claims.find(c => c.id === claimId && c.userId === userId);
    return claim || null;
  }

  async updateClaimStatus(userId: string, claimId: string, status: InsuranceClaim['status'], paidAmount?: number): Promise<InsuranceClaim | null> {
    const claimIndex = this.claims.findIndex(c => c.id === claimId && c.userId === userId);
    if (claimIndex === -1) return null;

    const updates: Partial<InsuranceClaim> = { status, updatedAt: new Date().toISOString() };
    if (paidAmount !== undefined) updates.paidAmount = paidAmount;

    this.claims[claimIndex] = { ...this.claims[claimIndex], ...updates };

    auditLog({
      action: 'insurance_claim_status_updated',
      userId,
      resourceId: claimId,
      details: { newStatus: status, paidAmount }
    });

    return this.claims[claimIndex];
  }

  // Auto-linking logic
  async autoLinkTransactions(userId: string, transaction: any): Promise<string[]> {
    const linkedPolicyIds: string[] = [];
    const userPolicies = await this.getUserPolicies(userId);

    for (const policy of userPolicies) {
      if (this.shouldLinkTransaction(transaction, policy)) {
        await this.linkTransactionToPolicy(userId, policy.id, transaction.id);
        linkedPolicyIds.push(policy.id);
      }
    }

    return linkedPolicyIds;
  }

  private shouldLinkTransaction(transaction: any, policy: InsurancePolicy): boolean {
    const { autoLinkingRules } = policy;
    
    // Check merchant patterns
    const merchantMatch = autoLinkingRules.merchantPatterns.some(pattern => 
      transaction.description?.toLowerCase().includes(pattern.toLowerCase()) ||
      transaction.merchant?.toLowerCase().includes(pattern.toLowerCase())
    );

    // Check amount tolerance for premium payments
    const amountMatch = Math.abs(transaction.amount - policy.premium) <= autoLinkingRules.amountTolerance;

    // Check category filters
    const categoryMatch = autoLinkingRules.categoryFilters.length === 0 || 
      autoLinkingRules.categoryFilters.includes(transaction.category);

    return merchantMatch || (amountMatch && categoryMatch);
  }

  // Document Management
  async uploadDocument(userId: string, documentData: Omit<InsuranceDocument, 'id' | 'userId' | 'uploadDate'>): Promise<InsuranceDocument> {
    const document: InsuranceDocument = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      ...documentData,
      uploadDate: new Date().toISOString(),
    };

    this.documents.push(document);

    auditLog({
      action: 'insurance_document_uploaded',
      userId,
      resourceId: document.id,
      details: { type: document.type, filename: document.filename }
    });

    return document;
  }

  async getPolicyDocuments(userId: string, policyId: string): Promise<InsuranceDocument[]> {
    return this.documents.filter(doc => doc.userId === userId && doc.policyId === policyId);
  }

  async getClaimDocuments(userId: string, claimId: string): Promise<InsuranceDocument[]> {
    return this.documents.filter(doc => doc.userId === userId && doc.claimId === claimId);
  }
}

export const insuranceService = new InsuranceService();