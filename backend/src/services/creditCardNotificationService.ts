interface CreditCard {
  id: string;
  userId: string;
  name: string;
  currentBalance: number;
  statementBalance: number;
  minimumPaymentDue: number;
  limit: number;
  dueDate: string;
  nextStatementDate: string;
  paymentReminderDays: number;
  interestRate: number;
  isActive: boolean;
}

interface NotificationItem {
  id: string;
  type: 'balance_due' | 'high_utilization' | 'payment_reminder' | 'bonus_alert' | 'late_payment' | 'statement_ready';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  cardId: string;
  daysUntilDue?: number;
  amount?: number;
  actionRequired: boolean;
}

export class CreditCardNotificationService {
  /**
   * Generates balance-related notifications for a credit card
   */
  static generateBalanceNotifications(card: CreditCard): NotificationItem[] {
    const notifications: NotificationItem[] = [];
    const today = new Date();
    const dueDate = new Date(card.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = today > dueDate;
    const utilization = card.limit > 0 ? (card.currentBalance / card.limit) * 100 : 0;

    // Payment overdue notification
    if (isOverdue && card.currentBalance > 0) {
      notifications.push({
        id: `overdue_${card.id}`,
        type: 'late_payment',
        title: 'Payment Overdue',
        message: `${card.name} payment of $${card.minimumPaymentDue.toFixed(2)} is overdue. Outstanding balance: $${card.currentBalance.toFixed(2)}`,
        priority: 'high',
        cardId: card.id,
        daysUntilDue,
        amount: card.minimumPaymentDue,
        actionRequired: true
      });
    }

    // Payment due soon notification
    if (daysUntilDue <= card.paymentReminderDays && daysUntilDue > 0 && card.currentBalance > 0) {
      const urgency = daysUntilDue <= 3 ? 'high' : 'medium';
      notifications.push({
        id: `payment_due_${card.id}`,
        type: 'payment_reminder',
        title: `Payment Due ${daysUntilDue === 1 ? 'Tomorrow' : `in ${daysUntilDue} days`}`,
        message: `${card.name} minimum payment of $${card.minimumPaymentDue.toFixed(2)} is due. Outstanding balance: $${card.currentBalance.toFixed(2)}`,
        priority: urgency,
        cardId: card.id,
        daysUntilDue,
        amount: card.minimumPaymentDue,
        actionRequired: true
      });
    }

    // High utilization warning
    if (utilization >= 70) {
      const urgency = utilization >= 90 ? 'high' : 'medium';
      notifications.push({
        id: `high_util_${card.id}`,
        type: 'high_utilization',
        title: `High Credit Utilization`,
        message: `${card.name} is at ${utilization.toFixed(1)}% utilization ($${card.currentBalance.toFixed(2)} / $${card.limit.toFixed(2)}). Consider paying down the balance.`,
        priority: urgency,
        cardId: card.id,
        amount: card.currentBalance,
        actionRequired: false
      });
    }

    // Statement balance notification
    if (card.statementBalance > 0 && card.statementBalance !== card.currentBalance) {
      const nextStatementDate = new Date(card.nextStatementDate);
      const daysUntilStatement = Math.ceil((nextStatementDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilStatement <= 7 && daysUntilStatement > 0) {
        notifications.push({
          id: `statement_${card.id}`,
          type: 'statement_ready',
          title: 'Statement Available',
          message: `${card.name} statement balance: $${card.statementBalance.toFixed(2)}. Next statement in ${daysUntilStatement} days.`,
          priority: 'low',
          cardId: card.id,
          amount: card.statementBalance,
          actionRequired: false
        });
      }
    }

    return notifications;
  }
}