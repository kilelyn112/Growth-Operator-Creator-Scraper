'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface UserSession {
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
  onboardingCompleted?: boolean;
}

interface SessionContextType {
  session: UserSession | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType>({
  session: null,
  isLoading: true,
  refresh: async () => {},
});

export function useSession() {
  return useContext(SessionContext);
}

export default function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      setSession(data);
    } catch {
      setSession({ authenticated: false });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  return (
    <SessionContext.Provider value={{ session, isLoading, refresh: fetchSession }}>
      {children}
    </SessionContext.Provider>
  );
}
