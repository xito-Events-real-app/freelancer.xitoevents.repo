import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { lovable } from '@/integrations/lovable';

export default function GuestSignUpPrompt() {
  const [open, setOpen] = useState(false);
  const isFirst = useRef(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) return;

    const delay = isFirst.current ? 5000 : 10000;
    const timer = setTimeout(() => {
      setOpen(true);
      isFirst.current = false;
    }, delay);

    return () => clearTimeout(timer);
  }, [open]);

  const handleGoogle = async () => {
    setOpen(false);
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: `${window.location.origin}/`,
      extraParams: { prompt: 'select_account' },
    });
    if (result.error) console.error('Google sign-in error:', result.error);
  };

  const handleEmailSignUp = () => {
    setOpen(false);
    navigate('/auth');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xs rounded-2xl">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-center text-lg">Join Xito Freelancer</DialogTitle>
          <DialogDescription className="text-center text-sm">
            Sign up to connect with freelancers, post jobs, and grow your network.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <Button onClick={handleGoogle} className="w-full h-11 rounded-xl gap-2 font-semibold">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>

          <Button variant="outline" onClick={handleEmailSignUp} className="w-full h-11 rounded-xl font-semibold">
            Sign up with Email
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
