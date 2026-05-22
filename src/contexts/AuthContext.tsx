import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const relaySessionToPreviewOpener = async () => {
      if (!window.opener || window.opener === window) return;
      const isOAuthCallback =
        window.location.hash.includes('access_token=') ||
        window.location.hash.includes('refresh_token=') ||
        window.location.search.includes('code=');
      if (!isOAuthCallback) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      window.opener.postMessage({ type: 'xito:supabase-session', session }, window.location.origin);
      window.close();
    };

    const receivePreviewSession = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'xito:supabase-session' || !event.data.session) return;
      void supabase.auth.setSession(event.data.session);
    };

    window.addEventListener('message', receivePreviewSession);
    void relaySessionToPreviewOpener();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      window.removeEventListener('message', receivePreviewSession);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("keepalive:reset"));
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
