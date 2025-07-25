import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useFirestore, FirebaseDocument } from "@/hooks/useFirestore";
import { AuthModal } from "@/components/AuthModal";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard,
  Target,
  AlertTriangle,
  Eye,
  EyeOff,
  Plus
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Link } from "react-router-dom";

interface BankAccount extends FirebaseDocument {
  name: string;
  type: string;
  balance: number;
  isActive: boolean;
}

interface CreditCard extends FirebaseDocument {
  name: string;
  balance: number;
  creditLimit: number;
  isActive: boolean;
}

interface BudgetCategory extends FirebaseDocument {
  name: string;
  budgeted: number;
  spent: number;
  color: string;
}

interface SavingsGoal extends FirebaseDocument {
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { documents: bankAccounts } = useFirestore<BankAccount>('bankAccounts');
  const { documents: creditCards } = useFirestore<CreditCard>('creditCards');
  const { documents: budgetCategories } = useFirestore<BudgetCategory>('budgetCategories');
  const { documents: savingsGoals } = useFirestore<SavingsGoal>('savingsGoals');
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showBalances, setShowBalances] = useState(true);

  if (!user) {
    return <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />;
  }

  // Calculate totals
  const activeAccounts = bankAccounts.filter(acc => acc.isActive);
  const totalBankBalance = activeAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  
  const activeCards = creditCards.filter(card => card.isActive);
  const totalCreditUsed = activeCards.reduce((sum, card) => sum + card.balance, 0);
  const totalCreditLimit = activeCards.reduce((sum, card) => sum + card.creditLimit, 0);
  const creditUtilization = totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0;

  const totalBudgeted = budgetCategories.reduce((sum, cat) => sum + cat.budgeted, 0);
  const totalSpent = budgetCategories.reduce((sum, cat) => sum + cat.spent, 0);
  const overBudgetCategories = budgetCategories.filter(cat => cat.spent > cat.budgeted);

  const totalGoalsTarget = savingsGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalGoalsSaved = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const goalsProgress = totalGoalsTarget > 0 ? (totalGoalsSaved / totalGoalsTarget) * 100 : 0;

  // Net worth calculation
  const netWorth = totalBankBalance - totalCreditUsed;

  // Mock data for trends
  const netWorthTrend = [
    { month: 'Jan', value: netWorth - 2000 },
    { month: 'Feb', value: netWorth - 1500 },
    { month: 'Mar', value: netWorth - 1000 },
    { month: 'Apr', value: netWorth - 500 },
    { month: 'May', value: netWorth },
  ];

  const spendingData = budgetCategories.slice(0, 5).map(cat => ({
    name: cat.name,
    value: cat.spent,
    color: cat.color
  }));

  const chartConfig = {
    value: { label: "Amount", color: "hsl(var(--primary))" }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Your financial overview at a glance</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowBalances(!showBalances)}
          className="gap-2"
        >
          {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showBalances ? "Hide" : "Show"} Balances
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {showBalances ? `$${netWorth.toLocaleString()}` : "••••••"}
            </p>
            <p className="text-sm text-success mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +5.2% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bank Accounts</CardTitle>
              <div className="p-2 rounded-lg bg-success/10">
                <Wallet className="h-4 w-4 text-success" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {showBalances ? `$${totalBankBalance.toLocaleString()}` : "••••••"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {activeAccounts.length} active accounts
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Credit Cards</CardTitle>
              <div className="p-2 rounded-lg bg-warning/10">
                <CreditCard className="h-4 w-4 text-warning" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {showBalances ? `$${totalCreditUsed.toLocaleString()}` : "••••••"}
            </p>
            <p className={`text-sm mt-1 ${creditUtilization > 30 ? 'text-warning' : 'text-success'}`}>
              {creditUtilization.toFixed(1)}% utilization
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Savings Goals</CardTitle>
              <div className="p-2 rounded-lg bg-accent/10">
                <Target className="h-4 w-4 text-accent" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {goalsProgress.toFixed(0)}%
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {savingsGoals.length} active goals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Net Worth Trend */}
        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle>Net Worth Trend</CardTitle>
            <CardDescription>Your net worth over the last 5 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={netWorthTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Spending Breakdown */}
        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle>Spending Breakdown</CardTitle>
            <CardDescription>Top spending categories this month</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={spendingData}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {spendingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Alerts & Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {overBudgetCategories.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                <div>
                  <p className="font-medium text-destructive">Budget Alert</p>
                  <p className="text-sm text-muted-foreground">
                    {overBudgetCategories.length} categories over budget
                  </p>
                </div>
                <Link to="/budgets">
                  <Button size="sm" variant="outline">View</Button>
                </Link>
              </div>
            )}
            
            {creditUtilization > 30 && (
              <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg">
                <div>
                  <p className="font-medium text-warning">High Credit Usage</p>
                  <p className="text-sm text-muted-foreground">
                    Credit utilization is {creditUtilization.toFixed(1)}%
                  </p>
                </div>
                <Link to="/credit-cards">
                  <Button size="sm" variant="outline">View</Button>
                </Link>
              </div>
            )}

            {overBudgetCategories.length === 0 && creditUtilization <= 30 && (
              <div className="text-center py-6 text-muted-foreground">
                <p>No alerts at this time</p>
                <p className="text-sm">You're doing great! 🎉</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/accounts" className="block">
              <Button variant="outline" className="w-full justify-start gap-3">
                <Plus className="h-4 w-4" />
                Add Bank Account
              </Button>
            </Link>
            <Link to="/credit-cards" className="block">
              <Button variant="outline" className="w-full justify-start gap-3">
                <Plus className="h-4 w-4" />
                Add Credit Card
              </Button>
            </Link>
            <Link to="/budgets" className="block">
              <Button variant="outline" className="w-full justify-start gap-3">
                <Plus className="h-4 w-4" />
                Create Budget Category
              </Button>
            </Link>
            <Link to="/goals" className="block">
              <Button variant="outline" className="w-full justify-start gap-3">
                <Plus className="h-4 w-4" />
                Set Savings Goal
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;