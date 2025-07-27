import express from 'express';
import { BaseService } from '../services/baseService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { CreditCardNotificationService } from '../services/creditCardNotificationService';
import { EmailService } from '../services/emailService';

const router = express.Router();
const notificationService = new BaseService('notifications');
const notificationPreferencesService = new BaseService('notificationPreferences');

// Get user notification preferences
router.get('/preferences', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    let preferences = await notificationPreferencesService.getByUserId(req.userId!);
    
    // Create default preferences if none exist
    if (!preferences || preferences.length === 0) {
      const defaultPreferences = {
        userId: req.userId!,
        emailNotifications: true,
        pushNotifications: false,
        balanceReminders: true,
        paymentReminders: true,
        bonusAlerts: true,
        utilizationWarnings: true,
        reminderDays: [7, 3, 1],
        notificationTime: '09:00'
      };
      
      const id = await notificationPreferencesService.create(defaultPreferences);
      preferences = [{ id, ...defaultPreferences }];
    }
    
    res.json(preferences[0]);
  } catch (error) {
    next(error);
  }
});

// Update notification preferences
router.put('/preferences', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    let existingPrefs = await notificationPreferencesService.getByUserId(req.userId!);
    
    if (existingPrefs && existingPrefs.length > 0) {
      await notificationPreferencesService.update(existingPrefs[0].id, req.userId!, req.body);
    } else {
      await notificationPreferencesService.create({
        ...req.body,
        userId: req.userId!
      });
    }
    
    res.json({ message: 'Notification preferences updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Get notification history
router.get('/history', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const notifications = await notificationService.getAll(req.userId!);
    res.json(notifications);
  } catch (error) {
    next(error);
  }
});

// Test notification system
router.post('/test', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { type, cardId } = req.body;
    
    // This would trigger a test notification
    const testNotification = {
      id: `test_${Date.now()}`,
      userId: req.userId!,
      type,
      cardId,
      title: 'Test Notification',
      message: 'This is a test notification from your finance app.',
      priority: 'low' as const,
      sentAt: new Date().toISOString(),
      dismissed: false
    };
    
    const id = await notificationService.create(testNotification);
    res.json({ id, message: 'Test notification created successfully' });
  } catch (error) {
    next(error);
  }
});

// Dismiss notification
router.patch('/:id/dismiss', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    await notificationService.update(req.params.id, req.userId!, { dismissed: true });
    res.json({ message: 'Notification dismissed successfully' });
  } catch (error) {
    next(error);
  }
});

// Check for due notifications (for scheduled job)
router.post('/check-due', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    // This endpoint would be called by a scheduled job to check for due notifications
    // In a real implementation, this would:
    // 1. Fetch all active credit cards for all users
    // 2. Generate notifications for each card
    // 3. Send emails for high priority notifications
    // 4. Store notifications in database
    
    res.json({ message: 'Notification check completed' });
  } catch (error) {
    next(error);
  }
});

export { router as notificationRoutes };