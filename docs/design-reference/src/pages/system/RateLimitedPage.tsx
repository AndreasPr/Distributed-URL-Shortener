import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Gauge, ArrowLeft, Zap, BookOpen } from 'lucide-react';
import { Button } from '../../design-system/Button';
import { RelayLogo } from '../../design-system/Icons';

export const RateLimitedPage: React.FC = () => {
  const [secondsRemaining, setSecondsRemaining] = useState(48);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
          to="/pricing"
          className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
        >
          View Higher Tier Limits →
        </Link>
      </header>

      <main className="max-w-md mx-auto w-full text-center py-12">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-6">
          <Gauge className="w-7 h-7 stroke-[1.75]" />
        </div>

        <div className="font-mono text-xs uppercase tracking-widest text-amber-600 dark:text-amber-400 font-semibold mb-2">
          HTTP 429 · Too Many Requests
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
          Rate limit exceeded.
        </h1>

        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
          You have submitted more requests than your current plan or API key rate limit allows. In-memory sliding window counters replenish automatically.
        </p>

        {/* Countdown box */}
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 text-center mb-6">
          <div className="font-mono text-3xl font-extrabold text-amber-600 dark:text-amber-400">
            00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Window quota resets in {secondsRemaining} seconds
          </div>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 font-mono text-[11px] text-slate-600 dark:text-slate-400 text-left mb-8 space-y-1">
          <div className="flex justify-between">
            <span>X-RateLimit-Limit:</span>
            <span className="text-slate-900 dark:text-white font-bold">1,000 req/min</span>
          </div>
          <div className="flex justify-between">
            <span>X-RateLimit-Remaining:</span>
            <span className="text-rose-500 font-bold">0</span>
          </div>
          <div className="flex justify-between">
            <span>X-RateLimit-Reset:</span>
            <span className="text-amber-500">{secondsRemaining}s</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/pricing" className="w-full sm:w-auto">
            <Button variant="default" className="w-full sm:w-auto">
              <Zap className="w-4 h-4 mr-2" />
              Upgrade Quota
            </Button>
          </Link>

          <Link to="/docs" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              <BookOpen className="w-4 h-4 mr-2" />
              Rate Limits Guide
            </Button>
          </Link>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto w-full text-center text-xs text-slate-400 dark:text-slate-500 font-mono">
        Token-bucket enforcement via Redis Cluster v7.2
      </footer>
    </div>
  );
};
