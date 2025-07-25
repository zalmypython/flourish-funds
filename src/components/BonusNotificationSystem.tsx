import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Gift, Calendar, DollarSign, X } from 'lucide-react';
import { CreditCard, CreditCardBonus } from '@/types';
import { useFirestore } from '@/hooks/useFirestore';
import { useToast } from '@/hooks/use-toast';

interface NotificationItem {
  id: string;
  type: 'bonus_completion' | 'bonus_deadline' | 'annual_fee' | 'optimal_card';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  cardId?: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface BonusNotificationSystemProps {
  cards: CreditCard[];
}

export default function BonusNotificationSystem({ cards }: BonusNotificationSystemProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const generateNotifications = () => {
      const newNotifications: NotificationItem[] = [];
      const today = new Date();
      
      cards.forEach(card => {
        if (!card.isActive) return;

        // Check for bonuses close to completion
        card.bonuses?.forEach(bonus => {
          if (bonus.status === 'in_progress') {
            const progress = (bonus.currentSpending / bonus.spendingRequired) * 100;
            const endDate = new Date(bonus.endDate);
            const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            // Near completion notification
            if (progress >= 80 && progress < 100) {
              newNotifications.push({
                id: `bonus_near_${bonus.id}`,
                type: 'bonus_completion',
                title: `Almost there! ${bonus.title}`,
                description: `Only $${(bonus.spendingRequired - bonus.currentSpending).toFixed(2)} left to earn your bonus`,
                priority: 'high',
                cardId: card.id,
                actionLabel: 'View Details',
                onAction: () => window.location.href = `/credit-cards/${card.id}`
              });
            }
            
            // Deadline warning
            if (daysLeft <= 30 && daysLeft > 0) {
              newNotifications.push({
                id: `bonus_deadline_${bonus.id}`,
                type: 'bonus_deadline',
                title: `Bonus deadline approaching`,
                description: `${bonus.title} expires in ${daysLeft} days. $${(bonus.spendingRequired - bonus.currentSpending).toFixed(2)} remaining.`,
                priority: daysLeft <= 7 ? 'high' : 'medium',
                cardId: card.id
              });
            }
          }
        });

        // Annual fee notifications
        if (card.nextAnnualFeeDate) {
          const feeDate = new Date(card.nextAnnualFeeDate);
          const daysUntilFee = Math.ceil((feeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilFee <= 30 && daysUntilFee > 0) {
            newNotifications.push({
              id: `annual_fee_${card.id}`,
              type: 'annual_fee',
              title: `Annual fee due soon`,
              description: `${card.name} annual fee of $${card.annualFee} due in ${daysUntilFee} days`,
              priority: daysUntilFee <= 7 ? 'high' : 'medium',
              cardId: card.id
            });
          }
        }
      });

      // Filter out dismissed notifications
      const filteredNotifications = newNotifications.filter(
        notif => !dismissedNotifications.includes(notif.id)
      );

      setNotifications(filteredNotifications);
    };

    generateNotifications();
  }, [cards, dismissedNotifications]);

  const dismissNotification = (notificationId: string) => {
    setDismissedNotifications(prev => [...prev, notificationId]);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'bonus_completion':
      case 'bonus_deadline':
        return <Gift className="h-4 w-4" />;
      case 'annual_fee':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Credit Card Alerts</CardTitle>
        </div>
        <CardDescription>
          Important notifications about your credit cards
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.map((notification) => (
          <div 
            key={notification.id} 
            className="flex items-start justify-between p-3 bg-background rounded-lg border"
          >
            <div className="flex items-start gap-3 flex-1">
              <div className="mt-0.5">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{notification.title}</p>
                  <Badge className={getPriorityColor(notification.priority)}>
                    {notification.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {notification.description}
                </p>
                {notification.actionLabel && notification.onAction && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={notification.onAction}
                    className="mt-2"
                  >
                    {notification.actionLabel}
                  </Button>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dismissNotification(notification.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}