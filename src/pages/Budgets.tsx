import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_CATEGORIES } from "@/types";
import { useApiFirestore } from "@/hooks/useApiFirestore";
import { useApiAuth } from "@/hooks/useApiAuth";
import { BaseDocument } from "@/types";
import { AuthModal } from "@/components/AuthModal";
import { Plus, Target, AlertTriangle, DollarSign, Calendar, Trash2 } from "lucide-react";

interface Budget extends BaseDocument {
  name: string;
  category: string;
  amount: number;
  spent: number;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  alertThreshold: number; // percentage
  status: 'active' | 'exceeded' | 'completed';
}

const Budgets = () => {
  const { user } = useApiAuth();
  const { documents: budgets, loading, addDocument, updateDocument, deleteDocument } = useApiFirestore<Budget>('budgets');
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    amount: "",
    period: "monthly" as 'weekly' | 'monthly' | 'yearly',
    alertThreshold: 80
  });

  if (!user) {
    return <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />;
  }

  const activeBudgets = budgets.filter(budget => budget.status === 'active');
  const totalBudgeted = activeBudgets.reduce((sum, budget) => sum + budget.amount, 0);
  const totalSpent = activeBudgets.reduce((sum, budget) => sum + budget.spent, 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const overBudgetCount = activeBudgets.filter(budget => budget.spent > budget.amount).length;

  const handleAddBudget = async () => {
    if (!formData.name || !formData.amount || !formData.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      const now = new Date();
      const endDate = new Date(now);
      
      switch (formData.period) {
        case 'weekly':
          endDate.setDate(now.getDate() + 7);
          break;
        case 'monthly':
          endDate.setMonth(now.getMonth() + 1);
          break;
        case 'yearly':
          endDate.setFullYear(now.getFullYear() + 1);
          break;
      }

      await addDocument({
        name: formData.name,
        category: formData.category,
        amount: parseFloat(formData.amount),
        spent: 0,
        period: formData.period,
        startDate: now.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        alertThreshold: formData.alertThreshold,
        status: 'active'
      });

      setFormData({
        name: "",
        category: "",
        amount: "",
        period: "monthly",
        alertThreshold: 80
      });
      setIsAddDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Budget created successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create budget. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    try {
      await deleteDocument(budgetId);
      toast({
        title: "Success",
        description: "Budget deleted successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete budget. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getBudgetProgress = (budget: Budget) => {
    return (budget.spent / budget.amount) * 100;
  };

  const getBudgetStatus = (budget: Budget) => {
    const progress = getBudgetProgress(budget);
    if (progress >= 100) return 'exceeded';
    if (progress >= budget.alertThreshold) return 'warning';
    return 'good';
  };

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Budgets</h1>
          <p className="text-muted-foreground mt-1">Create and track your spending budgets</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Budget</DialogTitle>
              <DialogDescription>
                Set up a new budget to track your spending in a specific category
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="budgetName">Budget Name</Label>
                <Input 
                  id="budgetName" 
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Groceries, Entertainment, Gas" 
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Budget Amount</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="500" 
                  />
                </div>
                <div>
                  <Label htmlFor="period">Period</Label>
                  <Select value={formData.period} onValueChange={(value: any) => setFormData(prev => ({ ...prev, period: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="alertThreshold">Alert Threshold (%)</Label>
                <Input 
                  id="alertThreshold" 
                  type="number" 
                  value={formData.alertThreshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, alertThreshold: parseInt(e.target.value) }))}
                  placeholder="80" 
                  min="0"
                  max="100"
                />
              </div>
              <Button onClick={handleAddBudget} className="w-full">Create Budget</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalBudgeted.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Active budgets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSpent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {totalBudgeted > 0 ? `${((totalSpent / totalBudgeted) * 100).toFixed(1)}%` : '0%'} of budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${Math.abs(totalRemaining).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalRemaining >= 0 ? 'Under budget' : 'Over budget'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{overBudgetCount}</div>
            <p className="text-xs text-muted-foreground">Over budget</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget List */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Active Budgets</h2>
        {activeBudgets.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No budgets created yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first budget to start tracking your spending and stay on top of your finances.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Budget
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeBudgets.map((budget) => {
              const progress = getBudgetProgress(budget);
              const status = getBudgetStatus(budget);
              const remaining = budget.amount - budget.spent;
              
              return (
                <Card key={budget.id} className="shadow-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{budget.name}</CardTitle>
                        <CardDescription>
                          {budget.period} • {DEFAULT_CATEGORIES.find(c => c.id === budget.category)?.name}
                        </CardDescription>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteBudget(budget.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">
                          ${budget.spent.toLocaleString()} / ${budget.amount.toLocaleString()}
                        </span>
                        <Badge variant={status === 'exceeded' ? 'destructive' : status === 'warning' ? 'secondary' : 'default'}>
                          {progress.toFixed(0)}%
                        </Badge>
                      </div>
                      <Progress 
                        value={Math.min(progress, 100)} 
                        className="h-2"
                      />
                      <div className="flex justify-between items-center mt-2">
                        <span className={`text-sm ${status === 'exceeded' ? 'text-red-600' : 'text-green-600'}`}>
                          {remaining >= 0 
                            ? `$${remaining.toLocaleString()} remaining`
                            : `$${Math.abs(remaining).toLocaleString()} over budget`
                          }
                        </span>
                        {status === 'exceeded' && (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Until {new Date(budget.endDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Budgets;