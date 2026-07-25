'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ROUTES } from '@/constants/routes';

const BackgroundDecorations = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    {/* Base light gradient */}
    <div className="absolute inset-0 bg-gradient-to-br from-[#f8fafc] to-[#e8eef3]" />
    
    {/* Dark Smoke Blobs matching login page background */}
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

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== ROUTES.LOGIN) {
      router.push(ROUTES.LOGIN);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-slate-400 text-sm font-medium animate-pulse">Loading ERP System...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative flex h-screen overflow-hidden text-slate-800">
      <BackgroundDecorations />

      <Sidebar />

      <div className="flex flex-col flex-1 w-full pl-72 h-screen overflow-y-auto relative z-10">
        <Header />
        <main className="flex-1 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
