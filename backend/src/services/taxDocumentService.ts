import { BaseService } from './baseService';
import { TaxDocument } from '../models/taxForm';
import { encryptFinancialData, decryptFinancialData } from '../middleware/encryption';
import { auditLog } from '../middleware/auditLogger';
import { enhancedLogger } from '../utils/enhancedLogger';

export class TaxDocumentService extends BaseService<TaxDocument> {
  constructor() {
    super('tax_documents');
  }

  async uploadDocument(
    userId: string,
    taxFormId: string,
    documentData: Partial<TaxDocument>
  ): Promise<TaxDocument> {
    try {
      const document: TaxDocument = {
        id: this.generateId(),
        userId,
        taxFormId,
        documentType: documentData.documentType || 'receipt',
        fileName: documentData.fileName || '',
        fileUrl: documentData.fileUrl || '',
        fileSize: documentData.fileSize || 0,
        uploadDate: new Date().toISOString(),
        description: documentData.description || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Encrypt sensitive document data
      const encryptedDocument = encryptFinancialData(document);
      
      const result = await this.create(encryptedDocument);

      // Audit log the document upload
      auditLog({
        userId,
        action: 'TAX_DOCUMENT_UPLOAD',
        resource: 'tax_document',
        resourceId: result.id,
        details: {
          taxFormId,
          documentType: document.documentType,
          fileName: document.fileName,
          fileSize: document.fileSize
        },
        ipAddress: '',
        userAgent: ''
      });

      enhancedLogger.logSecurityEvent('TAX_DOCUMENT_UPLOADED', {
        userId,
        documentId: result.id,
        taxFormId,
        documentType: document.documentType,
        fileSize: document.fileSize
      });

      return decryptFinancialData(result);
    } catch (error) {
      enhancedLogger.logSecurityEvent('TAX_DOCUMENT_UPLOAD_FAILED', {
        userId,
        taxFormId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getDocumentsByTaxForm(userId: string, taxFormId: string): Promise<TaxDocument[]> {
    try {
      const documents = await this.db.collection(this.collectionName)
        .where('userId', '==', userId)
        .where('taxFormId', '==', taxFormId)
        .orderBy('uploadDate', 'desc')
        .get();

      const decryptedDocuments = documents.docs.map(doc => {
        const data = { id: doc.id, ...doc.data() } as TaxDocument;
        return decryptFinancialData(data);
      });

      auditLog({
        userId,
        action: 'TAX_DOCUMENTS_RETRIEVED',
        resource: 'tax_document',
        resourceId: taxFormId,
        details: {
          documentCount: decryptedDocuments.length,
          taxFormId
        },
        ipAddress: '',
        userAgent: ''
      });

      return decryptedDocuments;
    } catch (error) {
      enhancedLogger.logSecurityEvent('TAX_DOCUMENTS_RETRIEVAL_FAILED', {
        userId,
        taxFormId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async deleteDocument(userId: string, documentId: string): Promise<void> {
    try {
      const document = await this.getById(documentId);
      
      if (!document || document.userId !== userId) {
        throw new Error('Document not found or access denied');
      }

      await this.delete(documentId);

      auditLog({
        userId,
        action: 'TAX_DOCUMENT_DELETED',
        resource: 'tax_document',
        resourceId: documentId,
        details: {
          taxFormId: document.taxFormId,
          documentType: document.documentType,
          fileName: document.fileName
        },
        ipAddress: '',
        userAgent: ''
      });

      enhancedLogger.logSecurityEvent('TAX_DOCUMENT_DELETED', {
        userId,
        documentId,
        taxFormId: document.taxFormId
      });
    } catch (error) {
      enhancedLogger.logSecurityEvent('TAX_DOCUMENT_DELETE_FAILED', {
        userId,
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getDocumentsByType(
    userId: string, 
    taxFormId: string, 
    documentType: string
  ): Promise<TaxDocument[]> {
    try {
      const documents = await this.db.collection(this.collectionName)
        .where('userId', '==', userId)
        .where('taxFormId', '==', taxFormId)
        .where('documentType', '==', documentType)
        .orderBy('uploadDate', 'desc')
        .get();

      return documents.docs.map(doc => {
        const data = { id: doc.id, ...doc.data() } as TaxDocument;
        return decryptFinancialData(data);
      });
    } catch (error) {
      enhancedLogger.logSecurityEvent('TAX_DOCUMENTS_BY_TYPE_FAILED', {
        userId,
        taxFormId,
        documentType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

export const taxDocumentService = new TaxDocumentService();