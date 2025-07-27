import express from 'express';
import { BaseService } from '../services/baseService';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const stockService = new BaseService('stocks');

interface Stock {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  shares: number;
  purchasePrice: number;
  currentPrice: number;
  totalValue: number;
  gainLoss: number;
  gainLossPercentage: number;
  purchaseDate: Date;
  sector?: string;
  dividendYield?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Get all stocks
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const stocks = await stockService.getAll(req.userId!);
    res.json(stocks);
  } catch (error) {
    next(error);
  }
});

// Get stock by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const stock = await stockService.getById(req.params.id, req.userId!);
    if (!stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }
    res.json(stock);
  } catch (error) {
    next(error);
  }
});

// Create new stock
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const stockData = {
      ...req.body,
      userId: req.userId!,
      purchaseDate: new Date(req.body.purchaseDate || Date.now()),
      totalValue: req.body.shares * req.body.purchasePrice,
      gainLoss: 0,
      gainLossPercentage: 0
    };
    
    const id = await stockService.create(stockData);
    res.status(201).json({ id, message: 'Stock created successfully' });
  } catch (error) {
    next(error);
  }
});

// Update stock
router.put('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const updateData = { ...req.body };
    
    if (updateData.purchaseDate) {
      updateData.purchaseDate = new Date(updateData.purchaseDate);
    }
    
    // Calculate derived fields if relevant data is provided
    if (updateData.shares !== undefined || updateData.currentPrice !== undefined || updateData.purchasePrice !== undefined) {
      const stock = await stockService.getById(req.params.id, req.userId!);
      if (stock) {
        const shares = updateData.shares !== undefined ? updateData.shares : (stock as any).shares;
        const currentPrice = updateData.currentPrice !== undefined ? updateData.currentPrice : (stock as any).currentPrice;
        const purchasePrice = updateData.purchasePrice !== undefined ? updateData.purchasePrice : (stock as any).purchasePrice;
        
        updateData.totalValue = shares * currentPrice;
        updateData.gainLoss = (currentPrice - purchasePrice) * shares;
        updateData.gainLossPercentage = ((currentPrice - purchasePrice) / purchasePrice) * 100;
      }
    }
    
    await stockService.update(req.params.id, req.userId!, updateData);
    res.json({ message: 'Stock updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete stock
router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    await stockService.delete(req.params.id, req.userId!);
    res.json({ message: 'Stock deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as stockRoutes };