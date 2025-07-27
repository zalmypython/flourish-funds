import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
const ALGORITHM = 'aes-256-gcm';

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

// Encrypt sensitive data
export const encrypt = (text: string): EncryptedData => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = (cipher as any).getAuthTag?.() || '';
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
};

// Decrypt sensitive data
export const decrypt = (encryptedData: EncryptedData): string => {
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
  
  if (encryptedData.tag) {
    (decipher as any).setAuthTag?.(Buffer.from(encryptedData.tag, 'hex'));
  }
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
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
  
  const sensitiveFields = ['accountNumber', 'routingNumber', 'ssn', 'ein'];
  const encrypted = { ...data };
  
  sensitiveFields.forEach(field => {
    if (encrypted[field]) {
      encrypted[field] = encrypt(encrypted[field].toString());
    }
  });
  
  return encrypted;
};

// Decrypt financial data
export const decryptFinancialData = (data: any): any => {
  if (!data) return data;
  
  const sensitiveFields = ['accountNumber', 'routingNumber', 'ssn', 'ein'];
  const decrypted = { ...data };
  
  sensitiveFields.forEach(field => {
    if (decrypted[field] && typeof decrypted[field] === 'object') {
      try {
        decrypted[field] = decrypt(decrypted[field]);
      } catch (error) {
        console.error(`Failed to decrypt ${field}:`, error);
      }
    }
  });
  
  return decrypted;
};