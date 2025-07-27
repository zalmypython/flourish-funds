import express from 'express';
import { BaseService } from '../services/baseService';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const creditCardService = new BaseService('creditCards');

interface CreditCard {
  id: string;
  userId: string;
  name: string;
  lastFourDigits: string;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
  interestRate: number;
  rewardsProgram?: string;
  cashbackRate?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Get all credit cards
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const cards = await creditCardService.getAll(req.userId!);
    res.json(cards);
  } catch (error) {
    next(error);
  }
});

// Get credit card by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const card = await creditCardService.getById(req.params.id, req.userId!);
    if (!card) {
      return res.status(404).json({ error: 'Credit card not found' });
    }
    res.json(card);
  } catch (error) {
    next(error);
  }
});

// Create new credit card
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const cardData = {
      ...req.body,
      userId: req.userId!,
      isActive: true,
      availableCredit: req.body.creditLimit - (req.body.currentBalance || 0)
    };
    
    const id = await creditCardService.create(cardData);
    res.status(201).json({ id, message: 'Credit card created successfully' });
  } catch (error) {
    next(error);
  }
});

// Update credit card
router.put('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const updateData = { ...req.body };
    if (updateData.creditLimit !== undefined && updateData.currentBalance !== undefined) {
      updateData.availableCredit = updateData.creditLimit - updateData.currentBalance;
    }
    
    await creditCardService.update(req.params.id, req.userId!, updateData);
    res.json({ message: 'Credit card updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete credit card
router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    await creditCardService.delete(req.params.id, req.userId!);
    res.json({ message: 'Credit card deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as creditCardRoutes };