import React from 'react';
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import {
  ShieldAlert,
  Activity,
  ArrowLeft,
  Sun,
  Moon,
  AlertTriangle,
  Users,
  Zap,
  BarChart3,
  Layers,
  Shield,
} from 'lucide-react';
import { RelayLogo } from '../design-system/Icons';
import { useTheme } from '../context/ThemeContext';
import { Badge } from '../design-system/Badge';
import { useAppData } from '../context/AppDataContext';

export const AdminLayout: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const { flaggedLinks, systemFlags } = useAppData();
  const location = useLocation();

  const pendingAbuseCount = flaggedLinks.filter((l) => l.status === 'pending').length;
  const isAnyKillSwitchActive =
    systemFlags.killSwitchSignups || systemFlags.killSwitchLinkCreation;

  const navItems = [
    { label: 'Overview', path: '/admin', icon: BarChart3, exact: true },
    {
      label: 'Abuse Queue',
      path: '/admin/flagged',
      icon: AlertTriangle,
      badge: pendingAbuseCount > 0 ? pendingAbuseCount : null,
      badgeVariant: 'destructive' as const,
    },
    { label: 'Customers', path: '/admin/customers', icon: Users },
    {
      label: 'Kill Switches & Flags',
      path: '/admin/flags',
      icon: Zap,
      indicator: isAnyKillSwitchActive,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-[#07090e] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Prominent High-Contrast "Operator Only" Banner */}
      <div className="bg-amber-500 dark:bg-amber-600 text-slate-950 px-4 py-1.5 text-center text-[11px] font-mono font-bold tracking-wider uppercase flex items-center justify-center gap-2 shadow-sm select-none">
        <Shield className="w-3.5 h-3.5" />
        <span>OPERATOR ONLY · CONFIDENTIAL INTERNAL INFRASTRUCTURE & CIRCUIT BREAKERS · ACCESS RESTRICTED</span>
      </div>

      {/* Top Admin Header */}
      <header className="border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-14 gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/app/links"
              className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Return to standard user application"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit to App</span>
            </Link>

            <span className="text-slate-300 dark:text-slate-700">|</span>

            <Link
              to="/design-system"
              className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Inspect Design System & Components"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Design System</span>
            </Link>

            <span className="text-slate-300 dark:text-slate-700">|</span>

            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white">
                <RelayLogo className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs tracking-tight text-slate-900 dark:text-white">
                Relaymark Admin
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                OPERATOR
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-mono">
              <Activity className="w-3.5 h-3.5" />
              <span>6 Global PoPs Active</span>
            </div>

            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
            </button>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto pb-0">
          {navItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);

            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                className={({ isActive: active }) =>
                  `flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                    active
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge !== null && item.badge !== undefined && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-rose-600 text-white">
                    {item.badge}
                  </span>
                )}
                {item.indicator && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Circuit breaker engaged" />
                )}
              </NavLink>
            );
          })}
        </div>
      </header>

      {/* Main Admin Viewport */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
};
