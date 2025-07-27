import { useAuth } from "@/hooks/useAuth";
import { useFirestore } from "@/hooks/useFirestore";
import { AuthModal } from "@/components/AuthModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, EyeOff, Edit, CreditCard, PiggyBank, Building, Building2, Archive, RefreshCcw, LinkIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { PlaidLinkButton, BankConnectionCard } from "@/components/PlaidLinkButton";
import { useBankConnections } from "@/hooks/useBankConnections";
import { Separator } from "@/components/ui/separator";

interface BankAccount {
  id: string;
  userId: string;
  name: string;
  type: string;
  initialBalance: number;
  currentBalance?: number;
  accountNumber: string;
  routingNumber?: string;
  isActive: boolean;
  createdDate: string;
  closedDate?: string;
}

export default function BankAccounts() {
  const { user, loading: authLoading } = useAuth();
  const { 
    documents: bankAccounts, 
    loading,
    addDocument,
    updateDocument 
  } = useFirestore('bankAccounts');
  
  const {
    connections,
    isLoading: connectionsLoading,
    addConnection,
    removeConnection,
    syncAllConnections,
    getTotalBalance
  } = useBankConnections();

  const [showBalances, setShowBalances] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    initialBalance: '',
    accountNumber: '',
    routingNumber: '',
    description: ''
  });

  const { toast } = useToast();

  // Show auth modal if not authenticated
  if (!user && !authLoading) {
    return <AuthModal open={!user} onOpenChange={() => {}} />;
  }

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Filter accounts
  const activeBankAccounts = useMemo(() => {
    return bankAccounts?.filter(account => (account as any).isActive) || [];
  }, [bankAccounts]);

  const inactiveBankAccounts = useMemo(() => {
    return bankAccounts?.filter(account => !(account as any).isActive) || [];
  }, [bankAccounts]);

  // Handle account actions
  const handleDeactivateAccount = async (accountId: string) => {
    try {
      await updateDocument(accountId, {
        ...bankAccounts.find(acc => acc.id === accountId),
        isActive: false,
        closedDate: new Date().toISOString().split('T')[0]
      } as any);
      toast({
        title: "Account Deactivated",
        description: "Bank account has been deactivated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to deactivate account. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRestoreAccount = async (accountId: string) => {
    try {
      await updateDocument(accountId, {
        ...bankAccounts.find(acc => acc.id === accountId),
        isActive: true,
        closedDate: undefined
      } as any);
      toast({
        title: "Account Restored",
        description: "Bank account has been restored successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to restore account. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getAccountTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'checking':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'savings':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'investment':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'credit':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'checking':
        return <CreditCard className="h-4 w-4" />;
      case 'savings':
        return <PiggyBank className="h-4 w-4" />;
      case 'investment':
        return <Building className="h-4 w-4" />;
      default:
        return <Building2 className="h-4 w-4" />;
    }
  };

  const handleAddAccount = async () => {
    if (!formData.name || !formData.type || !formData.initialBalance) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addDocument({
        name: formData.name,
        type: formData.type,
        initialBalance: parseFloat(formData.initialBalance),
        currentBalance: parseFloat(formData.initialBalance),
        accountNumber: formData.accountNumber ? `****${formData.accountNumber.slice(-4)}` : '',
        routingNumber: formData.routingNumber || '',
        isActive: true,
        createdDate: new Date().toISOString().split('T')[0],
        description: formData.description || ''
      });

      toast({
        title: "Account Added",
        description: "Bank account has been added successfully.",
      });

      // Reset form
      setFormData({
        name: '',
        type: '',
        initialBalance: '',
        accountNumber: '',
        routingNumber: '',
        description: ''
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add account. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Calculate balances
  const totalBalance = activeBankAccounts.reduce((sum, account) => {
    const acc = account as any;
    return sum + (acc.currentBalance || acc.initialBalance || 0);
  }, 0);
  
  const connectedAccountsBalance = getTotalBalance();

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Show auth modal if needed */}
      {showAuthModal && <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Bank Accounts</h1>
          <p className="text-muted-foreground">Manage your bank accounts and track balances</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            variant="outline"
            onClick={() => setShowInactive(!showInactive)}
            className="flex items-center gap-2"
          >
            <Archive className="h-4 w-4" />
            {showInactive ? 'Hide Inactive' : 'Show Inactive'} ({inactiveBankAccounts.length})
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowBalances(!showBalances)}
            className="flex items-center gap-2"
          >
            {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showBalances ? 'Hide' : 'Show'} Balances
          </Button>

          <Button
            variant="outline"
            onClick={syncAllConnections}
            disabled={connectionsLoading || connections.length === 0}
            className="flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Sync All Banks
          </Button>

          <PlaidLinkButton
            onSuccess={addConnection}
            variant="secondary"
            className="flex items-center gap-2"
          />

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Manual Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Bank Account</DialogTitle>
                <DialogDescription>
                  Add a new bank account to track your finances manually.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Account Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My Checking Account"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Account Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Checking</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="investment">Investment</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="initialBalance">Initial Balance</Label>
                  <Input
                    id="initialBalance"
                    type="number"
                    step="0.01"
                    value={formData.initialBalance}
                    onChange={(e) => setFormData(prev => ({ ...prev, initialBalance: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="accountNumber">Account Number (optional)</Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                    placeholder="Last 4 digits"
                    maxLength={4}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Additional notes about this account"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleAddAccount}>
                  Add Account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Account Summary
          </CardTitle>
          <CardDescription>
            Overview of your bank accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {showBalances ? `$${(totalBalance + connectedAccountsBalance).toFixed(2)}` : '••••••'}
              </div>
              <div className="text-sm text-muted-foreground">Total Balance</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {showBalances ? `$${connectedAccountsBalance.toFixed(2)}` : '••••••'}
              </div>
              <div className="text-sm text-muted-foreground">Connected Banks</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{activeBankAccounts.length}</div>
              <div className="text-sm text-muted-foreground">Manual Accounts</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{inactiveBankAccounts.length}</div>
              <div className="text-sm text-muted-foreground">Inactive Accounts</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connected Bank Accounts */}
      {connections.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Connected Bank Accounts</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connections.map((connection) => (
              <BankConnectionCard
                key={connection.id}
                connection={connection}
                onRemove={removeConnection}
              />
            ))}
          </div>
        </div>
      )}

      {activeBankAccounts.length > 0 && (
        <Separator className="my-6" />
      )}

      {/* Manual Bank Accounts */}
      {activeBankAccounts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Manual Bank Accounts</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeBankAccounts.map((account) => {
              const acc = account as any;
              return (
              <Card key={account.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getAccountTypeColor(acc.type)}`}>
                        {getAccountTypeIcon(acc.type)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{acc.name}</CardTitle>
                        <CardDescription className="capitalize">{acc.type}</CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        /* TODO: Add edit functionality */
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-2xl font-bold">
                      {showBalances ? 
                        `$${(acc.currentBalance || acc.initialBalance || 0).toLocaleString()}` : 
                        '••••••'
                      }
                    </p>
                  </div>
                  {acc.accountNumber && (
                    <div>
                      <p className="text-sm text-muted-foreground">Account Number</p>
                      <p className="text-sm font-mono">{acc.accountNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Opened</p>
                    <p className="text-sm">{new Date(acc.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Link to={`/accounts/${account.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        View Details
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Archive className="h-4 w-4 mr-1" />
                          Deactivate
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Deactivate Account</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to deactivate this account? You can restore it later if needed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeactivateAccount(account.id)}>
                            Deactivate
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Inactive Accounts */}
      {showInactive && inactiveBankAccounts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Inactive Accounts</h2>
          <div className="space-y-4">
            {inactiveBankAccounts.map((account) => {
              const acc = account as any;
              return (
              <Card key={account.id} className="opacity-60">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getAccountTypeColor(acc.type)}`}>
                        {getAccountTypeIcon(acc.type)}
                      </div>
                      <div>
                        <h3 className="font-semibold">{acc.name}</h3>
                        <p className="text-sm text-muted-foreground capitalize">
                          {acc.type} {acc.accountNumber && `• ${acc.accountNumber}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge variant="secondary">Inactive</Badge>
                        {acc.closedDate && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Closed: {new Date(acc.closedDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreAccount(account.id)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <RefreshCcw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}