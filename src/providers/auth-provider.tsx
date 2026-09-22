'use client';

import { useState, useEffect, ReactNode, useCallback } from 'react';
import { AppRole, AuthContext, User } from '@/contexts/auth-context';
import { getAccessToken, setAccessToken, setRefreshToken, removeAccessToken, removeRefreshToken } from '@/utils/token';
import { authService } from '@/services/auth/auth.service';
import { ROUTES } from '@/constants/routes';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken();
      if (token) {
        try {
          // The axios interceptor handles refresh automatically if this fails with 401
          const userData = await authService.getCurrentUser();
          setUser(userData);
          setIsAuthenticated(true);
        } catch (error) {
          // If the request fails (even after interceptor refresh attempts), the interceptor will clear tokens.
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback((accessToken: string, refreshToken: string, userData: User) => {
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    setUser(userData);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout API failed:', error);
    } finally {
      removeAccessToken();
      removeRefreshToken();
      setUser(null);
      setIsAuthenticated(false);
      queryClient.clear();
      if (typeof window !== 'undefined') {
        window.location.href = ROUTES.LOGIN;
      }
    }
  }, [queryClient]);

  const hasRole = useCallback((role: AppRole) => {
    return user?.roles?.includes(role) ?? false;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}
