import express from 'express';
import { BaseService } from '../services/baseService';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const savingsGoalService = new BaseService('savingsGoals');

interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  category: string;
  priority: 'low' | 'medium' | 'high';
  isActive: boolean;
  isCompleted: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Get all savings goals
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const goals = await savingsGoalService.getAll(req.userId!);
    res.json(goals);
  } catch (error) {
    next(error);
  }
});

// Get savings goal by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const goal = await savingsGoalService.getById(req.params.id, req.userId!);
    if (!goal) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }
    res.json(goal);
  } catch (error) {
    next(error);
  }
});

// Create new savings goal
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const goalData = {
      ...req.body,
      userId: req.userId!,
      currentAmount: req.body.currentAmount || 0,
      isActive: true,
      isCompleted: false,
      targetDate: new Date(req.body.targetDate)
    };
    
    const id = await savingsGoalService.create(goalData);
    res.status(201).json({ id, message: 'Savings goal created successfully' });
  } catch (error) {
    next(error);
  }
});

// Update savings goal
router.put('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const updateData = { ...req.body };
    
    if (updateData.targetDate) {
      updateData.targetDate = new Date(updateData.targetDate);
    }
    
    // Check if goal is completed
    if (updateData.currentAmount !== undefined && updateData.targetAmount !== undefined) {
      if (updateData.currentAmount >= updateData.targetAmount) {
        updateData.isCompleted = true;
        updateData.completedAt = new Date();
      } else {
        updateData.isCompleted = false;
        updateData.completedAt = null;
      }
    }
    
    await savingsGoalService.update(req.params.id, req.userId!, updateData);
    res.json({ message: 'Savings goal updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete savings goal
router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    await savingsGoalService.delete(req.params.id, req.userId!);
    res.json({ message: 'Savings goal deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as savingsGoalRoutes };