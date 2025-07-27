import { apiClient } from '@/lib/apiClient';
import { TransactionDocument } from '@/types';

export class TransactionDocumentService {
  private static instance: TransactionDocumentService;

  static getInstance(): TransactionDocumentService {
    if (!TransactionDocumentService.instance) {
      TransactionDocumentService.instance = new TransactionDocumentService();
    }
    return TransactionDocumentService.instance;
  }

  async uploadDocument(
    transactionId: string, 
    file: File, 
    source: 'camera' | 'files' | 'drag-drop'
  ): Promise<TransactionDocument> {
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
      }
    );

    return response.data.document;
  }

  async getDocuments(transactionId: string): Promise<TransactionDocument[]> {
    const response = await apiClient.get(`/transactions/${transactionId}/documents`);
    return response.data.documents;
  }

  async deleteDocument(transactionId: string, documentId: string): Promise<void> {
    await apiClient.delete(`/transactions/${transactionId}/documents/${documentId}`);
  }

  async downloadDocument(transactionId: string, documentId: string): Promise<Blob> {
    const response = await apiClient.get(
      `/transactions/${transactionId}/documents/${documentId}/download`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  }

  /**
   * Get document by URL for direct access
   */
  async getDocumentByUrl(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch document');
    }
    return response.blob();
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'File type not supported. Please use JPG, PNG, HEIC, or PDF files.',
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size too large. Maximum size is 10MB.',
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
}

export const transactionDocumentService = TransactionDocumentService.getInstance();