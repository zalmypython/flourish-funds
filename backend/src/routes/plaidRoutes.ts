import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import PlaidService from '../services/plaidService';
import FirebaseBankConnectionService from '../services/firebaseBankConnectionService';

const router = express.Router();

// Initialize Plaid service
const plaidConfig = {
  clientId: process.env.PLAID_CLIENT_ID || '',
  secret: process.env.PLAID_SECRET || '',
  environment: process.env.PLAID_ENV || 'sandbox',
};

const plaidService = new PlaidService(plaidConfig);
const bankConnectionService = new FirebaseBankConnectionService(plaidConfig);

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

export default router;