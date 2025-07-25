import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, FirebaseDocument } from '@/hooks/useFirestore';
import { useAccountBalance } from '@/hooks/useAccountBalance';
import { 
  Target, 
  Plus, 
  TrendingUp, 
  Calendar, 
  DollarSign,
  Zap,
  Home,
  Car,
  Plane,
  GraduationCap,
  Heart,
  Shield
} from 'lucide-react';

interface AccountGoal extends FirebaseDocument {
  name: string;
  type: 'savings' | 'spending_limit' | 'balance_maintenance';
  targetAmount: number;
  currentAmount: number;
  accountId: string;
  accountType: 'bank' | 'credit';
  deadline: string;
  monthlyContribution?: number;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'paused';
  icon: string;
  color: string;
}

interface AccountGoalsManagerProps {
  accountId: string;
  accountType: 'bank' | 'credit';
  accountName: string;
  currentBalance: number;
}

export const AccountGoalsManager = ({ 
  accountId, 
  accountType, 
  accountName, 
  currentBalance 
}: AccountGoalsManagerProps) => {
  const { documents: goals, addDocument, updateDocument } = useFirestore<AccountGoal>('accountGoals');
  const { getSpendingVelocity } = useAccountBalance();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'savings' as 'savings' | 'spending_limit' | 'balance_maintenance',
    targetAmount: '',
    deadline: '',
    monthlyContribution: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    icon: 'Target',
    color: 'hsl(190, 80%, 50%)'
  });

  const accountGoals = goals.filter(g => g.accountId === accountId && g.accountType === accountType);
  const activeGoals = accountGoals.filter(g => g.status === 'active');

  const iconMap: Record<string, any> = {
    Target,
    Home,
    Car,
    Plane,
    GraduationCap,
    Heart,
    Shield,
    DollarSign
  };

  const colorOptions = [
    { name: 'Blue', value: 'hsl(190, 80%, 50%)' },
    { name: 'Green', value: 'hsl(120, 60%, 50%)' },
    { name: 'Orange', value: 'hsl(32, 90%, 55%)' },
    { name: 'Red', value: 'hsl(0, 84%, 60%)' },
    { name: 'Purple', value: 'hsl(270, 50%, 60%)' },
    { name: 'Teal', value: 'hsl(180, 60%, 50%)' }
  ];

  const getGoalProgress = (goal: AccountGoal) => {
    let progress = 0;
    
    switch (goal.type) {
      case 'savings':
        progress = (goal.currentAmount / goal.targetAmount) * 100;
        break;
      case 'balance_maintenance':
        progress = currentBalance >= goal.targetAmount ? 100 : (currentBalance / goal.targetAmount) * 100;
        break;
      case 'spending_limit':
        const velocity = getSpendingVelocity(accountId, accountType, 30);
        const monthlySpending = velocity * 30;
        progress = Math.max(0, 100 - ((monthlySpending / goal.targetAmount) * 100));
        break;
    }
    
    return Math.min(progress, 100);
  };

  const handleCreateGoal = async () => {
    if (!formData.name || !formData.targetAmount || !formData.deadline) return;

    await addDocument({
      name: formData.name,
      type: formData.type,
      targetAmount: parseFloat(formData.targetAmount),
      currentAmount: formData.type === 'balance_maintenance' ? currentBalance : 0,
      accountId,
      accountType,
      deadline: formData.deadline,
      monthlyContribution: formData.monthlyContribution ? parseFloat(formData.monthlyContribution) : 0,
      priority: formData.priority,
      status: 'active',
      icon: formData.icon,
      color: formData.color
    });

    setFormData({
      name: '',
      type: 'savings',
      targetAmount: '',
      deadline: '',
      monthlyContribution: '',
      priority: 'medium',
      icon: 'Target',
      color: 'hsl(190, 80%, 50%)'
    });
    setIsCreateDialogOpen(false);
  };

  const handleQuickContribution = async (goalId: string, amount: number) => {
    const goal = activeGoals.find(g => g.id === goalId);
    if (!goal) return;

    const newAmount = goal.currentAmount + amount;
    const status = newAmount >= goal.targetAmount ? 'completed' : 'active';
    
    await updateDocument(goalId, {
      currentAmount: newAmount,
      status
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeDescription = (type: string) => {
    switch (type) {
      case 'savings': return 'Save money towards this goal';
      case 'spending_limit': return 'Stay under spending limit';
      case 'balance_maintenance': return 'Maintain minimum balance';
      default: return '';
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Account Goals
          </CardTitle>
          <CardDescription>
            Track savings and spending goals for {accountName}
          </CardDescription>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Goal
        </Button>
      </CardHeader>
      <CardContent>
        {activeGoals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Goals Set</h3>
            <p className="text-sm">Create your first goal to start tracking progress</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeGoals.map(goal => {
              const progress = getGoalProgress(goal);
              const IconComponent = iconMap[goal.icon] || Target;
              const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              
              return (
                <div key={goal.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg text-white"
                        style={{ backgroundColor: goal.color }}
                      >
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-medium">{goal.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {getTypeDescription(goal.type)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(goal.priority)}>
                        {goal.priority}
                      </Badge>
                      <Badge variant="outline">
                        {goal.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span className="font-medium">
                        {goal.type === 'savings' && `$${goal.currentAmount.toLocaleString()} / $${goal.targetAmount.toLocaleString()}`}
                        {goal.type === 'balance_maintenance' && `$${currentBalance.toLocaleString()} / $${goal.targetAmount.toLocaleString()}`}
                        {goal.type === 'spending_limit' && `${progress.toFixed(1)}% under limit`}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{progress.toFixed(1)}% complete</span>
                      <span className={daysLeft < 30 ? 'text-warning' : ''}>
                        {daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
                      </span>
                    </div>
                  </div>

                  {goal.type === 'savings' && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleQuickContribution(goal.id, 50)}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        +$50
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleQuickContribution(goal.id, 100)}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        +$100
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleQuickContribution(goal.id, 500)}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        +$500
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Create Goal Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Account Goal</DialogTitle>
            <DialogDescription>
              Set a specific goal for {accountName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Goal Name</Label>
              <Input
                placeholder="Emergency Fund"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Goal Type</Label>
                <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">Savings Goal</SelectItem>
                    <SelectItem value="spending_limit">Spending Limit</SelectItem>
                    <SelectItem value="balance_maintenance">Balance Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Amount</Label>
                <Input
                  type="number"
                  placeholder="5000"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Deadline</Label>
                <Input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly Contribution</Label>
                <Input
                  type="number"
                  placeholder="500"
                  value={formData.monthlyContribution}
                  onChange={(e) => setFormData({ ...formData, monthlyContribution: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Target">Target</SelectItem>
                    <SelectItem value="Home">Home</SelectItem>
                    <SelectItem value="Car">Car</SelectItem>
                    <SelectItem value="Plane">Vacation</SelectItem>
                    <SelectItem value="GraduationCap">Education</SelectItem>
                    <SelectItem value="Heart">Wedding</SelectItem>
                    <SelectItem value="Shield">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map(color => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: color.value }}
                          />
                          {color.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGoal}>
              Create Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};