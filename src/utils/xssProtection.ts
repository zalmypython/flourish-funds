import DOMPurify from 'dompurify';

// XSS Protection Configuration
const XSS_CONFIG = {
  // Allowed HTML tags for rich content (very restrictive)
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
  ALLOWED_ATTR: [], // No attributes allowed
  
  // Forbidden patterns that indicate XSS attempts
  FORBIDDEN_PATTERNS: [
    /<script[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick, onload
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<link/gi,
    /<meta/gi,
    /vbscript:/gi,
    /data:/gi,
    /expression\s*\(/gi, // CSS expressions
    /url\s*\(/gi, // CSS url() functions
    /@import/gi, // CSS imports
    /&#/gi, // HTML entities that could be used for encoding
    /\\u[0-9a-f]{4}/gi, // Unicode escapes
    /\\x[0-9a-f]{2}/gi, // Hex escapes
  ],
  
  // Suspicious character sequences
  SUSPICIOUS_CHARS: [
    '<', '>', '"', "'", '&', 
    'javascript:', 'vbscript:', 'data:',
    'expression(', 'url(', '@import'
  ]
};

// Sanitize HTML content using DOMPurify
export const sanitizeHTML = (dirty: string, options: {
  allowTags?: string[];
  allowAttributes?: string[];
  stripTags?: boolean;
} = {}): string => {
  const {
    allowTags = XSS_CONFIG.ALLOWED_TAGS,
    allowAttributes = XSS_CONFIG.ALLOWED_ATTR,
    stripTags = true
  } = options;

  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  try {
    // First pass: remove obviously malicious content
    let clean = dirty;
    
    // Remove forbidden patterns
    XSS_CONFIG.FORBIDDEN_PATTERNS.forEach(pattern => {
      clean = clean.replace(pattern, '');
    });

    // Use DOMPurify for comprehensive sanitization
    const sanitized = DOMPurify.sanitize(clean, {
      ALLOWED_TAGS: stripTags ? [] : allowTags,
      ALLOWED_ATTR: allowAttributes,
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
      FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input', 'textarea'],
      FORBID_ATTR: ['style', 'onclick', 'onload', 'onerror', 'onmouseover'],
      KEEP_CONTENT: stripTags,
      WHOLE_DOCUMENT: false,
    });

    return sanitized;
  } catch (error) {
    console.error('XSS sanitization error:', error);
    return ''; // Return empty string on error
  }
};

// Escape HTML entities to prevent XSS
export const escapeHTML = (unsafe: string): string => {
  if (!unsafe || typeof unsafe !== 'string') {
    return '';
  }

  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#x60;')
    .replace(/=/g, '&#x3D;');
};

// Unescape HTML entities (use carefully)
export const unescapeHTML = (safe: string): string => {
  if (!safe || typeof safe !== 'string') {
    return '';
  }

  return safe
    .replace(/&#x60;/g, '`')
    .replace(/&#x3D;/g, '=')
    .replace(/&#x2F;/g, '/')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
};

// Detect potential XSS attacks in input
export const detectXSS = (input: string): {
  isXSS: boolean;
  threats: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
} => {
  if (!input || typeof input !== 'string') {
    return { isXSS: false, threats: [], riskLevel: 'low' };
  }

  const threats: string[] = [];
  const inputLower = input.toLowerCase();

  // Check for forbidden patterns
  XSS_CONFIG.FORBIDDEN_PATTERNS.forEach((pattern, index) => {
    if (pattern.test(input)) {
      threats.push(`Forbidden pattern ${index + 1} detected`);
    }
  });

  // Check for suspicious character sequences
  XSS_CONFIG.SUSPICIOUS_CHARS.forEach(char => {
    if (inputLower.includes(char.toLowerCase())) {
      threats.push(`Suspicious character sequence: ${char}`);
    }
  });

  // Check for encoded attacks
  if (input.includes('%3C') || input.includes('%3E') || input.includes('%22')) {
    threats.push('URL-encoded HTML detected');
  }

  // Check for base64 encoded attacks
  try {
    const decoded = atob(input);
    if (decoded.includes('<script') || decoded.includes('javascript:')) {
      threats.push('Base64 encoded XSS attempt detected');
    }
  } catch {
    // Not base64, ignore
  }

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (threats.length > 0) {
    if (inputLower.includes('script') || inputLower.includes('javascript:')) {
      riskLevel = 'critical';
    } else if (inputLower.includes('iframe') || inputLower.includes('object')) {
      riskLevel = 'high';
    } else if (threats.length > 2) {
      riskLevel = 'medium';
    }
  }

  return {
    isXSS: threats.length > 0,
    threats,
    riskLevel
  };
};

// Sanitize user input for safe storage and display
export const sanitizeUserInput = (input: string, options: {
  maxLength?: number;
  allowHTML?: boolean;
  preserveLineBreaks?: boolean;
} = {}): string => {
  const {
    maxLength = 1000,
    allowHTML = false,
    preserveLineBreaks = true
  } = options;

  if (!input || typeof input !== 'string') {
    return '';
  }

  // Trim and limit length
  let clean = input.trim().substring(0, maxLength);

  // Preserve line breaks if requested
  if (preserveLineBreaks) {
    clean = clean.replace(/\n/g, '<br>');
  }

  // Sanitize based on HTML allowance
  if (allowHTML) {
    clean = sanitizeHTML(clean, { stripTags: false });
  } else {
    clean = escapeHTML(clean);
  }

  return clean;
};

// Create a safe React component for rendering user content
export const createSafeContent = (content: string, allowHTML: boolean = false) => {
  if (allowHTML) {
    const sanitized = sanitizeHTML(content);
    return { __html: sanitized };
  }
  return escapeHTML(content);
};

// CSP violation reporting
export const reportCSPViolation = (violation: SecurityPolicyViolationEvent) => {
  const report = {
    documentURI: violation.documentURI,
    violatedDirective: violation.violatedDirective,
    effectiveDirective: violation.effectiveDirective,
    originalPolicy: violation.originalPolicy,
    blockedURI: violation.blockedURI,
    sourceFile: violation.sourceFile,
    lineNumber: violation.lineNumber,
    columnNumber: violation.columnNumber,
    statusCode: violation.statusCode,
    timestamp: new Date().toISOString()
  };

  console.error('CSP Violation:', report);
  
  // In production, send to security monitoring service
  // fetch('/api/security/csp-violation', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(report)
  // });
};

// Setup CSP violation listener
export const setupCSPReporting = () => {
  document.addEventListener('securitypolicyviolation', reportCSPViolation);
};

// Validate URL to prevent javascript: and data: schemes
export const isValidURL = (url: string): boolean => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    return allowedProtocols.includes(parsed.protocol);
  } catch {
    return false;
  }
};

// Safe link creation
export const createSafeLink = (url: string, text: string): string => {
  if (!isValidURL(url)) {
    return escapeHTML(text);
  }
  
  const safeURL = escapeHTML(url);
  const safeText = escapeHTML(text);
  
  return `<a href="${safeURL}" target="_blank" rel="noopener noreferrer">${safeText}</a>`;
};