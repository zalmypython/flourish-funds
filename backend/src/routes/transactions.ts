import express from 'express';
import { BaseService } from '../services/baseService';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const transactionService = new BaseService('transactions');

interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense';
  date: Date;
  merchant?: string;
  tags?: string[];
  isRecurring?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Get all transactions
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const transactions = await transactionService.getAll(req.userId!);
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

// Get transaction by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const transaction = await transactionService.getById(req.params.id, req.userId!);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    next(error);
  }
});

// Create new transaction
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const transactionData = {
      ...req.body,
      userId: req.userId!,
      date: new Date(req.body.date || Date.now())
    };
    
    const id = await transactionService.create(transactionData);
    res.status(201).json({ id, message: 'Transaction created successfully' });
  } catch (error) {
    next(error);
  }
});

// Update transaction
router.put('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const updateData = { ...req.body };
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }
    
    await transactionService.update(req.params.id, req.userId!, updateData);
    res.json({ message: 'Transaction updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete transaction
router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    await transactionService.delete(req.params.id, req.userId!);
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as transactionRoutes };