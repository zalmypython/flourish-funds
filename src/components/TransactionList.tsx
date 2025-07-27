import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, Eye, EyeOff, Calendar, DollarSign, Tag } from 'lucide-react';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  plaidTransactionId: string;
  accountId: string;
  amount: number;
  date: string;
  name: string;
  merchantName?: string;
  category: string[];
  subcategory?: string;
  internalCategory?: string;
  pending: boolean;
  location?: {
    address?: string;
    city?: string;
    region?: string;
  };
  isHidden: boolean;
  notes?: string;
  tags?: string[];
}

interface TransactionListProps {
  transactions: Transaction[];
  isLoading?: boolean;
  onUpdateCategory?: (transactionId: string, category: string) => Promise<void>;
  onToggleVisibility?: (transactionId: string, isHidden: boolean) => Promise<void>;
  onRefresh?: () => void;
}

const categories = [
  { value: 'dining', label: 'Dining', color: 'bg-red-100 text-red-800' },
  { value: 'groceries', label: 'Groceries', color: 'bg-green-100 text-green-800' },
  { value: 'transportation', label: 'Transportation', color: 'bg-blue-100 text-blue-800' },
  { value: 'shopping', label: 'Shopping', color: 'bg-purple-100 text-purple-800' },
  { value: 'entertainment', label: 'Entertainment', color: 'bg-pink-100 text-pink-800' },
  { value: 'healthcare', label: 'Healthcare', color: 'bg-orange-100 text-orange-800' },
  { value: 'bills', label: 'Bills & Utilities', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'transfer', label: 'Transfer', color: 'bg-gray-100 text-gray-800' },
  { value: 'income', label: 'Income', color: 'bg-green-100 text-green-800' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' },
];

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  isLoading = false,
  onUpdateCategory,
  onToggleVisibility,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showHidden, setShowHidden] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const { toast } = useToast();

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter(transaction => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          transaction.name.toLowerCase().includes(searchLower) ||
          transaction.merchantName?.toLowerCase().includes(searchLower) ||
          transaction.category.some(cat => cat.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }

      // Category filter
      if (categoryFilter !== 'all') {
        if (transaction.internalCategory !== categoryFilter) return false;
      }

      // Hidden filter
      if (!showHidden && transaction.isHidden) return false;

      return true;
    });

    // Sort transactions
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          comparison = Math.abs(a.amount) - Math.abs(b.amount);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [transactions, searchTerm, categoryFilter, showHidden, sortBy, sortOrder]);

  const handleCategoryChange = async (transactionId: string, newCategory: string) => {
    if (!onUpdateCategory) return;
    
    try {
      await onUpdateCategory(transactionId, newCategory);
      toast({
        title: 'Category Updated',
        description: 'Transaction category has been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update transaction category.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleVisibility = async (transactionId: string, currentlyHidden: boolean) => {
    if (!onToggleVisibility) return;
    
    try {
      await onToggleVisibility(transactionId, !currentlyHidden);
      toast({
        title: currentlyHidden ? 'Transaction Shown' : 'Transaction Hidden',
        description: `Transaction has been ${currentlyHidden ? 'shown' : 'hidden'}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update transaction visibility.',
        variant: 'destructive',
      });
    }
  };

  const getCategoryColor = (category?: string) => {
    const cat = categories.find(c => c.value === category);
    return cat?.color || 'bg-gray-100 text-gray-800';
  };

  const getCategoryLabel = (category?: string) => {
    const cat = categories.find(c => c.value === category);
    return cat?.label || 'Other';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading transactions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(value: 'date' | 'amount' | 'name') => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex gap-2">
              <Button
                variant={sortOrder === 'desc' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortOrder('desc')}
              >
                Newest
              </Button>
              <Button
                variant={sortOrder === 'asc' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortOrder('asc')}
              >
                Oldest
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              variant={showHidden ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowHidden(!showHidden)}
              className="flex items-center gap-2"
            >
              {showHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {showHidden ? 'Hide Hidden' : 'Show Hidden'}
            </Button>
            
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                Refresh
              </Button>
            )}
            
            <span className="text-sm text-muted-foreground">
              {filteredTransactions.length} of {transactions.length} transactions
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <div className="space-y-2">
        {filteredTransactions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No transactions found matching your criteria.</p>
            </CardContent>
          </Card>
        ) : (
          filteredTransactions.map((transaction) => (
            <Card 
              key={transaction.id} 
              className={`transition-opacity ${transaction.isHidden ? 'opacity-50' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{transaction.name}</h3>
                        {transaction.pending && (
                          <Badge variant="outline" className="text-xs">
                            Pending
                          </Badge>
                        )}
                      </div>
                      {transaction.merchantName && transaction.merchantName !== transaction.name && (
                        <p className="text-sm text-muted-foreground">{transaction.merchantName}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(transaction.date), 'MMM dd, yyyy')}
                        </span>
                        {transaction.location?.city && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {transaction.location.city}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-lg font-semibold ${
                        transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.amount > 0 ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Select
                        value={transaction.internalCategory || 'other'}
                        onValueChange={(value) => handleCategoryChange(transaction.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Badge className={getCategoryColor(transaction.internalCategory)}>
                        {getCategoryLabel(transaction.internalCategory)}
                      </Badge>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleVisibility(transaction.id, transaction.isHidden)}
                      >
                        {transaction.isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};