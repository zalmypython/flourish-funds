import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useFirestore, FirebaseDocument } from '@/hooks/useFirestore';
import { useAccountBalance } from '@/hooks/useAccountBalance';
import { Transaction, BankAccount, CreditCard, DEFAULT_CATEGORIES } from '@/types';
import { Target, Plus, AlertTriangle, TrendingUp, Calendar, Clock } from 'lucide-react';

interface Budget extends FirebaseDocument {
  name: string;
  category: string;
  amount: number;
  spent: number;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  alertThreshold: number; // percentage
  status: 'active' | 'exceeded' | 'completed';
}

interface SmartBudgetIntegrationProps {
  accountId?: string;
  accountType?: 'bank' | 'credit';
}

export const SmartBudgetIntegration = ({ accountId, accountType }: SmartBudgetIntegrationProps) => {
  const { documents: transactions } = useFirestore<Transaction>('transactions');
  const { documents: budgets } = useFirestore<Budget>('budgets');
  const { addDocument: addBudget, updateDocument: updateBudget } = useFirestore<Budget>('budgets');
  const { getSpendingVelocity, calculateAccountBalance } = useAccountBalance();

  const [isCreatingBudget, setIsCreatingBudget] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    name: '',
    category: '',
    amount: '',
    period: 'monthly' as 'weekly' | 'monthly' | 'yearly',
    alertThreshold: 80
  });

  // Filter transactions by account if specified
  const accountTransactions = accountId 
    ? transactions.filter(t => t.accountId === accountId && t.accountType === accountType)
    : transactions;

  // Calculate real-time budget progress
  const getBudgetProgress = (budget: Budget) => {
    const now = new Date();
    const startDate = new Date(budget.startDate);
    const endDate = new Date(budget.endDate);
    
    // Get transactions in budget period and category
    const budgetTransactions = accountTransactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= startDate && 
             transactionDate <= endDate && 
             t.category === budget.category &&
             t.type === 'expense';
    });
    
    const spent = budgetTransactions.reduce((sum, t) => sum + t.amount, 0);
    const percentage = (spent / budget.amount) * 100;
    
    return { spent, percentage, transactions: budgetTransactions };
  };

  // Predict if budget will be exceeded
  const predictBudgetExceeded = (budget: Budget) => {
    const { spent } = getBudgetProgress(budget);
    const now = new Date();
    const endDate = new Date(budget.endDate);
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) return false;
    
    // Get daily spending velocity for this category
    const dailySpending = accountId && accountType 
      ? getSpendingVelocity(accountId, accountType, 30) 
      : spent / 30; // fallback calculation
    
    const projectedSpending = spent + (dailySpending * daysLeft);
    return projectedSpending > budget.amount;
  };

  // Get spending insights
  const getSpendingInsights = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlySpending = accountTransactions
      .filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === currentMonth && 
               date.getFullYear() === currentYear &&
               t.type === 'expense';
      })
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(monthlySpending)
      .map(([category, amount]) => ({
        category,
        amount,
        categoryName: DEFAULT_CATEGORIES.find(c => c.id === category)?.name || category
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  const handleCreateBudget = async () => {
    if (!budgetForm.name || !budgetForm.category || !budgetForm.amount) return;

    const now = new Date();
    let endDate = new Date();
    
    // Calculate end date based on period
    switch (budgetForm.period) {
      case 'weekly':
        endDate.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        endDate.setMonth(now.getMonth() + 1);
        break;
      case 'yearly':
        endDate.setFullYear(now.getFullYear() + 1);
        break;
    }

    await addBudget({
      name: budgetForm.name,
      category: budgetForm.category,
      amount: parseFloat(budgetForm.amount),
      spent: 0,
      period: budgetForm.period,
      startDate: now.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      alertThreshold: budgetForm.alertThreshold,
      status: 'active'
    });

    setBudgetForm({
      name: '',
      category: '',
      amount: '',
      period: 'monthly',
      alertThreshold: 80
    });
    setIsCreatingBudget(false);
  };

  const activeBudgets = budgets.filter(b => b.status === 'active');
  const spendingInsights = getSpendingInsights();

  return (
    <div className="space-y-6">
      {/* Smart Budget Overview */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Smart Budget Tracking
            </CardTitle>
            <CardDescription>
              Real-time budget monitoring with predictive insights
            </CardDescription>
          </div>
          <Button onClick={() => setIsCreatingBudget(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Budget
          </Button>
        </CardHeader>
        <CardContent>
          {activeBudgets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Active Budgets</h3>
              <p className="text-sm">Create your first budget to start tracking spending goals</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeBudgets.map(budget => {
                const progress = getBudgetProgress(budget);
                const willExceed = predictBudgetExceeded(budget);
                const isOverThreshold = progress.percentage >= budget.alertThreshold;
                
                return (
                  <div key={budget.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{budget.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {DEFAULT_CATEGORIES.find(c => c.id === budget.category)?.name} • {budget.period}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          ${progress.spent.toLocaleString()} / ${budget.amount.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {progress.percentage.toFixed(1)}% used
                        </p>
                      </div>
                    </div>
                    
                    <Progress 
                      value={Math.min(progress.percentage, 100)} 
                      className={`h-3 ${progress.percentage > 100 ? 'bg-destructive/20' : ''}`}
                    />
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        {isOverThreshold && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {budget.alertThreshold}% Alert
                          </Badge>
                        )}
                        {willExceed && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Projected to exceed
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Ends {new Date(budget.endDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {progress.transactions.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Recent Transactions ({progress.transactions.length})
                        </p>
                        <div className="space-y-1">
                          {progress.transactions.slice(0, 3).map(transaction => (
                            <div key={transaction.id} className="flex justify-between text-xs">
                              <span>{transaction.description}</span>
                              <span>${transaction.amount.toFixed(2)}</span>
                            </div>
                          ))}
                          {progress.transactions.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{progress.transactions.length - 3} more transactions
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spending Insights */}
      {spendingInsights.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Spending Insights
            </CardTitle>
            <CardDescription>
              Your spending patterns this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {spendingInsights.slice(0, 5).map(insight => (
                <div key={insight.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ 
                        backgroundColor: DEFAULT_CATEGORIES.find(c => c.id === insight.category)?.color || '#gray' 
                      }}
                    />
                    <span className="font-medium">{insight.categoryName}</span>
                  </div>
                  <span className="font-bold">${insight.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Budget Modal */}
      {isCreatingBudget && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Create New Budget</CardTitle>
            <CardDescription>Set spending limits and track your financial goals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Budget Name</Label>
                <Input
                  placeholder="e.g., Monthly Dining"
                  value={budgetForm.name}
                  onChange={(e) => setBudgetForm({ ...budgetForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  placeholder="500.00"
                  value={budgetForm.amount}
                  onChange={(e) => setBudgetForm({ ...budgetForm, amount: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={budgetForm.category} onValueChange={(value) => setBudgetForm({ ...budgetForm, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_CATEGORIES.filter(c => c.id !== 'income').map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Period</Label>
                <Select value={budgetForm.period} onValueChange={(value: any) => setBudgetForm({ ...budgetForm, period: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Alert Threshold ({budgetForm.alertThreshold}%)</Label>
              <Input
                type="range"
                min="50"
                max="100"
                value={budgetForm.alertThreshold}
                onChange={(e) => setBudgetForm({ ...budgetForm, alertThreshold: parseInt(e.target.value) })}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleCreateBudget}
                disabled={!budgetForm.name || !budgetForm.category || !budgetForm.amount}
              >
                Create Budget
              </Button>
              <Button variant="outline" onClick={() => setIsCreatingBudget(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};