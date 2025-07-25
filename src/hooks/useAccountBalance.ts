import { useMemo } from 'react';
import { useFirestore } from '@/hooks/useFirestore';
import { Transaction, BankAccount, CreditCard } from '@/types';
import { useToast } from '@/hooks/use-toast';

export const useAccountBalance = () => {
  const { documents: transactions } = useFirestore<Transaction>('transactions');
  const { documents: bankAccounts } = useFirestore<BankAccount>('bankAccounts');
  const { documents: creditCards } = useFirestore<CreditCard>('creditCards');
  const { addDocument: addTransaction } = useFirestore<Transaction>('transactions');
  const { toast } = useToast();
  
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

  // Enhanced transfer handling with dual account updates
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
      
      // Create outgoing transaction (from account)
      await addTransaction({
        date,
        amount,
        description: `Transfer to ${getAccountName(toAccountId, toAccountType)} - ${description}`,
        category: 'transfer',
        accountId: fromAccountId,
        accountType: fromAccountType,
        type: 'transfer',
        notes,
        status: 'cleared',
        transferToAccountId: toAccountId,
        transferToAccountType: toAccountType
      });
      
      // Create incoming transaction (to account)
      await addTransaction({
        date,
        amount,
        description: `Transfer from ${getAccountName(fromAccountId, fromAccountType)} - ${description}`,
        category: 'transfer',
        accountId: toAccountId,
        accountType: toAccountType,
        type: 'income',
        notes,
        status: 'cleared',
        transferFromAccountId: fromAccountId,
        transferFromAccountType: fromAccountType
      });
      
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

  // Credit card payment with dual account impact
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
      
      // Create payment transaction for credit card (reduces balance)
      await addTransaction({
        date,
        amount,
        description: `Payment from ${bankAccount.name} - ${description || 'Credit card payment'}`,
        category: 'transfer',
        accountId: creditCardId,
        accountType: 'credit',
        type: 'payment',
        status: 'cleared',
        paymentFromAccountId: fromBankAccountId
      });
      
      // Create expense transaction for bank account (reduces balance)
      await addTransaction({
        date,
        amount,
        description: `Credit card payment to ${creditCard.name} - ${description || 'Payment'}`,
        category: 'transfer',
        accountId: fromBankAccountId,
        accountType: 'bank',
        type: 'expense',
        status: 'cleared',
        paymentToAccountId: creditCardId
      });
      
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

  // Get account name helper
  const getAccountName = (accountId: string, accountType: 'bank' | 'credit') => {
    if (accountType === 'bank') {
      return bankAccounts.find(a => a.id === accountId)?.name || 'Unknown Account';
    }
    return creditCards.find(c => c.id === accountId)?.name || 'Unknown Card';
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
    calculateAccountBalance,
    getAccountTransactionSummary,
    processTransfer,
    processCreditCardPayment,
    getSuggestedTransactions,
    getSpendingVelocity,
    getAccountName
  };
};