import { useState, useEffect } from 'react';

// Simple encryption for localStorage (client-side only)
const STORAGE_KEY_PREFIX = 'secure_';

class SecureStorage {
  private key: string;

  constructor() {
    // Generate or retrieve encryption key for this session
    this.key = this.getOrCreateKey();
  }

  private getOrCreateKey(): string {
    let key = sessionStorage.getItem('_sk');
    if (!key) {
      key = this.generateKey();
      sessionStorage.setItem('_sk', key);
    }
    return key;
  }

  private generateKey(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private encrypt(text: string): string {
    // Simple XOR encryption (for demonstration - use proper encryption in production)
    const encrypted = Array.from(text)
      .map((char, index) => {
        const keyChar = this.key[index % this.key.length];
        return String.fromCharCode(char.charCodeAt(0) ^ keyChar.charCodeAt(0));
      })
      .join('');
    
    return btoa(encrypted);
  }

  private decrypt(encryptedText: string): string {
    try {
      const encrypted = atob(encryptedText);
      return Array.from(encrypted)
        .map((char, index) => {
          const keyChar = this.key[index % this.key.length];
          return String.fromCharCode(char.charCodeAt(0) ^ keyChar.charCodeAt(0));
        })
        .join('');
    } catch {
      return '';
    }
  }

  setItem(key: string, value: string): void {
    const encryptedValue = this.encrypt(value);
    localStorage.setItem(STORAGE_KEY_PREFIX + key, encryptedValue);
  }

  getItem(key: string): string | null {
    const encryptedValue = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (!encryptedValue) return null;
    
    const decryptedValue = this.decrypt(encryptedValue);
    return decryptedValue || null;
  }

  removeItem(key: string): void {
    localStorage.removeItem(STORAGE_KEY_PREFIX + key);
  }

  clear(): void {
    Object.keys(localStorage)
      .filter(key => key.startsWith(STORAGE_KEY_PREFIX))
      .forEach(key => localStorage.removeItem(key));
  }
}

const secureStorage = new SecureStorage();

export const useSecureStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = secureStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from secure storage:', error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      secureStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error writing to secure storage:', error);
    }
  };

  const removeValue = () => {
    try {
      setStoredValue(initialValue);
      secureStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from secure storage:', error);
    }
  };

  return [storedValue, setValue, removeValue] as const;
};

export { secureStorage };