import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { createRateLimit, fileUploadSecurity, validateRequest } from '../middleware/advancedSecurity';
import { uploadDocument, handleUploadError } from '../middleware/upload';
import { taxDocumentService } from '../services/taxDocumentService';
import { enhancedLogger } from '../utils/enhancedLogger';

const router = express.Router();

// Rate limiting for document uploads
const documentUploadLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 uploads per 15 minutes
  operation: 'tax document upload'
});

// Validation error handler
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Upload tax document
router.post('/:taxFormId/documents',
  authenticateToken,
  documentUploadLimiter,
  fileUploadSecurity,
  validateRequest([
    param('taxFormId').isUUID().withMessage('Invalid tax form ID'),
    body('documentType').isIn(['receipt', 'w2', '1099', 'bank_statement', 'other']).withMessage('Invalid document type'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description too long')
  ]),
  uploadDocument.single('document'),
  handleUploadError,
  async (req: AuthRequest, res, next) => {
    try {
      const { taxFormId } = req.params;
      const { documentType, description } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Enhanced security logging
      enhancedLogger.logSecurityEvent('TAX_DOCUMENT_UPLOAD_ATTEMPT', {
        userId: req.userId,
        taxFormId,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      const document = await taxDocumentService.uploadDocument(req.userId!, taxFormId, {
        documentType,
        fileName: req.file.originalname,
        fileUrl: req.file.path,
        fileSize: req.file.size,
        description
      });

      res.status(201).json(document);
    } catch (error) {
      enhancedLogger.logSecurityEvent('TAX_DOCUMENT_UPLOAD_FAILED', {
        userId: req.userId,
        taxFormId: req.params.taxFormId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      next(error);
    }
  }
);

// Get documents for a tax form
router.get('/:taxFormId/documents',
  authenticateToken,
  validateRequest([
    param('taxFormId').isUUID().withMessage('Invalid tax form ID')
  ]),
  handleValidationErrors,
  async (req: AuthRequest, res, next) => {
    try {
      const { taxFormId } = req.params;
      const documents = await taxDocumentService.getDocumentsByTaxForm(req.userId!, taxFormId);
      res.json(documents);
    } catch (error) {
      enhancedLogger.logSecurityEvent('TAX_DOCUMENTS_RETRIEVAL_FAILED', {
        userId: req.userId,
        taxFormId: req.params.taxFormId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      next(error);
    }
  }
);

// Get documents by type
router.get('/:taxFormId/documents/type/:documentType',
  authenticateToken,
  validateRequest([
    param('taxFormId').isUUID().withMessage('Invalid tax form ID'),
    param('documentType').isIn(['receipt', 'w2', '1099', 'bank_statement', 'other']).withMessage('Invalid document type')
  ]),
  handleValidationErrors,
  async (req: AuthRequest, res, next) => {
    try {
      const { taxFormId, documentType } = req.params;
      const documents = await taxDocumentService.getDocumentsByType(req.userId!, taxFormId, documentType);
      res.json(documents);
    } catch (error) {
      next(error);
    }
  }
);

// Delete a tax document
router.delete('/documents/:documentId',
  authenticateToken,
  validateRequest([
    param('documentId').isUUID().withMessage('Invalid document ID')
  ]),
  handleValidationErrors,
  async (req: AuthRequest, res, next) => {
    try {
      const { documentId } = req.params;
      await taxDocumentService.deleteDocument(req.userId!, documentId);
      
      enhancedLogger.logSecurityEvent('TAX_DOCUMENT_DELETED', {
        userId: req.userId,
        documentId
      });

      res.status(204).send();
    } catch (error) {
      enhancedLogger.logSecurityEvent('TAX_DOCUMENT_DELETE_FAILED', {
        userId: req.userId,
        documentId: req.params.documentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      next(error);
    }
  }
);

export { router as taxDocumentRoutes };