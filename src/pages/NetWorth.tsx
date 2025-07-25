import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard, 
  Home, 
  Car,
  DollarSign,
  Target
} from "lucide-react";

const NetWorth = () => {
  // Sample data for net worth trend
  const netWorthData = [
    { month: "Jan", assets: 45000, liabilities: 15000, netWorth: 30000 },
    { month: "Feb", assets: 47000, liabilities: 14500, netWorth: 32500 },
    { month: "Mar", assets: 48500, liabilities: 14000, netWorth: 34500 },
    { month: "Apr", assets: 50000, liabilities: 13500, netWorth: 36500 },
    { month: "May", assets: 52000, liabilities: 13000, netWorth: 39000 },
    { month: "Jun", assets: 54500, liabilities: 12500, netWorth: 42000 }
  ];

  // Assets breakdown
  const assets = [
    { name: "Checking Account", amount: 4250, type: "cash", icon: Wallet, color: "hsl(var(--primary))" },
    { name: "Savings Account", amount: 15750, type: "cash", icon: Wallet, color: "hsl(var(--success))" },
    { name: "Investment Account", amount: 25000, type: "investment", icon: TrendingUp, color: "hsl(var(--accent))" },
    { name: "401(k)", amount: 8500, type: "retirement", icon: Target, color: "hsl(var(--warning))" },
    { name: "House Value", amount: 180000, type: "property", icon: Home, color: "hsl(190 60% 50%)" },
    { name: "Car Value", amount: 12000, type: "vehicle", icon: Car, color: "hsl(200 60% 50%)" }
  ];

  // Liabilities breakdown
  const liabilities = [
    { name: "Credit Cards", amount: 2400, type: "credit", icon: CreditCard, color: "hsl(var(--destructive))" },
    { name: "Car Loan", amount: 8500, type: "loan", icon: Car, color: "hsl(var(--warning))" },
    { name: "Mortgage", amount: 125000, type: "mortgage", icon: Home, color: "hsl(var(--accent))" }
  ];

  const totalAssets = assets.reduce((sum, asset) => sum + asset.amount, 0);
  const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.amount, 0);
  const netWorth = totalAssets - totalLiabilities;
  const netWorthChange = 4500; // Sample change from last month

  const chartConfig = {
    netWorth: { label: "Net Worth", color: "hsl(var(--primary))" },
    assets: { label: "Assets", color: "hsl(var(--success))" },
    liabilities: { label: "Liabilities", color: "hsl(var(--destructive))" }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Net Worth</h1>
          <p className="text-muted-foreground mt-1">Track your total financial picture</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">${netWorth.toLocaleString()}</p>
            <div className="flex items-center text-sm text-success mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +${netWorthChange.toLocaleString()} this month
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">${totalAssets.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">{assets.length} assets</p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Liabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">${totalLiabilities.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">{liabilities.length} liabilities</p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Asset-to-Debt Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{(totalAssets / totalLiabilities).toFixed(1)}:1</p>
            <p className="text-sm text-muted-foreground mt-1">Assets to liabilities</p>
          </CardContent>
        </Card>
      </div>

      {/* Net Worth Trend Chart */}
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle>Net Worth Trend</CardTitle>
          <CardDescription>Your net worth progression over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netWorthData}>
                <defs>
                  <linearGradient id="assetsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="liabilitiesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area 
                  type="monotone" 
                  dataKey="assets" 
                  stackId="1"
                  stroke="hsl(var(--success))" 
                  fill="url(#assetsGradient)"
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="liabilities" 
                  stackId="2"
                  stroke="hsl(var(--destructive))" 
                  fill="url(#liabilitiesGradient)"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="netWorth" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Assets and Liabilities Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Assets</span>
              <Badge variant="secondary" className="bg-success/10 text-success">
                ${totalAssets.toLocaleString()}
              </Badge>
            </CardTitle>
            <CardDescription>Your valuable possessions and investments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assets.map((asset, index) => {
                const percentage = (asset.amount / totalAssets) * 100;
                return (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg text-white"
                        style={{ backgroundColor: asset.color }}
                      >
                        <asset.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{asset.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{asset.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">${asset.amount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Liabilities */}
        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Liabilities</span>
              <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                ${totalLiabilities.toLocaleString()}
              </Badge>
            </CardTitle>
            <CardDescription>Your debts and financial obligations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {liabilities.map((liability, index) => {
                const percentage = (liability.amount / totalLiabilities) * 100;
                return (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg text-white"
                        style={{ backgroundColor: liability.color }}
                      >
                        <liability.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{liability.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{liability.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">${liability.amount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Health Indicators */}
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle>Financial Health Indicators</CardTitle>
          <CardDescription>Key metrics to track your financial wellness</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-success/10 text-success mx-auto mb-3">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Debt-to-Asset Ratio</h3>
              <p className="text-2xl font-bold text-success mb-1">
                {((totalLiabilities / totalAssets) * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Lower is better</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto mb-3">
                <DollarSign className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Liquidity Ratio</h3>
              <p className="text-2xl font-bold text-primary mb-1">
                {((assets.filter(a => a.type === 'cash').reduce((sum, a) => sum + a.amount, 0) / totalLiabilities) * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Cash vs debts</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 text-accent mx-auto mb-3">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Investment Allocation</h3>
              <p className="text-2xl font-bold text-accent mb-1">
                {((assets.filter(a => a.type === 'investment' || a.type === 'retirement').reduce((sum, a) => sum + a.amount, 0) / totalAssets) * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Of total assets</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NetWorth;