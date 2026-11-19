import React from 'react';
import { Link } from 'react-router-dom';
import { Github, ExternalLink } from 'lucide-react';
import { RelayLogo } from '../../design-system/Icons';

export const MarketingFooter: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#07080c] py-12 px-4 sm:px-6 text-xs text-slate-600 dark:text-slate-400">
      <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-5 gap-8">
        {/* Brand Col */}
        <div className="space-y-3 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white">
              <RelayLogo className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Relaymark
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            API-first programmable link management and Model Context Protocol (MCP) server for autonomous agents.
          </p>
          <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>All systems operational · Edge P95 12ms</span>
          </div>
        </div>

        {/* Product Links */}
        <div className="space-y-2">
          <p className="font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
            Platform
          </p>
          <ul className="space-y-1.5">
            <li>
              <Link to="/qr-codes" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                QR Code Studio
              </Link>
            </li>
            <li>
              <Link to="/link-in-bio" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Link-in-Bio Profiles
              </Link>
            </li>
            <li>
              <Link to="/use-cases" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Real-World Use Cases
              </Link>
            </li>
            <li>
              <Link to="/developers" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-semibold text-blue-600 dark:text-blue-400">
                Developers & MCP
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Pricing & Quotas
              </Link>
            </li>
            <li>
              <Link to="/docs" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                API Docs & Quickstart
              </Link>
            </li>
          </ul>
        </div>

        {/* Resources & Content */}
        <div className="space-y-2">
          <p className="font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
            Resources
          </p>
          <ul className="space-y-1.5">
            <li>
              <Link to="/blog" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Engineering Blog
              </Link>
            </li>
            <li>
              <Link to="/docs#mcp" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                MCP Agent Setup
              </Link>
            </li>
            <li>
              <Link to="/design-system" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
                Design System & Tokens
              </Link>
            </li>
            <li>
              <Link to="/admin" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex items-center gap-1 font-mono text-[11px]">
                <span>Cluster Admin (Operator)</span>
              </Link>
            </li>
            <li>
              <Link to="/blocked-link" className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors font-mono text-[11px]">
                Blocked Abuse (451)
              </Link>
            </li>
            <li>
              <Link to="/429" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors font-mono text-[11px]">
                Rate Limited (429)
              </Link>
            </li>
            <li>
              <Link to="/expired-link" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-mono text-[11px]">
                Link Expired Notice
              </Link>
            </li>
            <li>
              <Link to="/maintenance" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-mono text-[11px]">
                Maintenance Screen
              </Link>
            </li>
            <li>
              <a
                href="https://github.com/relaymark/mcp-server-relay"
                target="_blank"
                rel="noreferrer"
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
              >
                <span>MCP Server Repo</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </li>
          </ul>
        </div>

        {/* Trust & Company */}
        <div className="space-y-2">
          <p className="font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
            Trust & Company
          </p>
          <ul className="space-y-1.5">
            <li>
              <Link to="/about" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                About & Maker Story
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Contact & Support
              </Link>
            </li>
            <li>
              <Link to="/security" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Security & Disclosure
              </Link>
            </li>
            <li>
              <Link to="/report" className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                Report Link Abuse
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal & Compliance */}
        <div className="space-y-2">
          <p className="font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
            Legal & Compliance
          </p>
          <ul className="space-y-1.5 text-[11px]">
            <li>
              <Link to="/legal/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link to="/legal/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/legal/aup" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Acceptable Use (AUP)
              </Link>
            </li>
            <li>
              <Link to="/legal/cookies" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Cookie Policy
              </Link>
            </li>
            <li>
              <Link to="/legal/refunds" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Refunds & Cancellation
              </Link>
            </li>
            <li>
              <Link to="/legal/dpa" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Data Processing (DPA)
              </Link>
            </li>
            <li>
              <Link to="/legal/subprocessors" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Subprocessors List
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Sub-Bar */}
      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>© {new Date().getFullYear()} Relaymark. All rights reserved.</span>
          <span>·</span>
          <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">
            [Legal documents are operational drafts pending formal bar review]
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/legal/terms" className="hover:underline">Terms</Link>
          <Link to="/legal/privacy" className="hover:underline">Privacy</Link>
          <Link to="/legal/subprocessors" className="hover:underline">Subprocessors</Link>
          <Link to="/status" className="hover:underline">Status</Link>
        </div>
      </div>
    </footer>
  );
};
