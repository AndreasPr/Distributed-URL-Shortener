import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, Search, Sun, Moon, Terminal, ShieldCheck, Bell } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAppData } from '../../context/AppDataContext';
import { Badge } from '../../design-system/Badge';

interface TopbarProps {
  onOpenMobileMenu?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileMenu }) => {
  const { isDark, toggleTheme } = useTheme();
  const { activeWorkspace } = useWorkspace();
  const { openCommandPalette } = useAppData();
  const location = useLocation();

  // Compute clean breadcrumbs based on current pathname
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentSection = pathSegments[pathSegments.length - 1] || 'overview';

  const formatSection = (str: string) => {
    return str
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#07080c]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
          <Link
            to="/app/links"
            className="text-slate-700 dark:text-slate-300 hover:text-blue-600 font-medium truncate"
          >
            {activeWorkspace.name}
          </Link>
          <span className="text-slate-400 select-none">/</span>
          <span className="text-slate-900 dark:text-slate-100 font-semibold truncate">
            {formatSection(currentSection)}
          </span>
        </nav>
      </div>

      {/* Right: Quick actions, search trigger, status badge, theme */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Anycast Status Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="font-mono">Anycast 320 PoPs</span>
        </div>

        {/* Quick Command shortcut display */}
        <button
          type="button"
          onClick={openCommandPalette}
          aria-label="Quick search and command palette"
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Quick search...</span>
          <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/10 text-[10px] font-mono bg-white dark:bg-white/5 text-slate-500">
            ⌘K
          </kbd>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label={`Toggle theme (currently ${isDark ? 'dark' : 'light'})`}
          className="min-w-[38px] min-h-[38px] flex items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* Admin Switcher Link */}
        <Link
          to="/admin"
          className="min-w-[38px] min-h-[38px] flex items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          title="Cluster Admin"
        >
          <Terminal className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
};
