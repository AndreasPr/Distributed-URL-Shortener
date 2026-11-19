import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, ArrowRight, Menu, X, LayoutGrid } from 'lucide-react';
import { RelayLogo } from '../../design-system/Icons';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../design-system/Button';

export const MarketingHeader: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: 'QR Codes', path: '/qr-codes' },
    { label: 'Link in Bio', path: '/link-in-bio' },
    { label: 'Use Cases', path: '/use-cases' },
    { label: 'Developers', path: '/developers' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'Docs', path: '/docs' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#07080c]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single element Brand wordmark with abstract relay logo */}
        <Link to="/" className="flex items-center gap-2.5 whitespace-nowrap shrink-0 group">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-700 transition-colors">
            <RelayLogo className="w-4.5 h-4.5" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Relaymark
          </span>
        </Link>

        {/* Zone 2: Desktop clean single-line nav links */}
        <nav
          aria-label="Main Navigation"
          className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-400"
        >
          {navLinks.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
                location.pathname === item.path ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Zone 3: 1 primary action + theme toggle + mobile menu toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          <Link
            to="/login"
            className="hidden sm:inline-block text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Sign In
          </Link>

          <Link to="/app">
            <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              <span className="hidden xs:inline">Open Console</span>
              <span className="xs:hidden">Console</span>
            </Button>
          </Link>

          {/* Mobile hamburger menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
            className="md:hidden min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Accessible Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div
          id="mobile-navigation"
          role="navigation"
          aria-label="Mobile Navigation Drawer"
          className="md:hidden border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#07080c] px-4 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="grid grid-cols-2 gap-2 text-xs font-medium">
            <Link
              to="/qr-codes"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-100 font-semibold"
            >
              QR Codes
            </Link>
            <Link
              to="/link-in-bio"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-100 font-semibold"
            >
              Link in Bio
            </Link>
            <Link
              to="/use-cases"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-100"
            >
              Use Cases
            </Link>
            <Link
              to="/developers"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2.5 rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-semibold"
            >
              Developers & MCP
            </Link>
            <Link
              to="/pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-100"
            >
              Pricing & Plans
            </Link>
            <Link
              to="/docs"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-100"
            >
              Documentation
            </Link>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-500 py-1">
              <span>Company & Support</span>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-400">
              <Link to="/about" onClick={() => setIsMobileMenuOpen(false)} className="hover:underline">About</Link>
              <span>·</span>
              <Link to="/blog" onClick={() => setIsMobileMenuOpen(false)} className="hover:underline">Blog</Link>
              <span>·</span>
              <Link to="/contact" onClick={() => setIsMobileMenuOpen(false)} className="hover:underline">Contact</Link>
              <span>·</span>
              <Link to="/security" onClick={() => setIsMobileMenuOpen(false)} className="hover:underline">Security</Link>
              <span>·</span>
              <Link to="/report" onClick={() => setIsMobileMenuOpen(false)} className="text-rose-600 hover:underline">Report Abuse</Link>
              <span>·</span>
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="text-blue-600 font-semibold hover:underline">Sign In</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
