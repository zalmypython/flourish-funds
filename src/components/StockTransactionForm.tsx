import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Search, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { stockApi } from '../services/stockApi';
import { useFirestore } from '../hooks/useFirestore';
import { useAuth } from '../hooks/useAuth';
import { useAccountBalance } from '../hooks/useAccountBalance';
import { useToast } from './ui/use-toast';
import { StockTransaction, StockHolding, BankAccount, Transaction } from '../types';

interface StockSearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  matchScore: number;
}

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  lastUpdated: Date;
}

interface StockTransactionFormProps {
  onTransactionComplete?: () => void;
}

export const StockTransactionForm = ({ onTransactionComplete }: StockTransactionFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { documents: accounts } = useFirestore<BankAccount>('bankAccounts');
  const { addDocument: addStockTransaction } = useFirestore<StockTransaction>('stockTransactions');
  const { documents: holdings, addDocument: addHolding, updateDocument: updateHolding } = useFirestore<StockHolding>('stockHoldings');
  const { addTransactionWithBalanceUpdate } = useAccountBalance();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(null);
  const [currentQuote, setCurrentQuote] = useState<StockQuote | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);

  const [formData, setFormData] = useState({
    type: 'buy' as 'buy' | 'sell',
    shares: '',
    price: '',
    fees: '0',
    accountId: '',
  });

  useEffect(() => {
    const searchStocks = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await stockApi.searchStocks(searchQuery);
        setSearchResults(results.slice(0, 10)); // Limit to 10 results
      } catch (error) {
        console.error('Stock search error:', error);
        toast({
          title: "Search Error",
          description: "Failed to search stocks. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchStocks, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, toast]);

  useEffect(() => {
    const fetchQuote = async () => {
      if (!selectedStock) {
        setCurrentQuote(null);
        return;
      }

      setIsLoadingQuote(true);
      try {
        const quote = await stockApi.getStockQuote(selectedStock.symbol);
        setCurrentQuote(quote);
        setFormData(prev => ({ ...prev, price: quote.price.toFixed(2) }));
      } catch (error) {
        console.error('Quote fetch error:', error);
        toast({
          title: "Quote Error",
          description: "Failed to fetch current price. Please enter manually.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingQuote(false);
      }
    };

    fetchQuote();
  }, [selectedStock, toast]);

  const handleStockSelect = (stock: StockSearchResult) => {
    setSelectedStock(stock);
    setSearchQuery(stock.symbol);
    setSearchResults([]);
  };

  const calculateTotal = () => {
    const shares = parseFloat(formData.shares) || 0;
    const price = parseFloat(formData.price) || 0;
    const fees = parseFloat(formData.fees) || 0;
    return shares * price + fees;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !selectedStock) return;

    const shares = parseFloat(formData.shares);
    const price = parseFloat(formData.price);
    const fees = parseFloat(formData.fees) || 0;
    const totalAmount = calculateTotal();

    if (!shares || !price || !formData.accountId) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create stock transaction
      const stockTransaction: Omit<StockTransaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        type: formData.type,
        stockSymbol: selectedStock.symbol,
        stockName: selectedStock.name,
        shares,
        price,
        fees,
        totalAmount,
        accountId: formData.accountId,
        date: new Date().toISOString().split('T')[0],
      };

      await addStockTransaction(stockTransaction);

      // Create corresponding account transaction
      const accountTransaction: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        amount: formData.type === 'buy' ? -totalAmount : totalAmount,
        description: `${formData.type === 'buy' ? 'Purchase' : 'Sale'} of ${shares} shares of ${selectedStock.symbol}`,
        category: 'stocks',
        date: new Date().toISOString().split('T')[0],
        accountId: formData.accountId,
        accountType: 'bank' as const,
        type: formData.type === 'buy' ? 'expense' as const : 'income' as const,
        status: 'cleared' as const,
        notes: `Stock Transaction: ${formData.type} ${shares} shares of ${selectedStock.symbol}`,
      };

      await addTransactionWithBalanceUpdate(accountTransaction);

      // Update or create stock holding
      const existingHolding = holdings.find(h => 
        h.stockSymbol === selectedStock.symbol && h.accountId === formData.accountId
      );

      if (existingHolding) {
        if (formData.type === 'buy') {
          const newTotalShares = existingHolding.shares + shares;
          const newAverageCost = ((existingHolding.averageCostBasis * existingHolding.shares) + (price * shares)) / newTotalShares;
          
          await updateHolding(existingHolding.id, {
            shares: newTotalShares,
            averageCostBasis: newAverageCost,
            totalValue: newTotalShares * (currentQuote?.price || price),
          });
        } else {
          // Sell shares
          const newShares = Math.max(0, existingHolding.shares - shares);
          await updateHolding(existingHolding.id, {
            shares: newShares,
            totalValue: newShares * (currentQuote?.price || price),
          });
        }
      } else if (formData.type === 'buy') {
        // Create new holding
        const newHolding: Omit<StockHolding, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
          stockSymbol: selectedStock.symbol,
          stockName: selectedStock.name,
          shares,
          averageCostBasis: price,
          totalValue: shares * (currentQuote?.price || price),
          accountId: formData.accountId,
        };

        await addHolding(newHolding);
      }

      toast({
        title: "Success! 📈",
        description: `${formData.type === 'buy' ? 'Purchased' : 'Sold'} ${shares} shares of ${selectedStock.symbol}`,
      });

      // Reset form
      setFormData({
        type: 'buy',
        shares: '',
        price: '',
        fees: '0',
        accountId: '',
      });
      setSelectedStock(null);
      setSearchQuery('');
      setCurrentQuote(null);
      setIsOpen(false);
      onTransactionComplete?.();

    } catch (error) {
      console.error('Transaction error:', error);
      toast({
        title: "Transaction Failed",
        description: "Failed to process stock transaction. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <TrendingUp className="h-4 w-4" />
          New Stock Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Stock Transaction</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transaction Type */}
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <Select value={formData.type} onValueChange={(value: 'buy' | 'sell') => setFormData(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Enhanced Stock Search */}
          <div className="space-y-2">
            <Label>Stock Symbol</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search stocks (e.g., AAPL, Tesla, Microsoft)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {isSearching && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              )}
            </div>
            
            {/* Enhanced Search Results */}
            {searchResults.length > 0 && !selectedStock && (
              <div className="mt-2 border rounded-md max-h-48 overflow-y-auto bg-background">
                {searchResults.map((stock) => (
                  <button
                    key={stock.symbol}
                    type="button"
                    onClick={() => handleStockSelect(stock)}
                    className="w-full text-left p-3 hover:bg-muted border-b last:border-b-0 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-foreground">{stock.symbol}</div>
                        <div className="text-sm text-muted-foreground">{stock.name}</div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {stock.type}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searchQuery && searchResults.length === 0 && !selectedStock && (
              <div className="mt-2 p-3 text-sm text-muted-foreground border rounded-md">
                No stocks found. Try searching for "AAPL", "Tesla", or "Microsoft".
              </div>
            )}
          </div>

          {/* Enhanced Current Quote */}
          {selectedStock && currentQuote && (
            <div className="p-4 bg-muted rounded-lg border">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-foreground">{selectedStock.symbol}</h3>
                  <p className="text-sm text-muted-foreground">{selectedStock.name}</p>
                  <Badge variant="outline" className="mt-1 text-xs">{selectedStock.type}</Badge>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-foreground">${currentQuote.price.toFixed(2)}</div>
                  <div className={`text-sm flex items-center ${currentQuote.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {currentQuote.change >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {currentQuote.change >= 0 ? '+' : ''}{currentQuote.change.toFixed(2)} ({currentQuote.changePercent.toFixed(2)}%)
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Vol: {currentQuote.volume.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transaction Details */}
          {selectedStock && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shares">Shares</Label>
                  <Input
                    id="shares"
                    type="number"
                    step="0.01"
                    value={formData.shares}
                    onChange={(e) => setFormData(prev => ({ ...prev, shares: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price per Share</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                    disabled={isLoadingQuote}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fees">Fees</Label>
                  <Input
                    id="fees"
                    type="number"
                    step="0.01"
                    value={formData.fees}
                    onChange={(e) => setFormData(prev => ({ ...prev, fees: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account</Label>
                  <Select value={formData.accountId} onValueChange={(value) => setFormData(prev => ({ ...prev, accountId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} - ${account.currentBalance.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Total */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total {formData.type === 'buy' ? 'Cost' : 'Proceeds'}:</span>
                    <div className="flex items-center text-lg font-bold">
                      <DollarSign className="h-4 w-4 mr-1" />
                      {calculateTotal().toFixed(2)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={!formData.shares || !formData.price || !formData.accountId}
                >
                  {formData.type === 'buy' ? 'Buy' : 'Sell'} Stock
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};