// src/routes/creditCards.ts
import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { BaseService } from '../services/baseService';
import { z } from 'zod';

const router = express.Router();
const creditCardService = new BaseService('creditCards');

const creditCardSchema = z.object({
  name: z.string(),
  issuer: z.string(),
  lastFourDigits: z.string(),
  creditLimit: z.number(),
  currentBalance: z.number().optional(),
  initialBalance: z.number().optional(),
  interestRate: z.number(),
  paymentDueDate: z.string().optional(),
  minimumPayment: z.number().optional(),
  isActive: z.boolean().optional()
});

router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const cards = await creditCardService.getAll(req.userId!);
    res.json(cards);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const data = creditCardSchema.parse(req.body);
    const id = await creditCardService.create({ ...data, userId: req.userId! });
    res.status(201).json({ id, message: 'Credit card created successfully' });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const data = creditCardSchema.partial().parse(req.body);
    await creditCardService.update(req.params.id, req.userId!, data);
    res.json({ message: 'Credit card updated successfully' });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    await creditCardService.delete(req.params.id, req.userId!);
    res.json({ message: 'Credit card deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as creditCardRoutes };

// src/routes/budgets.ts (same pattern)
// src/routes/savingsGoals.ts (same pattern)
// src/routes/recurringPayments.ts (same pattern)
// src/routes/stocks.ts (same pattern)
// src/routes/accountGoals.ts (same pattern)

// All follow the same CRUD pattern with BaseService