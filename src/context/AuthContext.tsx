/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (name: string, email: string, password: string, confirmPassword: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('novel_threads_token'));
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === UserRole.ADMIN;

  // Real-time verification of token on mount / refresh
  const verifyToken = async (currentToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });
      const data = await res.json();

      if (data.success && data.user) {
        setUser(data.user);
      } else {
        // Token became stale, user banned, or deleted
        handleClearAuth();
      }
    } catch (err) {
      console.error('Verify Token Fail:', err);
      handleClearAuth();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      verifyToken(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleClearAuth = () => {
    localStorage.removeItem('novel_threads_token');
    setToken(null);
    setUser(null);
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.success && data.token) {
        localStorage.setItem('novel_threads_token', data.token);
        setToken(data.token);
        setUser(data.user);
        return { success: true, message: data.message || 'Login successful' };
      } else {
        return { success: false, message: data.message || 'Invalid credentials' };
      }
    } catch (err: any) {
      console.error('Login Error Context:', err);
      return { success: false, message: 'Network error or backend is not active.' };
    }
  };

  const register = async (name: string, email: string, password: string, confirmPassword: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirmPassword })
      });
      const data = await res.json();

      if (data.success && data.token) {
        localStorage.setItem('novel_threads_token', data.token);
        setToken(data.token);
        setUser(data.user);
        return { success: true, message: data.message || 'Registered successfully' };
      } else {
        return { success: false, message: data.message || 'Registration failed' };
      }
    } catch (err) {
      console.error('Registration Error Context:', err);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    handleClearAuth();
  };

  const refreshUser = async () => {
    if (token) {
      await verifyToken(token);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, isAdmin, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
