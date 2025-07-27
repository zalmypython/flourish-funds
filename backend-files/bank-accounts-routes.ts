// src/routes/bankAccounts.ts
import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { BaseService } from '../services/baseService';
import { z } from 'zod';

const router = express.Router();
const bankAccountService = new BaseService('bankAccounts');

const bankAccountSchema = z.object({
  name: z.string(),
  type: z.string(),
  initialBalance: z.number(),
  currentBalance: z.number().optional(),
  routingNumber: z.string().optional(),
  accountNumber: z.string().optional(),
  bank: z.string().optional()
});

// Get all bank accounts
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const accounts = await bankAccountService.getAll(req.userId!);
    res.json(accounts);
  } catch (error) {
    next(error);
  }
});

// Get single bank account
router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const account = await bankAccountService.getById(req.params.id, req.userId!);
    if (!account) {
      return res.status(404).json({ error: 'Bank account not found' });
    }
    res.json(account);
  } catch (error) {
    next(error);
  }
});

// Create bank account
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const data = bankAccountSchema.parse(req.body);
    const id = await bankAccountService.create({ ...data, userId: req.userId! });
    res.status(201).json({ id, message: 'Bank account created successfully' });
  } catch (error) {
    next(error);
  }
});

// Update bank account
router.put('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const data = bankAccountSchema.partial().parse(req.body);
    await bankAccountService.update(req.params.id, req.userId!, data);
    res.json({ message: 'Bank account updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete bank account
router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    await bankAccountService.delete(req.params.id, req.userId!);
    res.json({ message: 'Bank account deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as bankAccountRoutes };