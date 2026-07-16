'use client';

import { useState, useEffect, ReactNode } from 'react';
import { AuthContext, User } from '@/contexts/auth-context';
import { getToken, setToken as setLocalToken, removeToken as removeLocalToken } from '@/utils/token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Basic check for token on mount
    const token = getToken();
    if (token) {
      // In a real application, you would validate the token with an API call here.
      // For this foundation, we just assume they are authenticated if a token exists.
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = (token: string, userData: User) => {
    setLocalToken(token);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    removeLocalToken();
    setUser(null);
    setIsAuthenticated(false);
    // You might want to redirect to /login here depending on your routing setup
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
