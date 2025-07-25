import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  EyeOff,
  MoreHorizontal,
  Edit,
  Trash2
} from "lucide-react";

interface BankAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  accountNumber: string;
  isActive: boolean;
  createdDate: string;
  closedDate?: string;
}

const BankAccounts = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([
    {
      id: "1",
      name: "Chase Checking",
      type: "checking",
      balance: 4250.75,
      accountNumber: "****1234",
      isActive: true,
      createdDate: "2023-01-15"
    },
    {
      id: "2", 
      name: "High Yield Savings",
      type: "savings",
      balance: 15750.00,
      accountNumber: "****5678",
      isActive: true,
      createdDate: "2023-03-20"
    },
    {
      id: "3",
      name: "Investment Account",
      type: "investment",
      balance: 8500.25,
      accountNumber: "****9012",
      isActive: true,
      createdDate: "2023-06-10"
    },
    {
      id: "4",
      name: "Old Checking",
      type: "checking",
      balance: 0,
      accountNumber: "****3456",
      isActive: false,
      createdDate: "2022-01-01",
      closedDate: "2023-12-31"
    }
  ]);

  const [showBalances, setShowBalances] = useState(true);

  const activeAccounts = accounts.filter(account => account.isActive);
  const closedAccounts = accounts.filter(account => !account.isActive);
  const totalBalance = activeAccounts.reduce((sum, account) => sum + account.balance, 0);

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case "checking": return "bg-primary text-primary-foreground";
      case "savings": return "bg-success text-success-foreground";
      case "investment": return "bg-accent text-accent-foreground";
      case "cash": return "bg-warning text-warning-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getAccountTypeIcon = (type: string) => {
    return <Wallet className="h-4 w-4" />;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bank Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage your bank accounts and track balances</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setShowBalances(!showBalances)}
            className="gap-2"
          >
            {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showBalances ? "Hide" : "Show"} Balances
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground hover:scale-105 shadow-elegant">
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Bank Account</DialogTitle>
                <DialogDescription>
                  Create a new bank account to track your finances
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input id="accountName" placeholder="e.g. Chase Checking" />
                </div>
                <div>
                  <Label htmlFor="accountType">Account Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Checking</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="investment">Investment</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="initialBalance">Initial Balance</Label>
                  <Input id="initialBalance" type="number" placeholder="0.00" />
                </div>
                <div>
                  <Label htmlFor="accountNumber">Account Number (last 4 digits)</Label>
                  <Input id="accountNumber" placeholder="1234" maxLength={4} />
                </div>
                <Button className="w-full">Add Account</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Account Summary</span>
            <Badge variant="secondary">{activeAccounts.length} Active Accounts</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <p className="text-2xl font-bold text-foreground">
                {showBalances ? `$${totalBalance.toLocaleString()}` : "••••••"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Active Accounts</p>
              <p className="text-2xl font-bold text-primary">{activeAccounts.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Closed Accounts</p>
              <p className="text-2xl font-bold text-muted-foreground">{closedAccounts.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Accounts */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Active Accounts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeAccounts.map((account) => (
            <Card key={account.id} className="shadow-card border-border/50 hover:shadow-elegant transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getAccountTypeColor(account.type)}`}>
                      {getAccountTypeIcon(account.type)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{account.name}</CardTitle>
                      <CardDescription className="capitalize">{account.type}</CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Balance</p>
                    <p className="text-2xl font-bold text-foreground">
                      {showBalances ? `$${account.balance.toLocaleString()}` : "••••••"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Account Number</p>
                    <p className="text-sm font-mono">{account.accountNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Opened</p>
                    <p className="text-sm">{new Date(account.createdDate).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      View Transactions
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Closed Accounts */}
      {closedAccounts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Closed Accounts</h2>
          <div className="space-y-3">
            {closedAccounts.map((account) => (
              <Card key={account.id} className="shadow-card border-border/50 opacity-60">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getAccountTypeColor(account.type)} opacity-50`}>
                        {getAccountTypeIcon(account.type)}
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{account.name}</h3>
                        <p className="text-sm text-muted-foreground capitalize">{account.type} • {account.accountNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">Closed</Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        {account.closedDate && new Date(account.closedDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BankAccounts;