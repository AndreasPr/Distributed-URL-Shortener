import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, ArrowLeft, AlertOctagon, Flag } from 'lucide-react';
import { Button } from '../../design-system/Button';
import { RelayLogo } from '../../design-system/Icons';

export const BlockedLinkPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07090e] text-slate-900 dark:text-slate-100 flex flex-col justify-between p-6">
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <RelayLogo className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
            Relaymark Trust & Safety
          </span>
        </Link>
        <Link
          to="/security"
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          Security Policies
        </Link>
      </header>

      <main className="max-w-md mx-auto w-full text-center py-12">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-7 h-7 stroke-[1.75]" />
        </div>

        <div className="font-mono text-xs uppercase tracking-widest text-rose-600 dark:text-rose-400 font-semibold mb-2">
          Suspended For Threat Mitigation
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
          This link was disabled for abuse.
        </h1>

        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
          To protect visitors from malicious activity, our automated telemetry scanner or security team has deactivated this redirect. The target URL was flagged for phishing, malware, or deceptive behavior.
        </p>

        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/20 text-left text-xs mb-8 space-y-2">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold">
            <AlertOctagon className="w-4 h-4 shrink-0" />
            <span>Do not attempt to bypass this warning</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Visiting the unshortened destination poses a risk of credential theft, session hijacking, or malicious binary execution.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="default"
            onClick={() => window.history.back()}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Safety
          </Button>

          <Link to="/report" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              <Flag className="w-4 h-4 mr-2" />
              Report False Positive
            </Button>
          </Link>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto w-full text-center text-xs text-slate-400 dark:text-slate-500 font-mono">
        HTTP 451 Unavailable For Legal / Safety Reasons · Zero Tolerance Policy
      </footer>
    </div>
  );
};
