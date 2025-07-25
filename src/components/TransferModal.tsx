import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore } from '@/hooks/useFirestore';
import { useAccountBalance } from '@/hooks/useAccountBalance';
import { BankAccount, CreditCard } from '@/types';
import { ArrowRightLeft } from 'lucide-react';

interface TransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TransferModal = ({ open, onOpenChange }: TransferModalProps) => {
  const { documents: bankAccounts } = useFirestore<BankAccount>('bankAccounts');
  const { documents: creditCards } = useFirestore<CreditCard>('creditCards');
  const { processTransfer, processCreditCardPayment, calculateAccountBalance } = useAccountBalance();

  const [formData, setFormData] = useState({
    fromAccountId: '',
    fromAccountType: 'bank' as 'bank' | 'credit',
    toAccountId: '',
    toAccountType: 'bank' as 'bank' | 'credit',
    amount: '',
    description: '',
    notes: ''
  });

  const [isProcessing, setIsProcessing] = useState(false);

  const allAccounts = [
    ...bankAccounts.map(acc => ({ ...acc, type: 'bank' as const })),
    ...creditCards.map(card => ({ ...card, type: 'credit' as const }))
  ];

  const getAvailableToAccounts = () => {
    return allAccounts.filter(acc => 
      acc.id !== formData.fromAccountId || acc.type !== formData.fromAccountType
    );
  };

  const getAccountBalance = (accountId: string, accountType: 'bank' | 'credit') => {
    if (accountType === 'bank') {
      const account = bankAccounts.find(a => a.id === accountId);
      return account ? calculateAccountBalance(accountId, accountType, account.initialBalance) : 0;
    } else {
      const card = creditCards.find(c => c.id === accountId);
      return card ? calculateAccountBalance(accountId, accountType, card.initialBalance) : 0;
    }
  };

  const getAccountName = (accountId: string, accountType: 'bank' | 'credit') => {
    if (accountType === 'bank') {
      return bankAccounts.find(a => a.id === accountId)?.name || '';
    }
    return creditCards.find(c => c.id === accountId)?.name || '';
  };

  const handleSubmit = async () => {
    if (!formData.fromAccountId || !formData.toAccountId || !formData.amount) return;

    setIsProcessing(true);
    try {
      const amount = parseFloat(formData.amount);
      
      // Check if this is a credit card payment (bank to credit card)
      if (formData.fromAccountType === 'bank' && formData.toAccountType === 'credit') {
        await processCreditCardPayment(
          formData.toAccountId,
          formData.fromAccountId,
          amount,
          formData.description
        );
      } else {
        // Regular transfer
        await processTransfer(
          formData.fromAccountId,
          formData.fromAccountType,
          formData.toAccountId,
          formData.toAccountType,
          amount,
          formData.description,
          formData.notes
        );
      }

      // Reset form
      setFormData({
        fromAccountId: '',
        fromAccountType: 'bank',
        toAccountId: '',
        toAccountType: 'bank',
        amount: '',
        description: '',
        notes: ''
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Transfer failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const fromAccount = allAccounts.find(acc => 
    acc.id === formData.fromAccountId && acc.type === formData.fromAccountType
  );
  const toAccount = allAccounts.find(acc => 
    acc.id === formData.toAccountId && acc.type === formData.toAccountType
  );

  const isPayment = formData.fromAccountType === 'bank' && formData.toAccountType === 'credit';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            {isPayment ? 'Credit Card Payment' : 'Transfer Money'}
          </DialogTitle>
          <DialogDescription>
            {isPayment 
              ? 'Make a payment to your credit card from your bank account'
              : 'Transfer money between your accounts'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* From Account */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From Account Type</Label>
              <Select 
                value={formData.fromAccountType} 
                onValueChange={(value: 'bank' | 'credit') => 
                  setFormData({ ...formData, fromAccountType: value, fromAccountId: '' })
                }
              >
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
              <Label>From Account</Label>
              <Select 
                value={formData.fromAccountId} 
                onValueChange={(value) => setFormData({ ...formData, fromAccountId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {(formData.fromAccountType === 'bank' ? bankAccounts : creditCards).map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* From Account Balance */}
          {fromAccount && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-lg font-bold">
                ${getAccountBalance(fromAccount.id, fromAccount.type).toLocaleString()}
              </p>
            </div>
          )}

          {/* To Account */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>To Account Type</Label>
              <Select 
                value={formData.toAccountType} 
                onValueChange={(value: 'bank' | 'credit') => 
                  setFormData({ ...formData, toAccountType: value, toAccountId: '' })
                }
              >
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
              <Label>To Account</Label>
              <Select 
                value={formData.toAccountId} 
                onValueChange={(value) => setFormData({ ...formData, toAccountId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableToAccounts()
                    .filter(acc => acc.type === formData.toAccountType)
                    .map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Amount */}
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

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder={isPayment ? "Credit card payment" : "Transfer description"}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          {/* Transfer Summary */}
          {fromAccount && toAccount && formData.amount && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <h4 className="font-medium mb-2">Transfer Summary</h4>
              <div className="text-sm space-y-1">
                <p>From: {getAccountName(formData.fromAccountId, formData.fromAccountType)}</p>
                <p>To: {getAccountName(formData.toAccountId, formData.toAccountType)}</p>
                <p className="font-medium">Amount: ${parseFloat(formData.amount || '0').toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!formData.fromAccountId || !formData.toAccountId || !formData.amount || isProcessing}
          >
            {isProcessing ? 'Processing...' : (isPayment ? 'Make Payment' : 'Transfer')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};