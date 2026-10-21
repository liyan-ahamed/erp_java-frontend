'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { authService } from '@/services/auth/auth.service';
import { ROUTES } from '@/constants/routes';
import { getApiErrorMessage } from '@/lib/api-error';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Mail, Lock, Eye, EyeOff, Shield, BookOpen, GraduationCap, Moon, Sun } from '@/components/ui/icons';
import { useTheme } from '@/providers/theme-provider';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Shown after a password change signs the user out (Account Settings → Change password).
  // Read from the URL on the client only, so server and first client render agree.
  const passwordChanged = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get('notice') === 'password-changed',
    () => false,
  );
  const notice = passwordChanged ? 'Your password was changed. Please sign in with your new password.' : '';

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
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Login failed. Please check your credentials.'));
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Forma's two-column entry screen, with the real credential sign-in in place of the demo role buttons.
  return (
    <div className="login">
      <div className="login-story">
        <div className="story-brand">
          <span className="brand-mark">
            <GraduationCap />
          </span>
          Dept. ERP
          <span className="badge">Department workspace</span>
        </div>
        <h1>
          A little less admin.
          <br />A lot more
          <br />possibility.
        </h1>
        <p>One thoughtful workspace for your department. Academics, people, and progress — brought together.</p>

        {/* Illustrative only: describes the three workspaces. No figures or records are shown here. */}
        <div className="mt-[45px] p-[21px] rounded-[14px] border border-line bg-surface -rotate-3 shadow-[0_15px_40px_#00000005] max-w-[460px]">
          <h3 className="text-[14px] font-[550]">One workspace, shaped by your role</h3>
          <div className="mt-[14px] grid gap-[9px]">
            {[
              { icon: <Shield />, title: 'Head of Department', text: 'People, academics and approvals' },
              { icon: <BookOpen />, title: 'Faculty', text: 'Classes, attendance and marks' },
              { icon: <GraduationCap />, title: 'Student', text: 'Schedule, learning and results' },
            ].map((role) => (
              <div key={role.title} className="flex items-center gap-3 rounded-[12px] border border-line px-[13px] py-[11px]">
                <span className="metric-icon">{role.icon}</span>
                <span className="min-w-0">
                  <strong className="block text-[13px] font-[550]">{role.title}</strong>
                  <small className="block text-[11px] text-muted mt-0.5">{role.text}</small>
                </span>
              </div>
            ))}
          </div>
        </div>
        <footer>DEPARTMENT ERP · ACADEMIC WORKSPACE</footer>
      </div>

      <div className="login-form">
        <button
          type="button"
          onClick={toggleTheme}
          className="f-btn icon theme-btn"
          aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
        >
          {theme === 'light' ? <Sun /> : <Moon />}
        </button>

        <div className="w-full max-w-[440px] mx-auto">
          <div className="login-mobile-brand">
            <span className="brand-mark">
              <GraduationCap />
            </span>
            Dept. ERP
          </div>
          <div className="eyebrow">Welcome back</div>
          <h1>Your day starts here.</h1>
          <p className="intro">Sign in with your department account to enter your workspace.</p>

          {notice && !error && (
            <div className="mb-5 rounded-[8px] bg-ok-soft p-3 text-[13px] text-ok" role="status">
              {notice}
            </div>
          )}
          {error && (
            <div className="mb-5 rounded-[8px] bg-danger-soft p-3 text-[13px] text-danger" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="f-label mb-2">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@department.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="f-label mb-2">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock className="w-4 h-4" />}
                  className="!pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md text-muted hover:text-fg"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full !mt-6" isLoading={isLoading}>
              Sign in
            </Button>
          </form>

          <div className="mt-[14px] flex items-center gap-2 text-[11px] text-muted">
            <Shield className="w-4 h-4" />
            Your workspace is set by the role on your account.
          </div>
        </div>
      </div>
    </div>
  );
}
