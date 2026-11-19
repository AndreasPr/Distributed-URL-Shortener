import React from 'react';
import { Link } from 'react-router-dom';
import { TimerOff, ArrowLeft, Home, HelpCircle } from 'lucide-react';
import { Button } from '../../design-system/Button';
import { RelayLogo } from '../../design-system/Icons';

export const ExpiredLinkPage: React.FC = () => {
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
          to="/about"
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          What is Relaymark?
        </Link>
      </header>

      <main className="max-w-md mx-auto w-full text-center py-12">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-6">
          <TimerOff className="w-7 h-7 stroke-[1.75]" />
        </div>

        <div className="font-mono text-xs uppercase tracking-widest text-amber-600 dark:text-amber-400 font-semibold mb-2">
          Link Expired
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
          This link is no longer active.
        </h1>

        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
          The creator of this shortlink configured a time-to-live (TTL) expiration date or total click threshold that has been reached. Redirection has ceased.
        </p>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-left text-xs mb-8 space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>Status:</span>
            <span className="font-mono font-semibold text-rose-500">Expired / Inactive</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2">
            <span>Next Step:</span>
            <span className="text-slate-700 dark:text-slate-300">Contact the person or organization who shared this link</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/" className="w-full sm:w-auto">
            <Button variant="default" className="w-full sm:w-auto">
              <Home className="w-4 h-4 mr-2" />
              Relaymark Home
            </Button>
          </Link>
          <Link to="/contact" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              <HelpCircle className="w-4 h-4 mr-2" />
              Help Center
            </Button>
          </Link>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto w-full text-center text-xs text-slate-400 dark:text-slate-500 font-mono">
        Relaymark TTL Policy Enforcement
      </footer>
    </div>
  );
};
