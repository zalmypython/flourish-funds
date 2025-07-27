import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, Eye, Star } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { useAuth } from '../hooks/useAuth';
import { stockApi } from '../services/stockApi';
import { StockHolding, StockTransaction, Portfolio } from '../types';
import { StockTransactionForm } from './StockTransactionForm';

export const StockPortfolioManager = () => {
  const { user } = useAuth();
  const { documents: holdings, loading: holdingsLoading } = useFirestore<StockHolding>('stockHoldings');
  const { documents: transactions } = useFirestore<StockTransaction>('stockTransactions');
  
  const [stockQuotes, setStockQuotes] = useState<Record<string, any>>({});
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);

  // Fetch current quotes for all holdings
  useEffect(() => {
    const fetchQuotes = async () => {
      if (holdings.length === 0) return;

      setIsLoadingQuotes(true);
      const quotes: Record<string, any> = {};
      
      try {
        // Fetch quotes for unique symbols
        const uniqueSymbols = [...new Set(holdings.map(h => h.stockSymbol))];
        
        for (const symbol of uniqueSymbols) {
          try {
            const quote = await stockApi.getStockQuote(symbol);
            quotes[symbol] = quote;
          } catch (error) {
            console.error(`Failed to fetch quote for ${symbol}:`, error);
          }
        }
        
        setStockQuotes(quotes);
      } catch (error) {
        console.error('Error fetching quotes:', error);
      } finally {
        setIsLoadingQuotes(false);
      }
    };

    fetchQuotes();
  }, [holdings]);

  // Calculate portfolio summary with enhanced features
  const portfolio = useMemo(() => {
    if (!holdings?.length) {
      return {
        totalValue: 0,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        totalDayChange: 0,
        totalDayChangePercent: 0,
        holdings: [],
        sectorAllocation: {},
      };
    }

    let totalValue = 0;
    let totalCostBasis = 0;
    let totalDayChange = 0;
    const sectorAllocation: Record<string, number> = {};

    // Group holdings by symbol to handle multiple purchases
    const consolidatedHoldings = holdings.reduce((acc, holding) => {
      if (!acc[holding.stockSymbol]) {
        acc[holding.stockSymbol] = {
          symbol: holding.stockSymbol,
          name: holding.stockName,
          shares: 0,
          totalCost: 0,
          accountId: holding.accountId, // Use first account for display
        };
      }
      acc[holding.stockSymbol].shares += holding.shares;
      acc[holding.stockSymbol].totalCost += holding.shares * holding.averageCostBasis;
      return acc;
    }, {} as Record<string, any>);

    const holdingsArray = Object.values(consolidatedHoldings).map((holding: any) => {
      const quote = stockQuotes[holding.symbol];
      const currentPrice = quote?.price || 0;
      const currentValue = holding.shares * currentPrice;
      const costBasis = holding.totalCost;
      const averageCostBasis = holding.shares > 0 ? costBasis / holding.shares : 0;
      const gainLoss = currentValue - costBasis;
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
      const dayChange = quote ? (holding.shares * quote.change) : 0;
      const dayChangePercent = quote?.changePercent || 0;

      // Mock sector data (in real app, this would come from stock metadata)
      const sector = getSectorForSymbol(holding.symbol);
      if (sector) {
        sectorAllocation[sector] = (sectorAllocation[sector] || 0) + currentValue;
      }

      totalValue += currentValue;
      totalCostBasis += costBasis;
      totalDayChange += dayChange;

      return {
        symbol: holding.symbol,
        name: holding.name,
        shares: holding.shares,
        averageCostBasis,
        accountId: holding.accountId,
        currentPrice,
        currentValue,
        gainLoss,
        gainLossPercent,
        dayChange,
        dayChangePercent,
        quote,
        sector,
      };
    });

    const totalGainLoss = totalValue - totalCostBasis;
    const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;
    const totalDayChangePercent = totalValue > totalDayChange ? (totalDayChange / (totalValue - totalDayChange)) * 100 : 0;

    return {
      totalValue,
      totalGainLoss,
      totalGainLossPercent,
      totalDayChange,
      totalDayChangePercent,
      holdings: holdingsArray.sort((a, b) => b.currentValue - a.currentValue), // Sort by value
      sectorAllocation,
    };
  }, [holdings, stockQuotes]);

  // Helper function to get sector for symbol (mock data)
  const getSectorForSymbol = (symbol: string): string => {
    const sectorMap: Record<string, string> = {
      'AAPL': 'Technology', 'GOOGL': 'Technology', 'MSFT': 'Technology', 'NVDA': 'Technology', 'META': 'Technology',
      'AMZN': 'Consumer Discretionary', 'TSLA': 'Consumer Discretionary', 'HD': 'Consumer Discretionary', 'MCD': 'Consumer Discretionary', 'NKE': 'Consumer Discretionary',
      'JPM': 'Financials', 'BAC': 'Financials', 'WFC': 'Financials', 'GS': 'Financials', 'MS': 'Financials', 'C': 'Financials',
      'JNJ': 'Healthcare', 'PFE': 'Healthcare', 'UNH': 'Healthcare', 'ABBV': 'Healthcare', 'MRK': 'Healthcare', 'TMO': 'Healthcare',
      'KO': 'Consumer Staples', 'PEP': 'Consumer Staples', 'WMT': 'Consumer Staples',
      'XOM': 'Energy', 'CVX': 'Energy', 'COP': 'Energy',
      'BA': 'Industrials', 'CAT': 'Industrials', 'GE': 'Industrials', 'MMM': 'Industrials',
      'SPY': 'ETF', 'QQQ': 'ETF', 'IWM': 'ETF', 'VTI': 'ETF', 'VOO': 'ETF',
    };
    return sectorMap[symbol] || 'Other';
  };

  // Recent transactions
  const recentTransactions = useMemo(() => {
    return transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [transactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please log in to view your portfolio.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Portfolio Summary */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(portfolio.totalValue)}</div>
            <p className={`text-xs flex items-center ${portfolio.totalDayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {portfolio.totalDayChange >= 0 ? '+' : ''}{formatCurrency(portfolio.totalDayChange)} 
              <span className="ml-1">({formatPercent(portfolio.totalDayChangePercent)})</span>
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${portfolio.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {portfolio.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(portfolio.totalGainLoss)}
            </div>
            <p className={`text-xs ${portfolio.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(portfolio.totalGainLossPercent)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Holdings</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolio.holdings.length}</div>
            <p className="text-xs text-muted-foreground">
              {Object.keys(portfolio.sectorAllocation).length} sectors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Holding</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {portfolio.holdings.length > 0 ? (
              <>
                <div className="text-2xl font-bold">{portfolio.holdings[0].symbol}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(portfolio.holdings[0].currentValue)}
                </p>
              </>
            ) : (
              <div className="text-2xl font-bold">-</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Stock Portfolio</h2>
        <StockTransactionForm />
      </div>

      {/* Main Content */}
      <Tabs defaultValue="holdings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="holdings">
          {holdingsLoading ? (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="mt-2 text-muted-foreground">Loading holdings...</p>
              </CardContent>
            </Card>
          ) : portfolio.holdings.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Holdings Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start building your portfolio by purchasing your first stock.
                </p>
                <StockTransactionForm />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {portfolio.holdings.map((holding: any) => {
                const quote = stockQuotes[holding.symbol];
                
                return (
                  <Card key={holding.symbol}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{holding.symbol}</h3>
                            {holding.sector && <Badge variant="outline" className="text-xs">{holding.sector}</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{holding.name}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {formatCurrency(holding.currentValue)}
                          </div>
                          <div className={`text-sm flex items-center ${holding.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {holding.gainLoss >= 0 ? 
                              <TrendingUp className="h-3 w-3 mr-1" /> : 
                              <TrendingDown className="h-3 w-3 mr-1" />
                            }
                            {formatCurrency(holding.gainLoss)} ({formatPercent(holding.gainLossPercent)})
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Shares</p>
                          <p className="font-medium">{holding.shares.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Avg Cost</p>
                          <p className="font-medium">{formatCurrency(holding.averageCostBasis)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Current Price</p>
                          <div className="flex flex-col">
                            <p className="font-medium">{formatCurrency(holding.currentPrice)}</p>
                            <span className={`text-xs ${holding.dayChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {holding.dayChangePercent >= 0 ? '+' : ''}{formatPercent(holding.dayChangePercent)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Cost</p>
                          <p className="font-medium">{formatCurrency(holding.shares * holding.averageCostBasis)}</p>
                        </div>
                      </div>

                      {quote && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Last updated: {new Date(quote.lastUpdated).toLocaleTimeString()}</span>
                            <Badge variant="secondary" className="text-xs">
                              <Eye className="h-3 w-3 mr-1" />
                              Live Price
                            </Badge>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions">
          {recentTransactions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No transactions yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <Card key={transaction.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <Badge variant={transaction.type === 'buy' ? 'default' : 'secondary'}>
                          {transaction.type.toUpperCase()}
                        </Badge>
                        <div>
                          <p className="font-medium">{transaction.stockSymbol}</p>
                          <p className="text-sm text-muted-foreground">{transaction.stockName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {transaction.shares.toLocaleString()} shares @ {formatCurrency(transaction.price)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Total: {formatCurrency(transaction.totalAmount)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {new Date(transaction.date).toLocaleDateString()} at {new Date(transaction.date).toLocaleTimeString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};