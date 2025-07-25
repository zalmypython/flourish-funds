import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { CreditCard } from '@/types';

const MAJOR_ISSUERS = [
  'American Express',
  'Bank of America',
  'Capital One',
  'Chase',
  'Citi',
  'Discover',
  'Wells Fargo',
  'Other'
];

const CARD_TYPES = [
  'Cashback',
  'Travel',
  'Business',
  'Balance Transfer',
  'Student',
  'Secured',
  'Store Card'
];

interface EnhancedCreditCardFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (cardData: Partial<CreditCard>) => Promise<void>;
  editCard?: CreditCard | null;
}

export const EnhancedCreditCardForm = ({ open, onOpenChange, onSubmit, editCard }: EnhancedCreditCardFormProps) => {
  const { toast } = useToast();
  const [currentTab, setCurrentTab] = useState('basic');
  const [formData, setFormData] = useState({
    // Basic Info
    name: editCard?.name || '',
    issuer: editCard?.issuer || '',
    type: editCard?.type || '',
    limit: editCard?.limit?.toString() || '',
    interestRate: editCard?.interestRate?.toString() || '',
    
    // Enhanced Fields
    annualFee: editCard?.annualFee?.toString() || '',
    annualFeeWaived: editCard?.annualFeeWaived || false,
    annualFeeWaivedFirstYear: editCard?.annualFeeWaivedFirstYear || false,
    rewardRate: editCard?.rewardRate?.toString() || '',
    nickname: editCard?.nickname || '',
    notes: editCard?.notes || '',
    
    // Dates
    applicationDate: editCard?.applicationDate || '',
    approvalDate: editCard?.approvalDate || '',
    accountOpenDate: editCard?.accountOpenDate || '',
    dueDate: editCard?.dueDate || '',
    
    // Churning
    eligibleForSignupBonus: editCard?.eligibleForSignupBonus !== false,
    lastSignupBonusDate: editCard?.lastSignupBonusDate || '',
    churningNotes: editCard?.churningNotes || ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      issuer: '',
      type: '',
      limit: '',
      interestRate: '',
      annualFee: '',
      annualFeeWaived: false,
      annualFeeWaivedFirstYear: false,
      rewardRate: '',
      nickname: '',
      notes: '',
      applicationDate: '',
      approvalDate: '',
      accountOpenDate: '',
      dueDate: '',
      eligibleForSignupBonus: true,
      lastSignupBonusDate: '',
      churningNotes: ''
    });
    setCurrentTab('basic');
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.name || !formData.issuer || !formData.type || !formData.limit || !formData.interestRate) {
      toast({
        title: "Error",
        description: "Please fill in all required basic information.",
        variant: "destructive"
      });
      setCurrentTab('basic');
      return;
    }

    const cardData: Partial<CreditCard> = {
      name: formData.name,
      issuer: formData.issuer,
      type: formData.type,
      limit: parseFloat(formData.limit),
      interestRate: parseFloat(formData.interestRate),
      
      // Enhanced fields
      annualFee: formData.annualFee ? parseFloat(formData.annualFee) : undefined,
      annualFeeWaived: formData.annualFeeWaived,
      annualFeeWaivedFirstYear: formData.annualFeeWaivedFirstYear,
      nextAnnualFeeDate: formData.accountOpenDate ? 
        new Date(new Date(formData.accountOpenDate).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : 
        undefined,
      rewardRate: formData.rewardRate ? parseFloat(formData.rewardRate) : undefined,
      nickname: formData.nickname || undefined,
      notes: formData.notes || undefined,
      
      // Dates
      applicationDate: formData.applicationDate || undefined,
      approvalDate: formData.approvalDate || undefined,
      accountOpenDate: formData.accountOpenDate || undefined,
      dueDate: formData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      
      // Churning
      eligibleForSignupBonus: formData.eligibleForSignupBonus,
      lastSignupBonusDate: formData.lastSignupBonusDate || undefined,
      churningNotes: formData.churningNotes || undefined,
      
      // Status
      accountStatus: 'active' as const,
      isActive: true,
      
      // Initialize with empty arrays if not editing
      bonuses: editCard?.bonuses || [],
      goals: editCard?.goals || []
    };

    try {
      await onSubmit(cardData);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editCard ? 'Edit Credit Card' : 'Add New Credit Card'}</DialogTitle>
          <DialogDescription>
            {editCard ? 'Update your credit card information' : 'Add a credit card to track spending, bonuses, and rewards'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="dates">Dates</TabsTrigger>
            <TabsTrigger value="churning">Churning</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cardName">Card Name *</Label>
                <Input 
                  id="cardName" 
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Chase Sapphire Preferred" 
                />
              </div>
              <div>
                <Label htmlFor="nickname">Nickname</Label>
                <Input 
                  id="nickname" 
                  value={formData.nickname}
                  onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                  placeholder="e.g. My Travel Card" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="issuer">Card Issuer *</Label>
                <Select value={formData.issuer} onValueChange={(value) => setFormData(prev => ({ ...prev, issuer: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select issuer" />
                  </SelectTrigger>
                  <SelectContent>
                    {MAJOR_ISSUERS.map(issuer => (
                      <SelectItem key={issuer} value={issuer}>{issuer}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cardType">Card Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select card type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARD_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
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
                placeholder="Additional notes about this card..." 
              />
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="limit">Credit Limit *</Label>
                <Input 
                  id="limit" 
                  type="number" 
                  value={formData.limit}
                  onChange={(e) => setFormData(prev => ({ ...prev, limit: e.target.value }))}
                  placeholder="10000" 
                />
              </div>
              <div>
                <Label htmlFor="interestRate">Interest Rate (%) *</Label>
                <Input 
                  id="interestRate" 
                  type="number" 
                  step="0.01" 
                  value={formData.interestRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, interestRate: e.target.value }))}
                  placeholder="19.99" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="annualFee">Annual Fee ($)</Label>
                <Input 
                  id="annualFee" 
                  type="number" 
                  value={formData.annualFee}
                  onChange={(e) => setFormData(prev => ({ ...prev, annualFee: e.target.value }))}
                  placeholder="95" 
                />
              </div>
              <div>
                <Label htmlFor="rewardRate">Base Reward Rate (%)</Label>
                <Input 
                  id="rewardRate" 
                  type="number" 
                  step="0.01" 
                  value={formData.rewardRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, rewardRate: e.target.value }))}
                  placeholder="1.00" 
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="annualFeeWaived" 
                  checked={formData.annualFeeWaived}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, annualFeeWaived: checked }))}
                />
                <Label htmlFor="annualFeeWaived">Annual fee currently waived</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="annualFeeWaivedFirstYear" 
                  checked={formData.annualFeeWaivedFirstYear}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, annualFeeWaivedFirstYear: checked }))}
                />
                <Label htmlFor="annualFeeWaivedFirstYear">First year annual fee waived</Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="dates" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="applicationDate">Application Date</Label>
                <Input 
                  id="applicationDate" 
                  type="date"
                  value={formData.applicationDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, applicationDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="approvalDate">Approval Date</Label>
                <Input 
                  id="approvalDate" 
                  type="date"
                  value={formData.approvalDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, approvalDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="accountOpenDate">Account Open Date</Label>
                <Input 
                  id="accountOpenDate" 
                  type="date"
                  value={formData.accountOpenDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountOpenDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="dueDate">Next Due Date</Label>
                <Input 
                  id="dueDate" 
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="churning" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch 
                id="eligibleForSignupBonus" 
                checked={formData.eligibleForSignupBonus}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, eligibleForSignupBonus: checked }))}
              />
              <Label htmlFor="eligibleForSignupBonus">Eligible for signup bonus</Label>
            </div>

            <div>
              <Label htmlFor="lastSignupBonusDate">Last Signup Bonus Date</Label>
              <Input 
                id="lastSignupBonusDate" 
                type="date"
                value={formData.lastSignupBonusDate}
                onChange={(e) => setFormData(prev => ({ ...prev, lastSignupBonusDate: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="churningNotes">Churning Notes</Label>
              <Textarea 
                id="churningNotes" 
                value={formData.churningNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, churningNotes: e.target.value }))}
                placeholder="Notes about churning strategy, issuer rules, etc..." 
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {editCard ? 'Update Card' : 'Add Card'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};