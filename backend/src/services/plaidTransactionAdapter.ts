import { TransactionModel } from '../models/bankConnection';
import { Transaction } from '../../../src/types';

export interface PlaidToManualAdapterConfig {
  categoryMappings: CategoryMapping[];
  defaultAccountType: 'bank' | 'credit';
}

interface CategoryMapping {
  plaidCategory: string;
  internalCategory: string;
  confidence: number;
}

export class PlaidTransactionAdapter {
  private categoryMappings: CategoryMapping[] = [
    { plaidCategory: 'Food and Drink', internalCategory: 'food', confidence: 0.9 },
    { plaidCategory: 'Transportation', internalCategory: 'transportation', confidence: 0.9 },
    { plaidCategory: 'Shops', internalCategory: 'shopping', confidence: 0.8 },
    { plaidCategory: 'Recreation', internalCategory: 'entertainment', confidence: 0.8 },
    { plaidCategory: 'Healthcare', internalCategory: 'healthcare', confidence: 0.9 },
    { plaidCategory: 'Service', internalCategory: 'bills', confidence: 0.7 },
    { plaidCategory: 'Government and Non-Profit', internalCategory: 'bills', confidence: 0.9 },
    { plaidCategory: 'Travel', internalCategory: 'transportation', confidence: 0.9 },
    { plaidCategory: 'Deposit', internalCategory: 'income', confidence: 0.9 },
    { plaidCategory: 'Transfer', internalCategory: 'transfer', confidence: 0.9 }
  ];

  /**
   * Converts a Plaid TransactionModel to our manual Transaction format
   */
  convertToManualTransaction(
    plaidTransaction: TransactionModel,
    accountType: 'bank' | 'credit' = 'bank',
    creditCardId?: string
  ): Transaction {
    const category = this.mapCategory(plaidTransaction.category || []);
    const transactionType = this.determineTransactionType(plaidTransaction, accountType);

    return {
      id: plaidTransaction.id,
      userId: plaidTransaction.userId,
      date: plaidTransaction.date,
      amount: Math.abs(plaidTransaction.amount), // Normalize amount to positive
      description: plaidTransaction.name,
      category,
      subcategory: plaidTransaction.subcategory,
      accountId: creditCardId || plaidTransaction.accountId,
      accountType,
      type: transactionType,
      tags: plaidTransaction.tags || [],
      notes: plaidTransaction.notes || '',
      isRecurring: false,
      status: plaidTransaction.pending ? 'pending' : 'cleared',
      merchantName: plaidTransaction.merchantName,
      location: this.formatLocation(plaidTransaction.location),
      createdAt: plaidTransaction.createdAt.toISOString(),
      updatedAt: plaidTransaction.updatedAt.toISOString(),
      // Plaid-specific metadata
      plaidTransactionId: plaidTransaction.plaidTransactionId,
      plaidAccountId: plaidTransaction.accountId,
      bankConnectionId: plaidTransaction.bankConnectionId
    };
  }

  /**
   * Maps Plaid categories to our internal category system
   */
  private mapCategory(plaidCategories: string[]): string {
    if (!plaidCategories || plaidCategories.length === 0) {
      return 'other';
    }

    const primaryCategory = plaidCategories[0];
    const mapping = this.categoryMappings.find(m => 
      primaryCategory.toLowerCase().includes(m.plaidCategory.toLowerCase())
    );

    return mapping ? mapping.internalCategory : 'other';
  }

  /**
   * Determines transaction type based on amount and account type
   */
  private determineTransactionType(
    plaidTransaction: TransactionModel,
    accountType: 'bank' | 'credit'
  ): 'income' | 'expense' | 'transfer' | 'payment' {
    const { amount, category } = plaidTransaction;

    // For credit cards, positive amounts are charges (expenses)
    if (accountType === 'credit') {
      return amount > 0 ? 'expense' : 'payment';
    }

    // For bank accounts, negative amounts are typically income/deposits
    if (amount < 0) {
      return 'income';
    }

    // Check if it's a transfer based on category
    if (category.some(cat => cat.toLowerCase().includes('transfer'))) {
      return 'transfer';
    }

    return 'expense';
  }

  /**
   * Formats Plaid location data to our location string format
   */
  private formatLocation(location?: {
    address?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  }): string | undefined {
    if (!location) return undefined;

    const parts = [
      location.address,
      location.city,
      location.region,
      location.postalCode
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : undefined;
  }

  /**
   * Batch convert multiple Plaid transactions
   */
  convertBatchToManualTransactions(
    plaidTransactions: TransactionModel[],
    accountMappings: Map<string, { accountType: 'bank' | 'credit'; creditCardId?: string }>
  ): Transaction[] {
    return plaidTransactions.map(plaidTx => {
      const mapping = accountMappings.get(plaidTx.accountId);
      const accountType = mapping?.accountType || 'bank';
      const creditCardId = mapping?.creditCardId;

      return this.convertToManualTransaction(plaidTx, accountType, creditCardId);
    });
  }
}

// Add to Transaction type for Plaid tracking
declare module '../../../src/types' {
  interface Transaction {
    plaidTransactionId?: string;
    plaidAccountId?: string;
    bankConnectionId?: string;
  }
}