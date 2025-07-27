import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { auth, AuthRequest } from '../middleware/auth';
import { incomeSourceService } from '../services/incomeSourceService';
import { auditLog } from '../middleware/auditLogger';
import { enhancedLogger } from '../utils/enhancedLogger';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// GET /api/income-sources - Get all user's income sources
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const incomeSources = await incomeSourceService.getAll(req.userId!);
    
    auditLog({
      userId: req.userId!,
      action: 'INCOME_SOURCES_FETCHED',
      resource: 'income_sources',
      details: { count: incomeSources.length }
    });

    res.json(incomeSources);
  } catch (error) {
    enhancedLogger.error('Failed to fetch income sources', { error, userId: req.userId });
    res.status(500).json({ error: 'Failed to fetch income sources' });
  }
});

// GET /api/income-sources/:id - Get specific income source
router.get('/:id', 
  auth,
  param('id').isString().notEmpty(),
  handleValidationErrors,
  async (req: AuthRequest, res) => {
    try {
      const incomeSource = await incomeSourceService.getById(req.params.id, req.userId!);
      
      if (!incomeSource) {
        return res.status(404).json({ error: 'Income source not found' });
      }

      auditLog({
        userId: req.userId!,
        action: 'INCOME_SOURCE_VIEWED',
        resource: 'income_source',
        resourceId: req.params.id
      });

      res.json(incomeSource);
    } catch (error) {
      enhancedLogger.error('Failed to fetch income source', { error, userId: req.userId, incomeSourceId: req.params.id });
      res.status(500).json({ error: 'Failed to fetch income source' });
    }
  }
);

// POST /api/income-sources - Create new income source
router.post('/',
  auth,
  [
    body('name').isString().trim().isLength({ min: 1, max: 100 }),
    body('description').optional().isString().trim().isLength({ max: 500 }),
    body('type').isIn(['salary', 'freelance', 'gig', 'business', 'investment', 'gifts', 'government', 'other']),
    body('employer').optional().isString().trim().isLength({ max: 100 }),
    body('expectedMonthlyAmount').optional().isNumeric().toFloat(),
    body('isActive').optional().isBoolean(),
    body('color').isString().matches(/^#[0-9A-F]{6}$/i),
    body('icon').isString().trim().isLength({ min: 1, max: 50 })
  ],
  handleValidationErrors,
  async (req: AuthRequest, res) => {
    try {
      const incomeSourceData = {
        ...req.body,
        userId: req.userId!,
        payerRules: [],
        linkedTransactionIds: [],
        isActive: req.body.isActive ?? true
      };

      const incomeSourceId = await incomeSourceService.create(incomeSourceData);

      auditLog({
        userId: req.userId!,
        action: 'INCOME_SOURCE_CREATED',
        resource: 'income_source',
        resourceId: incomeSourceId,
        details: { name: req.body.name, type: req.body.type }
      });

      res.status(201).json({ id: incomeSourceId, message: 'Income source created successfully' });
    } catch (error) {
      enhancedLogger.error('Failed to create income source', { error, userId: req.userId });
      res.status(500).json({ error: 'Failed to create income source' });
    }
  }
);

// PUT /api/income-sources/:id - Update income source
router.put('/:id',
  auth,
  [
    param('id').isString().notEmpty(),
    body('name').optional().isString().trim().isLength({ min: 1, max: 100 }),
    body('description').optional().isString().trim().isLength({ max: 500 }),
    body('type').optional().isIn(['salary', 'freelance', 'gig', 'business', 'investment', 'gifts', 'government', 'other']),
    body('employer').optional().isString().trim().isLength({ max: 100 }),
    body('expectedMonthlyAmount').optional().isNumeric().toFloat(),
    body('isActive').optional().isBoolean(),
    body('color').optional().isString().matches(/^#[0-9A-F]{6}$/i),
    body('icon').optional().isString().trim().isLength({ min: 1, max: 50 })
  ],
  handleValidationErrors,
  async (req: AuthRequest, res) => {
    try {
      await incomeSourceService.update(req.params.id, req.userId!, req.body);

      auditLog({
        userId: req.userId!,
        action: 'INCOME_SOURCE_UPDATED',
        resource: 'income_source',
        resourceId: req.params.id,
        details: { updates: Object.keys(req.body) }
      });

      res.json({ message: 'Income source updated successfully' });
    } catch (error) {
      enhancedLogger.error('Failed to update income source', { error, userId: req.userId, incomeSourceId: req.params.id });
      res.status(500).json({ error: 'Failed to update income source' });
    }
  }
);

// DELETE /api/income-sources/:id - Delete income source
router.delete('/:id',
  auth,
  param('id').isString().notEmpty(),
  handleValidationErrors,
  async (req: AuthRequest, res) => {
    try {
      await incomeSourceService.delete(req.params.id, req.userId!);

      auditLog({
        userId: req.userId!,
        action: 'INCOME_SOURCE_DELETED',
        resource: 'income_source',
        resourceId: req.params.id
      });

      res.json({ message: 'Income source deleted successfully' });
    } catch (error) {
      enhancedLogger.error('Failed to delete income source', { error, userId: req.userId, incomeSourceId: req.params.id });
      res.status(500).json({ error: 'Failed to delete income source' });
    }
  }
);

// POST /api/income-sources/:id/payer-rules - Create payer rule
router.post('/:id/payer-rules',
  auth,
  [
    param('id').isString().notEmpty(),
    body('ruleType').isIn(['exactPayer', 'partialDescription', 'amountPattern', 'accountBased']),
    body('pattern').isString().trim().isLength({ min: 1, max: 200 }),
    body('description').optional().isString().trim().isLength({ max: 500 }),
    body('amountRange').optional().isObject(),
    body('amountRange.min').optional().isNumeric().toFloat(),
    body('amountRange.max').optional().isNumeric().toFloat(),
    body('accountId').optional().isString().trim(),
    body('isActive').optional().isBoolean()
  ],
  handleValidationErrors,
  async (req: AuthRequest, res) => {
    try {
      const ruleData = {
        ...req.body,
        isActive: req.body.isActive ?? true
      };

      const ruleId = await incomeSourceService.createPayerRule(req.userId!, req.params.id, ruleData);

      auditLog({
        userId: req.userId!,
        action: 'PAYER_RULE_CREATED',
        resource: 'payer_rule',
        resourceId: ruleId,
        details: { incomeSourceId: req.params.id, ruleType: req.body.ruleType }
      });

      res.status(201).json({ id: ruleId, message: 'Payer rule created successfully' });
    } catch (error) {
      enhancedLogger.error('Failed to create payer rule', { error, userId: req.userId, incomeSourceId: req.params.id });
      res.status(500).json({ error: 'Failed to create payer rule' });
    }
  }
);

// POST /api/income-sources/:id/link-transaction - Link transaction to income source
router.post('/:id/link-transaction',
  auth,
  [
    param('id').isString().notEmpty(),
    body('transactionId').isString().notEmpty()
  ],
  handleValidationErrors,
  async (req: AuthRequest, res) => {
    try {
      await incomeSourceService.linkTransactionToIncomeSource(req.userId!, req.params.id, req.body.transactionId);

      auditLog({
        userId: req.userId!,
        action: 'TRANSACTION_LINKED_TO_INCOME_SOURCE',
        resource: 'income_source_transaction_link',
        details: { incomeSourceId: req.params.id, transactionId: req.body.transactionId }
      });

      res.json({ message: 'Transaction linked successfully' });
    } catch (error) {
      enhancedLogger.error('Failed to link transaction', { error, userId: req.userId, incomeSourceId: req.params.id });
      res.status(500).json({ error: 'Failed to link transaction' });
    }
  }
);

// GET /api/income-sources/:id/analytics - Get income source analytics
router.get('/:id/analytics',
  auth,
  [
    param('id').isString().notEmpty(),
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate()
  ],
  handleValidationErrors,
  async (req: AuthRequest, res) => {
    try {
      const analytics = await incomeSourceService.getIncomeAnalytics(
        req.userId!,
        req.query.startDate as Date,
        req.query.endDate as Date
      );

      auditLog({
        userId: req.userId!,
        action: 'INCOME_ANALYTICS_VIEWED',
        resource: 'income_analytics',
        details: { incomeSourceId: req.params.id }
      });

      res.json(analytics);
    } catch (error) {
      enhancedLogger.error('Failed to fetch income analytics', { error, userId: req.userId, incomeSourceId: req.params.id });
      res.status(500).json({ error: 'Failed to fetch income analytics' });
    }
  }
);

// POST /api/income-sources/find-match - Find matching income source for transaction
router.post('/find-match',
  auth,
  [
    body('transaction').isObject(),
    body('transaction.description').optional().isString(),
    body('transaction.merchant').optional().isString(),
    body('transaction.amount').isNumeric(),
    body('transaction.accountId').optional().isString()
  ],
  handleValidationErrors,
  async (req: AuthRequest, res) => {
    try {
      const matchingSourceId = await incomeSourceService.findMatchingIncomeSource(req.userId!, req.body.transaction);

      res.json({ matchingIncomeSourceId: matchingSourceId });
    } catch (error) {
      enhancedLogger.error('Failed to find matching income source', { error, userId: req.userId });
      res.status(500).json({ error: 'Failed to find matching income source' });
    }
  }
);

export default router;