import { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Lock, Eye, EyeOff, Loader2, QrCode, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const QRScanner = lazy(() => import('@/components/QRScanner'));

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [showFreelancer, setShowFreelancer] = useState(false);
  const [flEmail, setFlEmail] = useState('');
  const [flPassword, setFlPassword] = useState('');
  const [flShowPassword, setFlShowPassword] = useState(false);
  const [flSubmitting, setFlSubmitting] = useState(false);
  const [flPasswordError, setFlPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setEmailError(null);
    setSubmitting(true);

    const { data, error } = await supabase
      .rpc('find_client_portal_by_email' as any, { _email: email.trim().toLowerCase() });

    setSubmitting(false);

    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      setEmailError('No client account found with this email address.');
      return;
    }

    const client = Array.isArray(data) ? data[0] : data;
    const slug = client.client_name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    navigate(`/client-portal/${slug}/${client.id}?t=${encodeURIComponent(client.portal_token || '')}`, { replace: true });
  };

  const handleFreelancerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flEmail.trim() || !flPassword) return;
    setFlPasswordError(null);
    setFlSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: flEmail.trim(),
      password: flPassword,
    });
    setFlSubmitting(false);
    if (error) {
      setFlPasswordError('Incorrect password. Please try again.');
    }
  };

  const handleQRResult = (data: string) => {
    setShowQR(false);
    navigate('/guest', { replace: true });
  };

  const inputStyle = {
    background: 'hsl(18 45% 97%)',
    border: '1px solid hsl(18 32% 87%)',
    color: 'hsl(15 40% 16%)',
    fontFamily: 'Poppins, sans-serif',
  };

  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = '1px solid hsl(4 68% 64%)';
    e.currentTarget.style.boxShadow = '0 0 0 3px hsl(4 68% 64% / 0.12)';
    e.currentTarget.style.background = '#fff';
  };

  const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = '1px solid hsl(18 32% 87%)';
    e.currentTarget.style.boxShadow = 'none';
    e.currentTarget.style.background = 'hsl(18 45% 97%)';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'hsl(18 55% 97%)' }}>
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'hsl(4 68% 58%)' }} />
      </div>
    );
  }

  return (
    <>
      {showQR && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        }>
          <QRScanner onClose={() => setShowQR(false)} onResult={handleQRResult} />
        </Suspense>
      )}

      <div
        className="relative flex flex-col items-center justify-center min-h-screen px-6 overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse at 15% 10%, hsl(4 80% 93%) 0%, transparent 45%),
            radial-gradient(ellipse at 85% 85%, hsl(18 70% 93%) 0%, transparent 40%),
            hsl(18 55% 97%)
          `,
        }}
      >
        {/* Decorative blush orbs */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-60px', right: '-40px',
            width: '280px', height: '280px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, hsl(4 70% 90%) 0%, transparent 65%)',
            opacity: 0.6,
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '-80px', left: '-50px',
            width: '320px', height: '320px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, hsl(18 60% 90%) 0%, transparent 65%)',
            opacity: 0.5,
          }}
        />

        <div className="relative w-full max-w-[360px]">

          {/* ── Brand ── */}
          <div className="flex flex-col items-center gap-5 mb-8" style={{ marginTop: '-24px' }}>
            <div
              className="rounded-full flex items-center justify-center"
              style={{
                width: 84, height: 84, minWidth: 84, minHeight: 84,
                background: 'linear-gradient(145deg, hsl(4 68% 60%) 0%, hsl(340 55% 62%) 100%)',
                boxShadow: '0 8px 28px hsl(4 68% 60% / 0.28)',
              }}
            >
              <span
                className="text-[36px] font-bold text-white"
                style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
              >
                X
              </span>
            </div>

            <div className="text-center">
              <h1
                className="text-[38px] leading-none font-semibold tracking-wide"
                style={{
                  fontFamily: 'Cormorant Garamond, Georgia, serif',
                  color: 'hsl(15 40% 16%)',
                }}
              >
                Xito Events
              </h1>
            </div>
          </div>

          {/* ── Sliding card container ── */}
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                display: 'flex',
                width: '200%',
                transform: showFreelancer ? 'translateX(-50%)' : 'translateX(0)',
                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {/* ── Panel 1: Original login card ── */}
              <div style={{ width: '50%', flexShrink: 0 }}>
                <div
                  className="rounded-3xl p-6"
                  style={{
                    background: 'rgba(255,255,255,0.88)',
                    border: '1px solid hsl(18 32% 89%)',
                    boxShadow: '0 4px 32px hsl(15 30% 50% / 0.08)',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  <form onSubmit={handleLogin} className="space-y-3">
                    {/* Email */}
                    <div>
                      <div className="relative">
                        <Mail
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                          style={{ color: emailError ? 'hsl(4 68% 58%)' : 'hsl(15 14% 65%)' }}
                        />
                        <input
                          type="email"
                          value={email}
                          onChange={e => { setEmail(e.target.value); setEmailError(null); }}
                          placeholder="Email address"
                          required
                          autoComplete="email"
                          className="w-full h-11 pl-10 pr-4 rounded-xl text-[13px] transition-all focus:outline-none"
                          style={{
                            ...inputStyle,
                            border: emailError ? '1px solid hsl(4 68% 58%)' : inputStyle.border,
                          }}
                          onFocus={inputFocus}
                          onBlur={inputBlur}
                        />
                      </div>
                      {emailError && (
                        <p
                          className="text-[11px] mt-1.5 pl-1"
                          style={{ color: 'hsl(4 68% 54%)', fontFamily: 'Poppins, sans-serif' }}
                        >
                          {emailError}
                        </p>
                      )}
                    </div>

                    {/* Password */}
                    <div className="relative">
                      <Lock
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                        style={{ color: 'hsl(15 14% 65%)' }}
                      />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Password"
                        autoComplete="current-password"
                        className="w-full h-11 pl-10 pr-11 rounded-xl text-[13px] transition-all focus:outline-none"
                        style={inputStyle}
                        onFocus={inputFocus}
                        onBlur={inputBlur}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                        style={{ color: 'hsl(15 14% 65%)' }}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={submitting || !email.trim()}
                      className="w-full h-11 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 mt-1"
                      style={{
                        background: 'linear-gradient(135deg, hsl(4 68% 60%) 0%, hsl(340 55% 62%) 100%)',
                        boxShadow: submitting || !email.trim()
                          ? 'none'
                          : '0 4px 18px hsl(4 68% 58% / 0.32)',
                        fontFamily: 'Poppins, sans-serif',
                      }}
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Login'}
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3 pt-1">
                      <div className="flex-1 h-px" style={{ background: 'hsl(18 32% 89%)' }} />
                      <span className="text-[11px]" style={{ color: 'hsl(15 14% 68%)', fontFamily: 'Poppins, sans-serif' }}>or</span>
                      <div className="flex-1 h-px" style={{ background: 'hsl(18 32% 89%)' }} />
                    </div>

                    {/* Guest login */}
                    <button
                      type="button"
                      onClick={() => setShowQR(true)}
                      className="w-full flex items-center justify-center gap-2 py-1 transition-all active:scale-[0.98]"
                      style={{
                        color: 'hsl(4 68% 54%)',
                        fontFamily: 'Poppins, sans-serif',
                        fontSize: '13px',
                        fontWeight: 500,
                        background: 'none',
                        border: 'none',
                      }}
                    >
                      <QrCode className="w-4 h-4" />
                      Login as Guest
                    </button>
                  </form>
                </div>
              </div>

              {/* ── Panel 2: Freelancer login card ── */}
              <div style={{ width: '50%', flexShrink: 0 }}>
                <div
                  className="rounded-3xl p-6"
                  style={{
                    background: 'rgba(255,255,255,0.88)',
                    border: '1px solid hsl(18 32% 89%)',
                    boxShadow: '0 4px 32px hsl(15 30% 50% / 0.08)',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  {/* Back button */}
                  <button
                    type="button"
                    onClick={() => setShowFreelancer(false)}
                    className="flex items-center gap-1.5 mb-4 transition-colors active:scale-95"
                    style={{
                      color: 'hsl(15 14% 55%)',
                      fontFamily: 'Poppins, sans-serif',
                      fontSize: '13px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>

                  <form onSubmit={handleFreelancerLogin} className="space-y-3">
                    {/* Email */}
                    <div className="relative">
                      <Mail
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                        style={{ color: 'hsl(15 14% 65%)' }}
                      />
                      <input
                        type="email"
                        value={flEmail}
                        onChange={e => setFlEmail(e.target.value)}
                        placeholder="Email address"
                        required
                        autoComplete="email"
                        className="w-full h-11 pl-10 pr-4 rounded-xl text-[13px] transition-all focus:outline-none"
                        style={inputStyle}
                        onFocus={inputFocus}
                        onBlur={inputBlur}
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <div className="relative">
                        <Lock
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                          style={{ color: flPasswordError ? 'hsl(4 68% 58%)' : 'hsl(15 14% 65%)' }}
                        />
                        <input
                          type={flShowPassword ? 'text' : 'password'}
                          value={flPassword}
                          onChange={e => { setFlPassword(e.target.value); setFlPasswordError(null); }}
                          placeholder="Password"
                          required
                          autoComplete="current-password"
                          className="w-full h-11 pl-10 pr-11 rounded-xl text-[13px] transition-all focus:outline-none"
                          style={{
                            ...inputStyle,
                            border: flPasswordError ? '1px solid hsl(4 68% 58%)' : inputStyle.border,
                          }}
                          onFocus={inputFocus}
                          onBlur={inputBlur}
                        />
                        <button
                          type="button"
                          onClick={() => setFlShowPassword(v => !v)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                          style={{ color: 'hsl(15 14% 65%)' }}
                        >
                          {flShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {flPasswordError && (
                        <p
                          className="text-[11px] mt-1.5 pl-1"
                          style={{ color: 'hsl(4 68% 54%)', fontFamily: 'Poppins, sans-serif' }}
                        >
                          {flPasswordError}
                        </p>
                      )}
                    </div>

                    {/* Login */}
                    <button
                      type="submit"
                      disabled={flSubmitting || !flEmail.trim() || !flPassword}
                      className="w-full h-11 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(135deg, hsl(4 68% 60%) 0%, hsl(340 55% 62%) 100%)',
                        boxShadow: flSubmitting || !flEmail.trim() || !flPassword
                          ? 'none'
                          : '0 4px 18px hsl(4 68% 58% / 0.32)',
                        fontFamily: 'Poppins, sans-serif',
                      }}
                    >
                      {flSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Login'}
                    </button>

                    {/* "Don't have an account?" link */}
                    <div className="text-center">
                      <button
                        type="button"
                        className="text-[12px] transition-colors"
                        style={{
                          color: 'hsl(4 68% 54%)',
                          fontFamily: 'Poppins, sans-serif',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Don't have an account? <span style={{ fontWeight: 600 }}>create one</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="fixed bottom-5 left-0 right-0 flex flex-col items-center gap-2 px-6" style={{ zIndex: 10 }}>
        {!showFreelancer && (
          <button
            type="button"
            onClick={() => setShowFreelancer(true)}
            className="w-full max-w-[360px] h-11 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, hsl(4 68% 60%) 0%, hsl(340 55% 62%) 100%)',
              boxShadow: '0 4px 18px hsl(4 68% 58% / 0.32)',
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            Continue with Freelancer Account
          </button>
        )}
        <p
          className="text-center text-[11px]"
          style={{ color: 'hsl(15 14% 62%)', fontFamily: 'Poppins, sans-serif' }}
        >
          By signing in you agree to our Terms of Service
        </p>
      </div>
    </>
  );
}
