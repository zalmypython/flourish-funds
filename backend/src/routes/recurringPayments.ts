import express from 'express';
import { BaseService } from '../services/baseService';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const recurringPaymentService = new BaseService('recurringPayments');

interface RecurringPayment {
  id: string;
  userId: string;
  name: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextPaymentDate: Date;
  category: string;
  paymentMethod: string;
  accountId?: string;
  isActive: boolean;
  lastProcessed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Get all recurring payments
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const payments = await recurringPaymentService.getAll(req.userId!);
    res.json(payments);
  } catch (error) {
    next(error);
  }
});

// Get recurring payment by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const payment = await recurringPaymentService.getById(req.params.id, req.userId!);
    if (!payment) {
      return res.status(404).json({ error: 'Recurring payment not found' });
    }
    res.json(payment);
  } catch (error) {
    next(error);
  }
});

// Create new recurring payment
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const paymentData = {
      ...req.body,
      userId: req.userId!,
      isActive: true,
      nextPaymentDate: new Date(req.body.nextPaymentDate || Date.now())
    };
    
    const id = await recurringPaymentService.create(paymentData);
    res.status(201).json({ id, message: 'Recurring payment created successfully' });
  } catch (error) {
    next(error);
  }
});

// Update recurring payment
router.put('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const updateData = { ...req.body };
    
    if (updateData.nextPaymentDate) {
      updateData.nextPaymentDate = new Date(updateData.nextPaymentDate);
    }
    
    if (updateData.lastProcessed) {
      updateData.lastProcessed = new Date(updateData.lastProcessed);
    }
    
    await recurringPaymentService.update(req.params.id, req.userId!, updateData);
    res.json({ message: 'Recurring payment updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete recurring payment
router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    await recurringPaymentService.delete(req.params.id, req.userId!);
    res.json({ message: 'Recurring payment deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as recurringPaymentRoutes };