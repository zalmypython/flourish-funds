import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useFirestore } from '@/hooks/useFirestore';
import { useAccountBalance } from '@/hooks/useAccountBalance';
import { BankAccount, CreditCard, Transaction } from '@/types';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, DollarSign, CreditCard as CreditCardIcon } from 'lucide-react';

export const FinancialHealthDashboard = () => {
  const { documents: bankAccounts } = useFirestore<BankAccount>('bankAccounts');
  const { documents: creditCards } = useFirestore<CreditCard>('creditCards');
  const { documents: transactions } = useFirestore<Transaction>('transactions');
  const { calculateAccountBalance } = useAccountBalance();

  // Calculate total net worth
  const totalBankBalance = bankAccounts.reduce((sum, account) => 
    sum + calculateAccountBalance(account.id, 'bank', account.initialBalance), 0
  );

  const totalCreditBalance = creditCards.reduce((sum, card) => 
    sum + calculateAccountBalance(card.id, 'credit', 0), 0
  );

  const netWorth = totalBankBalance - Math.abs(totalCreditBalance);

  // Calculate monthly income/expenses
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate.getMonth() === currentMonth && 
           transactionDate.getFullYear() === currentYear;
  });

  const monthlyIncome = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpenses = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlySavings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

  // Calculate credit utilization
  const totalCreditLimit = creditCards.reduce((sum, card) => sum + (card.limit || 0), 0);
  const totalCreditUsed = Math.abs(totalCreditBalance);
  const creditUtilization = totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0;

  // Financial health score calculation
  const getFinancialHealthScore = () => {
    let score = 0;
    
    // Savings rate (40 points max)
    if (savingsRate >= 20) score += 40;
    else if (savingsRate >= 10) score += 30;
    else if (savingsRate >= 5) score += 20;
    else if (savingsRate > 0) score += 10;

    // Credit utilization (30 points max)
    if (creditUtilization <= 10) score += 30;
    else if (creditUtilization <= 30) score += 20;
    else if (creditUtilization <= 50) score += 10;

    // Emergency fund (30 points max)
    const emergencyFundTarget = monthlyExpenses * 3;
    if (totalBankBalance >= emergencyFundTarget) score += 30;
    else if (totalBankBalance >= emergencyFundTarget * 0.5) score += 20;
    else if (totalBankBalance >= emergencyFundTarget * 0.25) score += 10;

    return Math.min(score, 100);
  };

  const healthScore = getFinancialHealthScore();

  const getHealthStatus = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'success', icon: CheckCircle };
    if (score >= 60) return { label: 'Good', color: 'default', icon: TrendingUp };
    if (score >= 40) return { label: 'Fair', color: 'secondary', icon: TrendingDown };
    return { label: 'Needs Attention', color: 'destructive', icon: AlertTriangle };
  };

  const healthStatus = getHealthStatus(healthScore);

  return (
    <div className="space-y-6">
      {/* Financial Health Score */}
      <Card className="shadow-card bg-gradient-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <healthStatus.icon className="h-5 w-5" />
            Financial Health Score
          </CardTitle>
          <CardDescription className="text-white/80">
            Overall assessment of your financial wellbeing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">{healthScore}</div>
              <Badge variant="secondary" className="text-sm">
                {healthStatus.label}
              </Badge>
            </div>
            <Progress value={healthScore} className="h-3 bg-white/20" />
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Net Worth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${netWorth >= 0 ? 'text-success' : 'text-destructive'}`}>
              ${netWorth.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">
              Total assets minus debt
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Savings Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${savingsRate >= 20 ? 'text-success' : savingsRate >= 10 ? 'text-warning' : 'text-destructive'}`}>
              {savingsRate.toFixed(1)}%
            </p>
            <p className="text-sm text-muted-foreground">
              ${monthlySavings.toLocaleString()} saved this month
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCardIcon className="h-4 w-4" />
              Credit Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${creditUtilization <= 30 ? 'text-success' : creditUtilization <= 50 ? 'text-warning' : 'text-destructive'}`}>
              {creditUtilization.toFixed(1)}%
            </p>
            <p className="text-sm text-muted-foreground">
              ${totalCreditUsed.toLocaleString()} of ${totalCreditLimit.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Monthly Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-success">Income</span>
                <span className="font-medium">${monthlyIncome.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-destructive">Expenses</span>
                <span className="font-medium">${monthlyExpenses.toLocaleString()}</span>
              </div>
              <div className="pt-1 border-t">
                <div className="flex justify-between text-sm font-bold">
                  <span>Net</span>
                  <span className={monthlySavings >= 0 ? 'text-success' : 'text-destructive'}>
                    ${monthlySavings.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Tips */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>
            Personalized tips to improve your financial health
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {savingsRate < 10 && (
              <div className="flex items-start gap-3 p-3 border rounded-lg bg-warning/5">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <p className="font-medium">Increase Your Savings Rate</p>
                  <p className="text-sm text-muted-foreground">
                    Try to save at least 10-20% of your income. Consider reducing discretionary spending.
                  </p>
                </div>
              </div>
            )}
            
            {creditUtilization > 30 && (
              <div className="flex items-start gap-3 p-3 border rounded-lg bg-destructive/5">
                <CreditCardIcon className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium">Reduce Credit Card Usage</p>
                  <p className="text-sm text-muted-foreground">
                    Keep credit utilization below 30% to improve your credit score.
                  </p>
                </div>
              </div>
            )}

            {totalBankBalance < monthlyExpenses * 3 && (
              <div className="flex items-start gap-3 p-3 border rounded-lg bg-warning/5">
                <DollarSign className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <p className="font-medium">Build Emergency Fund</p>
                  <p className="text-sm text-muted-foreground">
                    Aim for 3-6 months of expenses in your emergency fund for financial security.
                  </p>
                </div>
              </div>
            )}

            {healthScore >= 80 && (
              <div className="flex items-start gap-3 p-3 border rounded-lg bg-success/5">
                <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                <div>
                  <p className="font-medium">Great Job!</p>
                  <p className="text-sm text-muted-foreground">
                    Your financial health is excellent. Consider investing for long-term growth.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};