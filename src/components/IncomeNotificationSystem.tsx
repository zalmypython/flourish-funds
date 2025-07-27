import { useEffect, useState } from 'react';
import { useIncomeSources } from '@/hooks/useIncomeSources';
import { useTransactions } from '@/hooks/useTransactions';
import { Transaction as TransactionType } from '@/types';
import { IncomeNotificationPrompt } from './IncomeNotificationPrompt';
import { useToast } from '@/hooks/use-toast';

interface IncomeNotificationSystemProps {
  children: React.ReactNode;
}

export function IncomeNotificationSystem({ children }: IncomeNotificationSystemProps) {
  const { transactions } = useTransactions();
  const { findMatchingIncomeSource, incomeSources } = useIncomeSources();
  const [pendingIncomeTransaction, setPendingIncomeTransaction] = useState<TransactionType | null>(null);
  const [processedTransactionIds] = useState(new Set<string>());
  const { toast } = useToast();

  useEffect(() => {
    const checkForNewIncomeTransactions = async () => {
      if (!transactions || transactions.length === 0) return;

      // Find recent income transactions that haven't been processed
      const recentIncomeTransactions = transactions
        .filter(transaction => 
          transaction.type === 'income' && 
          transaction.amount > 0 &&
          !processedTransactionIds.has(transaction.id) &&
          // Only check transactions from last 7 days
          new Date(transaction.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      for (const transaction of recentIncomeTransactions) {
        processedTransactionIds.add(transaction.id);

        // Check if this transaction already matches an income source
        try {
          const matchingSourceId = await findMatchingIncomeSource(transaction);
          
          if (!matchingSourceId && !pendingIncomeTransaction) {
            // No matching source found, prompt user to categorize
            const incomeTransaction: TransactionType = {
              id: transaction.id,
              userId: transaction.userId || '',
              accountId: transaction.accountId,
              accountType: transaction.accountType || 'bank',
              amount: transaction.amount,
              type: 'income',
              category: Array.isArray(transaction.category) ? transaction.category[0] || 'income' : 'income',
              description: transaction.description || transaction.name || 'Income Transaction',
              date: transaction.date,
              status: transaction.status || 'cleared',
              merchant: transaction.merchantName,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            setPendingIncomeTransaction(incomeTransaction);
            
            toast({
              title: 'Income Detected!',
              description: `New income transaction of $${transaction.amount.toLocaleString()} detected. Click to categorize.`,
              action: (
                <button 
                  onClick={() => setPendingIncomeTransaction(incomeTransaction)}
                  className="text-sm underline"
                >
                  Categorize
                </button>
              ),
            });
            break; // Only show one notification at a time
          } else if (matchingSourceId) {
            // Automatically link to existing source
            const matchingSource = incomeSources.find(s => s.id === matchingSourceId);
            if (matchingSource) {
              toast({
                title: 'Income Categorized',
                description: `$${transaction.amount.toLocaleString()} automatically linked to ${matchingSource.name}`,
              });
            }
          }
        } catch (error) {
          console.error('Error checking income transaction:', error);
        }
      }
    };

    // Check for new income transactions every 30 seconds
    const interval = setInterval(checkForNewIncomeTransactions, 30000);
    
    // Also check immediately
    checkForNewIncomeTransactions();

    return () => clearInterval(interval);
  }, [transactions, findMatchingIncomeSource, incomeSources, pendingIncomeTransaction, processedTransactionIds, toast]);

  return (
    <>
      {children}
      
      {pendingIncomeTransaction && (
        <IncomeNotificationPrompt
          open={!!pendingIncomeTransaction}
          onOpenChange={() => setPendingIncomeTransaction(null)}
          transaction={pendingIncomeTransaction}
          onComplete={() => {
            setPendingIncomeTransaction(null);
            toast({
              title: 'Income Categorized',
              description: 'Transaction has been successfully categorized.',
            });
          }}
        />
      )}
    </>
  );
}