import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useFirestore, FirebaseDocument } from '@/hooks/useFirestore';
import { useAccountBalance } from '@/hooks/useAccountBalance';
import { useToast } from '@/hooks/use-toast';
import { Transaction, BankAccount, CreditCard, DEFAULT_CATEGORIES } from '@/types';
import { Zap, Plus, Clock } from 'lucide-react';

interface Budget extends FirebaseDocument {
  name: string;
  category: string;
  amount: number;
  spent: number;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  alertThreshold: number;
  status: 'active' | 'exceeded' | 'completed';
}

interface QuickTransactionEntryProps {
  accountId?: string;
  accountType?: 'bank' | 'credit';
}

export const QuickTransactionEntry = ({ accountId, accountType }: QuickTransactionEntryProps) => {
  const { documents: bankAccounts } = useFirestore<BankAccount>('bankAccounts');
  const { documents: creditCards } = useFirestore<CreditCard>('creditCards');
  const { documents: budgets } = useFirestore<Budget>('budgets');
  const { getSuggestedTransactions, addTransactionWithBalanceUpdate } = useAccountBalance();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    budgetId: '',
    accountId: accountId || '',
    accountType: accountType || 'bank' as 'bank' | 'credit',
    type: 'expense' as 'income' | 'expense'
  });

  // Get active budgets for expenses
  const activeBudgets = budgets.filter(budget => budget.status === 'active');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const suggestedTransactions = accountId && accountType 
    ? getSuggestedTransactions(accountId, accountType)
    : [];

  const handleQuickAdd = async () => {
    if (!formData.amount || !formData.description || !formData.accountId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    
    // For expenses, check if budget is selected
    if (formData.type === 'expense' && !formData.budgetId) {
      toast({
        title: "Budget Required",
        description: "Please select a budget for expense transactions.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // For expenses, use budget's category. For income, use 'income' category
      const category = formData.type === 'expense' && formData.budgetId
        ? budgets.find(b => b.id === formData.budgetId)?.category || 'other'
        : formData.type === 'income' ? 'income' : 'other';

      await addTransactionWithBalanceUpdate({
        date: new Date().toISOString().split('T')[0],
        amount: parseFloat(formData.amount),
        description: formData.description,
        category,
        accountId: formData.accountId,
        accountType: formData.accountType,
        type: formData.type,
        status: 'cleared'
      });

      // Reset form
      setFormData({
        amount: '',
        description: '',
        budgetId: '',
        accountId: accountId || '',
        accountType: accountType || 'bank',
        type: 'expense'
      });

      toast({
        title: "Success",
        description: "Transaction added successfully!"
      });
    } catch (error) {
      console.error('Failed to add transaction:', error);
      toast({
        title: "Error",
        description: "Failed to add transaction. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuggestedTransaction = (transaction: Transaction) => {
    // Find budget by category for expenses
    const budget = transaction.type === 'expense' 
      ? budgets.find(b => b.category === transaction.category && b.status === 'active')
      : null;

    setFormData({
      amount: transaction.amount.toString(),
      description: transaction.description,
      budgetId: budget?.id || '',
      accountId: formData.accountId,
      accountType: formData.accountType,
      type: transaction.type === 'transfer' || transaction.type === 'payment' ? 'expense' : transaction.type
    });
  };

  const getAccountOptions = () => {
    if (accountId && accountType) return []; // Fixed account mode
    
    return [
      ...bankAccounts.map(acc => ({ ...acc, type: 'bank' as const })),
      ...creditCards.map(card => ({ ...card, type: 'credit' as const }))
    ];
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5" />
          Quick Transaction
        </CardTitle>
        <CardDescription>
          Add a transaction quickly with smart suggestions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Suggested Transactions */}
        {suggestedTransactions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              Recent Transactions
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedTransactions.slice(0, 3).map((transaction) => (
                <Button
                  key={transaction.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestedTransaction(transaction)}
                  className="h-auto p-2 flex flex-col items-start"
                >
                  <span className="font-medium">{transaction.description}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      ${transaction.amount}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {transaction.type === 'expense' 
                        ? budgets.find(b => b.category === transaction.category)?.name || 'No Budget'
                        : 'Income'
                      }
                    </Badge>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Entry Form */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Amount"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          />
          <Input
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
          
{formData.type === 'expense' ? (
            activeBudgets.length > 0 ? (
              <Select value={formData.budgetId} onValueChange={(value) => setFormData({ ...formData, budgetId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Budget" />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {activeBudgets.map((budget) => (
                    <SelectItem key={budget.id} value={budget.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{budget.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          ${budget.amount - budget.spent} left
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center justify-center h-10 px-3 border rounded-md bg-muted text-muted-foreground">
                No active budgets available
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-10 px-3 border rounded-md bg-muted text-muted-foreground">
              No budget needed for {formData.type}
            </div>
          )}
        </div>

        {/* Account Selection (only if not fixed) */}
        {!accountId && (
          <div className="grid grid-cols-2 gap-3">
            <Select 
              value={formData.accountType} 
              onValueChange={(value: 'bank' | 'credit') => 
                setFormData({ ...formData, accountType: value, accountId: '' })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Bank Account</SelectItem>
                <SelectItem value="credit">Credit Card</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={formData.accountId} 
              onValueChange={(value) => setFormData({ ...formData, accountId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {(formData.accountType === 'bank' ? bankAccounts : creditCards).map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button 
          onClick={handleQuickAdd}
          disabled={!formData.amount || !formData.description || !formData.accountId || isSubmitting || (formData.type === 'expense' && !formData.budgetId)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Adding...' : 'Add Transaction'}
        </Button>
      </CardContent>
    </Card>
  );
};