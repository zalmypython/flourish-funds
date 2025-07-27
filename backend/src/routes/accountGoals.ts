import express from 'express';
import { BaseService } from '../services/baseService';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const accountGoalService = new BaseService('accountGoals');

interface AccountGoal {
  id: string;
  userId: string;
  accountId: string;
  name: string;
  description?: string;
  goalType: 'balance' | 'savings_rate' | 'debt_reduction';
  targetValue: number;
  currentValue: number;
  targetDate: Date;
  isActive: boolean;
  isCompleted: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Get all account goals
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const goals = await accountGoalService.getAll(req.userId!);
    res.json(goals);
  } catch (error) {
    next(error);
  }
});

// Get account goal by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const goal = await accountGoalService.getById(req.params.id, req.userId!);
    if (!goal) {
      return res.status(404).json({ error: 'Account goal not found' });
    }
    res.json(goal);
  } catch (error) {
    next(error);
  }
});

// Create new account goal
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const goalData = {
      ...req.body,
      userId: req.userId!,
      currentValue: req.body.currentValue || 0,
      isActive: true,
      isCompleted: false,
      targetDate: new Date(req.body.targetDate)
    };
    
    const id = await accountGoalService.create(goalData);
    res.status(201).json({ id, message: 'Account goal created successfully' });
  } catch (error) {
    next(error);
  }
});

// Update account goal
router.put('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const updateData = { ...req.body };
    
    if (updateData.targetDate) {
      updateData.targetDate = new Date(updateData.targetDate);
    }
    
    // Check if goal is completed based on goal type
    if (updateData.currentValue !== undefined && updateData.targetValue !== undefined && updateData.goalType) {
      let isCompleted = false;
      
      switch (updateData.goalType) {
        case 'balance':
        case 'savings_rate':
          isCompleted = updateData.currentValue >= updateData.targetValue;
          break;
        case 'debt_reduction':
          isCompleted = updateData.currentValue <= updateData.targetValue;
          break;
      }
      
      if (isCompleted) {
        updateData.isCompleted = true;
        updateData.completedAt = new Date();
      } else {
        updateData.isCompleted = false;
        updateData.completedAt = null;
      }
    }
    
    await accountGoalService.update(req.params.id, req.userId!, updateData);
    res.json({ message: 'Account goal updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete account goal
router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    await accountGoalService.delete(req.params.id, req.userId!);
    res.json({ message: 'Account goal deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as accountGoalRoutes };