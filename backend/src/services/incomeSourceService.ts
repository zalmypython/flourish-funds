import { BaseService } from './baseService';
import { IncomeSource, PayerRule, IncomeAnalytics } from '../models/incomeSource';
import { enhancedLogger } from '../utils/enhancedLogger';
import { firestore } from '../config/firebase';
import { v4 as uuidv4 } from 'uuid';

export class IncomeSourceService extends BaseService<IncomeSource> {
  constructor() {
    super('incomeSources');
  }

  async createPayerRule(userId: string, incomeSourceId: string, ruleData: Omit<PayerRule, 'id' | 'createdAt'>): Promise<string> {
    try {
      const incomeSource = await this.getById(incomeSourceId, userId);
      if (!incomeSource) {
        throw new Error('Income source not found');
      }

      const newRule: PayerRule = {
        ...ruleData,
        id: uuidv4(),
        createdAt: new Date()
      };

      const updatedPayerRules = [...incomeSource.payerRules, newRule];
      
      await this.update(incomeSourceId, userId, { payerRules: updatedPayerRules });
      
      enhancedLogger.info('Payer rule created', { 
        userId, 
        incomeSourceId, 
        ruleId: newRule.id, 
        ruleType: newRule.ruleType 
      });

      return newRule.id;
    } catch (error) {
      enhancedLogger.error('Failed to create payer rule', { error, userId, incomeSourceId });
      throw error;
    }
  }

  async updatePayerRule(userId: string, incomeSourceId: string, ruleId: string, updates: Partial<PayerRule>): Promise<void> {
    try {
      const incomeSource = await this.getById(incomeSourceId, userId);
      if (!incomeSource) {
        throw new Error('Income source not found');
      }

      const updatedPayerRules = incomeSource.payerRules.map(rule =>
        rule.id === ruleId ? { ...rule, ...updates } : rule
      );

      await this.update(incomeSourceId, userId, { payerRules: updatedPayerRules });
      
      enhancedLogger.info('Payer rule updated', { userId, incomeSourceId, ruleId });
    } catch (error) {
      enhancedLogger.error('Failed to update payer rule', { error, userId, incomeSourceId, ruleId });
      throw error;
    }
  }

  async deletePayerRule(userId: string, incomeSourceId: string, ruleId: string): Promise<void> {
    try {
      const incomeSource = await this.getById(incomeSourceId, userId);
      if (!incomeSource) {
        throw new Error('Income source not found');
      }

      const updatedPayerRules = incomeSource.payerRules.filter(rule => rule.id !== ruleId);
      
      await this.update(incomeSourceId, userId, { payerRules: updatedPayerRules });
      
      enhancedLogger.info('Payer rule deleted', { userId, incomeSourceId, ruleId });
    } catch (error) {
      enhancedLogger.error('Failed to delete payer rule', { error, userId, incomeSourceId, ruleId });
      throw error;
    }
  }

  async linkTransactionToIncomeSource(userId: string, incomeSourceId: string, transactionId: string): Promise<void> {
    try {
      const incomeSource = await this.getById(incomeSourceId, userId);
      if (!incomeSource) {
        throw new Error('Income source not found');
      }

      const updatedTransactionIds = [...new Set([...incomeSource.linkedTransactionIds, transactionId])];
      
      await this.update(incomeSourceId, userId, { linkedTransactionIds: updatedTransactionIds });
      
      enhancedLogger.info('Transaction linked to income source', { userId, incomeSourceId, transactionId });
    } catch (error) {
      enhancedLogger.error('Failed to link transaction to income source', { error, userId, incomeSourceId, transactionId });
      throw error;
    }
  }

  async unlinkTransactionFromIncomeSource(userId: string, incomeSourceId: string, transactionId: string): Promise<void> {
    try {
      const incomeSource = await this.getById(incomeSourceId, userId);
      if (!incomeSource) {
        throw new Error('Income source not found');
      }

      const updatedTransactionIds = incomeSource.linkedTransactionIds.filter(id => id !== transactionId);
      
      await this.update(incomeSourceId, userId, { linkedTransactionIds: updatedTransactionIds });
      
      enhancedLogger.info('Transaction unlinked from income source', { userId, incomeSourceId, transactionId });
    } catch (error) {
      enhancedLogger.error('Failed to unlink transaction from income source', { error, userId, incomeSourceId, transactionId });
      throw error;
    }
  }

  async findMatchingIncomeSource(userId: string, transaction: any): Promise<string | null> {
    try {
      const incomeSources = await this.getAll(userId);
      
      for (const source of incomeSources) {
        if (!source.isActive) continue;
        
        for (const rule of source.payerRules) {
          if (!rule.isActive) continue;
          
          if (this.matchesRule(transaction, rule)) {
            enhancedLogger.info('Transaction matched to income source', { 
              userId, 
              transactionId: transaction.id, 
              incomeSourceId: source.id,
              ruleType: rule.ruleType 
            });
            return source.id;
          }
        }
      }
      
      return null;
    } catch (error) {
      enhancedLogger.error('Failed to find matching income source', { error, userId, transactionId: transaction.id });
      return null;
    }
  }

  private matchesRule(transaction: any, rule: PayerRule): boolean {
    switch (rule.ruleType) {
      case 'exactPayer':
        return transaction.description?.toLowerCase() === rule.pattern.toLowerCase() ||
               transaction.merchant?.toLowerCase() === rule.pattern.toLowerCase();
               
      case 'partialDescription':
        return transaction.description?.toLowerCase().includes(rule.pattern.toLowerCase()) ||
               transaction.merchant?.toLowerCase().includes(rule.pattern.toLowerCase());
               
      case 'amountPattern':
        if (!rule.amountRange) return false;
        const amount = Math.abs(parseFloat(transaction.amount) || 0);
        return amount >= rule.amountRange.min && amount <= rule.amountRange.max;
        
      case 'accountBased':
        return transaction.accountId === rule.accountId;
        
      default:
        return false;
    }
  }

  async getIncomeAnalytics(userId: string, startDate?: Date, endDate?: Date): Promise<IncomeAnalytics> {
    try {
      const incomeSources = await this.getAll(userId);
      
      // This would typically fetch transaction data and calculate analytics
      // For now, returning a basic structure - would need integration with transaction service
      const analytics: IncomeAnalytics = {
        totalMonthlyIncome: 0,
        incomeBySource: {},
        monthlyTrend: [],
        expectedVsActual: {}
      };

      for (const source of incomeSources) {
        analytics.incomeBySource[source.id] = 0; // Would calculate from linked transactions
        analytics.expectedVsActual[source.id] = {
          expected: source.expectedMonthlyAmount || 0,
          actual: 0, // Would calculate from linked transactions
          variance: 0
        };
      }

      enhancedLogger.info('Income analytics generated', { userId, sourcesCount: incomeSources.length });
      return analytics;
    } catch (error) {
      enhancedLogger.error('Failed to generate income analytics', { error, userId });
      throw error;
    }
  }

  async getTransactionsForIncomeSource(userId: string, incomeSourceId: string): Promise<any[]> {
    try {
      const incomeSource = await this.getById(incomeSourceId, userId);
      if (!incomeSource) {
        throw new Error('Income source not found');
      }

      // This would fetch actual transactions - simplified for now
      // Would need integration with transaction service to fetch by IDs
      enhancedLogger.info('Fetched transactions for income source', { 
        userId, 
        incomeSourceId, 
        transactionCount: incomeSource.linkedTransactionIds.length 
      });
      
      return []; // Placeholder - would return actual transaction data
    } catch (error) {
      enhancedLogger.error('Failed to fetch transactions for income source', { error, userId, incomeSourceId });
      throw error;
    }
  }
}

export const incomeSourceService = new IncomeSourceService();