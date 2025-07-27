import express from 'express';
import { BaseService } from '../services/baseService';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const budgetService = new BaseService('budgets');

interface Budget {
  id: string;
  userId: string;
  name: string;
  category: string;
  amount: number;
  spent: number;
  remaining: number;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Get all budgets
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const budgets = await budgetService.getAll(req.userId!);
    res.json(budgets);
  } catch (error) {
    next(error);
  }
});

// Get budget by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const budget = await budgetService.getById(req.params.id, req.userId!);
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    res.json(budget);
  } catch (error) {
    next(error);
  }
});

// Create new budget
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const budgetData = {
      ...req.body,
      userId: req.userId!,
      spent: 0,
      remaining: req.body.amount,
      isActive: true,
      startDate: new Date(req.body.startDate || Date.now()),
      endDate: new Date(req.body.endDate)
    };
    
    const id = await budgetService.create(budgetData);
    res.status(201).json({ id, message: 'Budget created successfully' });
  } catch (error) {
    next(error);
  }
});

// Update budget
router.put('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const updateData = { ...req.body };
    
    if (updateData.amount !== undefined || updateData.spent !== undefined) {
      const budget = await budgetService.getById(req.params.id, req.userId!);
      if (budget) {
        const amount = updateData.amount !== undefined ? updateData.amount : (budget as any).amount;
        const spent = updateData.spent !== undefined ? updateData.spent : (budget as any).spent;
        updateData.remaining = amount - spent;
      }
    }
    
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
    
    await budgetService.update(req.params.id, req.userId!, updateData);
    res.json({ message: 'Budget updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete budget
router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    await budgetService.delete(req.params.id, req.userId!);
    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as budgetRoutes };