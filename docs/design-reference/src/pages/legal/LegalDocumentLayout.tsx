import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { AlertTriangle, Clock, FileText, ChevronRight, ArrowLeft } from 'lucide-react';
import { Badge } from '../../design-system/Badge';

export interface TocSection {
  id: string;
  title: string;
}

export interface LegalDocumentLayoutProps {
  title: string;
  documentType: string;
  lastUpdated?: string;
  sections: TocSection[];
  children: React.ReactNode;
}

export const LegalDocumentLayout: React.FC<LegalDocumentLayoutProps> = ({
  title,
  documentType,
  lastUpdated = 'November 5, 2026',
  sections,
  children,
}) => {
  const legalDocs = [
    { label: 'Terms of Service', path: '/legal/terms' },
    { label: 'Privacy Policy', path: '/legal/privacy' },
    { label: 'Acceptable Use (AUP)', path: '/legal/aup' },
    { label: 'Cookie Policy', path: '/legal/cookies' },
    { label: 'Refunds & Cancellation', path: '/legal/refunds' },
    { label: 'Data Processing (DPA)', path: '/legal/dpa' },
    { label: 'Subprocessors List', path: '/legal/subprocessors' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto py-8 sm:py-12 px-4 sm:px-6 space-y-8 animate-in fade-in duration-150">
      {/* 1. Mandatory Visible Banner: Draft pending legal review */}
      <div
        role="alert"
        className="p-4 rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 flex items-start gap-3 shadow-xs"
      >
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-sm tracking-tight text-amber-950 dark:text-amber-100">
            Draft pending legal review
          </p>
          <p className="leading-relaxed text-amber-900 dark:text-amber-300">
            This document is a technical and operational draft created for evaluation purposes. It has not been signed off by licensed legal counsel in any jurisdiction. All terms, clauses, and liability limitations remain subject to formal legal audit.
          </p>
          <p className="text-[11px] font-mono text-amber-800 dark:text-amber-400 font-semibold pt-0.5">
            [PLACEHOLDER: Formal counsel review pending · Do not rely on this draft as legal advice]
          </p>
        </div>
      </div>

      {/* 2. Document Title & Last Updated Header */}
      <div className="space-y-3 border-b border-slate-200 dark:border-white/10 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="agent" size="sm">
            {documentType}
          </Badge>
          <span className="text-xs text-slate-400">·</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Last updated: {lastUpdated}</span>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          {title}
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
          Relaymark is an API-first link management platform for software engineers and autonomous AI agents. Please review these terms carefully.
        </p>
      </div>

      {/* 3. Horizontal Legal Documents Switcher Tab Strip */}
      <div className="w-full overflow-x-auto pb-2 border-b border-slate-100 dark:border-white/5">
        <nav aria-label="Legal Documents Navigation" className="flex items-center gap-1.5 min-w-max">
          {legalDocs.map((doc) => (
            <NavLink
              key={doc.path}
              to={doc.path}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                }`
              }
            >
              {doc.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* 4. Main 2-Column Layout (Sticky TOC + Long-Form Prose) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pt-2">
        {/* Left Column: Sticky Table of Contents */}
        <aside className="lg:col-span-1 space-y-3">
          <div className="sticky top-20 space-y-2 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#0f111a]/80 backdrop-blur-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider pb-1 border-b border-slate-200 dark:border-white/5">
              <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Table of Contents</span>
            </div>

            <nav className="space-y-1">
              {sections.map((sec, idx) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-white/5 transition-colors group"
                >
                  <span className="font-mono text-[10px] text-slate-400 group-hover:text-blue-500 tabular-nums">
                    {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}.
                  </span>
                  <span className="truncate">{sec.title}</span>
                </a>
              ))}
            </nav>

            <div className="pt-3 border-t border-slate-200 dark:border-white/5">
              <Link
                to="/contact"
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                <span>Legal questions? Contact us</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </aside>

        {/* Right Column: Long-Form Body Prose */}
        <main className="lg:col-span-3 space-y-10 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
          {children}

          {/* Bottom Nav Helper */}
          <div className="pt-8 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link to="/" className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Relaymark Homepage</span>
            </Link>
            <span className="text-xs text-slate-400 font-mono">
              [PLACEHOLDER: Legal Department Archival Code #RELAY-LEGAL-2026]
            </span>
          </div>
        </main>
      </div>
    </div>
  );
};
