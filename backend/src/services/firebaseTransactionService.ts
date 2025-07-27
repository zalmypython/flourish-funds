import { db } from '../config/firebase';
import { TransactionModel, SyncLogModel } from '../models/bankConnection';
import { encryptFinancialData, decryptFinancialData } from '../middleware/encryption';
import { auditLog } from '../middleware/auditLogger';
import { PlaidTransactionAdapter } from './plaidTransactionAdapter';
import CreditCardMappingService from './creditCardMappingService';
import RewardProcessingService from './rewardProcessingService';

interface CategoryMapping {
  plaidCategory: string;
  internalCategory: string;
  confidence: number;
}

export default class FirebaseTransactionService {
  private plaidAdapter: PlaidTransactionAdapter;
  private mappingService: CreditCardMappingService;
  private rewardService: RewardProcessingService;
  
  private categoryMappings: CategoryMapping[] = [
    { plaidCategory: 'Food and Drink', internalCategory: 'Food & Dining', confidence: 0.9 },
    { plaidCategory: 'Transportation', internalCategory: 'Transportation', confidence: 0.9 },
    { plaidCategory: 'Shops', internalCategory: 'Shopping', confidence: 0.8 },
    { plaidCategory: 'Recreation', internalCategory: 'Entertainment', confidence: 0.8 },
    { plaidCategory: 'Healthcare', internalCategory: 'Healthcare', confidence: 0.9 },
    { plaidCategory: 'Service', internalCategory: 'Services', confidence: 0.7 },
    { plaidCategory: 'Government and Non-Profit', internalCategory: 'Government', confidence: 0.9 },
    { plaidCategory: 'Travel', internalCategory: 'Travel', confidence: 0.9 },
    { plaidCategory: 'Deposit', internalCategory: 'Income', confidence: 0.9 },
    { plaidCategory: 'Transfer', internalCategory: 'Transfer', confidence: 0.9 }
  ];

  constructor() {
    this.plaidAdapter = new PlaidTransactionAdapter();
    this.mappingService = new CreditCardMappingService();
    this.rewardService = new RewardProcessingService();
  }

  async processTransactions(
    userId: string,
    bankConnectionId: string,
    plaidTransactions: any[]
  ): Promise<{ added: TransactionModel[]; updated: TransactionModel[]; errors: string[] }> {
    const results = { added: [] as TransactionModel[], updated: [] as TransactionModel[], errors: [] as string[] };

    // Get account mappings for reward processing
    const accountMappings = await this.mappingService.getAccountMappingsMap(userId);

    for (const plaidTx of plaidTransactions) {
      try {
        const existingTransaction = await this.findTransactionByPlaidId(plaidTx.transaction_id);

        let processedTransaction: TransactionModel;

        if (existingTransaction) {
          // Update existing transaction
          const updatedTransaction = await this.updateTransaction(existingTransaction.id, userId, plaidTx);
          if (updatedTransaction) {
            results.updated.push(updatedTransaction);
            processedTransaction = updatedTransaction;
          } else {
            continue;
          }
        } else {
          // Create new transaction
          const newTransaction = await this.createTransaction(userId, bankConnectionId, plaidTx);
          results.added.push(newTransaction);
          processedTransaction = newTransaction;
        }

        // Process rewards if this is a credit card transaction
        await this.processRewardsForTransaction(processedTransaction, accountMappings, userId);

      } catch (error: any) {
        results.errors.push(`Error processing transaction ${plaidTx.transaction_id}: ${error.message}`);
      }
    }

    return results;
  }

  private async createTransaction(
    userId: string,
    bankConnectionId: string,
    plaidTransaction: any
  ): Promise<TransactionModel> {
    const transaction: Omit<TransactionModel, 'id'> = {
      userId,
      bankConnectionId,
      plaidTransactionId: plaidTransaction.transaction_id,
      accountId: plaidTransaction.account_id,
      amount: plaidTransaction.amount,
      date: plaidTransaction.date,
      name: plaidTransaction.name,
      merchantName: plaidTransaction.merchant_name,
      category: plaidTransaction.category || [],
      subcategory: plaidTransaction.category?.[1],
      internalCategory: this.mapCategory(plaidTransaction.category || []),
      pending: plaidTransaction.pending,
      location: plaidTransaction.location ? {
        address: plaidTransaction.location.address,
        city: plaidTransaction.location.city,
        region: plaidTransaction.location.region,
        postalCode: plaidTransaction.location.postal_code,
        country: plaidTransaction.location.country
      } : undefined,
      metadata: {
        confidence: 0.8,
        website: plaidTransaction.website,
        logoUrl: plaidTransaction.logo_url
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      isHidden: false,
      isDeleted: false,
      notes: '',
      tags: []
    };

    const encryptedData = encryptFinancialData(transaction);
    const docRef = await db.collection('plaid_transactions').add(encryptedData);

    auditLog({
      event: 'plaid_transaction_created',
      userId,
      ip: 'server',
      userAgent: 'server',
      timestamp: new Date(),
      details: { transactionId: docRef.id, plaidId: plaidTransaction.transaction_id }
    });

    return { id: docRef.id, ...transaction };
  }

  private async updateTransaction(
    transactionId: string,
    userId: string,
    plaidTransaction: any
  ): Promise<TransactionModel | null> {
    try {
      const docRef = db.collection('plaid_transactions').doc(transactionId);
      const doc = await docRef.get();

      if (!doc.exists || doc.data()?.userId !== userId) {
        return null;
      }

      const updateData = {
        amount: plaidTransaction.amount,
        name: plaidTransaction.name,
        merchantName: plaidTransaction.merchant_name,
        pending: plaidTransaction.pending,
        updatedAt: new Date()
      };

      const encryptedData = encryptFinancialData(updateData);
      await docRef.update(encryptedData);

      const existingData = decryptFinancialData(doc.data()!);
      return { id: transactionId, ...existingData, ...updateData };
    } catch (error) {
      throw error;
    }
  }

  private mapCategory(plaidCategories: string[]): string {
    if (!plaidCategories || plaidCategories.length === 0) {
      return 'Other';
    }

    const primaryCategory = plaidCategories[0];
    const mapping = this.categoryMappings.find(m => 
      primaryCategory.toLowerCase().includes(m.plaidCategory.toLowerCase())
    );

    return mapping ? mapping.internalCategory : 'Other';
  }

  private async findTransactionByPlaidId(plaidTransactionId: string): Promise<TransactionModel | null> {
    try {
      const snapshot = await db.collection('plaid_transactions')
        .where('plaidTransactionId', '==', plaidTransactionId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const data = decryptFinancialData(doc.data());
      return { id: doc.id, ...data } as TransactionModel;
    } catch (error) {
      return null;
    }
  }

  async getUserTransactions(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      category?: string;
      startDate?: string;
      endDate?: string;
      accountId?: string;
      type?: 'income' | 'expense';
    }
  ): Promise<TransactionModel[]> {
    try {
      let query = db.collection('plaid_transactions').where('userId', '==', userId);

      // Apply filters
      if (options.accountId) {
        query = query.where('accountId', '==', options.accountId);
      }

      if (options.startDate) {
        query = query.where('date', '>=', options.startDate);
      }

      if (options.endDate) {
        query = query.where('date', '<=', options.endDate);
      }

      // Apply pagination
      query = query.orderBy('date', 'desc');
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const snapshot = await query.get();
      let transactions = snapshot.docs.map(doc => {
        const data = decryptFinancialData(doc.data());
        return { id: doc.id, ...data } as TransactionModel;
      });

      // Apply additional filters that can't be done in Firestore query
      if (options.category) {
        transactions = transactions.filter(t => t.internalCategory === options.category);
      }

      if (options.type) {
        transactions = transactions.filter(t => {
          return options.type === 'income' ? t.amount < 0 : t.amount > 0;
        });
      }

      return transactions;
    } catch (error: any) {
      auditLog({
        event: 'plaid_transactions_read_failed',
        userId,
        ip: 'server',
        userAgent: 'server',
        timestamp: new Date(),
        details: { error: error.message }
      });
      throw error;
    }
  }

  async getTransactionSummary(
    userId: string,
    options: {
      startDate?: string;
      endDate?: string;
      groupBy?: 'category' | 'month' | 'account';
    }
  ): Promise<any> {
    const transactions = await this.getUserTransactions(userId, {
      startDate: options.startDate,
      endDate: options.endDate
    });

    const income = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const expenses = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);

    const categoryBreakdown: Record<string, number> = {};
    transactions.forEach(t => {
      const category = t.internalCategory || 'Other';
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + Math.abs(t.amount);
    });

    return {
      totalTransactions: transactions.length,
      totalIncome: income,
      totalExpenses: expenses,
      netIncome: income - expenses,
      categoryBreakdown,
      timeRange: {
        startDate: options.startDate,
        endDate: options.endDate
      }
    };
  }

  async updateTransactionCategory(
    transactionId: string,
    userId: string,
    category: string
  ): Promise<TransactionModel | null> {
    try {
      const docRef = db.collection('plaid_transactions').doc(transactionId);
      const doc = await docRef.get();

      if (!doc.exists || doc.data()?.userId !== userId) {
        return null;
      }

      const updateData = { internalCategory: category, updatedAt: new Date() };
      const encryptedData = encryptFinancialData(updateData);
      await docRef.update(encryptedData);

      const existingData = decryptFinancialData(doc.data()!);
      return { id: transactionId, ...existingData, ...updateData };
    } catch (error) {
      throw error;
    }
  }

  async updateTransactionVisibility(
    transactionId: string,
    userId: string,
    isHidden: boolean
  ): Promise<TransactionModel | null> {
    try {
      const docRef = db.collection('plaid_transactions').doc(transactionId);
      const doc = await docRef.get();

      if (!doc.exists || doc.data()?.userId !== userId) {
        return null;
      }

      const updateData = { isHidden, updatedAt: new Date() };
      const encryptedData = encryptFinancialData(updateData);
      await docRef.update(encryptedData);

      const existingData = decryptFinancialData(doc.data()!);
      return { id: transactionId, ...existingData, ...updateData };
    } catch (error) {
      throw error;
    }
  }

  async getUserSyncLogs(userId: string, limit = 10): Promise<SyncLogModel[]> {
    try {
      const snapshot = await db.collection('sync_logs')
        .where('userId', '==', userId)
        .orderBy('startedAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data } as SyncLogModel;
      });
    } catch (error) {
      return [];
    }
  }

  async createSyncLog(
    userId: string,
    bankConnectionId: string,
    syncType: 'manual' | 'automatic' | 'initial'
  ): Promise<string> {
    const syncLog: Omit<SyncLogModel, 'id'> = {
      userId,
      bankConnectionId,
      syncType,
      status: 'pending',
      startedAt: new Date(),
      transactionsAdded: 0,
      transactionsUpdated: 0,
      errors: []
    };

    const docRef = await db.collection('sync_logs').add(syncLog);
    return docRef.id;
  }

  async updateSyncLog(
    syncLogId: string,
    updates: Partial<SyncLogModel>
  ): Promise<void> {
    await db.collection('sync_logs').doc(syncLogId).update({
      ...updates,
      completedAt: updates.status === 'completed' || updates.status === 'failed' ? new Date() : undefined
    });
  }

  /**
   * Process rewards for a Plaid transaction if it's mapped to a credit card
   */
  private async processRewardsForTransaction(
    plaidTransaction: TransactionModel,
    accountMappings: Map<string, { accountType: 'bank' | 'credit'; creditCardId?: string }>,
    userId: string
  ): Promise<void> {
    try {
      const mapping = accountMappings.get(plaidTransaction.accountId);
      
      if (mapping && mapping.accountType === 'credit' && mapping.creditCardId) {
        // Convert to manual transaction format
        const manualTransaction = this.plaidAdapter.convertToManualTransaction(
          plaidTransaction,
          'credit',
          mapping.creditCardId
        );

        // Process rewards and bonuses
        await this.rewardService.processTransactionRewards(
          manualTransaction,
          mapping.creditCardId
        );

        // Update budget spending
        await this.rewardService.updateBudgetSpending(manualTransaction, userId);

        auditLog({
          event: 'plaid_transaction_rewards_processed',
          userId,
          ip: 'server',
          userAgent: 'server',
          timestamp: new Date(),
          details: { 
            transactionId: plaidTransaction.id, 
            creditCardId: mapping.creditCardId,
            category: manualTransaction.category,
            amount: manualTransaction.amount
          }
        });
      }
    } catch (error) {
      console.error('Error processing rewards for transaction:', error);
      // Don't throw - transaction should still be saved even if reward processing fails
    }
  }
}