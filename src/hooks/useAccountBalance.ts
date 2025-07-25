import { useMemo } from 'react';
import { useFirestore } from '@/hooks/useFirestore';
import { Transaction, BankAccount, CreditCard } from '@/types';
import { useToast } from '@/hooks/use-toast';

export const useAccountBalance = () => {
  const transactionHook = useFirestore<Transaction>('transactions');
  const bankAccountsHook = useFirestore<BankAccount>('bankAccounts');
  const creditCardsHook = useFirestore<CreditCard>('creditCards');
  
  const { documents: transactions, addDocument: addTransaction } = transactionHook;
  const { documents: bankAccounts, updateDocument: updateBankAccount } = bankAccountsHook;
  const { documents: creditCards, updateDocument: updateCreditCard } = creditCardsHook;
  const { toast } = useToast();
  
  // Get cached balance - primary method for displaying balances
  const getCachedBalance = (accountId: string, accountType: 'bank' | 'credit') => {
    if (accountType === 'bank') {
      const account = bankAccounts.find(a => a.id === accountId);
      return account?.currentBalance ?? account?.initialBalance ?? 0;
    } else {
      const card = creditCards.find(c => c.id === accountId);
      return card?.currentBalance ?? card?.initialBalance ?? 0;
    }
  };

  // Calculate real-time balance from transactions (used for balance updates)
  const calculateAccountBalance = useMemo(() => {
    return (accountId: string, accountType: 'bank' | 'credit', initialBalance: number = 0) => {
      const accountTransactions = transactions.filter(
        t => t.accountId === accountId && t.accountType === accountType
      );
      
      let balance = initialBalance;
      
      accountTransactions.forEach(transaction => {
        if (accountType === 'bank') {
          // Bank account logic: income increases balance, expenses/transfers decrease balance
          if (transaction.type === 'income') {
            balance += transaction.amount;
          } else if (transaction.type === 'expense' || transaction.type === 'transfer') {
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
      
      return Math.round(balance * 100) / 100; // Round to 2 decimal places
    };
  }, [transactions]);

  // Update cached balance after transaction changes
  const updateAccountBalance = async (accountId: string, accountType: 'bank' | 'credit') => {
    try {
      if (accountType === 'bank') {
        const account = bankAccounts.find(a => a.id === accountId);
        if (account) {
          const newBalance = calculateAccountBalance(accountId, accountType, account.initialBalance);
          await updateBankAccount(accountId, {
            currentBalance: newBalance,
            lastBalanceUpdate: new Date().toISOString(),
            lastTransactionDate: new Date().toISOString()
          });
        }
      } else {
        const card = creditCards.find(c => c.id === accountId);
        if (card) {
          const newBalance = calculateAccountBalance(accountId, accountType, card.initialBalance);
          await updateCreditCard(accountId, {
            currentBalance: newBalance,
            lastBalanceUpdate: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error updating account balance:', error);
    }
  };

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

  // Simplified transfer handling with single transaction
  const processTransfer = async (
    fromAccountId: string,
    fromAccountType: 'bank' | 'credit',
    toAccountId: string,
    toAccountType: 'bank' | 'credit',
    amount: number,
    description: string,
    notes?: string
  ) => {
    try {
      const date = new Date().toISOString().split('T')[0];
      
      // Create single transfer transaction
      await addTransaction({
        date,
        amount,
        description: `Transfer: ${getAccountName(fromAccountId, fromAccountType)} → ${getAccountName(toAccountId, toAccountType)} - ${description}`,
        category: 'transfer',
        accountId: fromAccountId,
        accountType: fromAccountType,
        type: 'transfer',
        notes,
        status: 'cleared',
        fromAccountId,
        fromAccountType,
        toAccountId,
        toAccountType
      });

      // Update balances for both accounts
      await Promise.all([
        updateAccountBalance(fromAccountId, fromAccountType),
        updateAccountBalance(toAccountId, toAccountType)
      ]);
      
      toast({
        title: "Transfer Completed",
        description: `$${amount.toLocaleString()} transferred successfully`
      });
    } catch (error: any) {
      toast({
        title: "Transfer Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Credit card payment with single transaction
  const processCreditCardPayment = async (
    creditCardId: string,
    fromBankAccountId: string,
    amount: number,
    description?: string
  ) => {
    try {
      const date = new Date().toISOString().split('T')[0];
      const creditCard = creditCards.find(c => c.id === creditCardId);
      const bankAccount = bankAccounts.find(a => a.id === fromBankAccountId);
      
      if (!creditCard || !bankAccount) {
        throw new Error('Account not found');
      }
      
      // Create single payment transaction
      await addTransaction({
        date,
        amount,
        description: `Payment: ${bankAccount.name} → ${creditCard.name} - ${description || 'Credit card payment'}`,
        category: 'transfer',
        accountId: fromBankAccountId,
        accountType: 'bank',
        type: 'transfer',
        status: 'cleared',
        fromAccountId: fromBankAccountId,
        fromAccountType: 'bank',
        toAccountId: creditCardId,
        toAccountType: 'credit'
      });

      // Update balances for both accounts
      await Promise.all([
        updateAccountBalance(fromBankAccountId, 'bank'),
        updateAccountBalance(creditCardId, 'credit')
      ]);
      
      toast({
        title: "Payment Processed",
        description: `$${amount.toLocaleString()} payment to ${creditCard.name}`
      });
    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Enhanced transaction processor that updates balances
  const addTransactionWithBalanceUpdate = async (transactionData: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    try {
      await addTransaction(transactionData);
      
      // Update primary account balance
      await updateAccountBalance(transactionData.accountId, transactionData.accountType);
      
      // Update secondary account balance if this is a transfer
      if (transactionData.toAccountId && transactionData.toAccountType) {
        await updateAccountBalance(transactionData.toAccountId, transactionData.toAccountType);
      }
    } catch (error: any) {
      toast({
        title: "Transaction Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Get account name helper
  const getAccountName = (accountId: string, accountType: 'bank' | 'credit') => {
    if (accountType === 'bank') {
      return bankAccounts.find(a => a.id === accountId)?.name || 'Unknown Account';
    }
    return creditCards.find(c => c.id === accountId)?.name || 'Unknown Card';
  };

  // Get all transactions with enhanced filtering
  const getAllTransactions = () => {
    return transactions.map(transaction => ({
      ...transaction,
      accountName: getAccountName(transaction.accountId, transaction.accountType),
      fromAccountName: transaction.fromAccountId ? getAccountName(transaction.fromAccountId, transaction.fromAccountType || 'bank') : undefined,
      toAccountName: transaction.toAccountId ? getAccountName(transaction.toAccountId, transaction.toAccountType || 'bank') : undefined
    }));
  };

  // Get suggested transactions based on history
  const getSuggestedTransactions = (accountId: string, accountType: 'bank' | 'credit') => {
    const accountTransactions = transactions.filter(
      t => t.accountId === accountId && t.accountType === accountType
    );
    
    // Group by description and get most frequent
    const frequentTransactions = accountTransactions
      .reduce((acc, t) => {
        const key = t.description.toLowerCase();
        acc[key] = acc[key] || { ...t, count: 0 };
        acc[key].count++;
        return acc;
      }, {} as Record<string, Transaction & { count: number }>);
    
    return Object.values(frequentTransactions)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(({ count, ...transaction }) => transaction);
  };

  // Calculate spending velocity (daily average)
  const getSpendingVelocity = (accountId: string, accountType: 'bank' | 'credit', days: number = 30) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentTransactions = transactions.filter(t => 
      t.accountId === accountId && 
      t.accountType === accountType &&
      new Date(t.date) >= cutoffDate &&
      (t.type === 'expense' || (accountType === 'bank' && t.type === 'transfer'))
    );
    
    const totalSpent = recentTransactions.reduce((sum, t) => sum + t.amount, 0);
    return totalSpent / days;
  };

  return {
    getCachedBalance,
    calculateAccountBalance,
    updateAccountBalance,
    addTransactionWithBalanceUpdate,
    getAccountTransactionSummary,
    processTransfer,
    processCreditCardPayment,
    getSuggestedTransactions,
    getSpendingVelocity,
    getAccountName,
    getAllTransactions
  };
};