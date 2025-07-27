import nodemailer from 'nodemailer';
import { NotificationLog } from '../models/notificationLog';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailContent {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(config: EmailConfig) {
    this.transporter = nodemailer.createTransporter({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  /**
   * Send an email notification
   */
  async sendNotificationEmail(
    content: EmailContent,
    notificationId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@yourfinanceapp.com',
        to: content.to,
        subject: content.subject,
        text: content.textBody,
        html: content.htmlBody,
      });

      // Log the sent notification
      await NotificationLog.create({
        id: notificationId,
        userId,
        type: 'email',
        recipient: content.to,
        subject: content.subject,
        sentAt: new Date().toISOString(),
        messageId: info.messageId,
        status: 'sent'
      });

      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      
      // Log the failed notification
      await NotificationLog.create({
        id: notificationId,
        userId,
        type: 'email',
        recipient: content.to,
        subject: content.subject,
        sentAt: new Date().toISOString(),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return false;
    }
  }

  /**
   * Verify email configuration
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service verification failed:', error);
      return false;
    }
  }

  /**
   * Generate balance reminder email template
   */
  static generateBalanceReminderEmail(
    cardName: string,
    currentBalance: number,
    minimumPayment: number,
    dueDate: string,
    daysUntilDue: number,
    isOverdue: boolean
  ): { subject: string; htmlBody: string; textBody: string } {
    const urgency = isOverdue ? 'OVERDUE' : daysUntilDue <= 3 ? 'URGENT' : '';
    const subject = `${urgency ? `${urgency}: ` : ''}Payment ${isOverdue ? 'Overdue' : 'Due'} - ${cardName}`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${isOverdue ? '#fee2e2' : daysUntilDue <= 3 ? '#fef3c7' : '#f0f9ff'}; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <h1 style="color: ${isOverdue ? '#dc2626' : daysUntilDue <= 3 ? '#d97706' : '#2563eb'}; margin: 0;">
            ${isOverdue ? '⚠️ Payment Overdue' : '📅 Payment Reminder'}
          </h1>
          <p style="font-size: 18px; margin: 10px 0 0 0;">
            ${cardName}
          </p>
        </div>

        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #374151; margin: 0 0 15px 0;">Payment Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Outstanding Balance:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">$${currentBalance.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Minimum Payment:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">$${minimumPayment.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Due Date:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${new Date(dueDate).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Status:</strong></td>
              <td style="padding: 8px 0; text-align: right; color: ${isOverdue ? '#dc2626' : daysUntilDue <= 3 ? '#d97706' : '#059669'};">
                ${isOverdue ? 'OVERDUE' : daysUntilDue === 0 ? 'Due Today' : `${daysUntilDue} days remaining`}
              </td>
            </tr>
          </table>
        </div>

        ${isOverdue ? `
          <div style="background: #dc2626; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <h3 style="margin: 0 0 10px 0;">⚠️ IMMEDIATE ACTION REQUIRED</h3>
            <p style="margin: 0;">Your payment is overdue. Please make a payment immediately to avoid additional fees and potential credit score impact.</p>
          </div>
        ` : ''}

        <div style="background: #3b82f6; color: white; padding: 15px; border-radius: 8px; text-align: center;">
          <h3 style="margin: 0 0 10px 0;">💡 Payment Tips</h3>
          <ul style="margin: 0; padding-left: 20px; text-align: left;">
            <li>Pay at least the minimum to avoid late fees</li>
            <li>Pay more than the minimum to reduce interest charges</li>
            <li>Consider setting up auto-pay to never miss a payment</li>
          </ul>
        </div>

        <p style="font-size: 12px; color: #6b7280; margin-top: 20px; text-align: center;">
          This is an automated reminder from your personal finance tracker.<br>
          To stop receiving these emails, please update your notification preferences.
        </p>
      </div>
    `;

    const textBody = `
${subject}

Payment Details:
- Card: ${cardName}
- Outstanding Balance: $${currentBalance.toFixed(2)}
- Minimum Payment: $${minimumPayment.toFixed(2)}
- Due Date: ${new Date(dueDate).toLocaleDateString()}
- Status: ${isOverdue ? 'OVERDUE' : daysUntilDue === 0 ? 'Due Today' : `${daysUntilDue} days remaining`}

${isOverdue ? 'IMMEDIATE ACTION REQUIRED: Your payment is overdue. Please make a payment immediately to avoid additional fees and potential credit score impact.' : ''}

Payment Tips:
- Pay at least the minimum to avoid late fees
- Pay more than the minimum to reduce interest charges
- Consider setting up auto-pay to never miss a payment

This is an automated reminder from your personal finance tracker.
To stop receiving these emails, please update your notification preferences.
    `;

    return { subject, htmlBody, textBody };
  }
}