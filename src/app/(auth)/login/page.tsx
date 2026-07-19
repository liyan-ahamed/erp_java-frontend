'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { authService } from '@/services/auth/auth.service';
import { ROUTES } from '@/constants/routes';

const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 transition-colors group-focus-within:text-blue-600">
    <rect width="20" height="16" x="2" y="4" rx="2"></rect>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 transition-colors group-focus-within:text-blue-600">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 hover:text-slate-700 transition-colors">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 hover:text-slate-700 transition-colors">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
    <line x1="2" x2="22" y1="2" y2="22"></line>
  </svg>
);

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    <path d="m9 12 2 2 4-4"></path>
  </svg>
);

const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
    <path d="M5 12h14"></path>
    <path d="m12 5 7 7-7 7"></path>
  </svg>
);

const BackgroundDecorations = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    {/* Base light gradient */}
    <div className="absolute inset-0 bg-gradient-to-br from-[#f8fafc] to-[#e8eef3]" />
    
    {/* Dark Smoke Blobs matching reference */}
    <div 
      className="absolute -left-[25%] -top-[25%] h-[80%] w-[80%] rounded-full opacity-70"
      style={{
        background: 'radial-gradient(circle, rgba(37,61,78,0.85) 0%, rgba(37,61,78,0.4) 40%, transparent 75%)',
        filter: 'blur(120px)'
      }}
    />
    <div 
      className="absolute -bottom-[40%] -right-[25%] h-[120%] w-[120%] rounded-full opacity-80"
      style={{
        background: 'radial-gradient(circle, rgba(37,61,78,0.95) 0%, rgba(37,61,78,0.5) 45%, transparent 70%)',
        filter: 'blur(140px)'
      }}
    />
    
    {/* Dotted pattern overlay */}
    <div 
      className="absolute inset-0 opacity-[0.04]"
      style={{
        backgroundImage: 'radial-gradient(#000 2px, transparent 2px)',
        backgroundSize: '28px 28px'
      }}
    />

    {/* Large thin curved lines (intersecting circles) */}
    <div className="absolute -left-[10%] -top-[20%] h-[70vw] w-[70vw] rounded-full border border-slate-400/20" />
    <div className="absolute -right-[20%] -bottom-[30%] h-[80vw] w-[80vw] rounded-full border border-slate-400/20" />
  </div>
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push(ROUTES.DASHBOARD);
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const loginResponse = await authService.login(email, password);
      const { accessToken, refreshToken } = loginResponse;

      if (!accessToken) {
        throw new Error("Invalid credentials");
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', accessToken);
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
        }
      }

      const userData = await authService.getCurrentUser();
      login(accessToken, refreshToken || '', userData);
      router.push(ROUTES.DASHBOARD);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Login failed. Please check your credentials.');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center font-sans">
      <BackgroundDecorations />
      
      {/* Container with fade-in */}
      <div 
        className={`relative z-10 w-full max-w-[460px] p-4 transition-all duration-1000 ease-out ${
          isMounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        {/* Layer 3: Glassmorphism Card (matching reference exactly) */}
        <div 
          className="relative flex w-full flex-col items-center px-12 py-10"
          style={{
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            border: '1.5px solid rgba(255, 255, 255, 0.7)',
            borderRadius: '32px',
            boxShadow: '0 30px 60px rgba(0, 0, 0, 0.1)',
          }}
        >
          
          {/* Logo Placeholder */}
          <div 
            className="mb-6 flex items-center justify-center"
            style={{
              width: '84px',
              height: '84px',
              background: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1.5px solid rgba(255, 255, 255, 0.65)',
              borderRadius: '22px',
              boxShadow: 'inset 0 4px 10px rgba(255,255,255,0.4)',
            }}
          />

          <div className="mb-6 flex w-full flex-col items-center text-center">
            <h1 className="text-[22px] font-bold tracking-tight text-slate-800">Department ERP</h1>
            <h2 className="mt-1.5 text-[17px] font-semibold text-slate-700">Welcome Back</h2>
            <p className="mt-1.5 text-[13px] text-slate-500">Sign in to continue</p>
          </div>

          {error && (
            <div className="mb-5 w-full rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-[13px] text-red-600 backdrop-blur-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            {/* Layer 4: Glass inputs */}
            <div className="relative flex w-full items-center group">
              <div className="pointer-events-none absolute left-4 flex items-center justify-center">
                <MailIcon />
              </div>
              <input
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full py-3.5 pl-[44px] pr-4 text-[14px] font-medium text-slate-800 placeholder-slate-400 outline-none transition-all duration-300"
                style={{
                  background: 'rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.6)',
                  borderRadius: '16px',
                  boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.3)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(59, 130, 246, 0.5)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15), inset 0 2px 6px rgba(255,255,255,0.3)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.6)';
                  e.currentTarget.style.boxShadow = 'inset 0 2px 6px rgba(255,255,255,0.3)';
                }}
              />
            </div>

            <div className="relative flex w-full items-center group">
              <div className="pointer-events-none absolute left-4 flex items-center justify-center">
                <LockIcon />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full py-3.5 pl-[44px] pr-[44px] text-[14px] font-medium text-slate-800 placeholder-slate-400 outline-none transition-all duration-300"
                style={{
                  background: 'rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.6)',
                  borderRadius: '16px',
                  boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.3)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(59, 130, 246, 0.5)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15), inset 0 2px 6px rgba(255,255,255,0.3)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.6)';
                  e.currentTarget.style.boxShadow = 'inset 0 2px 6px rgba(255,255,255,0.3)';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 flex items-center justify-center focus:outline-none"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            {/* Layer 5: Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="group relative flex w-full items-center justify-center py-[14px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(37,61,78,0.4)] disabled:pointer-events-none disabled:opacity-70 disabled:shadow-none"
                style={{
                  background: '#253D4E',
                  boxShadow: '0 8px 24px rgba(37, 61, 78, 0.3)',
                  borderRadius: '16px',
                }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <>
                    <span className="mx-auto text-[15px]">Sign In</span>
                    <span className="absolute right-4">
                      <ArrowRightIcon />
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Version Footer */}
          <div className="mt-6 flex w-full flex-col items-center">
            <div className="relative flex w-full items-center justify-center">
              <div className="absolute w-full border-t border-slate-300/40" />
              <div 
                className="relative flex h-6 w-6 items-center justify-center rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 0 0 4px rgba(255,255,255,0.3)', // Mask line beautifully
                }}
              >
                <ShieldIcon />
              </div>
            </div>
            <p className="mt-3 text-[11px] font-medium text-slate-400">Version 1.0.0</p>
          </div>
          
        </div>
      </div>
    </div>
  );
}
