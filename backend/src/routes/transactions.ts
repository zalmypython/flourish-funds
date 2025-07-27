import express from 'express';
import { body, validationResult, query } from 'express-validator';
import fs from 'fs';
import { BaseService } from '../services/baseService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import FirebaseTransactionService from '../services/firebaseTransactionService';
import { uploadDocument, handleUploadError } from '../middleware/upload';
import { documentService } from '../services/documentService';

const router = express.Router();
const baseTransactionService = new BaseService('transactions');
const plaidTransactionService = new FirebaseTransactionService();

interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense';
  date: Date;
  merchant?: string;
  tags?: string[];
  isRecurring?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Get transaction summary (MUST come before /:id route)
router.get('/summary', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate, groupBy } = req.query;
    
    const summary = await plaidTransactionService.getTransactionSummary(
      req.userId!,
      {
        startDate: startDate as string,
        endDate: endDate as string,
        groupBy: groupBy as 'category' | 'month' | 'account'
      }
    );
    
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// Get sync logs (MUST come before /:id route)
router.get('/sync-logs', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { limit = 10 } = req.query;
    
    const syncLogs = await plaidTransactionService.getUserSyncLogs(req.userId!, Number(limit));
    res.json(syncLogs);
  } catch (error) {
    next(error);
  }
});

// Manual sync trigger
router.post('/sync', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { connectionId, startDate, endDate } = req.body;
    
    if (!connectionId) {
      return res.status(400).json({ error: 'Connection ID is required' });
    }
    
    // This would trigger a sync via the bank connection service
    // For now, return a success message
    res.json({ message: 'Sync triggered successfully' });
  } catch (error) {
    next(error);
  }
});

// Get Plaid transactions only
router.get('/plaid', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      category, 
      startDate, 
      endDate, 
      accountId,
      type 
    } = req.query;
    
    const plaidTransactions = await plaidTransactionService.getUserTransactions(
      req.userId!,
      {
        page: Number(page),
        limit: Number(limit),
        category: category as string,
        startDate: startDate as string,
        endDate: endDate as string,
        accountId: accountId as string,
        type: type as 'income' | 'expense'
      }
    );
    
    res.json({ transactions: plaidTransactions });
  } catch (error) {
    next(error);
  }
});

// Get all transactions (manual + Plaid imported)
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      category, 
      startDate, 
      endDate, 
      accountId,
      type 
    } = req.query;
    
    // Get Plaid transactions with filters
    const plaidTransactions = await plaidTransactionService.getUserTransactions(
      req.userId!,
      {
        page: Number(page),
        limit: Number(limit),
        category: category as string,
        startDate: startDate as string,
        endDate: endDate as string,
        accountId: accountId as string,
        type: type as 'income' | 'expense'
      }
    );
    
    // Get manual transactions
    const manualTransactions = await baseTransactionService.getAll(req.userId!);
    
    // Combine and sort by date
    const allTransactions = [...plaidTransactions, ...manualTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    res.json(allTransactions);
  } catch (error) {
    next(error);
  }
});

// Get transaction by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    // Try Plaid transactions first
    const plaidTransaction = await plaidTransactionService.getUserTransactions(req.userId!, {})
      .then(transactions => transactions.find(t => t.id === req.params.id));
    
    if (plaidTransaction) {
      return res.json(plaidTransaction);
    }
    
    // Fallback to manual transactions
    const transaction = await baseTransactionService.getById(req.params.id, req.userId!);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    next(error);
  }
});

// Create new manual transaction
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const transactionData = {
      ...req.body,
      userId: req.userId!,
      date: new Date(req.body.date || Date.now()),
      isManual: true // Mark as manually created
    };
    
    const id = await baseTransactionService.create(transactionData);
    res.status(201).json({ id, message: 'Transaction created successfully' });
  } catch (error) {
    next(error);
  }
});

// Update Plaid transaction category
router.put('/:id/category', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { category } = req.body;
    
    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }
    
    const updatedTransaction = await plaidTransactionService.updateTransactionCategory(
      req.params.id,
      req.userId!,
      category
    );
    
    if (!updatedTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json({ message: 'Transaction category updated successfully', transaction: updatedTransaction });
  } catch (error) {
    next(error);
  }
});

// Update Plaid transaction visibility
router.put('/:id/visibility', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { isHidden } = req.body;
    
    if (typeof isHidden !== 'boolean') {
      return res.status(400).json({ error: 'isHidden must be a boolean' });
    }
    
    const updatedTransaction = await plaidTransactionService.updateTransactionVisibility(
      req.params.id,
      req.userId!,
      isHidden
    );
    
    if (!updatedTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json({ message: 'Transaction visibility updated successfully', transaction: updatedTransaction });
  } catch (error) {
    next(error);
  }
});

// Update transaction
router.put('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const updateData = { ...req.body };
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }
    
    // Try updating manual transaction first
    try {
      await baseTransactionService.update(req.params.id, req.userId!, updateData);
      res.json({ message: 'Transaction updated successfully' });
    } catch (error: any) {
      // If not found in manual transactions, it might be a Plaid transaction category update
      if (error.message.includes('not found') && updateData.category) {
        // Handle Plaid transaction category update separately
        res.status(400).json({ error: 'Use /transactions/:id/category endpoint for Plaid transactions' });
      } else {
        throw error;
      }
    }
  } catch (error) {
    next(error);
  }
});

// Delete transaction (manual transactions only)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    await baseTransactionService.delete(req.params.id, req.userId!);
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Document upload endpoint
router.post('/:id/documents', 
  authenticateToken, 
  uploadDocument.single('document'),
  handleUploadError,
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          error: 'No file uploaded',
          code: 'NO_FILE'
        });
      }

      // Additional security validation
      if (!req.userId) {
        return res.status(401).json({ 
          error: 'User authentication required',
          code: 'UNAUTHORIZED'
        });
      }

      // Log upload attempt for security monitoring
      console.log('DOCUMENT_UPLOAD_ATTEMPT:', JSON.stringify({
        timestamp: new Date().toISOString(),
        userId: req.userId,
        transactionId: req.params.id,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }));

      const { source = 'files' } = req.body;
      
      // Validate source parameter
      const validSources = ['camera', 'files', 'drag-drop'];
      if (!validSources.includes(source)) {
        return res.status(400).json({
          error: 'Invalid source parameter',
          code: 'INVALID_SOURCE'
        });
      }
      
      const document = await documentService.uploadDocument(
        req.params.id,
        req.userId!,
        req.file,
        source as 'camera' | 'files' | 'drag-drop'
      );

      // Log successful upload
      console.log('DOCUMENT_UPLOAD_SUCCESS:', JSON.stringify({
        timestamp: new Date().toISOString(),
        userId: req.userId,
        transactionId: req.params.id,
        documentId: document.id,
        fileName: document.originalName,
        fileSize: document.fileSize
      }));

      res.status(201).json({ 
        message: 'Document uploaded successfully',
        document 
      });
    } catch (error: any) {
      // Enhanced error logging
      console.error('DOCUMENT_UPLOAD_ERROR:', JSON.stringify({
        timestamp: new Date().toISOString(),
        userId: req.userId,
        transactionId: req.params.id,
        error: error.message,
        stack: error.stack,
        ip: req.ip
      }));

      // Clean up uploaded file if processing failed
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log('Cleaned up failed upload file:', req.file.path);
      }
      next(error);
    }
  }
);

// Get documents for transaction
router.get('/:id/documents', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    // Log document access for audit
    console.log('DOCUMENT_ACCESS_ATTEMPT:', JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: req.userId,
      transactionId: req.params.id,
      action: 'list_documents',
      ip: req.ip
    }));

    const documents = await documentService.getTransactionDocuments(
      req.params.id, 
      req.userId!
    );
    
    res.json({ documents });
  } catch (error: any) {
    console.error('DOCUMENT_ACCESS_ERROR:', JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: req.userId,
      transactionId: req.params.id,
      error: error.message
    }));
    next(error);
  }
});

// Download document
router.get('/:id/documents/:docId/download', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    // Enhanced security logging for file downloads
    console.log('DOCUMENT_DOWNLOAD_ATTEMPT:', JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: req.userId,
      transactionId: req.params.id,
      documentId: req.params.docId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer')
    }));

    const { filePath, filename } = await documentService.downloadDocument(
      req.params.id,
      req.params.docId,
      req.userId!
    );

    // Set security headers for download
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('DOCUMENT_DOWNLOAD_ERROR:', JSON.stringify({
          timestamp: new Date().toISOString(),
          userId: req.userId,
          transactionId: req.params.id,
          documentId: req.params.docId,
          error: err.message
        }));
        next(err);
      } else {
        // Log successful download
        console.log('DOCUMENT_DOWNLOAD_SUCCESS:', JSON.stringify({
          timestamp: new Date().toISOString(),
          userId: req.userId,
          transactionId: req.params.id,
          documentId: req.params.docId,
          filename
        }));
      }
    });
  } catch (error: any) {
    console.error('DOCUMENT_DOWNLOAD_ERROR:', JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: req.userId,
      transactionId: req.params.id,
      documentId: req.params.docId,
      error: error.message
    }));
    next(error);
  }
});

// Delete document
router.delete('/:id/documents/:docId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    // Critical security logging for deletions
    console.log('DOCUMENT_DELETE_ATTEMPT:', JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: req.userId,
      transactionId: req.params.id,
      documentId: req.params.docId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'HIGH'
    }));

    await documentService.deleteDocument(
      req.params.id,
      req.params.docId,
      req.userId!
    );
    
    // Log successful deletion
    console.log('DOCUMENT_DELETE_SUCCESS:', JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: req.userId,
      transactionId: req.params.id,
      documentId: req.params.docId,
      severity: 'HIGH'
    }));
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error: any) {
    console.error('DOCUMENT_DELETE_ERROR:', JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: req.userId,
      transactionId: req.params.id,
      documentId: req.params.docId,
      error: error.message,
      severity: 'HIGH'
    }));
    next(error);
  }
});


export { router as transactionRoutes };