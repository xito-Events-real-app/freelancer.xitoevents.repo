import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { lovable } from '@/integrations/lovable';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExternalLink, Copy, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import InstallAppButton from '@/components/InstallAppButton';

function isInAppBrowser(): boolean {
  const ua = navigator.userAgent || navigator.vendor || '';
  return /FBAN|FBAV|Instagram|Line\/|Twitter|MicroMessenger|Snapchat/i.test(ua);
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const inApp = useMemo(() => isInAppBrowser(), []);
  const ios = useMemo(() => isIOS(), []);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [gsiLoaded, setGsiLoaded] = useState(false);

  // Email & Password states
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const siteUrl = window.location.origin;

  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter both email and password.');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    setAuthLoading(true);
    const loadingToast = toast.loading(isSignUp ? 'Creating your account...' : 'Signing you in...');

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        toast.dismiss(loadingToast);

        if (error) {
          toast.error(error.message || 'Could not sign up.');
        } else {
          if (data.session) {
            toast.success('Successfully signed up and logged in!');
          } else {
            toast.success('Signup successful! Check your email for confirmation link.');
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        toast.dismiss(loadingToast);

        if (error) {
          toast.error(error.message || 'Invalid email or password.');
        } else {
          toast.success('Successfully signed in!');
        }
      }
    } catch (err: any) {
      console.error('Email auth error:', err);
      toast.dismiss(loadingToast);
      toast.error('An unexpected error occurred.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCredentialResponse = async (response: any) => {
    const { credential } = response;
    const loadingToast = toast.loading('Signing in with Google...');
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential,
      });

      if (error) {
        console.error('Google ID token sign-in error:', error);
        toast.dismiss(loadingToast);
        toast.error(error.message || 'Failed to sign in with Google');
      } else {
        toast.dismiss(loadingToast);
        toast.success('Successfully signed in!');
      }
    } catch (e: any) {
      console.error('Sign-in exception:', e);
      toast.dismiss(loadingToast);
      toast.error('An unexpected error occurred during Google sign-in');
    }
  };

  const initializeGsi = () => {
    if (!window.google?.accounts?.id) return;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '339554625491-gf7bdeu8ed481ccamjmo04oe64qiq1mr.apps.googleusercontent.com';

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
      auto_select: false,
    });

    if (googleBtnRef.current) {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        shape: 'pill',
        text: 'continue_with',
      });
    }

    window.google.accounts.id.prompt();
  };

  useEffect(() => {
    const checkGsi = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(checkGsi);
        setGsiLoaded(true);
        initializeGsi();
      }
    }, 100);

    return () => clearInterval(checkGsi);
  }, []);

  useEffect(() => {
    if (gsiLoaded && googleBtnRef.current) {
      initializeGsi();
    }
  }, [gsiLoaded, googleBtnRef.current]);

  const handleGoogleSignIn = async () => {
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: `${window.location.origin}/`,
      extraParams: { prompt: 'select_account' },
    });
    if (result.error) {
      console.error('Google sign-in error:', result.error);
      toast.error(result.error.message || 'Could not start Google sign-in');
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl);
      toast.success('Link copied! Paste it in Chrome or Safari.');
    } catch {
      toast.error('Could not copy — long-press the link below to copy manually.');
    }
  };

  const handleOpenExternal = async () => {
    // Always copy as a safety net
    await copyUrl();

    if (!ios) {
      // Android: try Chrome intent with fallback
      window.location.href = `intent://${siteUrl.replace('https://', '')}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(siteUrl)};end`;
    }
    // iOS: no reliable programmatic way — the copy + instructions is the strategy
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / Brand */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary flex items-center justify-center">
            <span className="text-3xl font-extrabold text-primary-foreground">X</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Xito Freelancer
          </h1>
          <p className="text-muted-foreground text-sm">
            Showcase your work. Discover talent.
          </p>
        </div>

        {/* In-app browser warning */}
        {inApp ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center space-y-2">
              <Smartphone className="w-8 h-8 mx-auto text-destructive" />
              <p className="text-sm font-semibold text-foreground">
                Google Sign-In doesn't work inside this app
              </p>
              <p className="text-xs text-muted-foreground">
                {ios
                  ? 'Tap the ⋯ menu at the bottom right, then choose "Open in Safari".'
                  : 'Tap the button below to open in Chrome. If it doesn\'t work, copy the link and paste it in your browser.'}
              </p>
            </div>

            {!ios && (
              <Button
                onClick={handleOpenExternal}
                className="w-full h-12 text-base font-semibold rounded-xl gap-3"
                size="lg"
              >
                <ExternalLink className="w-5 h-5" />
                Open in Chrome
              </Button>
            )}

            <Button
              onClick={copyUrl}
              variant="outline"
              className="w-full h-12 text-base font-semibold rounded-xl gap-3"
              size="lg"
            >
              <Copy className="w-5 h-5" />
              Copy Link
            </Button>

            {/* Selectable URL */}
            <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Long-press to copy:</p>
              <p className="text-sm font-mono text-foreground select-all break-all">
                {siteUrl}
              </p>
            </div>

            {ios && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center space-y-1">
                <p className="text-xs font-semibold text-foreground">How to open in Safari:</p>
                <p className="text-xs text-muted-foreground">
                  1. Tap <span className="font-bold">⋯</span> or the share icon at the bottom<br/>
                  2. Select <span className="font-bold">"Open in Safari"</span>
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Sign In */
          <div className="space-y-6 flex flex-col items-center justify-center">
            <div className="w-full flex flex-col items-center justify-center">
              {gsiLoaded ? (
                <div ref={googleBtnRef} className="w-full flex justify-center min-h-[44px]" />
              ) : (
                <Button
                  onClick={handleGoogleSignIn}
                  className="w-full h-12 text-base font-semibold rounded-xl gap-3 justify-center"
                  size="lg"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </Button>
              )}
            </div>

            <div className="flex items-center w-full">
              <div className="flex-1 border-t border-border"></div>
              <span className="px-3 text-xs text-muted-foreground uppercase tracking-wider">or</span>
              <div className="flex-1 border-t border-border"></div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4 w-full text-left">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={authLoading}
                  className="h-11 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={authLoading}
                  className="h-11 rounded-xl"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={authLoading}
                className="w-full h-11 text-sm font-semibold rounded-xl mt-2"
              >
                {isSignUp ? 'Create Account' : 'Sign In with Email'}
              </Button>
              
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="flex justify-center">
          <InstallAppButton variant="outline" size="sm" />
        </div>

        <p className="text-center text-xs text-muted-foreground">
          By signing in, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
