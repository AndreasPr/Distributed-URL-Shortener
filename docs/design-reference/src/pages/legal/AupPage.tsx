import React from 'react';
import { LegalDocumentLayout, TocSection } from './LegalDocumentLayout';
import { ShieldAlert, AlertTriangle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AupPage: React.FC = () => {
  const sections: TocSection[] = [
    { id: 'purpose', title: '1. Purpose & Scope of Policy' },
    { id: 'prohibited', title: '2. Strictly Prohibited Content & Destinations' },
    { id: 'agentic-abuse', title: '3. Autonomous AI Agents & MCP Discipline' },
    { id: 'automated-scans', title: '4. Automated Scanning & Threat Feeds' },
    { id: 'enforcement', title: '5. Immediate Takedown & Suspension Rights' },
    { id: 'reporting', title: '6. Abuse Reporting & Takedown SLA' },
    { id: 'indemnity', title: '7. Customer Responsibility & Indemnification' },
  ];

  return (
    <LegalDocumentLayout
      title="Acceptable Use Policy (AUP)"
      documentType="ACCEPTABLE USE & ABUSE POLICY"
      lastUpdated="November 5, 2026"
      sections={sections}
    >
      {/* 1. Purpose & Scope */}
      <section id="purpose" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5 flex items-center gap-2">
          <span>1. Purpose & Scope of Policy</span>
        </h2>
        <p>
          This Acceptable Use Policy (&ldquo;AUP&rdquo;) governs all access to and use of Relaymark&rsquo;s redirection infrastructure, REST APIs, custom domain routing, and Model Context Protocol (MCP) servers.
        </p>
        <p>
          Relaymark is engineered strictly for legitimate developer infrastructure, transactional notifications, application deep-linking, marketing attribution, and authorized autonomous agent workflows. We enforce a zero-tolerance policy against malicious or deceptive redirection.
        </p>
      </section>

      {/* 2. Prohibited Content */}
      <section id="prohibited" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          2. Strictly Prohibited Content & Destinations
        </h2>
        <p>
          You may not create, programmatically generate, or route short links that point to, redirect toward, or facilitate:
        </p>
        <ul className="list-disc list-inside space-y-2 pl-2 text-slate-600 dark:text-slate-400">
          <li>
            <strong className="text-slate-800 dark:text-slate-200">Phishing & Credential Theft:</strong> Fake login portals, deceptive brand impersonation, MFA bypass interceptors, or bank login proxies.
          </li>
          <li>
            <strong className="text-slate-800 dark:text-slate-200">Malware & Exploit Payloads:</strong> Direct executable downloads (<code className="font-mono text-[11px]">.exe</code>, <code className="font-mono text-[11px]">.apk</code>, <code className="font-mono text-[11px]">.scr</code>, <code className="font-mono text-[11px]">.iso</code>), ransomware droppers, or browser exploit kits.
          </li>
          <li>
            <strong className="text-slate-800 dark:text-slate-200">Spam & Unsolicited Bulk Messaging:</strong> Unsolicited SMS blasts (smishing), email spam campaigns, social media bot swarms, or comment spam.
          </li>
          <li>
            <strong className="text-slate-800 dark:text-slate-200">Command & Control (C2) Infrastructure:</strong> Botnet beaconing, DNS tunneling, cryptocurrency mining scripts, or DDoS coordination.
          </li>
          <li>
            <strong className="text-slate-800 dark:text-slate-200">Illegal Goods & Unlawful Content:</strong> CSAM/CSAE (immediately reported to NCMEC and Europol), illegal narcotics marketplaces, unlicensed weapon brokers, or unauthorized copyright infringement streams.
          </li>
          <li>
            <strong className="text-slate-800 dark:text-slate-200">Cloaking & Deceptive Redirects:</strong> Serving clean landing pages to security crawlers while routing organic visitors to malicious payloads (conditional IP cloaking).
          </li>
        </ul>

        <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 font-mono text-[11px] text-slate-600 dark:text-slate-400">
          [PLACEHOLDER: Legal counsel statutory definitions of adult content restrictions and regional gambling licensing rules]
        </div>
      </section>

      {/* 3. Autonomous AI Agents */}
      <section id="agentic-abuse" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          3. Autonomous AI Agents & Model Context Protocol (MCP) Discipline
        </h2>
        <p>
          Developers deploying autonomous agents (via Claude Desktop, Cursor, LangChain, AutoGen, or custom agent swarms) must enforce destination sanitization before delegating link generation to Relaymark MCP tools:
        </p>
        <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400">
          <li>Agents must not generate links to unverified scraped domains without prior validation.</li>
          <li>Agents must not execute infinite link-shortening recursion (e.g. shortening a Relaymark link through another Relaymark link).</li>
          <li>Workspaces utilizing MCP keys must maintain agent prompt telemetry to trace origin instructions in the event of an abuse investigation.</li>
        </ul>
      </section>

      {/* 4. Automated Scanning */}
      <section id="automated-scans" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          4. Automated Scanning & Threat Feeds
        </h2>
        <p>
          All link creation requests via API, dashboard, or MCP are evaluated in real time against public and proprietary threat intelligence databases, including:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a]">
            <p className="font-semibold text-xs text-slate-900 dark:text-slate-100">Google Safe Browsing</p>
            <p className="text-[11px] text-slate-500">Real-time hash lookups for known malware & phishing sites.</p>
          </div>
          <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a]">
            <p className="font-semibold text-xs text-slate-900 dark:text-slate-100">Spamhaus DBL</p>
            <p className="text-[11px] text-slate-500">Domain Block List verification for high-risk spam origins.</p>
          </div>
          <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a]">
            <p className="font-semibold text-xs text-slate-900 dark:text-slate-100">Heuristic Probers</p>
            <p className="text-[11px] text-slate-500">Periodic asynchronous headless checks of destination targets.</p>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Target URLs identified as malicious are rejected immediately with HTTP 422 Unprocessable Content.
        </p>
      </section>

      {/* 5. Enforcement & Takedown */}
      <section id="enforcement" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          5. Immediate Takedown & Suspension Rights
        </h2>
        <p>
          Upon detecting an AUP violation, Relaymark reserves the right to take any of the following technical measures without prior notice:
        </p>
        <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400">
          <li><strong>Link Blacklisting:</strong> Instant routing redirect to a static security warning page or HTTP 410 Gone across all Anycast edge nodes.</li>
          <li><strong>API Key Revocation:</strong> Immediate invalidation of active Bearer tokens and MCP sessions.</li>
          <li><strong>Domain Quarantine:</strong> Disabling custom domain SSL certificates if mapped to malicious destinations.</li>
          <li><strong>Account Termination:</strong> Permanent workspace ban with forfeiture of unused subscription credits.</li>
        </ul>
      </section>

      {/* 6. Reporting */}
      <section id="reporting" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          6. Abuse Reporting & Takedown SLA
        </h2>
        <p>
          Security researchers, network administrators, and rights holders may report malicious shortlinks through our automated abuse portal at <Link to="/report" className="text-blue-600 dark:text-blue-400 font-medium underline inline-flex items-center gap-0.5">/report <ExternalLink className="w-3 h-3 inline" /></Link> or via email to <span className="font-mono text-blue-600 dark:text-blue-400">abuse@relaymark.dev</span>.
        </p>
        <p>
          Verified phishing and malware reports are triaged and purged automatically within 1 hour across our global Anycast routing table.
        </p>
      </section>

      {/* 7. Indemnity */}
      <section id="indemnity" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          7. Customer Responsibility & Indemnification
        </h2>
        <p>
          You agree to defend, indemnify, and hold harmless Relaymark and its infrastructure partners against any third-party claims, liabilities, damages, or regulatory fines arising directly from URLs shortened or content routed through your workspace or API tokens.
        </p>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 font-mono text-[11px] text-slate-600 dark:text-slate-400">
          [PLACEHOLDER: Legal indemnification procedure, defense counsel control clauses, and cooperation notice requirements]
        </div>
      </section>
    </LegalDocumentLayout>
  );
};
