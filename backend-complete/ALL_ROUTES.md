# All Backend Route Files

All routes follow the same pattern using BaseService. Here are the remaining route files:

## src/routes/bankAccounts.ts
```typescript
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

router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const accounts = await bankAccountService.getAll(req.userId!);
    res.json(accounts);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const data = bankAccountSchema.parse(req.body);
    const id = await bankAccountService.create({ ...data, userId: req.userId! });
    res.status(201).json({ id, message: 'Bank account created successfully' });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const data = bankAccountSchema.partial().parse(req.body);
    await bankAccountService.update(req.params.id, req.userId!, data);
    res.json({ message: 'Bank account updated successfully' });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    await bankAccountService.delete(req.params.id, req.userId!);
    res.json({ message: 'Bank account deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as bankAccountRoutes };
```

## src/routes/creditCards.ts
```typescript
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
```

## src/routes/transactions.ts
```typescript
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
  toAccountType: z.enum(['bank', 'credit']).optional()
});

router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const transactions = await transactionService.getAll(req.userId!);
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const data = transactionSchema.parse(req.body);
    const id = await transactionService.create({ ...data, userId: req.userId! });
    res.status(201).json({ id, message: 'Transaction created successfully' });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const data = transactionSchema.partial().parse(req.body);
    await transactionService.update(req.params.id, req.userId!, data);
    res.json({ message: 'Transaction updated successfully' });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    await transactionService.delete(req.params.id, req.userId!);
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as transactionRoutes };
```

## All other routes follow the same pattern:
- src/routes/budgets.ts
- src/routes/savingsGoals.ts  
- src/routes/recurringPayments.ts
- src/routes/stocks.ts
- src/routes/accountGoals.ts

Just replace the schema and service name for each collection.

## Environment Variables for Render:
```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...} // Your Firebase service account JSON
FIREBASE_PROJECT_ID=your-project-id
JWT_SECRET=your-random-secret-string
FRONTEND_URL=https://your-lovable-app.lovable.app
```