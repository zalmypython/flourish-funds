import crypto from 'crypto';

// Use environment variable or throw error for production security
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
  : (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('ENCRYPTION_KEY environment variable is required in production');
      }
      // Development fallback - consistent key
      return crypto.scryptSync('dev-encryption-key', 'salt', 32);
    })();

const ALGORITHM = 'aes-256-gcm';

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

// Encrypt sensitive data with proper AES-GCM
export const encrypt = (text: string): EncryptedData => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipherGCM(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
};

// Decrypt sensitive data with proper AES-GCM
export const decrypt = (encryptedData: EncryptedData): string => {
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const tag = Buffer.from(encryptedData.tag, 'hex');
  const decipher = crypto.createDecipherGCM(ALGORITHM, ENCRYPTION_KEY, iv);
  
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

// Encrypt any string data (for access tokens, etc.)
export const encryptData = (data: string): EncryptedData => {
  return encrypt(data);
};

// Decrypt any string data
export const decryptData = (encryptedData: EncryptedData): string => {
  return decrypt(encryptedData);
};

// Hash sensitive data (one-way)
export const hashSensitiveData = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Mask sensitive data for logging
export const maskSensitiveData = (data: string, visibleChars: number = 4): string => {
  if (data.length <= visibleChars) {
    return '*'.repeat(data.length);
  }
  
  const visible = data.slice(-visibleChars);
  const masked = '*'.repeat(data.length - visibleChars);
  
  return masked + visible;
};

// Encrypt account numbers and sensitive financial data
export const encryptFinancialData = (data: any): any => {
  if (!data) return data;
  
  const sensitiveFields = ['accountNumber', 'routingNumber', 'ssn', 'ein', 'accessToken'];
  const encrypted = { ...data };
  
  sensitiveFields.forEach(field => {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = encrypt(encrypted[field]);
    } else if (encrypted[field] && typeof encrypted[field] === 'object' && encrypted[field].encrypted) {
      // Already encrypted, leave as is
      return;
    }
  });
  
  return encrypted;
};

// Decrypt financial data
export const decryptFinancialData = (data: any): any => {
  if (!data) return data;
  
  const sensitiveFields = ['accountNumber', 'routingNumber', 'ssn', 'ein', 'accessToken'];
  const decrypted = { ...data };
  
  sensitiveFields.forEach(field => {
    if (decrypted[field] && typeof decrypted[field] === 'object' && decrypted[field].encrypted) {
      try {
        decrypted[field] = decrypt(decrypted[field]);
      } catch (error) {
        console.error(`Failed to decrypt ${field}:`, error);
        // Don't throw error, just log it to prevent cascade failures
      }
    }
  });
  
  return decrypted;
};