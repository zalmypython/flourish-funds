import { useEffect } from 'react';
import { useFirestore } from '@/hooks/useFirestore';
import { useAccountBalance } from '@/hooks/useAccountBalance';
import { BankAccount, CreditCard } from '@/types';

// Helper hook to initialize cached balances for existing accounts
export const useAccountBalanceInit = () => {
  const { documents: bankAccounts, updateDocument: updateBankAccount } = useFirestore<BankAccount>('bankAccounts');
  const { documents: creditCards, updateDocument: updateCreditCard } = useFirestore<CreditCard>('creditCards');
  const { calculateAccountBalance } = useAccountBalance();

  useEffect(() => {
    // Initialize bank account balances
    bankAccounts.forEach(async (account) => {
      if (account.currentBalance === undefined || account.lastBalanceUpdate === undefined) {
        const calculatedBalance = calculateAccountBalance(account.id, 'bank', account.initialBalance);
        await updateBankAccount(account.id, {
          currentBalance: calculatedBalance,
          lastBalanceUpdate: new Date().toISOString()
        });
      }
    });
  }, [bankAccounts, calculateAccountBalance, updateBankAccount]);

  useEffect(() => {
    // Initialize credit card balances
    creditCards.forEach(async (card) => {
      if (card.currentBalance === undefined || card.lastBalanceUpdate === undefined) {
        const calculatedBalance = calculateAccountBalance(card.id, 'credit', card.initialBalance);
        await updateCreditCard(card.id, {
          currentBalance: calculatedBalance,
          lastBalanceUpdate: new Date().toISOString()
        });
      }
    });
  }, [creditCards, calculateAccountBalance, updateCreditCard]);
};