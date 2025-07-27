// Frontend validation utilities for enhanced security

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Email validation with enhanced security checks
export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!email) {
    errors.push('Email is required');
    return { isValid: false, errors };
  }
  
  // Basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push('Invalid email format');
  }
  
  // Length validation
  if (email.length > 254) {
    errors.push('Email too long');
  }
  
  // Check for suspicious patterns
  if (email.includes('..') || email.includes('@@')) {
    errors.push('Invalid email format');
  }
  
  return { isValid: errors.length === 0, errors };
};

// Password validation with strength requirements
export const validatePassword = (password: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  // Length validation
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (password.length > 128) {
    errors.push('Password is too long');
  }
  
  // Complexity validation
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }
  
  // Check for common weak patterns
  const commonPatterns = [
    /^(.)\1+$/, // All same character
    /123456|password|qwerty|admin/i, // Common passwords
    /^[a-z]+$|^[A-Z]+$|^\d+$/, // Single character type
  ];
  
  if (commonPatterns.some(pattern => pattern.test(password))) {
    errors.push('Password is too weak');
  }
  
  return { isValid: errors.length === 0, errors };
};

// Amount validation for financial data
export const validateAmount = (amount: string | number): ValidationResult => {
  const errors: string[] = [];
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    errors.push('Invalid amount');
    return { isValid: false, errors };
  }
  
  if (numAmount < 0) {
    errors.push('Amount cannot be negative');
  }
  
  if (numAmount > 999999999.99) {
    errors.push('Amount is too large');
  }
  
  // Check for reasonable decimal places (max 2)
  const decimalPlaces = amount.toString().split('.')[1]?.length || 0;
  if (decimalPlaces > 2) {
    errors.push('Amount cannot have more than 2 decimal places');
  }
  
  return { isValid: errors.length === 0, errors };
};

// Account number validation
export const validateAccountNumber = (accountNumber: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!accountNumber) {
    errors.push('Account number is required');
    return { isValid: false, errors };
  }
  
  // Remove spaces and special characters for validation
  const cleaned = accountNumber.replace(/[\s-]/g, '');
  
  // Length validation (typical range for account numbers)
  if (cleaned.length < 8 || cleaned.length > 17) {
    errors.push('Account number must be between 8 and 17 digits');
  }
  
  // Numeric validation
  if (!/^\d+$/.test(cleaned)) {
    errors.push('Account number must contain only digits');
  }
  
  return { isValid: errors.length === 0, errors };
};

// Sanitize input to prevent XSS
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>'"]/g, '') // Remove potential script injection characters
    .trim()
    .substring(0, 1000); // Limit length
};

// Rate limiting for form submissions
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  isAllowed(key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < windowMs);
    
    if (validAttempts.length >= maxAttempts) {
      return false;
    }
    
    // Add current attempt
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    
    return true;
  }
  
  getRemainingTime(key: string, windowMs: number = 15 * 60 * 1000): number {
    const attempts = this.attempts.get(key) || [];
    if (attempts.length === 0) return 0;
    
    const oldestAttempt = Math.min(...attempts);
    const timeElapsed = Date.now() - oldestAttempt;
    
    return Math.max(0, windowMs - timeElapsed);
  }
}

export const rateLimiter = new RateLimiter();