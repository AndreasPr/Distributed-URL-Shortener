import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Link2,
  BarChart3,
  KeyRound,
  Webhook,
  Bot,
  CreditCard,
  Settings,
  LayoutGrid,
  ExternalLink,
  Activity,
  Gauge,
  Users,
  ShieldAlert,
  Sun,
  Moon,
  Laptop,
  X,
  BookOpen,
  Terminal,
  Smartphone,
} from 'lucide-react';
import { RelayLogo } from '../../design-system/Icons';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useTheme } from '../../context/ThemeContext';
import { mockCurrentUser } from '../../mock';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { activeWorkspace } = useWorkspace();
  const { theme, setTheme, isDark } = useTheme();

  const navItems = [
    { label: 'Dashboard', path: '/app', icon: Activity, exact: true },
    { label: 'Short Links', path: '/app/links', icon: Link2, badge: activeWorkspace.currentLinksCount },
    { label: 'Link-in-Bio', path: '/app/bio', icon: Smartphone, badge: 'New' },
    { label: 'Real-Time Analytics', path: '/app/analytics', icon: BarChart3 },
    { label: 'AI Agent MCP', path: '/app/mcp', icon: Bot, isAgent: true },
    { label: 'API Keys', path: '/app/settings/keys', icon: KeyRound },
    { label: 'Webhooks & Events', path: '/app/settings/webhooks', icon: Webhook },
    { label: 'Team Members', path: '/app/settings/members', icon: Users },
    { label: 'Billing & Invoices', path: '/app/settings/billing', icon: CreditCard },
    { label: 'Quota Usage', path: '/app/settings/usage', icon: Gauge },
    { label: 'Account Profile', path: '/app/settings/account', icon: Settings },
    { label: 'Security Audit', path: '/app/settings/audit', icon: ShieldAlert },
    { label: 'Design System', path: '/app/design-system', icon: LayoutGrid, isSpecial: true },
  ];

  const clickUsagePercent = Math.min(
    100,
    Math.round((activeWorkspace.monthlyClicks / activeWorkspace.maxMonthlyClicks) * 100)
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0b12] flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header & Workspace Switcher */}
        <div className="p-4 flex flex-col gap-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <RelayLogo className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Relaymark
                </span>
                <span className="text-[10px] text-slate-500 font-mono leading-none">
                  v2.4.1 · edge-api
                </span>
              </div>
            </Link>

            {onClose && (
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <WorkspaceSwitcher />
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <div className="px-2 pb-1 text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Infrastructure Navigation
          </div>

          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <item.icon
                  className={`w-4 h-4 shrink-0 ${
                    item.isAgent ? 'text-indigo-600 dark:text-indigo-400' : ''
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}

          {/* Quick External & Console Shortcuts */}
          <div className="pt-2 mt-2 border-t border-slate-100 dark:border-white/5 space-y-0.5">
            <div className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Quick Shortcuts
            </div>
            <Link
              to="/docs"
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
              <span>API Reference</span>
            </Link>
            <Link
              to="/status"
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              <span>System Status</span>
            </Link>
            <Link
              to="/admin"
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors font-mono"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Cluster Admin</span>
            </Link>
          </div>
        </div>

        {/* Bottom Section: Usage Meter & User Profile */}
        <div className="p-3 border-t border-slate-100 dark:border-white/5 space-y-3 bg-slate-50/50 dark:bg-black/20">
          {/* Monthly Routing Quota Meter */}
          <div className="p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-slate-700 dark:text-slate-300">Monthly Redirects</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                {clickUsagePercent}%
              </span>
            </div>

            <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all"
                style={{ width: `${clickUsagePercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono tabular-nums">
              <span>{activeWorkspace.monthlyClicks.toLocaleString()}</span>
              <span>/ {activeWorkspace.maxMonthlyClicks.toLocaleString()}</span>
            </div>
          </div>

          {/* User Profile & Theme Switcher */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={mockCurrentUser.avatarUrl}
                alt={mockCurrentUser.name}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-300 dark:border-white/20"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {mockCurrentUser.name}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {mockCurrentUser.email}
                </p>
              </div>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
