'use client';

import { createContext, useContext } from 'react';

export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  staff_code: string;
  phone: string;
  designation: string;
  roles: AppRole[];
  is_active: boolean;
}

export type AppRole = "ROLE_HOD" | "ROLE_STAFF" | "ROLE_STUDENT";

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, userData: User) => void;
  logout: () => void;
  hasRole: (role: AppRole) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
