import React from 'react';
import { LegalDocumentLayout, TocSection } from './LegalDocumentLayout';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../design-system/Table';
import { Badge } from '../../design-system/Badge';
import { CheckCircle2, Shield } from 'lucide-react';

export const CookiesPage: React.FC = () => {
  const sections: TocSection[] = [
    { id: 'overview', title: '1. Zero Tracking on Redirects' },
    { id: 'dashboard-cookies', title: '2. Dashboard & Session Storage' },
    { id: 'inventory', title: '3. Technical Cookie Inventory' },
    { id: 'third-party', title: '4. Third-Party Cookies (Stripe)' },
    { id: 'control', title: '5. Managing Browser Preferences' },
    { id: 'legal', title: '6. Legal Compliance & Updates' },
  ];

  return (
    <LegalDocumentLayout
      title="Cookie Policy"
      documentType="COOKIE DISCLOSURE & EPRIVACY"
      lastUpdated="November 5, 2026"
      sections={sections}
    >
      {/* 1. Zero Tracking */}
      <section id="overview" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5 flex items-center gap-2">
          <span>1. Zero Tracking on Redirects</span>
        </h2>
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-emerald-900 dark:text-emerald-200 space-y-1">
          <div className="flex items-center gap-2 font-semibold text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Redirect Traffic is 100% Cookie-Free</span>
          </div>
          <p className="text-xs leading-relaxed text-emerald-950/80 dark:text-emerald-200/80">
            When visitors click short links routed through Relaymark (e.g. <code className="font-mono text-[11px]">rl.is/*</code> or custom domains), our Anycast edge servers return an HTTP 301/307 redirect immediately. Relaymark does <strong>not</strong> inject tracking pixels, advertising beacons, or third-party cookies into redirection hops.
          </p>
        </div>
        <p>
          We believe link infrastructure should be transparent, swift, and respectful of end-user privacy. No behavioral cross-site tracking or profiling occurs during link resolution.
        </p>
      </section>

      {/* 2. Dashboard Storage */}
      <section id="dashboard-cookies" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          2. Dashboard & Session Storage
        </h2>
        <p>
          Cookies and local browser storage (<code className="font-mono text-[11px]">localStorage</code>) are strictly utilized on the developer console and marketing web application (<code className="font-mono text-[11px]">relaymark.dev</code>) for essential functional purposes:
        </p>
        <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400">
          <li><strong>Authentication & Security:</strong> Maintaining cryptographically signed session tokens and preventing Cross-Site Request Forgery (CSRF).</li>
          <li><strong>UI State & Preferences:</strong> Preserving your visual theme preference (<code className="font-mono text-[11px]">dark</code> / <code className="font-mono text-[11px]">light</code>) and currently selected workspace identifier.</li>
        </ul>
      </section>

      {/* 3. Inventory Table */}
      <section id="inventory" className="space-y-4 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          3. Technical Cookie & Storage Inventory
        </h2>
        <p className="text-xs text-slate-500">
          Below is a comprehensive list of all first-party and second-party cookies used on the Relaymark web application:
        </p>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Identifier</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-mono text-xs font-semibold">rl_session</TableCell>
              <TableCell>Relaymark</TableCell>
              <TableCell><Badge variant="primary" size="sm">Strictly Necessary</Badge></TableCell>
              <TableCell>Maintains authenticated developer session state</TableCell>
              <TableCell className="font-mono text-[11px]">Session (or 30d)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs font-semibold">rl_csrf_token</TableCell>
              <TableCell>Relaymark</TableCell>
              <TableCell><Badge variant="primary" size="sm">Strictly Necessary</Badge></TableCell>
              <TableCell>Cryptographic token protecting forms against CSRF attacks</TableCell>
              <TableCell className="font-mono text-[11px]">Session</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs font-semibold">relaymark_theme</TableCell>
              <TableCell>Relaymark (localStorage)</TableCell>
              <TableCell><Badge variant="secondary" size="sm">Preference</Badge></TableCell>
              <TableCell>Stores light/dark visual theme choice</TableCell>
              <TableCell className="font-mono text-[11px]">Persistent (1 year)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs font-semibold">rl_active_ws</TableCell>
              <TableCell>Relaymark (localStorage)</TableCell>
              <TableCell><Badge variant="secondary" size="sm">Preference</Badge></TableCell>
              <TableCell>Remembers the last active workspace switcher selection</TableCell>
              <TableCell className="font-mono text-[11px]">Persistent (1 year)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs font-semibold">__stripe_mid / __stripe_sid</TableCell>
              <TableCell>Stripe, Inc.</TableCell>
              <TableCell><Badge variant="primary" size="sm">Strictly Necessary</Badge></TableCell>
              <TableCell>Fraud prevention and card payment processing security</TableCell>
              <TableCell className="font-mono text-[11px]">1 year / 30 mins</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      {/* 4. Third-Party */}
      <section id="third-party" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          4. Third-Party Cookies (Stripe)
        </h2>
        <p>
          We embed Stripe.js on our billing checkout pages to facilitate secure credit card payments. Stripe sets necessary security tokens to detect fraudulent automated credit card testing and transaction risks.
        </p>
        <p>
          We do not embed third-party advertising cookies, retargeting pixels (such as Meta Pixel or Google Ads Remarketing), or invasive session replay tracking scripts.
        </p>
      </section>

      {/* 5. Managing Preferences */}
      <section id="control" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          5. Managing Browser Preferences & Opt-Out
        </h2>
        <p>
          Because our cookies are strictly necessary for service operation or UI preferences, Relaymark does not require an invasive cookie consent banner under European ePrivacy exemptions for essential functional cookies.
        </p>
        <p>
          You may configure your browser to block all cookies. However, disabling strictly necessary cookies will prevent you from logging into the developer console and managing API keys.
        </p>
      </section>

      {/* 6. Legal Compliance */}
      <section id="legal" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          6. Legal Compliance & Future Changes
        </h2>
        <p>
          Should Relaymark introduce non-essential analytics or telemetry cookies in the future, we will deploy an explicit granular opt-in consent mechanism prior to cookie placement.
        </p>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 font-mono text-[11px] text-slate-600 dark:text-slate-400">
          [PLACEHOLDER: Legal counsel confirmation on local ePrivacy Directive transposition in target operating jurisdictions]
        </div>
      </section>
    </LegalDocumentLayout>
  );
};
