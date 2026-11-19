import React from 'react';
import { LegalDocumentLayout, TocSection } from './LegalDocumentLayout';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../design-system/Table';
import { Badge } from '../../design-system/Badge';
import { ExternalLink, ShieldCheck, BellRing } from 'lucide-react';

interface SubprocessorRow {
  vendor: string;
  purpose: string;
  data: string;
  location: string;
  securityUrl?: string;
}

export const SubprocessorsPage: React.FC = () => {
  const sections: TocSection[] = [
    { id: 'overview', title: '1. Third-Party Subprocessor Overview' },
    { id: 'inventory-table', title: '2. Authorized Subprocessors Table' },
    { id: 'vetting', title: '3. Security Vetting & Due Diligence' },
    { id: 'objection', title: '4. 30-Day Notice & Objection Rights' },
    { id: 'updates', title: '5. Subprocessor Notification RSS/Email' },
  ];

  const subprocessors: SubprocessorRow[] = [
    {
      vendor: 'Supabase',
      purpose: 'Managed PostgreSQL database hosting, authentication token storage, and row-level security enforcement',
      data: 'Customer workspace credentials, user profile records, hashed passwords, API key metadata',
      location: 'United States & European Union (Frankfurt / Dublin)',
      securityUrl: 'https://supabase.com/security',
    },
    {
      vendor: 'Vercel',
      purpose: 'Global Anycast CDN edge network, static asset delivery, and frontend routing execution',
      data: 'Encrypted request headers, ephemeral IP addresses for TLS termination, routing paths',
      location: 'Global Edge Anycast Network (Global POPs)',
      securityUrl: 'https://vercel.com/security',
    },
    {
      vendor: 'Render',
      purpose: 'Background queue processing daemons, webhook dispatching engine, and cron telemetry workers',
      data: 'Customer webhook target URLs, payload dispatch queues, retry telemetry logs',
      location: 'US-East (Ohio) & EU-Central (Frankfurt)',
      securityUrl: 'https://render.com/docs/security',
    },
    {
      vendor: 'Stripe',
      purpose: 'Payment gateway, recurring subscription billing, invoice generation, and credit card compliance (PCI-DSS)',
      data: 'Billing name, business address, credit card token, tax IDs, invoice histories',
      location: 'United States & Global',
      securityUrl: 'https://stripe.com/docs/security',
    },
    {
      vendor: 'Redis',
      purpose: 'Low-latency in-memory cache for sliding window rate limiting and high-speed redirect lookup',
      data: 'Shortlink slug cache mappings, ephemeral rate-limit token counters, click timestamps',
      location: 'Multi-region (US, EU, APAC)',
      securityUrl: 'https://redis.io/legal/privacy-policy/',
    },
    {
      vendor: 'Grafana',
      purpose: 'Aggregated platform metrics monitoring, uptime monitoring, and distributed tracing visualization',
      data: 'Anonymized system performance metrics, HTTP status code distributions, error traces',
      location: 'European Union & United States',
      securityUrl: 'https://grafana.com/legal/security/',
    },
  ];

  return (
    <LegalDocumentLayout
      title="Third-Party Subprocessors"
      documentType="SUBPROCESSOR REGISTRY & DPA ANNEX"
      lastUpdated="November 5, 2026"
      sections={sections}
    >
      {/* 1. Overview */}
      <section id="overview" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          1. Third-Party Subprocessor Overview
        </h2>
        <p>
          Relaymark engages vetted third-party service providers (&ldquo;Subprocessors&rdquo;) to deliver reliable Anycast routing, database persistence, secure billing, and system monitoring.
        </p>
        <p>
          Pursuant to our <a href="/legal/dpa" className="text-blue-600 dark:text-blue-400 underline">Data Processing Agreement (DPA)</a>, each subprocessor is evaluated through rigorous security due diligence and is bound by data protection obligations no less stringent than those established between Relaymark and our Customers.
        </p>
      </section>

      {/* 2. Subprocessors Table */}
      <section id="inventory-table" className="space-y-4 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-1.5">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
            2. Authorized Subprocessors Table
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            Active Subprocessors: 6
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400">
          The following list enumerates the third-party infrastructure vendors currently authorized to process data on behalf of Relaymark:
        </p>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Vendor</TableHead>
              <TableHead className="w-64">Purpose</TableHead>
              <TableHead>Data Processed</TableHead>
              <TableHead className="w-48">Location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subprocessors.map((sub) => (
              <TableRow key={sub.vendor}>
                <TableCell className="font-semibold text-slate-900 dark:text-slate-100 align-top">
                  <div className="flex items-center gap-1.5">
                    <span>{sub.vendor}</span>
                    {sub.securityUrl && (
                      <a
                        href={sub.securityUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={`${sub.vendor} Security & Compliance`}
                        className="text-slate-400 hover:text-blue-500 inline-flex items-center"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-slate-700 dark:text-slate-300 align-top leading-relaxed">
                  {sub.purpose}
                </TableCell>
                <TableCell className="text-xs text-slate-600 dark:text-slate-400 align-top leading-relaxed">
                  {sub.data}
                </TableCell>
                <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400 align-top">
                  <Badge variant="outline" size="sm" className="font-normal font-sans">
                    {sub.location}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 font-mono text-[11px] text-slate-600 dark:text-slate-400">
          [PLACEHOLDER: Subprocessor corporate registration entities and DPA executed date audit tags]
        </div>
      </section>

      {/* 3. Vetting */}
      <section id="vetting" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>3. Security Vetting & Due Diligence</span>
        </h2>
        <p>
          Before engaging any new infrastructure subprocessor, Relaymark requires:
        </p>
        <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400">
          <li>Verification of independent security audits (SOC 2 Type II, ISO 27001, or equivalent certifications).</li>
          <li>Execution of a binding Data Processing Agreement incorporating Standard Contractual Clauses (SCCs).</li>
          <li>Review of encryption standards for data in transit (TLS 1.2+) and data at rest (AES-256).</li>
          <li>Assessment of breach notification protocols guaranteeing sub-24h notification to Relaymark.</li>
        </ul>
      </section>

      {/* 4. Objection */}
      <section id="objection" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          4. 30-Day Notice & Objection Rights
        </h2>
        <p>
          In accordance with GDPR Article 28(2), Relaymark provides at least <strong>thirty (30) days prior notice</strong> before adding or replacing any subprocessor.
        </p>
        <p>
          Customers may object in writing to the appointment of a new subprocessor on documented data protection grounds by contacting <span className="font-mono text-blue-600 dark:text-blue-400">privacy@relaymark.dev</span>. If an amicable resolution cannot be reached, Customer may terminate the affected workspace without penalty.
        </p>
      </section>

      {/* 5. Notifications */}
      <section id="updates" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5 flex items-center gap-2">
          <BellRing className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>5. Subprocessor Notification Subscription</span>
        </h2>
        <p>
          Workspace administrators can subscribe to receive automatic email notifications whenever this subprocessor list is amended:
        </p>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Security & Subprocessor Change Advisory
            </p>
            <p className="text-[11px] text-slate-500">
              Receive updates 30 days prior to any infrastructure changes.
            </p>
          </div>
          <span className="text-xs font-mono bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900">
            security-subscribe@relaymark.dev
          </span>
        </div>
      </section>
    </LegalDocumentLayout>
  );
};
