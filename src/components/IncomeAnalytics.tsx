import { useState } from 'react';
import { useIncomeSources } from '@/hooks/useIncomeSources';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Target } from 'lucide-react';

export function IncomeAnalytics() {
  const [dateRange, setDateRange] = useState('30');
  const { useIncomeAnalytics, incomeSources } = useIncomeSources();
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(dateRange));
  
  const { data: analytics, isLoading } = useIncomeAnalytics(startDate, new Date());

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading analytics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalExpected = incomeSources
    .filter(source => source.isActive)
    .reduce((sum, source) => sum + (source.expectedMonthlyAmount || 0), 0);

  const totalActual = analytics?.totalMonthlyIncome || 0;
  const variance = totalActual - totalExpected;
  const variancePercentage = totalExpected > 0 ? (variance / totalExpected) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Income Analytics</h2>
          <p className="text-muted-foreground">
            Track your income performance and trends
          </p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalActual.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Last {dateRange} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Income</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpected.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Monthly target
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variance</CardTitle>
            {variance >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {variance >= 0 ? '+' : ''}${variance.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {variancePercentage >= 0 ? '+' : ''}{variancePercentage.toFixed(1)}% vs expected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {incomeSources.filter(source => source.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              of {incomeSources.length} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Income by Source */}
      {analytics?.incomeBySource && Object.keys(analytics.incomeBySource).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Income by Source</CardTitle>
            <CardDescription>
              Breakdown of income by source for the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.incomeBySource).map(([sourceId, amount]) => {
                const source = incomeSources.find(s => s.id === sourceId);
                if (!source) return null;

                const percentage = totalActual > 0 ? (amount / totalActual) * 100 : 0;

                return (
                  <div key={sourceId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: source.color }}
                      />
                      <div>
                        <p className="font-medium">{source.name}</p>
                        <p className="text-sm text-muted-foreground">{source.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${amount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expected vs Actual */}
      {analytics?.expectedVsActual && Object.keys(analytics.expectedVsActual).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Expected vs Actual</CardTitle>
            <CardDescription>
              Compare expected and actual income by source
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.expectedVsActual).map(([sourceId, data]) => {
                const source = incomeSources.find(s => s.id === sourceId);
                if (!source) return null;

                const variance = data.actual - data.expected;
                const variancePercentage = data.expected > 0 ? (variance / data.expected) * 100 : 0;

                return (
                  <div key={sourceId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: source.color }}
                        />
                        <span className="font-medium">{source.name}</span>
                      </div>
                      <Badge 
                        variant={variance >= 0 ? "default" : "secondary"}
                        className={variance >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                      >
                        {variance >= 0 ? '+' : ''}{variancePercentage.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Expected</p>
                        <p className="font-medium">${data.expected.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Actual</p>
                        <p className="font-medium">${data.actual.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Variance</p>
                        <p className={`font-medium ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {variance >= 0 ? '+' : ''}${variance.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {(!analytics || Object.keys(analytics.incomeBySource || {}).length === 0) && (
        <Card>
          <CardContent className="text-center py-8">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No income data</h3>
            <p className="text-muted-foreground">
              Link transactions to income sources to see analytics
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}