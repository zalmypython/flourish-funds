import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard, 
  PieChart, 
  Target,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart as RechartsPieChart, Cell, BarChart, Bar, Pie } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// Sample data
const balanceData = [
  { month: "Jan", balance: 8500 },
  { month: "Feb", balance: 9200 },
  { month: "Mar", balance: 8800 },
  { month: "Apr", balance: 9500 },
  { month: "May", balance: 10200 },
  { month: "Jun", balance: 11000 }
];

const expenseData = [
  { name: "Food", value: 1200, color: "hsl(var(--accent))" },
  { name: "Transportation", value: 800, color: "hsl(var(--primary))" },
  { name: "Entertainment", value: 600, color: "hsl(var(--success))" },
  { name: "Shopping", value: 950, color: "hsl(var(--warning))" },
  { name: "Bills", value: 1800, color: "hsl(var(--destructive))" }
];

const chartConfig = {
  balance: {
    label: "Balance",
    color: "hsl(var(--primary))",
  },
  expense: {
    label: "Expenses",
    color: "hsl(var(--destructive))",
  },
};

const Dashboard = () => {
  const totalBalance = 11000;
  const monthlyExpenses = 5350;
  const creditCardBalance = 2400;
  const savingsGoal = 15000;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's your financial overview.</p>
        </div>
        <Button className="bg-gradient-primary text-primary-foreground hover:scale-105 shadow-elegant">
          <Plus className="h-4 w-4 mr-2" />
          Quick Add
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">${totalBalance.toLocaleString()}</div>
            <div className="flex items-center text-sm text-success">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12% from last month
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Expenses</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">${monthlyExpenses.toLocaleString()}</div>
            <div className="flex items-center text-sm text-success">
              <TrendingDown className="h-3 w-3 mr-1" />
              -5% from last month
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Credit Cards</CardTitle>
            <CreditCard className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">${creditCardBalance.toLocaleString()}</div>
            <div className="flex items-center text-sm text-warning">
              <TrendingUp className="h-3 w-3 mr-1" />
              +8% utilization
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Savings Goal</CardTitle>
            <Target className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">73%</div>
            <div className="flex items-center text-sm text-muted-foreground">
              ${totalBalance.toLocaleString()} of ${savingsGoal.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Balance Trend */}
        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">Balance Trend</CardTitle>
            <CardDescription>Your account balance over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={balanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">Expense Breakdown</CardTitle>
            <CardDescription>This month's spending by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">Quick Actions</CardTitle>
            <CardDescription>Common tasks to manage your finances</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start h-12">
              <Plus className="h-4 w-4 mr-3" />
              Add New Transaction
            </Button>
            <Button variant="outline" className="w-full justify-start h-12">
              <CreditCard className="h-4 w-4 mr-3" />
              Pay Credit Card
            </Button>
            <Button variant="outline" className="w-full justify-start h-12">
              <Target className="h-4 w-4 mr-3" />
              Update Savings Goal
            </Button>
            <Button variant="outline" className="w-full justify-start h-12">
              <PieChart className="h-4 w-4 mr-3" />
              Review Budget
            </Button>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Transactions</CardTitle>
            <CardDescription>Your latest financial activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Grocery Store", amount: -85.32, type: "expense", date: "Today" },
                { name: "Salary Deposit", amount: 3200.00, type: "income", date: "2 days ago" },
                { name: "Netflix", amount: -15.99, type: "expense", date: "3 days ago" },
                { name: "Gas Station", amount: -42.15, type: "expense", date: "4 days ago" },
                { name: "Freelance Work", amount: 500.00, type: "income", date: "5 days ago" }
              ].map((transaction, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-8 rounded-full ${transaction.type === 'income' ? 'bg-success' : 'bg-destructive'}`} />
                    <div>
                      <p className="font-medium text-foreground">{transaction.name}</p>
                      <p className="text-sm text-muted-foreground">{transaction.date}</p>
                    </div>
                  </div>
                  <div className={`font-bold ${transaction.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                    {transaction.type === 'income' ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;