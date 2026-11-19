import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MailCheck, ArrowLeft, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '../../design-system/Button';
import { RelayLogo } from '../../design-system/Icons';
import { useToast } from '../../context/ToastContext';

export const EmailVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleInputChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newCode = [...code];
    newCode[index] = val.slice(-1);
    setCode(newCode);

    // Auto-focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`digit-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`digit-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length < 6) return;

    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      addToast({
        title: 'Email Verified',
        description: 'Your developer account is now active. Welcome to Relaymark!',
        variant: 'default',
      });
      navigate('/onboarding');
    }, 800);
  };

  const handleResend = () => {
    setIsResending(true);
    setTimeout(() => {
      setIsResending(false);
      addToast({
        title: 'Verification Link Sent',
        description: 'A fresh 6-digit code has been dispatched to andreas@relaymark.dev.',
        variant: 'default',
      });
    }, 700);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07090e] text-slate-900 dark:text-slate-100 flex flex-col justify-between p-6">
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <RelayLogo className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
            Relaymark
          </span>
        </Link>
        <Link
          to="/login"
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </header>

      <main className="max-w-md mx-auto w-full text-center py-10">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto mb-6">
          <MailCheck className="w-7 h-7 stroke-[1.75]" />
        </div>

        <div className="font-mono text-xs uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-semibold mb-2">
          Verification Required
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
          Check your inbox.
        </h1>

        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
          We sent a 6-digit confirmation code to <strong className="text-slate-900 dark:text-slate-100 font-mono">andreas@relaymark.dev</strong>. Enter the code below to complete account verification.
        </p>

        {/* 6-Digit Code Inputs */}
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            {code.map((digit, idx) => (
              <input
                key={idx}
                id={`digit-${idx}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-11 h-13 sm:w-12 sm:h-14 text-center font-mono text-xl font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              />
            ))}
          </div>

          <Button
            type="submit"
            variant="default"
            disabled={code.some((d) => !d) || isVerifying}
            className="w-full h-11"
          >
            {isVerifying ? (
              'Verifying token...'
            ) : (
              <>
                Confirm & Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>Didn't receive an email?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
            <span>Resend Code</span>
          </button>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto w-full text-center text-xs text-slate-400 dark:text-slate-500 font-mono">
        Secured with HMAC cryptographic token verification
      </footer>
    </div>
  );
};
