import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/hooks/useFirestore';
import { CreditCard, CreditCardBonus } from '@/types';
import { Plus, Gift, Edit, Check, X, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface CreditCardBonusManagerProps {
  cardId: string;
  bonuses: CreditCardBonus[];
  onBonusUpdate: () => void;
}

export const CreditCardBonusManager = ({ cardId, bonuses, onBonusUpdate }: CreditCardBonusManagerProps) => {
  const { updateDocument } = useFirestore<CreditCard>('creditCards');
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingBonus, setEditingBonus] = useState<CreditCardBonus | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirement: '',
    bonusAmount: '',
    bonusValue: '',
    spendingRequired: '',
    endDate: '',
    category: '',
    categoryMultiplier: '',
    notes: ''
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      requirement: '',
      bonusAmount: '',
      bonusValue: '',
      spendingRequired: '',
      endDate: '',
      category: '',
      categoryMultiplier: '',
      notes: ''
    });
  };

  const handleAddBonus = async () => {
    if (!formData.title || !formData.spendingRequired || !formData.endDate) {
      toast({
        title: "Error",
        description: "Please fill in the required fields.",
        variant: "destructive"
      });
      return;
    }

    const newBonus: CreditCardBonus = {
      id: `bonus_${Date.now()}`,
      title: formData.title,
      description: formData.description,
      requirement: formData.requirement,
      bonusAmount: formData.bonusAmount,
      bonusValue: formData.bonusValue ? parseFloat(formData.bonusValue) : undefined,
      spendingRequired: parseFloat(formData.spendingRequired),
      currentSpending: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: formData.endDate,
      status: 'not_started',
      category: formData.category || undefined,
      categoryMultiplier: formData.categoryMultiplier ? parseFloat(formData.categoryMultiplier) : undefined,
      notes: formData.notes || undefined
    };

    try {
      const updatedBonuses = [...bonuses, newBonus];
      await updateDocument(cardId, { bonuses: updatedBonuses });
      toast({
        title: "Success",
        description: "Bonus added successfully!"
      });
      resetForm();
      setIsAddDialogOpen(false);
      onBonusUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleUpdateBonusStatus = async (bonusId: string, newStatus: CreditCardBonus['status'], additionalData?: Partial<CreditCardBonus>) => {
    try {
      const updatedBonuses = bonuses.map(bonus => 
        bonus.id === bonusId 
          ? { 
              ...bonus, 
              status: newStatus,
              ...(newStatus === 'completed' && { dateCompleted: new Date().toISOString().split('T')[0] }),
              ...(newStatus === 'paid_out' && { datePaidOut: new Date().toISOString().split('T')[0] }),
              ...additionalData
            }
          : bonus
      );
      
      await updateDocument(cardId, { bonuses: updatedBonuses });
      toast({
        title: "Success",
        description: "Bonus status updated successfully!"
      });
      onBonusUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getBonusStatusColor = (status: CreditCardBonus['status']) => {
    switch (status) {
      case 'not_started': return 'bg-muted text-muted-foreground';
      case 'in_progress': return 'bg-warning text-warning-foreground';
      case 'completed': return 'bg-success text-success-foreground';
      case 'paid_out': return 'bg-primary text-primary-foreground';
      case 'expired': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getBonusProgress = (bonus: CreditCardBonus) => {
    return Math.min((bonus.currentSpending / bonus.spendingRequired) * 100, 100);
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Sign-up Bonuses</CardTitle>
          <CardDescription>Track credit card bonuses and spending requirements</CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Bonus
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Sign-up Bonus</DialogTitle>
              <DialogDescription>
                Track a new credit card sign-up bonus or reward program
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Bonus Title *</Label>
                  <Input 
                    id="title" 
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Welcome Bonus" 
                  />
                </div>
                <div>
                  <Label htmlFor="bonusAmount">Bonus Amount</Label>
                  <Input 
                    id="bonusAmount" 
                    value={formData.bonusAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, bonusAmount: e.target.value }))}
                    placeholder="e.g. 80,000 points, $500 cash back" 
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Details about the bonus..." 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="spendingRequired">Spending Required *</Label>
                  <Input 
                    id="spendingRequired" 
                    type="number"
                    value={formData.spendingRequired}
                    onChange={(e) => setFormData(prev => ({ ...prev, spendingRequired: e.target.value }))}
                    placeholder="4000" 
                  />
                </div>
                <div>
                  <Label htmlFor="bonusValue">Estimated Value ($)</Label>
                  <Input 
                    id="bonusValue" 
                    type="number"
                    step="0.01"
                    value={formData.bonusValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, bonusValue: e.target.value }))}
                    placeholder="800" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input 
                    id="endDate" 
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Bonus Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All purchases</SelectItem>
                      <SelectItem value="dining">Dining</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="gas">Gas</SelectItem>
                      <SelectItem value="groceries">Groceries</SelectItem>
                      <SelectItem value="online">Online purchases</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea 
                  id="notes" 
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this bonus..." 
                />
              </div>

              <Button onClick={handleAddBonus} className="w-full">
                Add Bonus
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {bonuses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No bonuses tracked</p>
            <p className="text-sm">Add your first sign-up bonus to start tracking progress</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bonuses.map((bonus) => {
              const progress = getBonusProgress(bonus);
              const daysLeft = Math.ceil((new Date(bonus.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              
              return (
                <div key={bonus.id} className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{bonus.title}</h4>
                        <Badge className={getBonusStatusColor(bonus.status)}>
                          {bonus.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      {bonus.description && (
                        <p className="text-sm text-muted-foreground mb-2">{bonus.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {bonus.bonusAmount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {bonus.status === 'in_progress' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleUpdateBonusStatus(bonus.id, 'completed')}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      {bonus.status === 'completed' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleUpdateBonusStatus(bonus.id, 'paid_out')}
                        >
                          Mark Paid
                        </Button>
                      )}
                      <Button size="sm" variant="ghost">
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {bonus.status === 'in_progress' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Spending Progress</span>
                        <span>${bonus.currentSpending.toLocaleString()} / ${bonus.spendingRequired.toLocaleString()}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{progress.toFixed(1)}% complete</span>
                        <span>${(bonus.spendingRequired - bonus.currentSpending).toLocaleString()} remaining</span>
                      </div>
                    </div>
                  )}

                  {bonus.dateCompleted && (
                    <div className="text-xs text-muted-foreground">
                      Completed: {format(new Date(bonus.dateCompleted), 'MMM dd, yyyy')}
                    </div>
                  )}

                  {bonus.datePaidOut && (
                    <div className="text-xs text-success">
                      Paid out: {format(new Date(bonus.datePaidOut), 'MMM dd, yyyy')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};