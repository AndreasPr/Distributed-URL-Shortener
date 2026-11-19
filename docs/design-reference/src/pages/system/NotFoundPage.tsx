import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft, Home, Activity } from 'lucide-react';
import { Button } from '../../design-system/Button';
import { RelayLogo } from '../../design-system/Icons';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

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
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
          <span>Systems Operational</span>
        </Link>
      </header>

      <main className="max-w-md mx-auto w-full text-center py-12">
        <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 flex items-center justify-center mx-auto mb-6">
          <Compass className="w-7 h-7 stroke-[1.75]" />
        </div>

        <div className="font-mono text-xs uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-semibold mb-2">
          HTTP 404 · Not Found
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
          Page or shortlink does not exist.
        </h1>

        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
          The requested route, slug, or redirect target could not be resolved by our Anycast edge. It may have been deleted, moved, or never created.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>

          <Link to="/" className="w-full sm:w-auto">
            <Button variant="default" className="w-full sm:w-auto">
              <Home className="w-4 h-4 mr-2" />
              Return Home
            </Button>
          </Link>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto w-full text-center text-xs text-slate-400 dark:text-slate-500 font-mono">
        Relaymark Edge Routing · Anycast Node IAD-01
      </footer>
    </div>
  );
};
