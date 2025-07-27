import { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

export interface User {
  id: string;
  email: string;
}

export const useApiAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check for stored user and token
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('authToken');
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await apiClient.post('/auth/login', { email, password });
      const { user, token } = response.data;
      
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('authToken', token);
      setUser(user);
      
      toast({
        title: "Success",
        description: "Successfully logged in!"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Login failed",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await apiClient.post('/auth/register', { email, password });
      const { user, token } = response.data;
      
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('authToken', token);
      setUser(user);
      
      toast({
        title: "Success",
        description: "Account created successfully!"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Registration failed",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      setUser(null);
      
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
  };

  return {
    user,
    loading,
    login,
    signup,
    logout
  };
};