import { logger } from './logger';

/**
 * Enhanced secure storage utilities with comprehensive security
 */
export class EnhancedSecureStorage {
  private static instance: EnhancedSecureStorage;
  private sessionKey: string;
  private readonly STORAGE_PREFIX = 'sec_';
  private readonly SESSION_KEY = '_sk';
  private readonly MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.sessionKey = this.getOrCreateSessionKey();
  }

  static getInstance(): EnhancedSecureStorage {
    if (!EnhancedSecureStorage.instance) {
      EnhancedSecureStorage.instance = new EnhancedSecureStorage();
    }
    return EnhancedSecureStorage.instance;
  }

  private getOrCreateSessionKey(): string {
    try {
      let key = sessionStorage.getItem(this.SESSION_KEY);
      if (!key) {
        key = this.generateSecureKey();
        sessionStorage.setItem(this.SESSION_KEY, key);
        logger.info('New session key generated for secure storage');
      }
      return key;
    } catch (error) {
      logger.error('Failed to access session storage for encryption key', { error });
      // Fallback to in-memory key
      return this.generateSecureKey();
    }
  }

  private generateSecureKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private async encrypt(data: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const keyBuffer = encoder.encode(this.sessionKey.slice(0, 32));
      const key = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(data)
      );

      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encrypted), iv.length);

      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      logger.error('Encryption failed', { error });
      throw new Error('Data encryption failed');
    }
  }

  private async decrypt(encryptedData: string): Promise<string> {
    try {
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      const encoder = new TextEncoder();
      const keyBuffer = encoder.encode(this.sessionKey.slice(0, 32));
      const key = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      logger.error('Decryption failed', { error });
      throw new Error('Data decryption failed');
    }
  }

  private createStorageItem(value: string): string {
    return JSON.stringify({
      data: value,
      timestamp: Date.now(),
      version: '1.0'
    });
  }

  private parseStorageItem(item: string): { data: string; timestamp: number; version: string } | null {
    try {
      const parsed = JSON.parse(item);
      
      // Check age
      if (Date.now() - parsed.timestamp > this.MAX_AGE) {
        logger.warn('Expired storage item detected');
        return null;
      }

      return parsed;
    } catch (error) {
      logger.error('Failed to parse storage item', { error });
      return null;
    }
  }

  async setSecureItem(key: string, value: string): Promise<void> {
    try {
      logger.debug('Setting secure storage item', { key });
      
      const storageItem = this.createStorageItem(value);
      const encrypted = await this.encrypt(storageItem);
      
      localStorage.setItem(this.STORAGE_PREFIX + key, encrypted);
      
      logger.info('Secure storage item set successfully', { key });
    } catch (error) {
      logger.error('Failed to set secure storage item', { key, error });
      throw error;
    }
  }

  async getSecureItem(key: string): Promise<string | null> {
    try {
      const encrypted = localStorage.getItem(this.STORAGE_PREFIX + key);
      if (!encrypted) {
        return null;
      }

      const decrypted = await this.decrypt(encrypted);
      const item = this.parseStorageItem(decrypted);
      
      if (!item) {
        // Remove invalid/expired item
        this.removeSecureItem(key);
        return null;
      }

      logger.debug('Secure storage item retrieved', { key });
      return item.data;
    } catch (error) {
      logger.error('Failed to get secure storage item', { key, error });
      // Remove corrupted item
      this.removeSecureItem(key);
      return null;
    }
  }

  removeSecureItem(key: string): void {
    try {
      localStorage.removeItem(this.STORAGE_PREFIX + key);
      logger.info('Secure storage item removed', { key });
    } catch (error) {
      logger.error('Failed to remove secure storage item', { key, error });
    }
  }

  clearAllSecureItems(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(this.STORAGE_PREFIX));
      keys.forEach(key => localStorage.removeItem(key));
      
      logger.info('All secure storage items cleared', { count: keys.length });
    } catch (error) {
      logger.error('Failed to clear secure storage', { error });
    }
  }

  /**
   * Security audit - check for suspicious storage activity
   */
  auditStorageAccess(): void {
    try {
      const secureItems = Object.keys(localStorage).filter(key => key.startsWith(this.STORAGE_PREFIX));
      
      logger.info('Storage audit completed', {
        secureItemCount: secureItems.length,
        totalStorageItems: Object.keys(localStorage).length,
        storageUsage: JSON.stringify(localStorage).length
      });

      // Check for suspicious patterns
      if (secureItems.length > 50) {
        logger.warn('High number of secure storage items detected', { count: secureItems.length });
      }

      const largeItems = secureItems.filter(key => {
        const item = localStorage.getItem(key);
        return item && item.length > 10000; // 10KB threshold
      });

      if (largeItems.length > 0) {
        logger.warn('Large secure storage items detected', { 
          count: largeItems.length,
          keys: largeItems.map(key => key.replace(this.STORAGE_PREFIX, ''))
        });
      }
    } catch (error) {
      logger.error('Storage audit failed', { error });
    }
  }
}

export const enhancedSecureStorage = EnhancedSecureStorage.getInstance();