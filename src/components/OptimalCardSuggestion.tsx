import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, CreditCard as CreditCardIcon } from 'lucide-react';
import { CreditCard } from '@/types';
import { useRewardCalculation } from '@/hooks/useRewardCalculation';

interface OptimalCardSuggestionProps {
  amount: number;
  category: string;
  cards: CreditCard[];
  onCardSelect?: (cardId: string) => void;
}

export default function OptimalCardSuggestion({ 
  amount, 
  category, 
  cards, 
  onCardSelect 
}: OptimalCardSuggestionProps) {
  const { getOptimalCardSuggestion, calculateRewardForTransaction } = useRewardCalculation();
  const [suggestedCard, setSuggestedCard] = useState<CreditCard | null>(null);
  const [rewardAmount, setRewardAmount] = useState(0);

  useEffect(() => {
    if (amount > 0 && cards.length > 0) {
      const optimal = getOptimalCardSuggestion(amount, category, cards);
      setSuggestedCard(optimal);

      if (optimal) {
        const reward = calculateRewardForTransaction(
          { amount, category } as any,
          optimal
        );
        setRewardAmount(reward.amount);
      }
    }
  }, [amount, category, cards, getOptimalCardSuggestion, calculateRewardForTransaction]);

  if (!suggestedCard || amount <= 0) {
    return null;
  }

  const formatReward = (amount: number, type: string) => {
    switch (type) {
      case 'cashback':
        return `$${amount.toFixed(2)}`;
      case 'points':
        return `${Math.round(amount)} points`;
      case 'miles':
        return `${Math.round(amount)} miles`;
      default:
        return amount.toString();
    }
  };

  const categoryReward = suggestedCard.categoryRewards?.[category];
  const rewardRate = categoryReward 
    ? categoryReward.rate 
    : suggestedCard.rewardRate || 1;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Optimal Card Suggestion</CardTitle>
        </div>
        <CardDescription>
          Get the best rewards for this purchase
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-background rounded-lg border">
          <div className="flex items-center gap-3">
            <CreditCardIcon className="h-6 w-6 text-primary" />
            <div>
              <p className="font-medium">{suggestedCard.name}</p>
              <p className="text-sm text-muted-foreground">{suggestedCard.issuer}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-primary">
              {formatReward(rewardAmount, suggestedCard.rewardType)}
            </p>
            <Badge variant="secondary">
              {categoryReward?.type === 'cashback' 
                ? `${rewardRate}%` 
                : `${rewardRate}x ${categoryReward?.type || 'cash back'}`}
            </Badge>
          </div>
        </div>

        {categoryReward && categoryReward.ratio && (
          <div className="text-sm text-muted-foreground">
            <p>Rate: {categoryReward.ratio}</p>
          </div>
        )}

        {onCardSelect && (
          <Button 
            onClick={() => onCardSelect(suggestedCard.id)}
            className="w-full"
            variant="outline"
          >
            Use This Card
          </Button>
        )}

        <div className="text-xs text-muted-foreground">
          💡 This card offers the best rewards for {category} purchases
        </div>
      </CardContent>
    </Card>
  );
}