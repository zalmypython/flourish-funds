import { TransactionModel, SyncLogModel } from '../models/bankConnection';
import { PlaidTransaction } from './plaidService';

interface CategoryMapping {
  plaidCategory: string;
  internalCategory: string;
  confidence: number;
}

class TransactionService {
  private transactions: Map<string, TransactionModel> = new Map();
  private syncLogs: Map<string, SyncLogModel> = new Map();
  
  // Category mappings from Plaid categories to our internal categories
  private categoryMappings: CategoryMapping[] = [
    { plaidCategory: 'Food and Drink', internalCategory: 'dining', confidence: 0.9 },
    { plaidCategory: 'Restaurants', internalCategory: 'dining', confidence: 0.95 },
    { plaidCategory: 'Groceries', internalCategory: 'groceries', confidence: 0.9 },
    { plaidCategory: 'Gas Stations', internalCategory: 'transportation', confidence: 0.9 },
    { plaidCategory: 'Transportation', internalCategory: 'transportation', confidence: 0.8 },
    { plaidCategory: 'Shopping', internalCategory: 'shopping', confidence: 0.7 },
    { plaidCategory: 'Entertainment', internalCategory: 'entertainment', confidence: 0.8 },
    { plaidCategory: 'Healthcare', internalCategory: 'healthcare', confidence: 0.9 },
    { plaidCategory: 'Bills', internalCategory: 'bills', confidence: 0.9 },
    { plaidCategory: 'Transfer', internalCategory: 'transfer', confidence: 0.95 },
    { plaidCategory: 'Deposit', internalCategory: 'income', confidence: 0.9 },
    { plaidCategory: 'Payroll', internalCategory: 'income', confidence: 0.95 },
  ];

  // Process and store transactions from Plaid
  async processTransactions(
    userId: string,
    bankConnectionId: string,
    plaidTransactions: PlaidTransaction[]
  ): Promise<{
    added: TransactionModel[];
    updated: TransactionModel[];
    errors: string[];
  }> {
    const added: TransactionModel[] = [];
    const updated: TransactionModel[] = [];
    const errors: string[] = [];

    for (const plaidTx of plaidTransactions) {
      try {
        const existingTransaction = this.findTransactionByPlaidId(plaidTx.transactionId);
        
        if (existingTransaction) {
          // Update existing transaction
          const updatedTransaction = await this.updateTransaction(existingTransaction.id, plaidTx);
          if (updatedTransaction) {
            updated.push(updatedTransaction);
          }
        } else {
          // Create new transaction
          const newTransaction = await this.createTransaction(userId, bankConnectionId, plaidTx);
          if (newTransaction) {
            added.push(newTransaction);
          }
        }
      } catch (error) {
        errors.push(`Failed to process transaction ${plaidTx.transactionId}: ${error}`);
      }
    }

    return { added, updated, errors };
  }

  // Create new transaction from Plaid data
  private async createTransaction(
    userId: string,
    bankConnectionId: string,
    plaidTx: PlaidTransaction
  ): Promise<TransactionModel | null> {
    try {
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const internalCategory = this.mapCategory(plaidTx.category);
      
      const transaction: TransactionModel = {
        id: transactionId,
        userId,
        bankConnectionId,
        plaidTransactionId: plaidTx.transactionId,
        accountId: plaidTx.accountId,
        amount: plaidTx.amount,
        date: plaidTx.date,
        name: plaidTx.name,
        merchantName: plaidTx.merchantName,
        category: plaidTx.category,
        subcategory: plaidTx.subcategory,
        internalCategory,
        pending: plaidTx.pending,
        location: plaidTx.location,
        createdAt: new Date(),
        updatedAt: new Date(),
        isHidden: false,
        isDeleted: false,
      };

      this.transactions.set(transactionId, transaction);
      return transaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      return null;
    }
  }

  // Update existing transaction
  private async updateTransaction(
    transactionId: string,
    plaidTx: PlaidTransaction
  ): Promise<TransactionModel | null> {
    try {
      const existingTransaction = this.transactions.get(transactionId);
      if (!existingTransaction) {
        return null;
      }

      const updatedTransaction: TransactionModel = {
        ...existingTransaction,
        amount: plaidTx.amount,
        name: plaidTx.name,
        merchantName: plaidTx.merchantName,
        category: plaidTx.category,
        subcategory: plaidTx.subcategory,
        pending: plaidTx.pending,
        location: plaidTx.location,
        updatedAt: new Date(),
      };

      this.transactions.set(transactionId, updatedTransaction);
      return updatedTransaction;
    } catch (error) {
      console.error('Error updating transaction:', error);
      return null;
    }
  }

  // Map Plaid categories to internal categories
  private mapCategory(plaidCategories: string[]): string {
    if (!plaidCategories || plaidCategories.length === 0) {
      return 'other';
    }

    // Try to find the best match
    for (const category of plaidCategories) {
      const mapping = this.categoryMappings.find(m => 
        category.toLowerCase().includes(m.plaidCategory.toLowerCase()) ||
        m.plaidCategory.toLowerCase().includes(category.toLowerCase())
      );
      
      if (mapping) {
        return mapping.internalCategory;
      }
    }

    // Default fallback based on primary category
    const primaryCategory = plaidCategories[0].toLowerCase();
    if (primaryCategory.includes('food') || primaryCategory.includes('restaurant')) {
      return 'dining';
    } else if (primaryCategory.includes('gas') || primaryCategory.includes('transport')) {
      return 'transportation';
    } else if (primaryCategory.includes('shop') || primaryCategory.includes('retail')) {
      return 'shopping';
    } else if (primaryCategory.includes('transfer') || primaryCategory.includes('payment')) {
      return 'transfer';
    } else if (primaryCategory.includes('deposit') || primaryCategory.includes('income')) {
      return 'income';
    }

    return 'other';
  }

  // Find transaction by Plaid ID
  private findTransactionByPlaidId(plaidTransactionId: string): TransactionModel | undefined {
    for (const transaction of this.transactions.values()) {
      if (transaction.plaidTransactionId === plaidTransactionId) {
        return transaction;
      }
    }
    return undefined;
  }

  // Get user transactions
  getUserTransactions(
    userId: string,
    options: {
      bankConnectionId?: string;
      accountId?: string;
      category?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
      includeHidden?: boolean;
    } = {}
  ): TransactionModel[] {
    let userTransactions: TransactionModel[] = [];
    
    for (const transaction of this.transactions.values()) {
      if (transaction.userId !== userId) continue;
      if (!options.includeHidden && transaction.isHidden) continue;
      if (transaction.isDeleted) continue;
      
      // Apply filters
      if (options.bankConnectionId && transaction.bankConnectionId !== options.bankConnectionId) continue;
      if (options.accountId && transaction.accountId !== options.accountId) continue;
      if (options.category && transaction.internalCategory !== options.category) continue;
      if (options.startDate && transaction.date < options.startDate) continue;
      if (options.endDate && transaction.date > options.endDate) continue;
      
      userTransactions.push(transaction);
    }

    // Sort by date (newest first)
    userTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Apply pagination
    if (options.offset) {
      userTransactions = userTransactions.slice(options.offset);
    }
    if (options.limit) {
      userTransactions = userTransactions.slice(0, options.limit);
    }

    return userTransactions;
  }

  // Get transaction summary
  getTransactionSummary(
    userId: string,
    options: {
      bankConnectionId?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): {
    totalTransactions: number;
    totalIncome: number;
    totalExpenses: number;
    categorySummary: { [category: string]: number };
    monthlyTrend: { month: string; income: number; expenses: number }[];
  } {
    const transactions = this.getUserTransactions(userId, options);
    
    let totalIncome = 0;
    let totalExpenses = 0;
    const categorySummary: { [category: string]: number } = {};
    const monthlyData: { [month: string]: { income: number; expenses: number } } = {};

    for (const transaction of transactions) {
      const amount = Math.abs(transaction.amount);
      const month = new Date(transaction.date).toISOString().slice(0, 7); // YYYY-MM
      
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expenses: 0 };
      }

      if (transaction.amount > 0) {
        totalIncome += amount;
        monthlyData[month].income += amount;
      } else {
        totalExpenses += amount;
        monthlyData[month].expenses += amount;
      }

      const category = transaction.internalCategory || 'other';
      categorySummary[category] = (categorySummary[category] || 0) + amount;
    }

    const monthlyTrend = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
      }));

    return {
      totalTransactions: transactions.length,
      totalIncome,
      totalExpenses,
      categorySummary,
      monthlyTrend,
    };
  }

  // Update transaction category
  async updateTransactionCategory(
    transactionId: string,
    userId: string,
    category: string
  ): Promise<TransactionModel | null> {
    const transaction = this.transactions.get(transactionId);
    
    if (!transaction || transaction.userId !== userId) {
      return null;
    }

    transaction.internalCategory = category;
    transaction.updatedAt = new Date();
    
    this.transactions.set(transactionId, transaction);
    return transaction;
  }

  // Hide/show transaction
  async updateTransactionVisibility(
    transactionId: string,
    userId: string,
    isHidden: boolean
  ): Promise<TransactionModel | null> {
    const transaction = this.transactions.get(transactionId);
    
    if (!transaction || transaction.userId !== userId) {
      return null;
    }

    transaction.isHidden = isHidden;
    transaction.updatedAt = new Date();
    
    this.transactions.set(transactionId, transaction);
    return transaction;
  }

  // Create sync log
  createSyncLog(
    userId: string,
    bankConnectionId: string,
    syncType: 'manual' | 'automatic' | 'initial'
  ): SyncLogModel {
    const logId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const syncLog: SyncLogModel = {
      id: logId,
      userId,
      bankConnectionId,
      syncType,
      status: 'pending',
      startedAt: new Date(),
      transactionsAdded: 0,
      transactionsUpdated: 0,
      errors: [],
    };

    this.syncLogs.set(logId, syncLog);
    return syncLog;
  }

  // Update sync log
  updateSyncLog(
    logId: string,
    updates: Partial<SyncLogModel>
  ): SyncLogModel | null {
    const syncLog = this.syncLogs.get(logId);
    
    if (!syncLog) {
      return null;
    }

    const updatedLog = { ...syncLog, ...updates };
    this.syncLogs.set(logId, updatedLog);
    return updatedLog;
  }

  // Get sync logs for user
  getUserSyncLogs(userId: string, limit: number = 20): SyncLogModel[] {
    const userLogs: SyncLogModel[] = [];
    
    for (const log of this.syncLogs.values()) {
      if (log.userId === userId) {
        userLogs.push(log);
      }
    }

    return userLogs
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }
}

export default TransactionService;