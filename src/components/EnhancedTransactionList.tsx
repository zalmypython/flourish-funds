import { useState } from 'react';
import { format } from 'date-fns';
import { Search, Filter, Calendar, X, Trash2, Edit, Paperclip, Eye, EyeOff, ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DEFAULT_CATEGORIES, Transaction } from '@/types';
import { IncomeNotificationPrompt } from './IncomeNotificationPrompt';

interface EnhancedTransactionListProps {
  transactions: Transaction[];
  onDelete: (transactionId: string) => void;
  onEdit?: (transaction: Transaction) => void;
  showAmounts: boolean;
}

export function EnhancedTransactionList({ 
  transactions, 
  onDelete, 
  onEdit,
  showAmounts 
}: EnhancedTransactionListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [incomeNotificationTransaction, setIncomeNotificationTransaction] = useState<Transaction | null>(null);

  // Enhanced filtering
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (transaction.merchantName && transaction.merchantName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || transaction.category === selectedCategory;
    const matchesAccount = selectedAccount === 'all' || transaction.accountId === selectedAccount;
    
    let matchesDate = true;
    if (dateRange !== 'all') {
      const transactionDate = new Date(transaction.date);
      const now = new Date();
      
      switch (dateRange) {
        case '7days':
          matchesDate = transactionDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          matchesDate = transactionDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90days':
          matchesDate = transactionDate >= new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
      }
    }
    
    return matchesSearch && matchesCategory && matchesAccount && matchesDate;
  });

  // Get unique accounts for filter dropdown
  const accountMap = new Map();
  transactions.forEach(t => {
    accountMap.set(t.accountId, { 
      id: t.accountId, 
      name: `Account ${t.accountId}`, // Fallback name since we don't have accountName in the type
      type: t.accountType 
    });
  });
  const uniqueAccounts = Array.from(accountMap.values());

  const formatAmount = (amount: number, type: string) => {
    const formatted = showAmounts ? `$${amount.toFixed(2)}` : '••••';
    return type === 'income' ? `+${formatted}` : `-${formatted}`;
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'income': return 'bg-green-100 text-green-800';
      case 'expense': return 'bg-red-100 text-red-800';
      case 'transfer': return 'bg-blue-100 text-blue-800';
      case 'payment': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'cleared': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'reconciled': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Filters</CardTitle>
          <CardDescription>
            Search and filter your transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {DEFAULT_CATEGORIES.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {uniqueAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.type === 'bank' ? 'Bank' : 'Credit'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="90days">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setSelectedAccount('all');
                  setDateRange('all');
                }}
                className="w-full"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Transactions ({filteredTransactions.length})</span>
            <ArrowUpDown className="h-4 w-4" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found matching your filters.
              </div>
            ) : (
              filteredTransactions
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((transaction) => (
                  <div 
                    key={transaction.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{transaction.description}</h4>
                        <Badge variant="outline" className={getTransactionTypeColor(transaction.type)}>
                          {transaction.type}
                        </Badge>
                        <Badge variant="outline" className={getStatusColor(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Account {transaction.accountId}</span>
                        <span>•</span>
                        <span>{DEFAULT_CATEGORIES.find(c => c.id === transaction.category)?.name || transaction.category}</span>
                        <span>•</span>
                        <span>{format(new Date(transaction.date), 'MMM d, yyyy')}</span>
                      </div>
                      
                      {transaction.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{transaction.notes}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${
                        transaction.type === 'income' 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {formatAmount(transaction.amount, transaction.type)}
                      </span>

                      {/* Document indicator */}
                      {transaction.documents && transaction.documents.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <Paperclip className="h-3 w-3 mr-1" />
                          {transaction.documents.length}
                        </Badge>
                      )}
                      
                      {onEdit && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onEdit(transaction)}
                          title="Edit transaction"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      
                       <Button 
                         variant="ghost" 
                         size="sm"
                         onClick={() => onDelete(transaction.id)}
                         title="Delete transaction"
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                       
                       {/* Income notification trigger */}
                       {transaction.type === 'income' && (
                         <Button 
                           variant="ghost" 
                           size="sm"
                           onClick={() => setIncomeNotificationTransaction(transaction)}
                           title="Categorize income"
                         >
                           💰
                         </Button>
                       )}
                     </div>
                   </div>
                 ))
             )}
           </div>
         </CardContent>
       </Card>

       {/* Income Notification Prompt */}
       {incomeNotificationTransaction && (
         <IncomeNotificationPrompt
           open={!!incomeNotificationTransaction}
           onOpenChange={() => setIncomeNotificationTransaction(null)}
           transaction={incomeNotificationTransaction}
           onComplete={() => setIncomeNotificationTransaction(null)}
         />
       )}
     </div>
   );
 }