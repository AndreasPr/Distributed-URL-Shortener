import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RelayLogo } from '../../design-system/Icons';
import { Button } from '../../design-system/Button';
import { Input } from '../../design-system/Input';
import { Badge } from '../../design-system/Badge';
import { useToast } from '../../context/ToastContext';
import {
  Github,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  Lock
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('andreas@relaymark.dev');
  const [password, setPassword] = useState('••••••••••••');
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [loading, setLoading] = useState(false);

  // Demonstration state switches (normal, error, verification_needed)
  const [authState, setAuthState] = useState<'normal' | 'error' | 'verification_needed'>('normal');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);

  const handleOAuthLogin = (provider: 'github' | 'google') => {
    setLoading(true);
    toast({
      title: `Connecting to ${provider === 'github' ? 'GitHub' : 'Google'} OAuth...`,
      variant: 'info',
    });
    setTimeout(() => {
      setLoading(false);
      toast({
        title: 'Authentication Successful',
        description: `Signed in as Andreas Priftis via ${provider === 'github' ? 'GitHub' : 'Google'}.`,
        variant: 'success',
      });
      navigate('/app');
    }, 800);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup' && !agreedToTerms) {
      toast({
        title: 'Terms of Service Required',
        description: 'You must agree to the Terms of Service and Privacy Policy to create an account.',
        variant: 'error',
      });
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (authState === 'error') {
        toast({
          title: 'Authentication Error',
          description: 'Invalid credentials or API gateway rate limit reached. Please verify your token.',
          variant: 'error',
        });
        return;
      }

      if (authState === 'verification_needed' || mode === 'signup') {
        setAuthState('verification_needed');
        toast({
          title: 'Verification Code Sent',
          description: `A 6-digit cryptographic verification code was sent to ${email}`,
          variant: 'info',
        });
        return;
      }

      toast({
        title: 'Welcome Back',
        description: 'Successfully authenticated. Entering workspace...',
        variant: 'success',
      });
      navigate('/app');
    }, 700);
  };

  const handleVerifyCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({
        title: 'Email Verified',
        description: 'Account verified successfully. Proceeding to onboarding...',
        variant: 'success',
      });
      navigate('/onboarding');
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-[#07080c] text-slate-900 dark:text-slate-100 p-4 sm:p-6">
      {/* Top Header */}
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between py-2">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <RelayLogo className="w-4 h-4" />
          </div>
          <span className="font-bold text-base tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            Relaymark
          </span>
        </Link>

        {/* State Simulator Bar for Tester */}
        <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-xs">
          <span className="text-[10px] font-mono text-slate-400 px-1 hidden md:inline">
            TEST STATE:
          </span>
          <button
            type="button"
            onClick={() => setAuthState('normal')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              authState === 'normal'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Normal Form
          </button>
          <button
            type="button"
            onClick={() => setAuthState('error')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              authState === 'error'
                ? 'bg-rose-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Simulate Error
          </button>
          <button
            type="button"
            onClick={() => setAuthState('verification_needed')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              authState === 'verification_needed'
                ? 'bg-amber-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Verification State
          </button>
        </div>
      </div>

      {/* Main Card Viewport */}
      <div className="w-full max-w-md mx-auto my-8">
        <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] shadow-xl space-y-6">
          {/* Header Title & Switch */}
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {authState === 'verification_needed'
                ? 'Check your inbox'
                : mode === 'signin'
                ? 'Sign in to Relaymark'
                : 'Create your developer account'}
            </h1>
            <p className="text-xs text-slate-500">
              {authState === 'verification_needed'
                ? `We sent a 6-digit confirmation code to ${email}`
                : 'API-first link platform for developers & AI agents'}
            </p>
          </div>

          {/* SIMULATED ERROR STATE BANNER */}
          {authState === 'error' && (
            <div
              role="alert"
              className="p-3.5 rounded-lg border border-rose-500/40 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-rose-950 dark:text-rose-100">
                  Authentication Failed (HTTP 401)
                </p>
                <p className="text-[11px] leading-relaxed text-rose-800 dark:text-rose-300">
                  The email or password entered does not match our records, or the IP address has triggered automated credential stuffing defenses.
                </p>
              </div>
            </div>
          )}

          {/* VERIFICATION-NEEDED STATE */}
          {authState === 'verification_needed' ? (
            <form onSubmit={handleVerifyCodeSubmit} className="space-y-4">
              <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 text-xs space-y-1">
                <p className="font-semibold text-amber-950 dark:text-amber-100">
                  Verification Required
                </p>
                <p className="text-amber-900 dark:text-amber-300 text-[11px] leading-relaxed">
                  Enter the 6-digit code sent to your email to verify authorization for this workspace session.
                </p>
              </div>

              {/* 6 Digit Input Boxes */}
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-2">
                  6-Digit Verification Code
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <input
                      key={idx}
                      type="text"
                      maxLength={1}
                      defaultValue={idx === 0 ? '7' : idx === 1 ? '4' : idx === 2 ? '2' : ''}
                      className="h-12 text-center text-lg font-mono font-bold rounded-lg border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/30 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                    />
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={loading}
              >
                Verify & Continue
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setAuthState('normal')}
                  className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white underline"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            /* STANDARD SIGN IN / SIGN UP FORM */
            <div className="space-y-5">
              {/* OAuth Providers: GitHub & Google */}
              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthLogin('github')}
                  disabled={loading}
                  leftIcon={<Github className="w-4 h-4" />}
                  className="w-full justify-center text-xs"
                >
                  GitHub
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthLogin('google')}
                  disabled={loading}
                  leftIcon={
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  }
                  className="w-full justify-center text-xs"
                >
                  Google
                </Button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-slate-200 dark:border-white/10" />
                <span className="relative bg-white dark:bg-[#0f111a] px-3 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                  or email
                </span>
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <Input
                  label="Work Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                />

                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />

                {/* Terms of Service & Privacy Checkbox */}
                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="terms-checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 dark:border-white/20 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="terms-checkbox" className="text-xs text-slate-600 dark:text-slate-400 leading-normal">
                    I agree to the{' '}
                    <Link to="/legal/terms" className="text-blue-600 dark:text-blue-400 underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/legal/privacy" className="text-blue-600 dark:text-blue-400 underline">
                      Privacy Policy
                    </Link>
                    .
                  </label>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full justify-center"
                  isLoading={loading}
                >
                  {mode === 'signin' ? 'Sign In to Workspace' : 'Create Free Account'}
                </Button>
              </form>

              {/* Mode Toggle Footer */}
              <div className="pt-2 text-center text-xs text-slate-500">
                {mode === 'signin' ? (
                  <p>
                    Don&rsquo;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    >
                      Sign up free
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signin')}
                      className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    >
                      Sign in
                    </button>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Trust Badge */}
        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>SOC 2 Type II Certified · Anycast TLS 1.3 Resolution</span>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-7xl mx-auto py-4 border-t border-slate-200 dark:border-white/5 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Relaymark Inc. All rights reserved.
      </div>
    </div>
  );
};
