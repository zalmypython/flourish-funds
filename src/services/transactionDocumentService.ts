import { apiClient } from '@/lib/apiClient';
import { TransactionDocument } from '@/types';
import { logger } from '@/utils/logger';
import { enhancedSecureStorage } from '@/utils/enhancedSecureStorage';
import { useErrorHandler } from '@/hooks/useErrorHandler';

export class TransactionDocumentService {
  private static instance: TransactionDocumentService;

  static getInstance(): TransactionDocumentService {
    if (!TransactionDocumentService.instance) {
      TransactionDocumentService.instance = new TransactionDocumentService();
    }
    return TransactionDocumentService.instance;
  }

  private logDocumentOperation(operation: string, data: any) {
    logger.info(`Document ${operation}`, {
      operation,
      transactionId: data.transactionId,
      documentId: data.documentId,
      fileSize: data.fileSize,
      fileType: data.fileType,
      source: data.source,
      timestamp: new Date().toISOString()
    });
  }

  async uploadDocument(
    transactionId: string, 
    file: File, 
    source: 'camera' | 'files' | 'drag-drop'
  ): Promise<TransactionDocument> {
    try {
      // Validate file before upload
      const validation = this.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid file');
      }

      // Log upload attempt
      this.logDocumentOperation('upload_attempt', {
        transactionId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        source
      });

      const formData = new FormData();
      formData.append('document', file);
      formData.append('source', source);

      const response = await apiClient.post(
        `/transactions/${transactionId}/documents`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000, // 30 second timeout for uploads
        }
      );

      const document = response.data.document;
      
      // Log successful upload
      this.logDocumentOperation('upload_success', {
        transactionId,
        documentId: document.id,
        fileName: document.originalName,
        fileSize: document.fileSize,
        fileType: document.fileType,
        source
      });

      return document;
    } catch (error: any) {
      // Log upload failure
      logger.error('Document upload failed', {
        transactionId,
        fileName: file.name,
        fileSize: file.size,
        source,
        error: error.message,
        stack: error.stack
      });
      
      throw new Error(`Upload failed: ${error.response?.data?.error || error.message}`);
    }
  }

  async getDocuments(transactionId: string): Promise<TransactionDocument[]> {
    try {
      const response = await apiClient.get(`/transactions/${transactionId}/documents`);
      
      this.logDocumentOperation('documents_retrieved', {
        transactionId,
        documentCount: response.data.documents?.length || 0
      });
      
      return response.data.documents || [];
    } catch (error: any) {
      logger.error('Failed to retrieve documents', {
        transactionId,
        error: error.message,
        status: error.response?.status
      });
      throw new Error(`Failed to retrieve documents: ${error.response?.data?.error || error.message}`);
    }
  }

  async deleteDocument(transactionId: string, documentId: string): Promise<void> {
    try {
      await apiClient.delete(`/transactions/${transactionId}/documents/${documentId}`);
      
      this.logDocumentOperation('document_deleted', {
        transactionId,
        documentId
      });
    } catch (error: any) {
      logger.error('Document deletion failed', {
        transactionId,
        documentId,
        error: error.message,
        status: error.response?.status
      });
      throw new Error(`Delete failed: ${error.response?.data?.error || error.message}`);
    }
  }

  async downloadDocument(transactionId: string, documentId: string): Promise<Blob> {
    try {
      const response = await apiClient.get(
        `/transactions/${transactionId}/documents/${documentId}/download`,
        {
          responseType: 'blob',
          timeout: 60000, // 60 second timeout for downloads
        }
      );
      
      this.logDocumentOperation('document_downloaded', {
        transactionId,
        documentId,
        fileSize: response.data.size
      });
      
      return response.data;
    } catch (error: any) {
      logger.error('Document download failed', {
        transactionId,
        documentId,
        error: error.message,
        status: error.response?.status
      });
      throw new Error(`Download failed: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get document by URL for direct access
   */
  async getDocumentByUrl(url: string): Promise<Blob> {
    try {
      // Validate URL is from our domain for security
      const urlObj = new URL(url);
      const allowedOrigins = [window.location.origin, process.env.VITE_API_URL];
      
      if (!allowedOrigins.some(origin => urlObj.origin === origin)) {
        throw new Error('Invalid document URL origin');
      }

      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${await this.getSecureAuthToken()}` || ''
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      logger.info('Document fetched by URL', { url: urlObj.pathname });
      return response.blob();
    } catch (error: any) {
      logger.error('Document URL fetch failed', {
        url,
        error: error.message
      });
      throw new Error(`Failed to fetch document: ${error.message}`);
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.heic', '.pdf'];

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      logger.warn('Invalid file type attempted', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      });
      return {
        valid: false,
        error: 'File type not supported. Please use JPG, PNG, HEIC, or PDF files.',
      };
    }

    // Double-check with file extension for security
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(extension)) {
      logger.warn('Invalid file extension attempted', {
        fileName: file.name,
        extension,
        fileType: file.type
      });
      return {
        valid: false,
        error: 'File extension not allowed.',
      };
    }

    // Check file size
    if (file.size > maxSize) {
      logger.warn('File size limit exceeded', {
        fileName: file.name,
        fileSize: file.size,
        maxSize
      });
      return {
        valid: false,
        error: 'File size too large. Maximum size is 10MB.',
      };
    }

    // Check for empty files
    if (file.size === 0) {
      return {
        valid: false,
        error: 'File appears to be empty.',
      };
    }

    return { valid: true };
  }

  /**
   * Compress image before upload (client-side optimization)
   */
  async compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Get authentication token securely
   */
  private async getSecureAuthToken(): Promise<string | null> {
    try {
      // Try secure storage first
      const secureToken = await enhancedSecureStorage.getSecureItem('authToken');
      if (secureToken) {
        return secureToken;
      }

      // Fallback to localStorage
      const fallbackToken = localStorage.getItem('authToken');
      if (fallbackToken) {
        logger.warn('Using fallback token from localStorage');
        // Migrate to secure storage
        await enhancedSecureStorage.setSecureItem('authToken', fallbackToken);
        return fallbackToken;
      }

      return null;
    } catch (error) {
      logger.error('Failed to retrieve auth token', { error });
      return localStorage.getItem('authToken'); // Final fallback
    }
  }
}

export const transactionDocumentService = TransactionDocumentService.getInstance();