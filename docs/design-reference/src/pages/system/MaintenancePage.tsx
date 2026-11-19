import React from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Activity, Clock, ShieldCheck } from 'lucide-react';
import { Button } from '../../design-system/Button';
import { RelayLogo } from '../../design-system/Icons';

export const MaintenancePage: React.FC = () => {
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
          to="/status"
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <Activity className="w-3.5 h-3.5 text-blue-500" />
          <span>Status Page</span>
        </Link>
      </header>

      <main className="max-w-md mx-auto w-full text-center py-12">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-6">
          <Wrench className="w-7 h-7 stroke-[1.75]" />
        </div>

        <div className="font-mono text-xs uppercase tracking-widest text-blue-600 dark:text-blue-400 font-semibold mb-2">
          Maintenance In Progress
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
          Scheduled edge cluster upgrade.
        </h1>

        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
          We are performing a scheduled zero-downtime database schema migration and edge routing proxy restart. Existing shortlinks continue redirecting without interruption.
        </p>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-left text-xs mb-8 space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Estimated Duration:
            </span>
            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">~15 minutes</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Redirect Ingress:
            </span>
            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">Fully Operational</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/status" className="w-full sm:w-auto">
            <Button variant="default" className="w-full sm:w-auto">
              <Activity className="w-4 h-4 mr-2" />
              View Live Progress
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto"
          >
            Check Again
          </Button>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto w-full text-center text-xs text-slate-400 dark:text-slate-500 font-mono">
        Window: 02:00 - 02:20 UTC · Rolling upgrade across 320 Anycast PoPs
      </footer>
    </div>
  );
};
