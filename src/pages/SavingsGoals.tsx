import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Target, 
  Calendar,
  DollarSign,
  TrendingUp,
  Plane,
  Home,
  Car,
  GraduationCap,
  Heart,
  MoreHorizontal
} from "lucide-react";

interface SavingsGoal {
  id: string;
  name: string;
  icon: any;
  color: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  monthlyContribution: number;
  priority: "High" | "Medium" | "Low";
  status: "Active" | "Completed" | "Paused";
}

const SavingsGoals = () => {
  const [goals, setGoals] = useState<SavingsGoal[]>([
    {
      id: "1",
      name: "Emergency Fund",
      icon: Target,
      color: "hsl(var(--destructive))",
      targetAmount: 15000,
      currentAmount: 8500,
      deadline: "2024-12-31",
      monthlyContribution: 500,
      priority: "High",
      status: "Active"
    },
    {
      id: "2",
      name: "Vacation to Japan",
      icon: Plane,
      color: "hsl(var(--primary))",
      targetAmount: 5000,
      currentAmount: 2800,
      deadline: "2024-06-15",
      monthlyContribution: 400,
      priority: "Medium",
      status: "Active"
    },
    {
      id: "3",
      name: "House Down Payment",
      icon: Home,
      color: "hsl(var(--accent))",
      targetAmount: 50000,
      currentAmount: 12000,
      deadline: "2025-08-01",
      monthlyContribution: 800,
      priority: "High",
      status: "Active"
    },
    {
      id: "4",
      name: "New Car",
      icon: Car,
      color: "hsl(var(--warning))",
      targetAmount: 25000,
      currentAmount: 25000,
      deadline: "2024-01-15",
      monthlyContribution: 0,
      priority: "Medium",
      status: "Completed"
    },
    {
      id: "5",
      name: "Wedding Fund",
      icon: Heart,
      color: "hsl(190 60% 50%)",
      targetAmount: 20000,
      currentAmount: 5500,
      deadline: "2024-09-20",
      monthlyContribution: 600,
      priority: "High",
      status: "Active"
    }
  ]);

  const activeGoals = goals.filter(goal => goal.status === "Active");
  const completedGoals = goals.filter(goal => goal.status === "Completed");
  const totalTargetAmount = activeGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalCurrentAmount = activeGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const totalMonthlyContribution = activeGoals.reduce((sum, goal) => sum + goal.monthlyContribution, 0);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "bg-destructive text-destructive-foreground";
      case "Medium": return "bg-warning text-warning-foreground";
      case "Low": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-primary text-primary-foreground";
      case "Completed": return "bg-success text-success-foreground";
      case "Paused": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getDaysRemaining = (deadline: string) => {
    const today = new Date();
    const target = new Date(deadline);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getMonthsToGoal = (target: number, current: number, monthly: number) => {
    if (monthly <= 0) return Infinity;
    return Math.ceil((target - current) / monthly);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Savings Goals</h1>
          <p className="text-muted-foreground mt-1">Track progress toward your financial goals</p>
        </div>
        <div className="flex items-center gap-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground hover:scale-105 shadow-elegant">
                <Plus className="h-4 w-4 mr-2" />
                New Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Savings Goal</DialogTitle>
                <DialogDescription>
                  Set a new savings goal to track your progress
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="goalName">Goal Name</Label>
                  <Input id="goalName" placeholder="e.g. Emergency Fund" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="targetAmount">Target Amount</Label>
                    <Input id="targetAmount" type="number" placeholder="10000" />
                  </div>
                  <div>
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input id="deadline" type="date" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currentAmount">Current Amount</Label>
                    <Input id="currentAmount" type="number" placeholder="0" />
                  </div>
                  <div>
                    <Label htmlFor="monthlyContribution">Monthly Contribution</Label>
                    <Input id="monthlyContribution" type="number" placeholder="500" />
                  </div>
                </div>
                <Button className="w-full">Create Goal</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Goal Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">${totalTargetAmount.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">{activeGoals.length} active goals</p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">${totalCurrentAmount.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {((totalCurrentAmount / totalTargetAmount) * 100).toFixed(1)}% of goals
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Contributions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">${totalMonthlyContribution.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">Per month</p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{completedGoals.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Achieved</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Goals */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-6">Active Goals</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeGoals.map((goal) => {
            const percentage = (goal.currentAmount / goal.targetAmount) * 100;
            const remaining = goal.targetAmount - goal.currentAmount;
            const daysRemaining = getDaysRemaining(goal.deadline);
            const monthsToGoal = getMonthsToGoal(goal.targetAmount, goal.currentAmount, goal.monthlyContribution);
            
            return (
              <Card key={goal.id} className="shadow-card border-border/50 hover:shadow-elegant transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg text-white"
                        style={{ backgroundColor: goal.color }}
                      >
                        <goal.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{goal.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getPriorityColor(goal.priority)}>
                            {goal.priority}
                          </Badge>
                          <Badge className={getStatusColor(goal.status)}>
                            {goal.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Progress</span>
                      <span className="text-sm font-medium text-foreground">
                        ${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={percentage} className="h-3" />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm font-medium text-success">
                        {percentage.toFixed(1)}% complete
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ${remaining.toLocaleString()} remaining
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Deadline</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(goal.deadline).toLocaleDateString()}
                      </p>
                      <p className={`text-xs ${daysRemaining < 30 ? 'text-warning' : 'text-muted-foreground'}`}>
                        {daysRemaining > 0 ? `${daysRemaining} days left` : 'Overdue'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Monthly</p>
                      <p className="font-medium flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${goal.monthlyContribution.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {monthsToGoal === Infinity ? 'No contributions' : `${monthsToGoal} months to goal`}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Add Money
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      Edit Goal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Completed Goals</h2>
          <div className="space-y-3">
            {completedGoals.map((goal) => (
              <Card key={goal.id} className="shadow-card border-border/50 opacity-80">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg text-white opacity-80"
                        style={{ backgroundColor: goal.color }}
                      >
                        <goal.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{goal.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Completed • ${goal.targetAmount.toLocaleString()} saved
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(goal.status)}>
                        {goal.status}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        Target: {new Date(goal.deadline).toLocaleDateString()}
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

export default SavingsGoals;