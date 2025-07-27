import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { taxFormService } from '../services/taxFormService';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// GET /api/tax-forms - Get user's tax forms
router.get('/', 
  authenticateToken,
  [
    query('taxYear').optional().isInt({ min: 2020, max: 2030 }).toInt()
  ],
  handleValidationErrors,
  async (req: AuthRequest, res: express.Response) => {
    try {
      const { taxYear } = req.query;
      
      if (taxYear) {
        const taxForm = await taxFormService.getByTaxYear(req.userId!, taxYear as number);
        return res.json(taxForm ? [taxForm] : []);
      }
      
      const taxForms = await taxFormService.getAll(req.userId!);
      res.json(taxForms);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/tax-forms/:id - Get specific tax form
router.get('/:id',
  authenticateToken,
  [
    param('id').isString().notEmpty()
  ],
  handleValidationErrors,
  async (req: AuthRequest, res: express.Response) => {
    try {
      const taxForm = await taxFormService.getById(req.params.id, req.userId!);
      if (!taxForm) {
        return res.status(404).json({ error: 'Tax form not found' });
      }
      res.json(taxForm);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// POST /api/tax-forms - Create new tax form
router.post('/',
  authenticateToken,
  [
    body('taxYear').isInt({ min: 2020, max: 2030 }),
    body('filingStatus').isIn(['single', 'married_jointly', 'married_separately', 'head_of_household', 'qualifying_widow']),
    body('personalInfo').isObject(),
    body('incomeData').isObject(),
    body('deductionsData').isObject(),
    body('creditsData').isObject(),
    body('status').optional().isIn(['draft', 'completed', 'submitted_to_accountant', 'reviewed', 'filed'])
  ],
  handleValidationErrors,
  async (req: AuthRequest, res: express.Response) => {
    try {
      const taxFormData = {
        ...req.body,
        userId: req.userId!,
        status: req.body.status || 'draft',
        lastModified: new Date().toISOString()
      };

      const id = await taxFormService.create(taxFormData);
      res.status(201).json({ id, message: 'Tax form created successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// PUT /api/tax-forms/:id - Update tax form
router.put('/:id',
  authenticateToken,
  [
    param('id').isString().notEmpty(),
    body('taxYear').optional().isInt({ min: 2020, max: 2030 }),
    body('filingStatus').optional().isIn(['single', 'married_jointly', 'married_separately', 'head_of_household', 'qualifying_widow']),
    body('personalInfo').optional().isObject(),
    body('incomeData').optional().isObject(),
    body('deductionsData').optional().isObject(),
    body('creditsData').optional().isObject(),
    body('status').optional().isIn(['draft', 'completed', 'submitted_to_accountant', 'reviewed', 'filed'])
  ],
  handleValidationErrors,
  async (req: AuthRequest, res: express.Response) => {
    try {
      const updateData = {
        ...req.body,
        lastModified: new Date().toISOString()
      };

      await taxFormService.update(req.params.id, req.userId!, updateData);
      res.json({ message: 'Tax form updated successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// DELETE /api/tax-forms/:id - Delete tax form (draft only)
router.delete('/:id',
  authenticateToken,
  [
    param('id').isString().notEmpty()
  ],
  handleValidationErrors,
  async (req: AuthRequest, res: express.Response) => {
    try {
      // Check if form is in draft status
      const taxForm = await taxFormService.getById(req.params.id, req.userId!);
      if (!taxForm) {
        return res.status(404).json({ error: 'Tax form not found' });
      }
      
      if (taxForm.status !== 'draft') {
        return res.status(400).json({ error: 'Can only delete draft tax forms' });
      }

      await taxFormService.delete(req.params.id, req.userId!);
      res.json({ message: 'Tax form deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// POST /api/tax-forms/:id/submit-to-accountant - Submit form to accountant
router.post('/:id/submit-to-accountant',
  authenticateToken,
  [
    param('id').isString().notEmpty(),
    body('accountantEmail').isEmail()
  ],
  handleValidationErrors,
  async (req: AuthRequest, res: express.Response) => {
    try {
      await taxFormService.submitToAccountant(req.params.id, req.userId!, req.body.accountantEmail);
      res.json({ message: 'Tax form submitted to accountant successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;