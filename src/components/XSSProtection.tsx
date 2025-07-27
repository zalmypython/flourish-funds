import React, { useEffect, useState } from 'react';
import { sanitizeHTML, detectXSS, escapeHTML, setupCSPReporting } from '@/utils/xssProtection';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Safe HTML renderer component
interface SafeHTMLProps {
  content: string;
  allowHTML?: boolean;
  className?: string;
  maxLength?: number;
}

export const SafeHTML: React.FC<SafeHTMLProps> = ({ 
  content, 
  allowHTML = false, 
  className = '',
  maxLength = 1000 
}) => {
  const [sanitizedContent, setSanitizedContent] = useState('');
  const [hasThreats, setHasThreats] = useState(false);

  useEffect(() => {
    if (!content) {
      setSanitizedContent('');
      return;
    }

    // Detect XSS attempts
    const xssCheck = detectXSS(content);
    setHasThreats(xssCheck.isXSS);

    if (xssCheck.isXSS) {
      console.warn('XSS attempt detected:', xssCheck);
      // Log to security monitoring
      // securityLogger.logXSSAttempt(xssCheck);
    }

    // Sanitize content
    const truncated = content.substring(0, maxLength);
    if (allowHTML) {
      setSanitizedContent(sanitizeHTML(truncated));
    } else {
      setSanitizedContent(escapeHTML(truncated));
    }
  }, [content, allowHTML, maxLength]);

  if (hasThreats) {
    return (
      <div className={`${className} p-2 bg-destructive/10 border border-destructive/20 rounded`}>
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">Content blocked for security</span>
        </div>
      </div>
    );
  }

  if (allowHTML) {
    return (
      <div 
        className={className}
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
    );
  }

  return (
    <div className={className}>
      {sanitizedContent}
    </div>
  );
};

// XSS Security Notification Component
interface XSSNotificationProps {
  open: boolean;
  onClose: () => void;
  threat: {
    type: string;
    message: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

export const XSSNotification: React.FC<XSSNotificationProps> = ({ 
  open, 
  onClose, 
  threat 
}) => {
  if (!open) return null;

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <Alert className="fixed top-4 right-4 w-96 z-50 border-destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex justify-between items-start">
        <div>
          <div className="font-semibold text-destructive">Security Alert</div>
          <div className="text-sm mt-1">{threat.message}</div>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${getRiskColor(threat.riskLevel)}`} />
            <span className="text-xs uppercase font-medium">{threat.riskLevel} Risk</span>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose}
          className="h-6 w-6 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </AlertDescription>
    </Alert>
  );
};

// Safe Input Component with XSS protection
interface SafeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSecurityViolation?: (threat: any) => void;
  enableXSSDetection?: boolean;
}

export const SafeInput: React.FC<SafeInputProps> = ({ 
  onChange, 
  onSecurityViolation,
  enableXSSDetection = true,
  ...props 
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (enableXSSDetection && value) {
      const xssCheck = detectXSS(value);
      
      if (xssCheck.isXSS) {
        console.warn('XSS attempt in input:', xssCheck);
        
        if (onSecurityViolation) {
          onSecurityViolation({
            type: 'XSS_INPUT_ATTEMPT',
            message: `Potential XSS detected in input: ${xssCheck.threats.join(', ')}`,
            riskLevel: xssCheck.riskLevel,
            timestamp: new Date().toISOString(),
            value: value.substring(0, 100) // Log partial value for analysis
          });
        }

        // Block critical threats
        if (xssCheck.riskLevel === 'critical') {
          e.preventDefault();
          return;
        }
      }
    }

    if (onChange) {
      onChange(e);
    }
  };

  return (
    <input
      {...props}
      onChange={handleChange}
      autoComplete="off"
      spellCheck={false}
    />
  );
};

// Security Dashboard Component
export const SecurityDashboard: React.FC = () => {
  const [cspViolations, setCspViolations] = useState(0);
  const [xssAttempts, setXssAttempts] = useState(0);
  const [isSecure, setIsSecure] = useState(true);

  useEffect(() => {
    // Setup CSP reporting
    setupCSPReporting();

    // Check if HTTPS is enabled
    setIsSecure(window.location.protocol === 'https:');

    // Listen for security events (in a real app, this would come from a security service)
    const handleSecurityEvent = (event: CustomEvent) => {
      if (event.detail.type === 'CSP_VIOLATION') {
        setCspViolations(prev => prev + 1);
      } else if (event.detail.type === 'XSS_ATTEMPT') {
        setXssAttempts(prev => prev + 1);
      }
    };

    document.addEventListener('security-event', handleSecurityEvent as EventListener);

    return () => {
      document.removeEventListener('security-event', handleSecurityEvent as EventListener);
    };
  }, []);

  return (
    <div className="p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5" />
        <h3 className="font-semibold">Security Status</h3>
      </div>
      
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <div className="font-medium">HTTPS</div>
          <div className={isSecure ? 'text-green-600' : 'text-red-600'}>
            {isSecure ? '✓ Enabled' : '✗ Disabled'}
          </div>
        </div>
        
        <div className="text-center">
          <div className="font-medium">CSP Violations</div>
          <div className={cspViolations === 0 ? 'text-green-600' : 'text-yellow-600'}>
            {cspViolations}
          </div>
        </div>
        
        <div className="text-center">
          <div className="font-medium">XSS Attempts</div>
          <div className={xssAttempts === 0 ? 'text-green-600' : 'text-red-600'}>
            {xssAttempts}
          </div>
        </div>
      </div>
    </div>
  );
};

// React Hook for XSS protection
export const useXSSProtection = () => {
  const [threats, setThreats] = useState<any[]>([]);

  const checkForXSS = (content: string) => {
    const result = detectXSS(content);
    if (result.isXSS) {
      setThreats(prev => [...prev, {
        id: Date.now(),
        ...result,
        timestamp: new Date().toISOString()
      }]);
    }
    return result;
  };

  const clearThreats = () => setThreats([]);

  return {
    threats,
    checkForXSS,
    clearThreats,
    hasCriticalThreats: threats.some(t => t.riskLevel === 'critical')
  };
};