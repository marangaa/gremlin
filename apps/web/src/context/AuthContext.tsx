import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { authClient, API_URL } from '../lib/auth';

export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  plan?: string;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isPending: boolean;
  isAuthenticated: boolean;
  plan: 'free' | 'pro' | null;
  isPro: boolean;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: sessionData, isPending } = authClient.useSession();
  const [plan, setPlan] = useState<'free' | 'pro' | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const user = (sessionData?.user as User | undefined) ?? null;
  const session = (sessionData?.session as Session | undefined) ?? null;
  const isAuthenticated = !!user;

  // Whenever a user session is active, fetch authoritative profile plan
  // and broadcast to any Gremlin extension content script on the tab.
  useEffect(() => {
    if (!user) {
      setPlan(null);
      return;
    }

    // Set initial plan from session user object if available
    const hintedPlan = user.plan === 'pro' ? 'pro' : 'free';
    setPlan(hintedPlan);

    // Fetch authoritative server plan
    let active = true;
    void (async () => {
      try {
        const res = await fetch(`${API_URL}/api/user/profile`, {
          credentials: 'include',
        });
        if (res.ok && active) {
          const body = (await res.json()) as { data?: { plan?: string } };
          setPlan(body?.data?.plan === 'pro' ? 'pro' : 'free');
        }
      } catch {
        // Keep hinted plan if offline
      }
    })();

    // Broadcast authentication to Gremlin Extension content script
    window.postMessage(
      {
        source: 'gremlin-web',
        type: 'GREMLIN_AUTH_SUCCESS',
        payload: { user },
      },
      '*',
    );

    return () => {
      active = false;
    };
  }, [user?.id, user?.email]);

  const openAuthModal = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authClient.signIn.popup({
        provider: 'google',
      });

      if (res.error) {
        // If popup was blocked by browser, graceful fallback to standard social redirect
        if (res.error.code === 'POPUP_BLOCKED') {
          await authClient.signIn.social({
            provider: 'google',
            callbackURL: window.location.href,
          });
          return { success: true };
        }
        return { success: false, error: res.error.message || 'Google sign-in failed' };
      }

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign-in failed. Please try again.';
      return { success: false, error: message };
    }
  }, []);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    setPlan(null);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      isPending,
      isAuthenticated,
      plan,
      isPro: plan === 'pro',
      signInWithGoogle,
      signOut,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
    }),
    [
      user,
      session,
      isPending,
      isAuthenticated,
      plan,
      signInWithGoogle,
      signOut,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
