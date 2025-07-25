import { useMemo } from 'react';
import { useFirestore } from '@/hooks/useFirestore';
import { Transaction } from '@/types';

export const useAccountBalance = () => {
  const { documents: transactions } = useFirestore<Transaction>('transactions');
  
  const calculateAccountBalance = useMemo(() => {
    return (accountId: string, accountType: 'bank' | 'credit', initialBalance: number = 0) => {
      const accountTransactions = transactions.filter(
        t => t.accountId === accountId && t.accountType === accountType
      );
      
      let balance = initialBalance;
      
      accountTransactions.forEach(transaction => {
        if (accountType === 'bank') {
          // Bank account logic: income increases balance, expenses decrease balance
          if (transaction.type === 'income') {
            balance += transaction.amount;
          } else if (transaction.type === 'expense') {
            balance -= transaction.amount;
          }
        } else if (accountType === 'credit') {
          // Credit card logic: expenses increase balance (debt), payments decrease balance
          if (transaction.type === 'expense') {
            balance += transaction.amount;
          } else if (transaction.type === 'payment') {
            balance -= transaction.amount;
          }
        }
      });
      
      return balance;
    };
  }, [transactions]);

  const getAccountTransactionSummary = useMemo(() => {
    return (accountId: string, accountType: 'bank' | 'credit') => {
      const accountTransactions = transactions.filter(
        t => t.accountId === accountId && t.accountType === accountType
      );
      
      const totalIncome = accountTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
        
      const totalExpenses = accountTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
        
      const totalPayments = accountTransactions
        .filter(t => t.type === 'payment')
        .reduce((sum, t) => sum + t.amount, 0);
      
      return {
        totalIncome,
        totalExpenses,
        totalPayments,
        transactionCount: accountTransactions.length
      };
    };
  }, [transactions]);

  return {
    calculateAccountBalance,
    getAccountTransactionSummary
  };
};