import { useState } from "react";
import { CalendarIcon, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FrequencyConfig, FrequencyType } from "@/types/recurringPayments";
import { useFirestore } from "@/hooks/useFirestore";

interface RecurringPaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WEEKDAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" }
];

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" }
];

export const RecurringPaymentForm = ({ open, onOpenChange }: RecurringPaymentFormProps) => {
  const { documents: bankAccounts } = useFirestore<any>('bankAccounts');
  const { documents: creditCards } = useFirestore<any>('creditCards');
  const { addDocument } = useFirestore<any>('recurringPayments');
  
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    description: "",
    notes: "",
    accountId: "",
    accountType: "" as 'bank' | 'credit' | '',
    category: "",
    isAutomatic: false,
    isVariableAmount: false,
    minAmount: "",
    maxAmount: "",
    reminderDays: [] as number[],
    tags: [] as string[],
    newTag: ""
  });

  const [frequency, setFrequency] = useState<FrequencyConfig>({
    type: 'monthly',
    interval: 1,
    skipWeekends: false
  });

  const [nextDueDate, setNextDueDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const allAccounts = [
    ...bankAccounts.map(acc => ({ ...acc, type: 'bank' as const })),
    ...creditCards.map(card => ({ ...card, type: 'credit' as const }))
  ];

  const handleFrequencyChange = (type: FrequencyType) => {
    setFrequency(prev => ({
      ...prev,
      type,
      interval: 1,
      dayOfWeek: type === 'weekly' ? 1 : undefined,
      dayOfMonth: type === 'monthly' ? 1 : undefined,
      monthOfYear: type === 'yearly' ? 1 : undefined
    }));
  };

  const handleAddTag = () => {
    if (formData.newTag.trim() && !formData.tags.includes(formData.newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, prev.newTag.trim()],
        newTag: ""
      }));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleAddReminder = (days: number) => {
    if (!formData.reminderDays.includes(days)) {
      setFormData(prev => ({
        ...prev,
        reminderDays: [...prev.reminderDays, days].sort((a, b) => a - b)
      }));
    }
  };

  const handleRemoveReminder = (days: number) => {
    setFormData(prev => ({
      ...prev,
      reminderDays: prev.reminderDays.filter(d => d !== days)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.amount || !formData.accountId || !formData.category || !nextDueDate) {
      return;
    }

    const recurringPayment = {
      name: formData.name,
      amount: parseFloat(formData.amount),
      description: formData.description,
      notes: formData.notes,
      frequency: {
        ...frequency,
        endDate: endDate ? endDate.toISOString().split('T')[0] : undefined
      },
      nextDueDate: nextDueDate.toISOString().split('T')[0],
      accountId: formData.accountId,
      accountType: formData.accountType,
      paymentMethod: allAccounts.find(acc => acc.id === formData.accountId)?.name || "",
      category: formData.category,
      isActive: true,
      isAutomatic: formData.isAutomatic,
      isVariableAmount: formData.isVariableAmount,
      amountRange: formData.isVariableAmount ? {
        min: parseFloat(formData.minAmount) || parseFloat(formData.amount),
        max: parseFloat(formData.maxAmount) || parseFloat(formData.amount)
      } : undefined,
      reminderDays: formData.reminderDays,
      tags: formData.tags,
      paymentHistory: []
    };

    await addDocument(recurringPayment);
    
    // Reset form
    setFormData({
      name: "",
      amount: "",
      description: "",
      notes: "",
      accountId: "",
      accountType: "",
      category: "",
      isAutomatic: false,
      isVariableAmount: false,
      minAmount: "",
      maxAmount: "",
      reminderDays: [],
      tags: [],
      newTag: ""
    });
    setFrequency({ type: 'monthly', interval: 1, skipWeekends: false });
    setNextDueDate(undefined);
    setEndDate(undefined);
    onOpenChange(false);
  };

  const getFrequencyDescription = () => {
    switch (frequency.type) {
      case 'daily':
        return frequency.interval === 1 ? 'Every day' : `Every ${frequency.interval} days`;
      case 'weekly':
        const dayName = WEEKDAYS.find(d => d.value === frequency.dayOfWeek)?.label;
        return frequency.interval === 1 
          ? `Every ${dayName}` 
          : `Every ${frequency.interval} weeks on ${dayName}`;
      case 'monthly':
        return frequency.interval === 1 
          ? `Monthly on the ${frequency.dayOfMonth}${frequency.dayOfMonth === 1 ? 'st' : frequency.dayOfMonth === 2 ? 'nd' : frequency.dayOfMonth === 3 ? 'rd' : 'th'}` 
          : `Every ${frequency.interval} months on the ${frequency.dayOfMonth}${frequency.dayOfMonth === 1 ? 'st' : frequency.dayOfMonth === 2 ? 'nd' : frequency.dayOfMonth === 3 ? 'rd' : 'th'}`;
      case 'yearly':
        const monthName = MONTHS.find(m => m.value === frequency.monthOfYear)?.label;
        return `Yearly in ${monthName}`;
      default:
        return 'Custom frequency';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Recurring Payment</DialogTitle>
          <DialogDescription>
            Set up a new recurring payment with advanced scheduling options
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Basic Information</h3>
            
            <div>
              <Label htmlFor="paymentName">Payment Name</Label>
              <Input 
                id="paymentName" 
                placeholder="e.g. Netflix, Rent, Car Payment" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input 
                id="description" 
                placeholder="Additional details about this payment" 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  step="0.01"
                  placeholder="15.99"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Housing">Housing</SelectItem>
                    <SelectItem value="Entertainment">Entertainment</SelectItem>
                    <SelectItem value="Health">Health</SelectItem>
                    <SelectItem value="Insurance">Insurance</SelectItem>
                    <SelectItem value="Software">Software</SelectItem>
                    <SelectItem value="Utilities">Utilities</SelectItem>
                    <SelectItem value="Transportation">Transportation</SelectItem>
                    <SelectItem value="Food">Food</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Variable Amount */}
            <div className="flex items-center space-x-2">
              <Switch 
                checked={formData.isVariableAmount}
                onCheckedChange={(checked) => setFormData({ ...formData, isVariableAmount: checked })}
              />
              <Label>Variable amount (e.g., utilities)</Label>
            </div>

            {formData.isVariableAmount && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minAmount">Minimum Amount</Label>
                  <Input 
                    id="minAmount" 
                    type="number" 
                    step="0.01"
                    placeholder="50.00"
                    value={formData.minAmount}
                    onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="maxAmount">Maximum Amount</Label>
                  <Input 
                    id="maxAmount" 
                    type="number" 
                    step="0.01"
                    placeholder="200.00"
                    value={formData.maxAmount}
                    onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Payment Method</h3>
            
            <div>
              <Label htmlFor="account">Account</Label>
              <Select 
                value={formData.accountId} 
                onValueChange={(value) => {
                  const account = allAccounts.find(acc => acc.id === value);
                  setFormData({ 
                    ...formData, 
                    accountId: value,
                    accountType: account?.type || ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Bank Accounts</div>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.type})
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Credit Cards</div>
                  {creditCards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name} ({card.issuer})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch 
                checked={formData.isAutomatic}
                onCheckedChange={(checked) => setFormData({ ...formData, isAutomatic: checked })}
              />
              <Label>Automatic payment</Label>
            </div>
          </div>

          {/* Frequency Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Frequency</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Frequency Type</Label>
                <Select value={frequency.type} onValueChange={handleFrequencyChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Interval</Label>
                <Input 
                  type="number" 
                  min="1" 
                  max="365"
                  value={frequency.interval}
                  onChange={(e) => setFrequency({ ...frequency, interval: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            {/* Frequency-specific options */}
            {frequency.type === 'weekly' && (
              <div>
                <Label>Day of Week</Label>
                <Select 
                  value={frequency.dayOfWeek?.toString()} 
                  onValueChange={(value) => setFrequency({ ...frequency, dayOfWeek: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {frequency.type === 'monthly' && (
              <div>
                <Label>Day of Month</Label>
                <Input 
                  type="number" 
                  min="1" 
                  max="31"
                  placeholder="15"
                  value={frequency.dayOfMonth}
                  onChange={(e) => setFrequency({ ...frequency, dayOfMonth: parseInt(e.target.value) || 1 })}
                />
              </div>
            )}

            {frequency.type === 'yearly' && (
              <div>
                <Label>Month</Label>
                <Select 
                  value={frequency.monthOfYear?.toString()} 
                  onValueChange={(value) => setFrequency({ ...frequency, monthOfYear: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch 
                checked={frequency.skipWeekends}
                onCheckedChange={(checked) => setFrequency({ ...frequency, skipWeekends: checked })}
              />
              <Label>Skip weekends (move to next business day)</Label>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Preview: {getFrequencyDescription()}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Dates</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Next Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !nextDueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {nextDueDate ? format(nextDueDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={nextDueDate}
                      onSelect={setNextDueDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>End Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "No end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Reminders */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Reminders</h3>
            
            <div className="flex flex-wrap gap-2">
              {[1, 3, 7, 14].map((days) => (
                <Button
                  key={days}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddReminder(days)}
                  disabled={formData.reminderDays.includes(days)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {days} day{days > 1 ? 's' : ''} before
                </Button>
              ))}
            </div>

            {formData.reminderDays.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.reminderDays.map((days) => (
                  <Badge key={days} variant="secondary" className="gap-1">
                    {days} day{days > 1 ? 's' : ''} before
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => handleRemoveReminder(days)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Tags (Optional)</h3>
            
            <div className="flex gap-2">
              <Input
                placeholder="Add tag"
                value={formData.newTag}
                onChange={(e) => setFormData({ ...formData, newTag: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <Button variant="outline" size="sm" onClick={handleAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes or instructions"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Add Payment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};