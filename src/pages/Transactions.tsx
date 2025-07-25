import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFirestore, FirebaseDocument } from '@/hooks/useFirestore';
import { useAccountBalance } from '@/hooks/useAccountBalance';
import { useToast } from '@/hooks/use-toast';
import { Transaction, DEFAULT_CATEGORIES, BankAccount, CreditCard } from '@/types';
import { AuthModal } from '@/components/AuthModal';
import { TransferModal } from '@/components/TransferModal';
import { QuickTransactionEntry } from '@/components/QuickTransactionEntry';
import { EnhancedTransactionList } from '@/components/EnhancedTransactionList';
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

interface Budget extends FirebaseDocument {
  name: string;
  category: string;
  amount: number;
  spent: number;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  alertThreshold: number;
  status: 'active' | 'exceeded' | 'completed';
}


export const Transactions = () => {
  const { user } = useAuth();
  const { documents: transactions, loading, deleteDocument } = useFirestore<Transaction>('transactions');
  const { documents: bankAccounts } = useFirestore<BankAccount>('bankAccounts');
  const { documents: creditCards } = useFirestore<CreditCard>('creditCards');
  const { documents: budgets } = useFirestore<Budget>('budgets');
  const { addTransactionWithBalanceUpdate } = useAccountBalance();
  const { toast } = useToast();
  
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
    budgetId: '',
    accountId: '',
    accountType: 'bank' as 'bank' | 'credit',
    type: 'expense' as 'income' | 'expense' | 'transfer' | 'payment',
    notes: '',
    status: 'cleared' as 'pending' | 'cleared' | 'reconciled'
  });

  // Get active budgets for expenses
  const activeBudgets = budgets.filter(budget => budget.status === 'active');

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
    if (!formData.amount || !formData.description || !formData.accountId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    
    // For expenses, check if budget is selected
    if (formData.type === 'expense' && !formData.budgetId) {
      toast({
        title: "Budget Required",
        description: "Please select a budget for expense transactions.",
        variant: "destructive"
      });
      return;
    }

    try {
      // For expenses, use budget's category. For income, use 'income' category
      const category = formData.type === 'expense' && formData.budgetId
        ? budgets.find(b => b.id === formData.budgetId)?.category || 'other'
        : formData.type === 'income' ? 'income' : 'other';

      await addTransactionWithBalanceUpdate({
        date: formData.date,
        amount: parseFloat(formData.amount),
        description: formData.description,
        category,
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
        budgetId: '',
        accountId: '',
        accountType: 'bank',
        type: 'expense',
        notes: '',
        status: 'cleared'
      });
      
      setIsAddDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Transaction added successfully!",
      });
    } catch (error) {
      console.error('Failed to add transaction:', error);
      toast({
        title: "Error",
        description: "Failed to add transaction. Please try again.",
        variant: "destructive"
      });
    }
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
                    <Label>Budget/Category</Label>
                    {formData.type === 'expense' ? (
                      activeBudgets.length > 0 ? (
                        <Select value={formData.budgetId} onValueChange={(value) => setFormData({ ...formData, budgetId: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Budget" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border z-50">
                            {activeBudgets.map((budget) => (
                              <SelectItem key={budget.id} value={budget.id}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{budget.name}</span>
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    ${budget.amount - budget.spent} left
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center justify-center h-10 px-3 border rounded-md bg-muted text-muted-foreground">
                          No active budgets available
                        </div>
                      )
                    ) : (
                      <div className="flex items-center justify-center h-10 px-3 border rounded-md bg-muted text-muted-foreground">
                        No budget needed for {formData.type}
                      </div>
                    )}
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
                <Button 
                  onClick={handleAddTransaction}
                  disabled={!formData.amount || !formData.description || !formData.accountId || (formData.type === 'expense' && !formData.budgetId)}
                >
                  Add Transaction
                </Button>
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

      {/* Enhanced Transaction List */}
      <EnhancedTransactionList />
    </div>
  );
};