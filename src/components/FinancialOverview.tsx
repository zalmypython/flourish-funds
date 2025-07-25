import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useFirestore, FirebaseDocument } from '@/hooks/useFirestore';
import { useAccountBalance } from '@/hooks/useAccountBalance';
import { Transaction, BankAccount, CreditCard } from '@/types';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Calendar,
  DollarSign,
  CreditCard as CreditCardIcon,
  Landmark,
  Target,
  Eye,
  EyeOff
} from 'lucide-react';

interface FinancialOverviewProps {
  showAmounts?: boolean;
  onToggleAmounts?: () => void;
}

export const FinancialOverview = ({ 
  showAmounts = true, 
  onToggleAmounts 
}: FinancialOverviewProps) => {
  const { documents: transactions } = useFirestore<Transaction>('transactions');
  const { documents: bankAccounts } = useFirestore<BankAccount>('bankAccounts');
  const { documents: creditCards } = useFirestore<CreditCard>('creditCards');
  const { calculateAccountBalance } = useAccountBalance();

  // Calculate total balances
  const totalBankBalance = bankAccounts.reduce((sum, account) => {
    return sum + calculateAccountBalance(account.id, 'bank', account.initialBalance);
  }, 0);

  const totalCreditBalance = creditCards.reduce((sum, card) => {
    return sum + calculateAccountBalance(card.id, 'credit', card.initialBalance);
  }, 0);

  const totalCreditLimit = creditCards.reduce((sum, card) => sum + card.limit, 0);
  const availableCredit = totalCreditLimit - totalCreditBalance;
  const overallUtilization = totalCreditLimit > 0 ? (totalCreditBalance / totalCreditLimit) * 100 : 0;

  // Monthly stats
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const monthlyIncome = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpenses = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netCashFlow = monthlyIncome - monthlyExpenses;

  // Alert conditions
  const lowBalanceAccounts = bankAccounts.filter(account => {
    const balance = calculateAccountBalance(account.id, 'bank', account.initialBalance);
    return balance < 1000; // Alert if balance below $1000
  });

  const highUtilizationCards = creditCards.filter(card => {
    const balance = calculateAccountBalance(card.id, 'credit', card.initialBalance);
    const utilization = (balance / card.limit) * 100;
    return utilization > 70; // Alert if utilization above 70%
  });

  const formatAmount = (amount: number) => {
    return showAmounts ? `$${amount.toLocaleString()}` : '••••••';
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization < 30) return 'text-success';
    if (utilization < 70) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="space-y-6">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Financial Overview</h2>
          <p className="text-muted-foreground">Your complete financial picture</p>
        </div>
        {onToggleAmounts && (
          <Button variant="outline" size="sm" onClick={onToggleAmounts}>
            {showAmounts ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Main Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(totalBankBalance - totalCreditBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Assets minus debts
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Available</CardTitle>
            <Landmark className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatAmount(totalBankBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              {bankAccounts.length} bank accounts
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Available</CardTitle>
            <CreditCardIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatAmount(availableCredit)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatAmount(totalCreditLimit)} total limit
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cash Flow</CardTitle>
            {netCashFlow >= 0 ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-success' : 'text-destructive'}`}>
              {netCashFlow >= 0 ? '+' : ''}{formatAmount(Math.abs(netCashFlow))}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Credit Utilization Overview */}
      {creditCards.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCardIcon className="h-5 w-5" />
              Credit Utilization
            </CardTitle>
            <CardDescription>Overall credit usage across all cards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Overall Utilization</span>
                  <span className={`text-sm font-bold ${getUtilizationColor(overallUtilization)}`}>
                    {overallUtilization.toFixed(1)}%
                  </span>
                </div>
                <Progress value={overallUtilization} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{formatAmount(totalCreditBalance)} used</span>
                  <span>{formatAmount(totalCreditLimit)} total</span>
                </div>
              </div>
              
              {highUtilizationCards.length > 0 && (
                <div className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">
                    {highUtilizationCards.length} card(s) with high utilization
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {(lowBalanceAccounts.length > 0 || highUtilizationCards.length > 0) && (
        <Card className="shadow-card border-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Account Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowBalanceAccounts.map(account => {
              const balance = calculateAccountBalance(account.id, 'bank', account.initialBalance);
              return (
                <div key={account.id} className="flex items-center justify-between p-3 bg-warning/10 rounded-lg">
                  <div>
                    <p className="font-medium">{account.name}</p>
                    <p className="text-sm text-muted-foreground">Low balance warning</p>
                  </div>
                  <Badge variant="outline" className="text-warning border-warning">
                    {formatAmount(balance)}
                  </Badge>
                </div>
              );
            })}
            
            {highUtilizationCards.map(card => {
              const balance = calculateAccountBalance(card.id, 'credit', card.initialBalance);
              const utilization = (balance / card.limit) * 100;
              return (
                <div key={card.id} className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                  <div>
                    <p className="font-medium">{card.name}</p>
                    <p className="text-sm text-muted-foreground">High utilization</p>
                  </div>
                  <Badge variant="outline" className="text-destructive border-destructive">
                    {utilization.toFixed(1)}%
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Monthly Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatAmount(monthlyIncome)}
            </div>
            <p className="text-sm text-muted-foreground">
              {monthlyTransactions.filter(t => t.type === 'income').length} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Monthly Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatAmount(monthlyExpenses)}
            </div>
            <p className="text-sm text-muted-foreground">
              {monthlyTransactions.filter(t => t.type === 'expense').length} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Savings Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {monthlyIncome > 0 ? ((netCashFlow / monthlyIncome) * 100).toFixed(1) : '0.0'}%
            </div>
            <p className="text-sm text-muted-foreground">
              Of monthly income
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};