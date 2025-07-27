import express from 'express';
import { BaseService } from '../services/baseService';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const bankAccountService = new BaseService('bankAccounts');

interface BankAccount {
  id: string;
  userId: string;
  name: string;
  type: string;
  balance: number;
  accountNumber?: string;
  routingNumber?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Get all bank accounts
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const accounts = await bankAccountService.getAll(req.userId!);
    res.json(accounts);
  } catch (error) {
    next(error);
  }
});

// Get bank account by ID
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

// Create new bank account
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const accountData = {
      ...req.body,
      userId: req.userId!,
      isActive: true
    };
    
    const id = await bankAccountService.create(accountData);
    res.status(201).json({ id, message: 'Bank account created successfully' });
  } catch (error) {
    next(error);
  }
});

// Update bank account
router.put('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    await bankAccountService.update(req.params.id, req.userId!, req.body);
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