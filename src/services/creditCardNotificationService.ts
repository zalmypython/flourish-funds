import { CreditCard, NotificationLog, NotificationPreferences } from '@/types';
import { CreditCardBalanceService } from './creditCardBalanceService';

export interface NotificationItem {
  id: string;
  type: 'balance_due' | 'high_utilization' | 'payment_reminder' | 'late_payment' | 'statement_ready';
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
    const balanceCheck = CreditCardBalanceService.shouldNotifyForBalance(card);
    const utilization = CreditCardBalanceService.calculateUtilization(card.currentBalance, card.limit);

    // Payment overdue notification
    if (balanceCheck.overdue && card.currentBalance > 0) {
      notifications.push({
        id: `overdue_${card.id}`,
        type: 'late_payment',
        title: 'Payment Overdue',
        message: `${card.name} payment of $${card.minimumPaymentDue.toFixed(2)} is overdue. Outstanding balance: $${card.currentBalance.toFixed(2)}`,
        priority: 'high',
        cardId: card.id,
        daysUntilDue: balanceCheck.daysUntilDue,
        amount: card.minimumPaymentDue,
        actionRequired: true
      });
    }

    // Payment due soon notification
    if (balanceCheck.paymentDue && !balanceCheck.overdue && card.currentBalance > 0) {
      const urgency = balanceCheck.daysUntilDue <= 3 ? 'high' : 'medium';
      notifications.push({
        id: `payment_due_${card.id}`,
        type: 'payment_reminder',
        title: `Payment Due ${balanceCheck.daysUntilDue === 1 ? 'Tomorrow' : `in ${balanceCheck.daysUntilDue} days`}`,
        message: `${card.name} minimum payment of $${card.minimumPaymentDue.toFixed(2)} is due. Outstanding balance: $${card.currentBalance.toFixed(2)}`,
        priority: urgency,
        cardId: card.id,
        daysUntilDue: balanceCheck.daysUntilDue,
        amount: card.minimumPaymentDue,
        actionRequired: true
      });
    }

    // High utilization warning
    if (balanceCheck.highUtilization) {
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
      const daysUntilStatement = CreditCardBalanceService.getDaysUntilDue(card.nextStatementDate);
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

  /**
   * Generates email notification content
   */
  static generateEmailContent(notification: NotificationItem, card: CreditCard): {
    subject: string;
    htmlBody: string;
    textBody: string;
  } {
    const subject = `${notification.title} - ${card.name}`;
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${notification.priority === 'high' ? '#fee2e2' : notification.priority === 'medium' ? '#fef3c7' : '#f0f9ff'}; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: ${notification.priority === 'high' ? '#dc2626' : notification.priority === 'medium' ? '#d97706' : '#2563eb'}; margin: 0 0 10px 0;">
            ${notification.title}
          </h2>
          <p style="margin: 0; font-size: 16px; line-height: 1.5;">
            ${notification.message}
          </p>
        </div>
        
        <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">Card Details</h3>
          <p style="margin: 5px 0;"><strong>Card:</strong> ${card.name}</p>
          <p style="margin: 5px 0;"><strong>Current Balance:</strong> $${card.currentBalance.toFixed(2)}</p>
          <p style="margin: 5px 0;"><strong>Credit Limit:</strong> $${card.limit.toFixed(2)}</p>
          <p style="margin: 5px 0;"><strong>Available Credit:</strong> $${CreditCardBalanceService.calculateAvailableCredit(card.limit, card.currentBalance).toFixed(2)}</p>
          ${notification.daysUntilDue ? `<p style="margin: 5px 0;"><strong>Payment Due:</strong> ${notification.daysUntilDue} days</p>` : ''}
        </div>
        
        ${notification.actionRequired ? `
          <div style="background: #3b82f6; color: white; padding: 15px; border-radius: 6px; text-align: center;">
            <p style="margin: 0; font-weight: bold;">Action Required</p>
            <p style="margin: 5px 0 0 0;">Please review your account and make necessary payments.</p>
          </div>
        ` : ''}
        
        <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
          This is an automated notification from your personal finance tracker.
        </p>
      </div>
    `;

    const textBody = `
${notification.title} - ${card.name}

${notification.message}

Card Details:
- Card: ${card.name}
- Current Balance: $${card.currentBalance.toFixed(2)}
- Credit Limit: $${card.limit.toFixed(2)}
- Available Credit: $${CreditCardBalanceService.calculateAvailableCredit(card.limit, card.currentBalance).toFixed(2)}
${notification.daysUntilDue ? `- Payment Due: ${notification.daysUntilDue} days\n` : ''}

${notification.actionRequired ? 'ACTION REQUIRED: Please review your account and make necessary payments.\n' : ''}

This is an automated notification from your personal finance tracker.
    `;

    return { subject, htmlBody, textBody };
  }

  /**
   * Filters notifications based on user preferences
   */
  static filterNotificationsByPreferences(
    notifications: NotificationItem[],
    preferences: NotificationPreferences
  ): NotificationItem[] {
    return notifications.filter(notification => {
      switch (notification.type) {
        case 'balance_due':
        case 'payment_reminder':
        case 'late_payment':
          return preferences.paymentReminders;
        case 'high_utilization':
          return preferences.utilizationWarnings;
        case 'statement_ready':
          return preferences.balanceReminders;
        default:
          return true;
      }
    });
  }

  /**
   * Determines if notification should be sent based on timing and preferences
   */
  static shouldSendNotification(
    notification: NotificationItem,
    preferences: NotificationPreferences,
    lastSent?: string
  ): boolean {
    // Don't send if notifications are disabled
    if (!preferences.emailNotifications) return false;

    // Check if enough time has passed since last notification of same type
    if (lastSent) {
      const lastSentDate = new Date(lastSent);
      const now = new Date();
      const hoursSinceLastSent = (now.getTime() - lastSentDate.getTime()) / (1000 * 60 * 60);
      
      // Don't spam - minimum 4 hours between similar notifications
      if (hoursSinceLastSent < 4) return false;
    }

    // Send high priority notifications immediately
    if (notification.priority === 'high') return true;

    // Check if it's the right time to send based on user preferences
    const now = new Date();
    const [prefHour, prefMinute] = preferences.notificationTime.split(':').map(Number);
    const currentHour = now.getHours();
    
    // Send within 2 hours of preferred time
    const timeDiff = Math.abs(currentHour - prefHour);
    return timeDiff <= 2;
  }
}