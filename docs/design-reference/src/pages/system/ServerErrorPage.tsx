import React from 'react';
import { Link } from 'react-router-dom';
import { ServerCrash, RefreshCw, Activity, ArrowLeft } from 'lucide-react';
import { Button } from '../../design-system/Button';
import { RelayLogo } from '../../design-system/Icons';

export const ServerErrorPage: React.FC = () => {
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
          <Activity className="w-3.5 h-3.5 text-amber-500" />
          <span>Status Dashboard</span>
        </Link>
      </header>

      <main className="max-w-md mx-auto w-full text-center py-12">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-6">
          <ServerCrash className="w-7 h-7 stroke-[1.75]" />
        </div>

        <div className="font-mono text-xs uppercase tracking-widest text-rose-600 dark:text-rose-400 font-semibold mb-2">
          HTTP 500 · Edge Ingress Error
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
          Something went wrong on our end.
        </h1>

        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
          The edge reverse proxy encountered an unexpected failure during request forward. Our automated self-healing pipeline has received telemetry for this event.
        </p>

        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 font-mono text-xs text-slate-500 dark:text-slate-400 text-left mb-8 space-y-1">
          <div className="flex justify-between">
            <span>Ray ID:</span>
            <span className="text-slate-800 dark:text-slate-200">89fa012c4e91024</span>
          </div>
          <div className="flex justify-between">
            <span>Error Code:</span>
            <span className="text-rose-500">EDGE_CLUSTER_FAILOVER_500</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload Page
          </Button>

          <Link to="/status" className="w-full sm:w-auto">
            <Button variant="default" className="w-full sm:w-auto">
              <Activity className="w-4 h-4 mr-2" />
              Check Status
            </Button>
          </Link>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto w-full text-center text-xs text-slate-400 dark:text-slate-500 font-mono">
        Relaymark Ingress Gateway · Automatic BGP transit rerouting active
      </footer>
    </div>
  );
};
