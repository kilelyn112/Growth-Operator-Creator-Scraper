'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import TrialExpired from './TrialExpired';

interface AuthSession {
  authenticated: boolean;
  user?: {
    id: number;
    email: string;
    firstName: string;
    isMember: boolean;
  };
  trial?: {
    isActive: boolean;
    daysRemaining: number;
    hasAccess: boolean;
  };
}

interface AuthWrapperProps {
  children: ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, [pathname]);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();

      if (!data.authenticated) {
        // Middleware will handle redirect for protected routes
        setSession(null);
      } else {
        setSession(data);
      }
    } catch (error) {
      console.error('Session check error:', error);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, middleware will redirect
  if (!session?.authenticated) {
    return null;
  }

  // Check if trial expired and user is not a member
  if (session.trial && !session.trial.hasAccess) {
    return (
      <TrialExpired
        firstName={session.user?.firstName || 'there'}
        onLogout={handleLogout}
      />
    );
  }

  // Render the app with user context
  return (
    <>
      {children}
    </>
  );
}

// Export a context hook for accessing session throughout the app
export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        if (data.authenticated) {
          setSession(data);
        }
      } catch (error) {
        console.error('Failed to fetch session:', error);
      }
    };

    fetchSession();
  }, []);

  return session;
}
