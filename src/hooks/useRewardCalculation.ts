import { useState, useEffect } from 'react';
import { CreditCard, Transaction, CreditCardBonus } from '@/types';
import { useFirestore } from './useFirestore';
import { useToast } from './use-toast';

export const useRewardCalculation = () => {
  const { updateDocument } = useFirestore<CreditCard>('creditCards');
  const { toast } = useToast();

  const calculateRewardForTransaction = (
    transaction: Transaction,
    card: CreditCard
  ): { amount: number; type: 'cashback' | 'points' | 'miles' } => {
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
  };

  const updateBonusProgress = async (
    cardId: string,
    transaction: Transaction,
    bonuses: CreditCardBonus[]
  ): Promise<CreditCardBonus[]> => {
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
  };

  const processTransactionRewards = async (
    transaction: Transaction,
    card: CreditCard
  ): Promise<void> => {
    try {
      // Calculate rewards for this transaction
      const reward = calculateRewardForTransaction(transaction, card);
      
      // Create reward history entry
      const rewardHistoryEntry = {
        id: `reward_${transaction.id}_${Date.now()}`,
        date: transaction.date,
        transactionId: transaction.id,
        category: transaction.category,
        amount: transaction.amount,
        rewardType: reward.type,
        rewardEarned: reward.amount,
        description: transaction.description
      };

      // Update bonus progress
      const updatedBonuses = await updateBonusProgress(card.id, transaction, card.bonuses || []);

      // Update card with new rewards and bonus progress
      const updatedCard: Partial<CreditCard> = {
        cashBackBalance: card.cashBackBalance + reward.amount,
        rewardHistory: [...(card.rewardHistory || []), rewardHistoryEntry],
        bonuses: updatedBonuses
      };

      await updateDocument(card.id, updatedCard);

      // Check if any bonuses were completed
      const newlyCompleted = updatedBonuses.filter(bonus => 
        bonus.status === 'completed' && 
        !(card.bonuses || []).find(oldBonus => oldBonus.id === bonus.id && oldBonus.status === 'completed')
      );

      if (newlyCompleted.length > 0) {
        toast({
          title: "Bonus Completed! 🎉",
          description: `You've met the spending requirement for ${newlyCompleted[0].title}`,
        });
      }

    } catch (error: any) {
      console.error('Error processing transaction rewards:', error);
      toast({
        title: "Error",
        description: "Failed to calculate rewards for transaction",
        variant: "destructive"
      });
    }
  };

  const getOptimalCardSuggestion = (
    amount: number,
    category: string,
    cards: CreditCard[]
  ): CreditCard | null => {
    let bestCard: CreditCard | null = null;
    let bestRewardRate = 0;

    cards.forEach(card => {
      if (!card.isActive) return;

      const categoryReward = card.categoryRewards?.[category];
      let rewardRate = 0;

      if (categoryReward) {
        switch (categoryReward.type) {
          case 'cashback':
            rewardRate = categoryReward.rate;
            break;
          case 'points':
          case 'miles':
            // Assume 1 point/mile = $0.01 for comparison (could be made configurable)
            rewardRate = categoryReward.rate * 0.01;
            break;
        }
      } else {
        rewardRate = card.rewardRate || 1;
      }

      if (rewardRate > bestRewardRate) {
        bestRewardRate = rewardRate;
        bestCard = card;
      }
    });

    return bestCard;
  };

  return {
    calculateRewardForTransaction,
    updateBonusProgress,
    processTransactionRewards,
    getOptimalCardSuggestion
  };
};