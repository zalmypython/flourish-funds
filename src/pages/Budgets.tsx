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
import { useFirestore, FirebaseDocument } from "@/hooks/useFirestore";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "@/components/AuthModal";
import { 
  Plus, 
  PieChart, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Car,
  Home,
  Utensils,
  Coffee,
  Heart,
  MoreHorizontal,
  Edit,
  Trash2
} from "lucide-react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface BudgetCategory extends FirebaseDocument {
  name: string;
  icon: string;
  color: string;
  budgeted: number;
  spent: number;
  transactions: number;
}

const Budgets = () => {
  const { user } = useAuth();
  const { documents: categories, loading, addDocument, updateDocument, deleteDocument } = useFirestore<BudgetCategory>('budgetCategories');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    budget: "",
    category: ""
  });

  const { toast } = useToast();

  if (!user) {
    return <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />;
  }

  const totalBudgeted = categories.reduce((sum, cat) => sum + cat.budgeted, 0);
  const totalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const overBudgetCategories = categories.filter(cat => cat.spent > cat.budgeted);

  const chartData = categories.map(cat => ({
    name: cat.name,
    spent: cat.spent,
    budgeted: cat.budgeted,
    color: cat.color
  }));

  const pieData = categories.map(cat => ({
    name: cat.name,
    value: cat.spent,
    color: cat.color
  }));

  const chartConfig = {
    spent: { label: "Spent", color: "hsl(var(--primary))" },
    budgeted: { label: "Budgeted", color: "hsl(var(--muted))" }
  };

  const getProgressColor = (spent: number, budgeted: number) => {
    const percentage = (spent / budgeted) * 100;
    if (percentage > 100) return "bg-destructive";
    if (percentage > 80) return "bg-warning";
    return "bg-primary";
  };

  const categoryIconMap: Record<string, string> = {
    "Food & Dining": "Utensils",
    "Transportation": "Car", 
    "Shopping": "ShoppingCart",
    "Bills & Utilities": "Home",
    "Entertainment": "Coffee",
    "Health & Fitness": "Heart"
  };

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      Utensils, Car, ShoppingCart, Home, Coffee, Heart, DollarSign
    };
    return icons[iconName] || DollarSign;
  };

  const categoryColorMap: Record<string, string> = {
    "Food & Dining": "hsl(var(--accent))",
    "Transportation": "hsl(var(--primary))",
    "Shopping": "hsl(var(--warning))",
    "Bills & Utilities": "hsl(var(--destructive))",
    "Entertainment": "hsl(var(--success))",
    "Health & Fitness": "hsl(190 60% 50%)"
  };

  const handleAddCategory = async () => {
    if (!formData.name || !formData.budget || !formData.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    await addDocument({
      name: formData.name,
      icon: categoryIconMap[formData.category] || "DollarSign",
      color: categoryColorMap[formData.category] || "hsl(var(--muted))",
      budgeted: parseFloat(formData.budget),
      spent: 0,
      transactions: 0
    });

    setFormData({ name: "", budget: "", category: "" });
    setIsAddDialogOpen(false);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    await deleteDocument(categoryId);
  };

  const handleAddTransaction = async (categoryId: string, amount: number) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      await updateDocument(categoryId, {
        spent: category.spent + amount,
        transactions: category.transactions + 1
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Budgets</h1>
          <p className="text-muted-foreground mt-1">Track spending across categories and stay on budget</p>
        </div>
        <div className="flex items-center gap-4">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground hover:scale-105 shadow-elegant">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Budget Category</DialogTitle>
                <DialogDescription>
                  Create a new budget category to track your spending
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="categoryName">Category Name</Label>
                  <Input 
                    id="categoryName" 
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Groceries" 
                  />
                </div>
                <div>
                  <Label htmlFor="monthlyBudget">Monthly Budget</Label>
                  <Input 
                    id="monthlyBudget" 
                    type="number" 
                    value={formData.budget}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                    placeholder="500" 
                  />
                </div>
                <div>
                  <Label htmlFor="categoryIcon">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Food & Dining">Food & Dining</SelectItem>
                      <SelectItem value="Transportation">Transportation</SelectItem>
                      <SelectItem value="Shopping">Shopping</SelectItem>
                      <SelectItem value="Bills & Utilities">Bills & Utilities</SelectItem>
                      <SelectItem value="Entertainment">Entertainment</SelectItem>
                      <SelectItem value="Health & Fitness">Health & Fitness</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddCategory} className="w-full">Add Category</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Budgeted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">${totalBudgeted.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">${totalSpent.toLocaleString()}</p>
            <p className={`text-sm mt-1 ${totalSpent > totalBudgeted ? 'text-destructive' : 'text-success'}`}>
              {((totalSpent / totalBudgeted) * 100).toFixed(1)}% of budget
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalRemaining >= 0 ? 'text-success' : 'text-destructive'}`}>
              ${Math.abs(totalRemaining).toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {totalRemaining >= 0 ? 'Under budget' : 'Over budget'}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">{overBudgetCategories.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Over budget</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle>Spending Overview</CardTitle>
            <CardDescription>Budgeted vs actual spending by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="budgeted" fill="hsl(var(--muted))" name="Budgeted" />
                  <Bar dataKey="spent" fill="hsl(var(--primary))" name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle>Spending Distribution</CardTitle>
            <CardDescription>How your money is being spent</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Category Cards */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Budget Categories</h2>
          {overBudgetCategories.length > 0 && (
            <div className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{overBudgetCategories.length} categories over budget</span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const percentage = (category.spent / category.budgeted) * 100;
            const isOverBudget = category.spent > category.budgeted;
            const remaining = category.budgeted - category.spent;
            
            return (
              <Card key={category.id} className="shadow-card border-border/50 hover:shadow-elegant transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg text-white"
                        style={{ backgroundColor: category.color }}
                      >
                        {(() => {
                          const IconComponent = getIconComponent(category.icon);
                          return <IconComponent className="h-4 w-4" />;
                        })()}
                      </div>
                      <div>
                        <CardTitle className="text-base">{category.name}</CardTitle>
                        <CardDescription>{category.transactions} transactions</CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleAddTransaction(category.id, 50)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(category.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">
                        ${category.spent.toLocaleString()} / ${category.budgeted.toLocaleString()}
                      </span>
                      <span className={`text-sm font-medium ${isOverBudget ? 'text-destructive' : 'text-success'}`}>
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(percentage, 100)} 
                      className="h-2"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className={`text-sm font-medium ${isOverBudget ? 'text-destructive' : 'text-success'}`}>
                        {isOverBudget 
                          ? `$${Math.abs(remaining).toLocaleString()} over budget`
                          : `$${remaining.toLocaleString()} remaining`
                        }
                      </span>
                      {isOverBudget && (
                        <div className="flex items-center gap-1 text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleAddTransaction(category.id, 25)}>
                      Add $25
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleAddTransaction(category.id, 100)}>
                      Add $100
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Budgets;