import { logger } from './logger';

/**
 * Input sanitization for file operations
 */
export class SecurityUtils {
  /**
   * Sanitize filename to prevent directory traversal
   */
  static sanitizeFilename(filename: string): string {
    // Remove path separators and dangerous characters
    const sanitized = filename
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\.\./g, '')
      .replace(/[^\w\s.-]/g, '')
      .trim();
    
    // Ensure filename is not empty and has reasonable length
    if (!sanitized || sanitized.length === 0) {
      return `file_${Date.now()}`;
    }
    
    if (sanitized.length > 255) {
      const ext = sanitized.substring(sanitized.lastIndexOf('.'));
      return sanitized.substring(0, 250 - ext.length) + ext;
    }
    
    return sanitized;
  }

  /**
   * Validate file type based on magic numbers (file signatures)
   */
  static async validateFileSignature(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const uint8Array = new Uint8Array(reader.result as ArrayBuffer);
        const signatures = {
          // JPEG
          'image/jpeg': [[0xFF, 0xD8, 0xFF]],
          // PNG
          'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
          // PDF
          'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
          // HEIC (simplified check)
          'image/heic': [[0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]]
        };

        const signature = signatures[file.type as keyof typeof signatures];
        if (!signature) {
          logger.warn('Unknown file type for signature validation', { type: file.type });
          resolve(false);
          return;
        }

        // Check if any of the signatures match
        const isValid = signature.some(sig => 
          sig.every((byte, index) => uint8Array[index] === byte)
        );

        if (!isValid) {
          logger.warn('File signature validation failed', {
            fileName: file.name,
            declaredType: file.type,
            actualSignature: Array.from(uint8Array.slice(0, 8)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ')
          });
        }

        resolve(isValid);
      };

      reader.onerror = () => {
        logger.error('Error reading file for signature validation', { fileName: file.name });
        resolve(false);
      };

      // Read first 8 bytes for signature checking
      reader.readAsArrayBuffer(file.slice(0, 8));
    });
  }

  /**
   * Generate secure random filename
   */
  static generateSecureFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = originalName.substring(originalName.lastIndexOf('.'));
    
    return `${timestamp}_${random}${extension}`;
  }

  /**
   * Validate transaction ownership before document operations
   */
  static validateTransactionAccess(transactionId: string, userId: string): boolean {
    // Basic validation - in production this would check against database
    if (!transactionId || !userId) {
      logger.warn('Invalid transaction access attempt', { transactionId, userId });
      return false;
    }

    // Additional checks would go here (database lookup, etc.)
    return true;
  }

  /**
   * Detect potential security threats in file uploads
   */
  static detectSecurityThreats(file: File): { safe: boolean; threats: string[] } {
    const threats: string[] = [];
    
    // Check for executable extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.js', '.vbs', '.jar'];
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (dangerousExtensions.includes(extension)) {
      threats.push('DANGEROUS_EXTENSION');
    }

    // Check for suspicious filenames
    const suspiciousPatterns = [
      /\.\./,           // Directory traversal
      /[<>:"\\|?*]/,    // Invalid filename characters
      /\.(php|asp|jsp)$/i, // Server-side scripts
    ];

    suspiciousPatterns.forEach((pattern, index) => {
      if (pattern.test(file.name)) {
        threats.push(`SUSPICIOUS_PATTERN_${index + 1}`);
      }
    });

    // Check file size anomalies
    if (file.size === 0) {
      threats.push('EMPTY_FILE');
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB
      threats.push('OVERSIZED_FILE');
    }

    return {
      safe: threats.length === 0,
      threats
    };
  }
}