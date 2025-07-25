import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useFirestore } from '@/hooks/useFirestore';
import { useAccountBalance } from '@/hooks/useAccountBalance';
import { useAuth } from '@/hooks/useAuth';
import { BankAccount, Transaction, AccountGoal, AccountBonus } from '@/types';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Calendar, Target, Gift, Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const BankAccountDetail = () => {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { documents: accounts } = useFirestore<BankAccount>('bankAccounts');
  const { documents: transactions } = useFirestore<Transaction>('transactions');
  const { calculateAccountBalance, getAccountTransactionSummary } = useAccountBalance();

  const [account, setAccount] = useState<BankAccount | null>(null);

  useEffect(() => {
    const foundAccount = accounts.find(acc => acc.id === accountId);
    setAccount(foundAccount || null);
  }, [accounts, accountId]);

  if (!user || !account) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground">Account not found</p>
          <Button onClick={() => navigate('/accounts')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Accounts
          </Button>
        </div>
      </div>
    );
  }

  const currentBalance = calculateAccountBalance(account.id, 'bank', account.initialBalance);
  const summary = getAccountTransactionSummary(account.id, 'bank');
  const accountTransactions = transactions.filter(t => t.accountId === account.id);

  const activeGoals = account.goals?.filter(goal => goal.status === 'active') || [];
  const activeBonuses = account.bonuses?.filter(bonus => bonus.status === 'active') || [];

  const getGoalProgress = (goal: AccountGoal) => {
    if (goal.type === 'savings') {
      return Math.min((currentBalance / goal.targetAmount) * 100, 100);
    } else if (goal.type === 'balance_maintenance') {
      return currentBalance >= goal.targetAmount ? 100 : 0;
    }
    return 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/accounts')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{account.name}</h1>
            <p className="text-muted-foreground capitalize">{account.type} Account • {account.accountNumber}</p>
          </div>
        </div>
        <Button variant="outline">
          <Edit className="h-4 w-4 mr-2" />
          Edit Account
        </Button>
      </div>

      {/* Account Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">${currentBalance.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Initial: ${account.initialBalance.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">${summary.totalIncome.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">This period</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">${summary.totalExpenses.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">This period</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{summary.transactionCount}</p>
            <p className="text-sm text-muted-foreground mt-1">Total count</p>
          </CardContent>
        </Card>
      </div>

      {/* Goals & Bonuses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Goals */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Account Goals</CardTitle>
              <CardDescription>Track your savings and financial targets</CardDescription>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </CardHeader>
          <CardContent>
            {activeGoals.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No active goals</p>
                <p className="text-sm">Set savings or balance goals to track progress</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeGoals.map((goal) => {
                  const progress = getGoalProgress(goal);
                  return (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{goal.title}</p>
                          <p className="text-sm text-muted-foreground">{goal.description}</p>
                        </div>
                        <Badge variant={goal.priority === 'high' ? 'destructive' : goal.priority === 'medium' ? 'default' : 'secondary'}>
                          {goal.priority}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>${currentBalance.toLocaleString()}</span>
                          <span>${goal.targetAmount.toLocaleString()}</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{progress.toFixed(1)}% complete</span>
                          <span>Due {format(new Date(goal.endDate), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Bonuses */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Bank Bonuses</CardTitle>
              <CardDescription>Track signup bonuses and promotions</CardDescription>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Bonus
            </Button>
          </CardHeader>
          <CardContent>
            {activeBonuses.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Gift className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No active bonuses</p>
                <p className="text-sm">Track bank signup bonuses and promotions</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeBonuses.map((bonus) => (
                  <div key={bonus.id} className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{bonus.title}</p>
                        <p className="text-sm text-muted-foreground">{bonus.description}</p>
                      </div>
                      <Badge variant="secondary">${bonus.bonusAmount}</Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{bonus.progress}%</span>
                      </div>
                      <Progress value={bonus.progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{bonus.requirement}</span>
                        <span>Ends {format(new Date(bonus.endDate), 'MMM dd')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
            <CardDescription>{accountTransactions.length} transactions for this account</CardDescription>
          </div>
          <Button size="sm" variant="outline">
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {accountTransactions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No transactions found</p>
              <p className="text-sm">Transactions for this account will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accountTransactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${transaction.type === 'income' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                      {transaction.type === 'income' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(transaction.date), 'MMM dd, yyyy')}</span>
                        <Badge variant="outline" className="ml-2">{transaction.category}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${transaction.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                      {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString()}
                    </p>
                    <Badge variant="secondary" className="text-xs">{transaction.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BankAccountDetail;