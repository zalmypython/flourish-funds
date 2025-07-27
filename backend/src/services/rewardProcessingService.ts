import { db } from '../config/firebase';
import { Transaction } from '../../../src/types';
import { encryptFinancialData, decryptFinancialData } from '../middleware/encryption';

interface CreditCard {
  id: string;
  userId: string;
  cashBackBalance: number;
  rewardRate?: number;
  rewardType: 'cashback' | 'points' | 'miles';
  categoryRewards?: { [category: string]: { type: 'cashback' | 'points' | 'miles'; rate: number } };
  bonuses?: CreditCardBonus[];
  rewardHistory?: RewardHistoryEntry[];
}

interface CreditCardBonus {
  id: string;
  title: string;
  spendingRequired: number;
  currentSpending: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'paid_out' | 'expired';
  category?: string;
  autoTracking: boolean;
  spendingByCategory?: { [category: string]: number };
  dateCompleted?: string;
}

interface RewardHistoryEntry {
  id: string;
  date: string;
  transactionId: string;
  category: string;
  amount: number;
  rewardType: 'cashback' | 'points' | 'miles';
  rewardEarned: number;
  description?: string;
}

export default class RewardProcessingService {
  
  /**
   * Process rewards for a transaction
   */
  async processTransactionRewards(
    transaction: Transaction,
    creditCardId: string
  ): Promise<{ rewardAmount: number; rewardType: string; bonusesUpdated: number }> {
    try {
      // Get credit card data
      const card = await this.getCreditCard(creditCardId, transaction.userId);
      if (!card) {
        throw new Error('Credit card not found');
      }

      // Calculate rewards
      const reward = this.calculateRewardForTransaction(transaction, card);

      // Update bonus progress
      const updatedBonuses = this.updateBonusProgress(transaction, card.bonuses || []);
      const bonusesCompleted = updatedBonuses.filter(b => 
        b.status === 'completed' && 
        !(card.bonuses || []).find(oldB => oldB.id === b.id && oldB.status === 'completed')
      );

      // Create reward history entry
      const rewardHistoryEntry: RewardHistoryEntry = {
        id: `reward_${transaction.id}_${Date.now()}`,
        date: transaction.date,
        transactionId: transaction.id,
        category: transaction.category,
        amount: transaction.amount,
        rewardType: reward.type,
        rewardEarned: reward.amount,
        description: transaction.description
      };

      // Update credit card
      const updatedCard = {
        cashBackBalance: card.cashBackBalance + reward.amount,
        rewardHistory: [...(card.rewardHistory || []), rewardHistoryEntry],
        bonuses: updatedBonuses
      };

      await this.updateCreditCard(creditCardId, transaction.userId, updatedCard);

      // Store transaction in unified transactions collection
      await this.storeUnifiedTransaction(transaction);

      return {
        rewardAmount: reward.amount,
        rewardType: reward.type,
        bonusesUpdated: bonusesCompleted.length
      };

    } catch (error) {
      console.error('Error processing transaction rewards:', error);
      throw error;
    }
  }

  /**
   * Calculate reward for a transaction
   */
  private calculateRewardForTransaction(
    transaction: Transaction,
    card: CreditCard
  ): { amount: number; type: 'cashback' | 'points' | 'miles' } {
    const categoryReward = card.categoryRewards?.[transaction.category];
    
    if (!categoryReward) {
      // Use default rate if no specific category reward
      return {
        amount: transaction.amount * (card.rewardRate || 0.01),
        type: card.rewardType
      };
    }

    let rewardAmount = 0;
    
    switch (categoryReward.type) {
      case 'cashback':
        rewardAmount = transaction.amount * (categoryReward.rate / 100);
        break;
      case 'points':
      case 'miles':
        rewardAmount = transaction.amount * categoryReward.rate;
        break;
    }

    return {
      amount: rewardAmount,
      type: categoryReward.type
    };
  }

  /**
   * Update bonus progress
   */
  private updateBonusProgress(
    transaction: Transaction,
    bonuses: CreditCardBonus[]
  ): CreditCardBonus[] {
    return bonuses.map(bonus => {
      if (!bonus.autoTracking || bonus.status === 'completed' || bonus.status === 'expired') {
        return bonus;
      }

      let shouldUpdateProgress = false;
      let spendingToAdd = 0;

      // Check if transaction qualifies for this bonus
      if (!bonus.category || bonus.category === transaction.category) {
        shouldUpdateProgress = true;
        spendingToAdd = transaction.amount;
      }

      if (shouldUpdateProgress) {
        const newCurrentSpending = bonus.currentSpending + spendingToAdd;
        const newStatus = newCurrentSpending >= bonus.spendingRequired 
          ? 'completed' 
          : bonus.currentSpending === 0 
            ? 'in_progress' 
            : bonus.status;

        return {
          ...bonus,
          currentSpending: newCurrentSpending,
          status: newStatus,
          spendingByCategory: {
            ...bonus.spendingByCategory,
            [transaction.category]: (bonus.spendingByCategory?.[transaction.category] || 0) + spendingToAdd
          },
          ...(newStatus === 'completed' && { dateCompleted: new Date().toISOString().split('T')[0] })
        };
      }

      return bonus;
    });
  }

  /**
   * Get credit card data
   */
  private async getCreditCard(creditCardId: string, userId: string): Promise<CreditCard | null> {
    try {
      const doc = await db.collection('creditCards').doc(creditCardId).get();
      
      if (!doc.exists || doc.data()?.userId !== userId) {
        return null;
      }

      const data = decryptFinancialData(doc.data()!);
      return { id: doc.id, ...data } as CreditCard;
    } catch (error) {
      console.error('Error fetching credit card:', error);
      return null;
    }
  }

  /**
   * Update credit card data
   */
  private async updateCreditCard(
    creditCardId: string,
    userId: string,
    updates: Partial<CreditCard>
  ): Promise<void> {
    const docRef = db.collection('creditCards').doc(creditCardId);
    const doc = await docRef.get();

    if (!doc.exists || doc.data()?.userId !== userId) {
      throw new Error('Credit card not found or access denied');
    }

    const encryptedData = encryptFinancialData(updates);
    await docRef.update(encryptedData);
  }

  /**
   * Store transaction in unified transactions collection
   */
  private async storeUnifiedTransaction(transaction: Transaction): Promise<void> {
    try {
      const encryptedData = encryptFinancialData(transaction);
      await db.collection('transactions').doc(transaction.id).set(encryptedData);
    } catch (error) {
      console.error('Error storing unified transaction:', error);
      // Don't throw here - reward processing should continue even if unified storage fails
    }
  }

  /**
   * Update budget spending based on transaction
   */
  async updateBudgetSpending(
    transaction: Transaction,
    userId: string
  ): Promise<void> {
    try {
      // Get budgets for the user
      const budgetsSnapshot = await db.collection('budgets')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get();

      for (const budgetDoc of budgetsSnapshot.docs) {
        const budget = decryptFinancialData(budgetDoc.data());
        
        // Check if transaction category matches budget category
        if (budget.category === transaction.category) {
          const currentSpent = budget.spent || 0;
          const newSpent = currentSpent + transaction.amount;
          
          const updates = {
            spent: newSpent,
            updatedAt: new Date()
          };

          const encryptedUpdates = encryptFinancialData(updates);
          await budgetDoc.ref.update(encryptedUpdates);
        }
      }
    } catch (error) {
      console.error('Error updating budget spending:', error);
      // Don't throw - this is a secondary operation
    }
  }
}