import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import PlaidService from '../services/plaidService';
import FirebaseBankConnectionService from '../services/firebaseBankConnectionService';
import CreditCardMappingService from '../services/creditCardMappingService';

const router = express.Router();

// Initialize Plaid service
const plaidConfig = {
  clientId: process.env.PLAID_CLIENT_ID || '',
  secret: process.env.PLAID_SECRET || '',
  environment: process.env.PLAID_ENV || 'sandbox',
};

const plaidService = new PlaidService(plaidConfig);
const bankConnectionService = new FirebaseBankConnectionService(plaidConfig);
const mappingService = new CreditCardMappingService();

// Validation middleware
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Validation rules
const createMappingValidation = [
  body('plaidAccountId').isAlphanumeric().isLength({ min: 1, max: 50 }).trim(),
  body('plaidAccountName').isLength({ min: 1, max: 100 }).trim(),
  body('creditCardId').isAlphanumeric().isLength({ min: 1, max: 50 }).trim(),
  body('creditCardName').isLength({ min: 1, max: 100 }).trim(),
  body('institutionName').isLength({ min: 1, max: 100 }).trim(),
];

const updateMappingValidation = [
  param('mappingId').isAlphanumeric().isLength({ min: 1, max: 50 }),
  body('creditCardId').optional().isAlphanumeric().isLength({ min: 1, max: 50 }).trim(),
  body('creditCardName').optional().isLength({ min: 1, max: 100 }).trim(),
  body('isActive').optional().isBoolean(),
];

// Create link token for Plaid Link
router.post('/link/token', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const linkToken = await plaidService.createLinkToken(userId);
    res.json({ linkToken });
  } catch (error) {
    console.error('Error creating link token:', error);
    res.status(500).json({ error: 'Failed to create link token' });
  }
});

// Exchange public token and create bank connection
router.post('/link/exchange', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { publicToken } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!publicToken) {
      return res.status(400).json({ error: 'Public token is required' });
    }

    const connection = await bankConnectionService.addConnection(userId, publicToken);
    res.json({ connection });
  } catch (error) {
    console.error('Error exchanging public token:', error);
    res.status(500).json({ error: 'Failed to create bank connection' });
  }
});

// Get user's bank connections
router.get('/connections', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const connections = await bankConnectionService.getUserConnections(userId);
    
    // Remove sensitive data from response
    const safeConnections = connections.map(conn => ({
      id: conn.id,
      institutionName: conn.institutionName,
      accounts: conn.accounts.map(acc => ({
        accountId: acc.accountId,
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype,
        mask: acc.mask,
        balance: acc.balance,
      })),
      lastSync: conn.lastSync,
      createdAt: conn.createdAt,
    }));

    res.json({ connections: safeConnections });
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

// Sync transactions for a specific connection
router.post('/connections/:connectionId/sync', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { connectionId } = req.params;
    const { startDate, endDate } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const result = await bankConnectionService.syncTransactions(
      connectionId,
      userId,
      startDate,
      endDate
    );

    res.json(result);
  } catch (error) {
    console.error('Error syncing transactions:', error);
    res.status(500).json({ error: 'Failed to sync transactions' });
  }
});

// Sync all user connections
router.post('/sync/all', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const results = await bankConnectionService.syncAllUserConnections(userId);
    res.json({ results });
  } catch (error) {
    console.error('Error syncing all connections:', error);
    res.status(500).json({ error: 'Failed to sync connections' });
  }
});

// Remove bank connection
router.delete('/connections/:connectionId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { connectionId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    await bankConnectionService.removeConnection(connectionId, userId);
    res.json({ message: 'Connection removed successfully' });
  } catch (error) {
    console.error('Error removing connection:', error);
    res.status(500).json({ error: 'Failed to remove connection' });
  }
});

// Get credit card mappings for user
router.get('/mappings', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const mappings = await mappingService.getUserMappings(userId);
    res.json({ mappings });
  } catch (error) {
    console.error('Error fetching mappings:', error);
    res.status(500).json({ error: 'Failed to fetch mappings' });
  }
});

// Create credit card mapping
router.post('/mappings', authenticateToken, createMappingValidation, handleValidationErrors, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { plaidAccountId, plaidAccountName, creditCardId, creditCardName, institutionName } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!plaidAccountId || !creditCardId) {
      return res.status(400).json({ error: 'plaidAccountId and creditCardId are required' });
    }

    const mapping = await mappingService.createMapping(
      userId,
      plaidAccountId,
      plaidAccountName,
      creditCardId,
      creditCardName,
      institutionName
    );

    res.json({ mapping });
  } catch (error) {
    console.error('Error creating mapping:', error);
    res.status(500).json({ error: error.message || 'Failed to create mapping' });
  }
});

// Update credit card mapping
router.put('/mappings/:mappingId', authenticateToken, updateMappingValidation, handleValidationErrors, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { mappingId } = req.params;
    const { creditCardId, creditCardName, isActive } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const mapping = await mappingService.updateMapping(mappingId, userId, {
      creditCardId,
      creditCardName,
      isActive
    });

    if (!mapping) {
      return res.status(404).json({ error: 'Mapping not found' });
    }

    res.json({ mapping });
  } catch (error) {
    console.error('Error updating mapping:', error);
    res.status(500).json({ error: 'Failed to update mapping' });
  }
});

// Delete credit card mapping
router.delete('/mappings/:mappingId', authenticateToken, [param('mappingId').isAlphanumeric().isLength({ min: 1, max: 50 })], handleValidationErrors, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { mappingId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const success = await mappingService.deleteMapping(mappingId, userId);

    if (!success) {
      return res.status(404).json({ error: 'Mapping not found' });
    }

    res.json({ message: 'Mapping deleted successfully' });
  } catch (error) {
    console.error('Error deleting mapping:', error);
    res.status(500).json({ error: 'Failed to delete mapping' });
  }
});

// Get mapping suggestions
router.post('/mappings/suggestions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { plaidAccounts, creditCards } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const suggestions = await mappingService.suggestMappings(userId, plaidAccounts, creditCards);
    res.json({ suggestions });
  } catch (error) {
    console.error('Error getting mapping suggestions:', error);
    res.status(500).json({ error: 'Failed to get mapping suggestions' });
  }
});

export default router;