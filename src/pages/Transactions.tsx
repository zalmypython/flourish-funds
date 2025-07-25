import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFirestore } from '@/hooks/useFirestore';
import { Transaction, DEFAULT_CATEGORIES, BankAccount, CreditCard } from '@/types';
import { AuthModal } from '@/components/AuthModal';
import { TransferModal } from '@/components/TransferModal';
import { QuickTransactionEntry } from '@/components/QuickTransactionEntry';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Search, Filter, Calendar, DollarSign, ArrowUpDown, Eye, EyeOff, ArrowRightLeft, Zap } from 'lucide-react';
import { format } from 'date-fns';


export const Transactions = () => {
  const { user } = useAuth();
  const { documents: transactions, loading, addDocument, deleteDocument } = useFirestore<Transaction>('transactions');
  const { documents: bankAccounts } = useFirestore<BankAccount>('bankAccounts');
  const { documents: creditCards } = useFirestore<CreditCard>('creditCards');
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [showAmounts, setShowAmounts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState('all');
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    category: '',
    accountId: '',
    accountType: 'bank' as 'bank' | 'credit',
    type: 'expense' as 'income' | 'expense' | 'transfer' | 'payment',
    notes: '',
    status: 'cleared' as 'pending' | 'cleared' | 'reconciled'
  });

  if (!user) {
    return <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const handleAddTransaction = async () => {
    if (!formData.amount || !formData.description || !formData.accountId) return;

    await addDocument({
      date: formData.date,
      amount: parseFloat(formData.amount),
      description: formData.description,
      category: formData.category || 'other',
      accountId: formData.accountId,
      accountType: formData.accountType,
      type: formData.type,
      notes: formData.notes,
      status: formData.status
    });

    setFormData({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      description: '',
      category: '',
      accountId: '',
      accountType: 'bank',
      type: 'expense',
      notes: '',
      status: 'cleared'
    });
    setIsAddDialogOpen(false);
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || transaction.category === selectedCategory;
    const matchesAccount = selectedAccount === 'all' || transaction.accountId === selectedAccount;
    
    return matchesSearch && matchesCategory && matchesAccount;
  });

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const allAccounts = [
    ...bankAccounts.map(acc => ({ ...acc, type: 'bank' })),
    ...creditCards.map(card => ({ ...card, type: 'credit' }))
  ];

  const getAccountName = (accountId: string, accountType: string) => {
    if (accountType === 'bank') {
      const account = bankAccounts.find(acc => acc.id === accountId);
      return account?.name || 'Unknown Account';
    } else {
      const card = creditCards.find(card => card.id === accountId);
      return card?.name || 'Unknown Card';
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = DEFAULT_CATEGORIES.find(c => c.id === category);
    return cat?.icon || 'MoreHorizontal';
  };

  const formatAmount = (amount: number, type: string) => {
    const formatted = showAmounts ? `$${amount.toFixed(2)}` : '••••';
    return type === 'income' ? `+${formatted}` : `-${formatted}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">Track and manage all your financial transactions</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAmounts(!showAmounts)}
          >
            {showAmounts ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsTransferModalOpen(true)}
          >
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Transfer
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Transaction</DialogTitle>
                <DialogDescription>
                  Record a new financial transaction to track your spending and income.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Transaction description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                        <SelectItem value="payment">Credit Card Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEFAULT_CATEGORIES.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <Select value={formData.accountType} onValueChange={(value: any) => setFormData({ ...formData, accountType: value, accountId: '' })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank">Bank Account</SelectItem>
                        <SelectItem value="credit">Credit Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Account</Label>
                    <Select value={formData.accountId} onValueChange={(value) => setFormData({ ...formData, accountId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.accountType === 'bank' 
                          ? bankAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name}
                              </SelectItem>
                            ))
                          : creditCards.map((card) => (
                              <SelectItem key={card.id} value={card.id}>
                                {card.name}
                              </SelectItem>
                            ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes about this transaction"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddTransaction}>Add Transaction</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Transfer Modal */}
      <TransferModal 
        open={isTransferModalOpen} 
        onOpenChange={setIsTransferModalOpen} 
      />

      {/* Quick Transaction Entry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <QuickTransactionEntry />
        </div>
        <div className="lg:col-span-1">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={() => setIsTransferModalOpen(true)}
                className="w-full justify-start"
                variant="outline"
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transfer Money
              </Button>
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                className="w-full justify-start"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {showAmounts ? `$${totalIncome.toFixed(2)}` : '••••••'}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {showAmounts ? `$${totalExpenses.toFixed(2)}` : '••••••'}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {showAmounts ? `$${(totalIncome - totalExpenses).toFixed(2)}` : '••••••'}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
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
                  {allAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.type === 'bank' ? 'Bank' : 'Credit'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found. Add your first transaction to get started.
              </div>
            ) : (
              filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full`} style={{ backgroundColor: `${DEFAULT_CATEGORIES.find(c => c.id === transaction.category)?.color}20` }}>
                      <div className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span>{getAccountName(transaction.accountId, transaction.accountType)}</span>
                        <Separator orientation="vertical" className="h-3" />
                        <span>{DEFAULT_CATEGORIES.find(c => c.id === transaction.category)?.name}</span>
                        <Separator orientation="vertical" className="h-3" />
                        <span>{format(new Date(transaction.date), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <Badge variant={transaction.status === 'cleared' ? 'default' : 'secondary'}>
                      {transaction.status}
                    </Badge>
                    <div className={`text-lg font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {formatAmount(transaction.amount, transaction.type)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteDocument(transaction.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};