// Frontend data masking and security utilities

// Mask sensitive data for display
export const maskAccountNumber = (accountNumber: string): string => {
  if (!accountNumber || accountNumber.length < 4) {
    return '****';
  }
  
  const visibleDigits = 4;
  const totalLength = accountNumber.length;
  const maskedLength = totalLength - visibleDigits;
  
  return '*'.repeat(maskedLength) + accountNumber.slice(-visibleDigits);
};

// Mask credit card numbers
export const maskCreditCard = (cardNumber: string): string => {
  if (!cardNumber || cardNumber.length < 4) {
    return '****';
  }
  
  // Remove spaces and non-digits
  const cleaned = cardNumber.replace(/\D/g, '');
  
  if (cleaned.length < 4) {
    return '****';
  }
  
  // Show first 4 and last 4 digits for credit cards
  if (cleaned.length >= 8) {
    const first4 = cleaned.slice(0, 4);
    const last4 = cleaned.slice(-4);
    const middleMask = '*'.repeat(cleaned.length - 8);
    return `${first4}${middleMask}${last4}`;
  }
  
  // For shorter numbers, just show last 4
  return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
};

// Mask email addresses
export const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) {
    return '****@****.***';
  }
  
  const [localPart, domain] = email.split('@');
  
  if (localPart.length <= 2) {
    return '**@' + domain;
  }
  
  const maskedLocal = localPart[0] + '*'.repeat(localPart.length - 2) + localPart.slice(-1);
  return maskedLocal + '@' + domain;
};

// Mask dollar amounts for partial display
export const maskAmount = (amount: number, showCents: boolean = false): string => {
  if (showCents) {
    return `$****.**`;
  }
  return `$****`;
};

// Format currency safely
export const formatCurrency = (amount: number, options: {
  showFullAmount?: boolean;
  currency?: string;
} = {}): string => {
  const { showFullAmount = true, currency = 'USD' } = options;
  
  if (!showFullAmount) {
    return maskAmount(amount, false);
  }
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
};

// Secure random ID generation
export const generateSecureId = (length: number = 16): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Check if data should be masked based on user preferences or context
export const shouldMaskData = (context: 'display' | 'print' | 'export' = 'display'): boolean => {
  // In a real app, this would check user preferences, privacy settings, etc.
  // For now, always mask in export context for security
  return context === 'export';
};

// Clean and validate input data
export const cleanFinancialInput = (input: string): string => {
  return input
    .replace(/[^\d.-]/g, '') // Only allow digits, decimal point, and minus
    .replace(/^-+/, '-') // Only one minus at start
    .replace(/\..*\./, '.') // Only one decimal point
    .substring(0, 20); // Reasonable length limit
};

// Device fingerprinting for security
export const getDeviceFingerprint = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('Device fingerprint', 10, 10);
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
    navigator.hardwareConcurrency || 'unknown',
    navigator.maxTouchPoints || 0
  ].join('|');
  
  // Simple hash
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(16);
};