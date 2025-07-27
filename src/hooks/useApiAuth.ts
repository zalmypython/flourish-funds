import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useSecureStorage } from './useSecureStorage';
import { validateEmail, validatePassword, rateLimiter } from '@/utils/validation';
import { getDeviceFingerprint } from '@/utils/encryption';

export interface User {
  id: string;
  email: string;
}

export const useApiAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);
  const { toast } = useToast();
  
  // Use secure storage for sensitive data
  const [secureUser, setSecureUser, removeSecureUser] = useSecureStorage<User | null>('user', null);
  const [secureToken, setSecureToken, removeSecureToken] = useSecureStorage<string | null>('authToken', null);

  useEffect(() => {
    // Check for stored user and token in secure storage
    if (secureUser && secureToken) {
      setUser(secureUser);
    }
    setLoading(false);
  }, [secureUser, secureToken]);

  // Auto-logout on inactivity
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      if (user) {
        inactivityTimer = setTimeout(() => {
          logout();
          toast({
            title: "Session Expired",
            description: "You've been logged out due to inactivity",
            variant: "destructive"
          });
        }, INACTIVITY_TIMEOUT);
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer, true));

    resetTimer(); // Start the timer

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => document.removeEventListener(event, resetTimer, true));
    };
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      // Validate inputs
      const emailValidation = validateEmail(email);
      const passwordValidation = validatePassword(password);
      
      if (!emailValidation.isValid) {
        toast({
          title: "Validation Error",
          description: emailValidation.errors.join(', '),
          variant: "destructive"
        });
        return;
      }
      
      if (!passwordValidation.isValid) {
        toast({
          title: "Validation Error", 
          description: passwordValidation.errors.join(', '),
          variant: "destructive"
        });
        return;
      }

      // Check rate limiting
      const deviceId = getDeviceFingerprint();
      if (!rateLimiter.isAllowed(`login_${deviceId}`, 5, 15 * 60 * 1000)) {
        const remainingTime = Math.ceil(rateLimiter.getRemainingTime(`login_${deviceId}`, 15 * 60 * 1000) / 1000);
        toast({
          title: "Rate Limit Exceeded",
          description: `Too many login attempts. Try again in ${remainingTime} seconds.`,
          variant: "destructive"
        });
        return;
      }

      setLoading(true);
      const response = await apiClient.post('/auth/login', { 
        email, 
        password,
        deviceFingerprint: deviceId
      });
      const { user, token } = response.data;
      
      // Store in secure storage
      setSecureUser(user);
      setSecureToken(token);
      setUser(user);
      setFailedAttempts(0);
      
      toast({
        title: "Success",
        description: "Successfully logged in!"
      });
    } catch (error: any) {
      setFailedAttempts(prev => prev + 1);
      
      const errorMessage = error.response?.data?.error || "Login failed";
      
      // Check for specific security errors
      if (error.response?.status === 429) {
        toast({
          title: "Rate Limited",
          description: "Too many attempts. Please try again later.",
          variant: "destructive"
        });
      } else if (error.response?.status === 401) {
        toast({
          title: "Authentication Failed",
          description: "Invalid email or password",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  }, [setSecureUser, setSecureToken, toast]);

  const signup = useCallback(async (email: string, password: string) => {
    try {
      // Validate inputs with enhanced security
      const emailValidation = validateEmail(email);
      const passwordValidation = validatePassword(password);
      
      if (!emailValidation.isValid) {
        toast({
          title: "Validation Error",
          description: emailValidation.errors.join(', '),
          variant: "destructive"
        });
        return;
      }
      
      if (!passwordValidation.isValid) {
        toast({
          title: "Password Requirements",
          description: passwordValidation.errors.join(', '),
          variant: "destructive"
        });
        return;
      }

      // Check rate limiting for registration
      const deviceId = getDeviceFingerprint();
      if (!rateLimiter.isAllowed(`register_${deviceId}`, 3, 60 * 60 * 1000)) { // 3 attempts per hour
        toast({
          title: "Rate Limited",
          description: "Too many registration attempts. Please try again later.",
          variant: "destructive"
        });
        return;
      }

      setLoading(true);
      const response = await apiClient.post('/auth/register', { 
        email, 
        password,
        deviceFingerprint: deviceId
      });
      const { user, token } = response.data;
      
      // Store in secure storage
      setSecureUser(user);
      setSecureToken(token);
      setUser(user);
      
      toast({
        title: "Success",
        description: "Account created successfully!"
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Registration failed";
      
      if (error.response?.status === 409) {
        toast({
          title: "Account Exists",
          description: "An account with this email already exists",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  }, [setSecureUser, setSecureToken, toast]);

  const logout = useCallback(async () => {
    try {
      // Clear secure storage
      removeSecureUser();
      removeSecureToken();
      
      // Clear regular storage as fallback
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      
      setUser(null);
      setFailedAttempts(0);
      setLockoutTime(0);
      
      toast({
        title: "Success",
        description: "Successfully logged out!"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [removeSecureUser, removeSecureToken, toast]);

  return {
    user,
    loading,
    login,
    signup,
    logout,
    failedAttempts,
    lockoutTime,
    isRateLimited: lockoutTime > Date.now()
  };
};