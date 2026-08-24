import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Role } from '../types';
import { authApi } from '../services/api';

export interface DemoAccount {
  label: string;
  role: Role;
  email: string;
  password: string;
  description: string;
  badgeColor: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: 'Sarah Chen (Admin)',
    role: 'ADMIN',
    email: 'admin@milezero.io',
    password: 'Password123!',
    description: 'Ops Command Tower, Rate Cards, Fleet & Manual/Auto Dispatch',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  {
    label: 'Rahul Sharma (B2C Customer)',
    role: 'CUSTOMER',
    email: 'rahul.sharma@example.com',
    password: 'Password123!',
    description: 'Instant Booking, Live Map Tracking, Reschedule Deliveries',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  {
    label: 'TechCorp Logistics (B2B Customer)',
    role: 'CUSTOMER',
    email: 'techcorp@example.com',
    password: 'Password123!',
    description: 'Bulk Enterprise Shipments, Volumetric & Freight Pricing',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  },
  {
    label: 'Alex Rivera (Delivery Agent - Available)',
    role: 'AGENT',
    email: 'alex.agent@milezero.io',
    password: 'Password123!',
    description: 'Shift toggle, Assigned routes, Status progression & Failure reports',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  {
    label: 'Sam Wilson (Delivery Agent - Heavy Van)',
    role: 'AGENT',
    email: 'sam.agent@milezero.io',
    password: 'Password123!',
    description: 'In-transit shipment driver & GPS location updates',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
];

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (dto: any) => Promise<void>;
  logout: () => void;
  switchPersona: (account: DemoAccount) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('milezero_token'),
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem('milezero_token');
    if (!storedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const userData = await authApi.getMe();
      setUser(userData);
    } catch (err) {
      console.warn('Session expired or invalid token:', err);
      localStorage.removeItem('milezero_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.login({ email, password: pass });
      localStorage.setItem('milezero_token', res.accessToken);
      setToken(res.accessToken);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (dto: any) => {
    setIsLoading(true);
    try {
      const res = await authApi.register(dto);
      localStorage.setItem('milezero_token', res.accessToken);
      setToken(res.accessToken);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('milezero_token');
    setToken(null);
    setUser(null);
  };

  const switchPersona = async (account: DemoAccount) => {
    await login(account.email, account.password);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
        switchPersona,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
