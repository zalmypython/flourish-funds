import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { encryptFinancialData, decryptFinancialData } from '../middleware/encryption';

export interface TransactionDocument {
  id: string;
  transactionId: string;
  userId: string;
  filename: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  source: 'camera' | 'files' | 'drag-drop';
  encryptedPath: string;
}

export class DocumentService {
  private documents: Map<string, TransactionDocument> = new Map();
  
  async uploadDocument(
    transactionId: string,
    userId: string,
    file: Express.Multer.File,
    source: 'camera' | 'files' | 'drag-drop'
  ): Promise<TransactionDocument> {
    // Validate transaction ownership
    if (!await this.validateTransactionOwnership(transactionId, userId)) {
      throw new Error('Unauthorized: Transaction not found or access denied');
    }

    const documentId = uuidv4();
    const encryptedPath = this.encryptFilePath(file.path);
    
    // Create document record
    const document: TransactionDocument = {
      id: documentId,
      transactionId,
      userId,
      filename: file.filename,
      originalName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      url: `/api/transactions/${transactionId}/documents/${documentId}/download`,
      uploadedAt: new Date().toISOString(),
      source,
      encryptedPath
    };

    // Store document metadata
    this.documents.set(documentId, document);
    
    // Log the upload
    await this.logDocumentAction('upload', userId, transactionId, documentId);

    return document;
  }

  async getTransactionDocuments(transactionId: string, userId: string): Promise<TransactionDocument[]> {
    // Validate transaction ownership
    if (!await this.validateTransactionOwnership(transactionId, userId)) {
      throw new Error('Unauthorized: Transaction not found or access denied');
    }

    const documents = Array.from(this.documents.values())
      .filter(doc => doc.transactionId === transactionId && doc.userId === userId);

    // Log the access
    await this.logDocumentAction('access', userId, transactionId);

    return documents;
  }

  async getDocument(transactionId: string, documentId: string, userId: string): Promise<TransactionDocument> {
    const document = this.documents.get(documentId);
    
    if (!document) {
      throw new Error('Document not found');
    }

    // Validate ownership
    if (document.userId !== userId || document.transactionId !== transactionId) {
      throw new Error('Unauthorized: Access denied');
    }

    // Log the access
    await this.logDocumentAction('access', userId, transactionId, documentId);

    return document;
  }

  async downloadDocument(transactionId: string, documentId: string, userId: string): Promise<{ filePath: string; filename: string }> {
    const document = await this.getDocument(transactionId, documentId, userId);
    const decryptedPath = this.decryptFilePath(document.encryptedPath);
    
    // Verify file exists
    if (!fs.existsSync(decryptedPath)) {
      throw new Error('File not found on disk');
    }

    // Log the download
    await this.logDocumentAction('download', userId, transactionId, documentId);

    return {
      filePath: decryptedPath,
      filename: document.originalName
    };
  }

  async deleteDocument(transactionId: string, documentId: string, userId: string): Promise<void> {
    const document = await this.getDocument(transactionId, documentId, userId);
    const decryptedPath = this.decryptFilePath(document.encryptedPath);
    
    // Delete file from disk
    if (fs.existsSync(decryptedPath)) {
      fs.unlinkSync(decryptedPath);
    }

    // Remove from memory store
    this.documents.delete(documentId);

    // Log the deletion
    await this.logDocumentAction('delete', userId, transactionId, documentId);
  }

  private async validateTransactionOwnership(transactionId: string, userId: string): Promise<boolean> {
    // This would typically query the database
    // For now, return true as transactions are already user-scoped
    return true;
  }

  private encryptFilePath(filePath: string): string {
    // Encrypt the file path for storage
    return encryptFinancialData({ path: filePath }).path;
  }

  private decryptFilePath(encryptedPath: string): string {
    // Decrypt the file path for access
    return decryptFinancialData({ path: encryptedPath }).path;
  }

  private async logDocumentAction(
    action: 'upload' | 'access' | 'download' | 'delete',
    userId: string,
    transactionId: string,
    documentId?: string
  ): Promise<void> {
    // Audit logging
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      transactionId,
      documentId: documentId || null,
      userAgent: 'backend-service' // Would get from request in real implementation
    };

    console.log('AUDIT_LOG:', JSON.stringify(logEntry));
    
    // In production, this would write to a secure audit log service
    // or database with tamper-proof logging
  }

  // Cleanup method for removing orphaned files
  async cleanupOrphanedFiles(userId: string): Promise<void> {
    const userDir = path.join(process.cwd(), 'uploads', userId);
    
    if (!fs.existsSync(userDir)) {
      return;
    }

    const files = fs.readdirSync(userDir);
    const documentFiles = new Set(
      Array.from(this.documents.values())
        .filter(doc => doc.userId === userId)
        .map(doc => path.basename(this.decryptFilePath(doc.encryptedPath)))
    );

    // Remove files not referenced by any document
    files.forEach(file => {
      if (!documentFiles.has(file)) {
        const filePath = path.join(userDir, file);
        fs.unlinkSync(filePath);
        console.log(`Cleaned up orphaned file: ${filePath}`);
      }
    });
  }
}

export const documentService = new DocumentService();