// src/routes/transactions.ts
import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { BaseService } from '../services/baseService';
import { z } from 'zod';

const router = express.Router();
const transactionService = new BaseService('transactions');

const transactionSchema = z.object({
  date: z.string(),
  amount: z.number(),
  description: z.string(),
  category: z.string(),
  type: z.enum(['income', 'expense', 'transfer', 'payment']),
  accountId: z.string(),
  accountType: z.enum(['bank', 'credit']),
  toAccountId: z.string().optional(),
  toAccountType: z.enum(['bank', 'credit']).optional(),
  isRecurring: z.boolean().optional()
});

// Get all transactions
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const transactions = await transactionService.getAll(req.userId!);
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

// Get transactions by account
router.get('/account/:accountId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { accountId } = req.params;
    const { accountType } = req.query;
    
    const transactions = await transactionService.getAll(req.userId!);
    const filtered = transactions.filter((t: any) => 
      (t.accountId === accountId && t.accountType === accountType) ||
      (t.toAccountId === accountId && t.toAccountType === accountType)
    );
    
    res.json(filtered);
  } catch (error) {
    next(error);
  }
});

// Create transaction
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const data = transactionSchema.parse(req.body);
    const id = await transactionService.create({ ...data, userId: req.userId! });
    res.status(201).json({ id, message: 'Transaction created successfully' });
  } catch (error) {
    next(error);
  }
});

// Update transaction
router.put('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const data = transactionSchema.partial().parse(req.body);
    await transactionService.update(req.params.id, req.userId!, data);
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