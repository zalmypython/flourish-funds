export interface NotificationLogData {
  id: string;
  userId: string;
  type: 'email' | 'push' | 'in_app';
  recipient: string;
  subject: string;
  sentAt: string;
  messageId?: string;
  status: 'sent' | 'failed' | 'pending';
  error?: string;
  cardId?: string;
  notificationType?: string;
}

export class NotificationLog {
  static async create(data: NotificationLogData): Promise<string> {
    // This would integrate with your database
    // For now, just log to console
    console.log('Notification logged:', data);
    return data.id;
  }

  static async getByUserId(userId: string, limit: number = 50): Promise<NotificationLogData[]> {
    // This would fetch from your database
    // For now, return empty array
    return [];
  }

  static async getRecentByType(
    userId: string, 
    type: string, 
    hours: number = 24
  ): Promise<NotificationLogData[]> {
    // This would fetch recent notifications of a specific type
    // Used to prevent spam
    return [];
  }
}