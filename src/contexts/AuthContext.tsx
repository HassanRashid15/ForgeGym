"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthContextType, UserRole } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo credentials
const DEMO_USERS: User[] = [
  {
    id: '1',
    email: 'admin@gym.com',
    name: 'Admin User',
    role: 'admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'
  },
  {
    id: '2',
    email: 'customer@gym.com',
    name: 'John Doe',
    role: 'customer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=customer'
  }
];

const DEMO_PASSWORDS: Record<string, string> = {
  'admin@gym.com': 'admin123',
  'customer@gym.com': 'customer123'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check for stored user on mount
    const storedUser = localStorage.getItem('gym_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (email: string, password: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const demoUser = DEMO_USERS.find(u => u.email === email);
    if (!demoUser) {
      throw new Error('User not found');
    }

    if (DEMO_PASSWORDS[email] !== password) {
      throw new Error('Invalid password');
    }

    setUser(demoUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gym_user', JSON.stringify(demoUser));
    }
  };

  const register = async (email: string, password: string, name: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if user already exists
    if (DEMO_USERS.find(u => u.email === email)) {
      throw new Error('User already exists');
    }

    const newUser: User = {
      id: Date.now().toString(),
      email,
      name,
      role: 'customer', // Default role for new registrations
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
    };

    setUser(newUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gym_user', JSON.stringify(newUser));
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gym_user');
    }
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <AuthContext.Provider value={{ user: null, login, register, logout, isAuthenticated: false, isAdmin: false }}>{children}</AuthContext.Provider>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
