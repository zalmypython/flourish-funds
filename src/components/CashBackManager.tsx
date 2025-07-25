import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, History, Settings } from 'lucide-react';
import { CreditCard, RewardRedemption } from '@/types';
import { DEFAULT_CATEGORIES } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';

interface CashBackManagerProps {
  card: CreditCard;
  onCardUpdate: (updatedCard: CreditCard) => void;
}

export default function CashBackManager({ card, onCardUpdate }: CashBackManagerProps) {
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [redemptionAmount, setRedemptionAmount] = useState('');
  const [redemptionMethod, setRedemptionMethod] = useState('');
  const [redemptionNotes, setRedemptionNotes] = useState('');
  const [categoryRates, setCategoryRates] = useState(card.categoryRewards || DEFAULT_CATEGORIES.reduce((acc, cat) => ({
    ...acc,
    [cat.id]: { type: 'cashback', rate: 1 }
  }), {}));
  const { toast } = useToast();

  const handleRedeem = () => {
    const amount = parseFloat(redemptionAmount);
    if (!amount || amount <= 0 || amount > card.cashBackBalance) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid redemption amount.",
        variant: "destructive",
      });
      return;
    }

    const newRedemption: RewardRedemption = {
      id: `redemption_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      amount,
      type: card.rewardType,
      description: redemptionNotes,
      redemptionMethod,
    };

    const updatedCard = {
      ...card,
      cashBackBalance: card.cashBackBalance - amount,
      redemptionHistory: [...(card.redemptionHistory || []), newRedemption],
    };

    onCardUpdate(updatedCard);
    setIsRedeemOpen(false);
    setRedemptionAmount('');
    setRedemptionMethod('');
    setRedemptionNotes('');

    toast({
      title: "Redemption Recorded",
      description: `Successfully redeemed $${amount.toFixed(2)}`,
    });
  };

  const handleUpdateRates = () => {
    const updatedCard = {
      ...card,
      categoryRewards: categoryRates,
    };

    onCardUpdate(updatedCard);
    setIsSettingsOpen(false);

    toast({
      title: "Reward Rates Updated",
      description: "Category reward rates have been updated successfully.",
    });
  };

  const formatRewardDisplay = (amount: number) => {
    switch (card.rewardType) {
      case 'cashback':
        return `$${amount.toFixed(2)}`;
      case 'points':
        return `${amount.toLocaleString()} points`;
      case 'miles':
        return `${amount.toLocaleString()} miles`;
      default:
        return amount.toString();
    }
  };

  const getRewardTypeLabel = () => {
    switch (card.rewardType) {
      case 'cashback':
        return 'Cash Back';
      case 'points':
        return 'Points';
      case 'miles':
        return 'Miles';
      default:
        return 'Rewards';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            <CardTitle>{getRewardTypeLabel()} Balance</CardTitle>
          </div>
          <div className="flex gap-2">
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reward Rate Settings</DialogTitle>
                  <DialogDescription>
                    Configure category-specific reward rates for this card
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {DEFAULT_CATEGORIES.map((category) => {
                    const categoryReward = categoryRates[category.id] || { type: 'cashback', rate: 1 };
                    return (
                      <div key={category.id} className="space-y-3 p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <Label className="font-medium">{category.name}</Label>
                          <Select 
                            value={categoryReward.type} 
                            onValueChange={(value: 'cashback' | 'points' | 'miles') => setCategoryRates({
                              ...categoryRates,
                              [category.id]: { ...categoryReward, type: value }
                            })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cashback">Cash Back</SelectItem>
                              <SelectItem value="points">Points</SelectItem>
                              <SelectItem value="miles">Miles</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm">
                              {categoryReward.type === 'cashback' ? 'Percentage (%)' : 'Multiplier (x)'}
                            </Label>
                            <Input
                              type="number"
                              step={categoryReward.type === 'cashback' ? '0.25' : '0.5'}
                              min="0"
                              max={categoryReward.type === 'cashback' ? '10' : '20'}
                              value={categoryReward.rate}
                              onChange={(e) => setCategoryRates({
                                ...categoryRates,
                                [category.id]: { 
                                  ...categoryReward, 
                                  rate: parseFloat(e.target.value) || 1 
                                }
                              })}
                            />
                          </div>
                          
                          {(categoryReward.type === 'points' || categoryReward.type === 'miles') && (
                            <div>
                              <Label className="text-sm">Ratio (optional)</Label>
                              <Input
                                placeholder="e.g., $1 = 2 points"
                                value={categoryReward.ratio || ''}
                                onChange={(e) => setCategoryRates({
                                  ...categoryRates,
                                  [category.id]: { 
                                    ...categoryReward, 
                                    ratio: e.target.value || undefined 
                                  }
                                })}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <Button onClick={handleUpdateRates} className="w-full">
                    Update Rates
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <CardDescription>
          Current {getRewardTypeLabel().toLowerCase()} balance and redemption history
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Balance */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Available Balance</p>
            <p className="text-2xl font-bold">{formatRewardDisplay(card.cashBackBalance || 0)}</p>
          </div>
          <Dialog open={isRedeemOpen} onOpenChange={setIsRedeemOpen}>
            <DialogTrigger asChild>
              <Button disabled={!card.cashBackBalance || card.cashBackBalance <= 0}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Redeem
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Redeem {getRewardTypeLabel()}</DialogTitle>
                <DialogDescription>
                  Record a redemption of your {getRewardTypeLabel().toLowerCase()}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    max={card.cashBackBalance}
                    value={redemptionAmount}
                    onChange={(e) => setRedemptionAmount(e.target.value)}
                    placeholder="Enter amount to redeem"
                  />
                </div>
                <div>
                  <Label htmlFor="method">Redemption Method</Label>
                  <Select value={redemptionMethod} onValueChange={setRedemptionMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select redemption method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="statement_credit">Statement Credit</SelectItem>
                      <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="gift_card">Gift Card</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={redemptionNotes}
                    onChange={(e) => setRedemptionNotes(e.target.value)}
                    placeholder="Any additional notes..."
                  />
                </div>
                <Button onClick={handleRedeem} className="w-full">
                  Record Redemption
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Category Rates */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Category Reward Rates
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {DEFAULT_CATEGORIES.map((category) => {
              const categoryReward = categoryRates[category.id] || { type: 'cashback', rate: 1 };
              return (
                <div key={category.id} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                  <span>{category.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {categoryReward.type === 'cashback' 
                        ? `${categoryReward.rate}%` 
                        : `${categoryReward.rate}x ${categoryReward.type}`}
                    </Badge>
                    {categoryReward.ratio && (
                      <span className="text-xs text-muted-foreground">({categoryReward.ratio})</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Earned Rewards History */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Recent Rewards Earned
          </h4>
          {card.rewardHistory && card.rewardHistory.length > 0 ? (
            <div className="space-y-2">
              {card.rewardHistory.slice(-5).reverse().map((reward) => (
                <div key={reward.id} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                  <div>
                    <p className="font-medium">{formatRewardDisplay(reward.rewardEarned)}</p>
                    <p className="text-sm text-muted-foreground">
                      {reward.date} • {reward.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${reward.amount.toFixed(2)} in {reward.category}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No rewards earned yet</p>
          )}
        </div>

        {/* Redemption History */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <History className="h-4 w-4" />
            Recent Redemptions
          </h4>
          {card.redemptionHistory && card.redemptionHistory.length > 0 ? (
            <div className="space-y-2">
              {card.redemptionHistory.slice(-5).reverse().map((redemption) => (
                <div key={redemption.id} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                  <div>
                    <p className="font-medium">{formatRewardDisplay(redemption.amount)}</p>
                    <p className="text-sm text-muted-foreground">
                      {redemption.date} • {redemption.redemptionMethod?.replace('_', ' ')}
                    </p>
                    {redemption.description && (
                      <p className="text-xs text-muted-foreground">{redemption.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No redemptions recorded yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}