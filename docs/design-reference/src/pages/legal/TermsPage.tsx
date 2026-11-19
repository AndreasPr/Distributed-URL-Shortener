import React from 'react';
import { LegalDocumentLayout, TocSection } from './LegalDocumentLayout';
import { Badge } from '../../design-system/Badge';

export const TermsPage: React.FC = () => {
  const sections: TocSection[] = [
    { id: 'acceptance', title: '1. Acceptance of Terms & Parties' },
    { id: 'services', title: '2. Services & Anycast Routing' },
    { id: 'accounts', title: '3. Workspaces & API Key Security' },
    { id: 'agents', title: '4. AI Agents & MCP Responsibilities' },
    { id: 'quotas', title: '5. Enforced Quotas & Fair Usage' },
    { id: 'domains', title: '6. Custom Domains & IP Rights' },
    { id: 'billing', title: '7. Subscriptions, Fees & Taxes' },
    { id: 'termination', title: '8. Suspension & Account Termination' },
    { id: 'warranties', title: '9. Disclaimer of Warranties' },
    { id: 'liability', title: '10. Limitation of Liability' },
    { id: 'governing-law', title: '11. Governing Law & Jurisdiction' },
    { id: 'contact', title: '12. Legal Inquiries & Amendments' },
  ];

  return (
    <LegalDocumentLayout
      title="Terms of Service"
      documentType="TERMS & CONDITIONS"
      lastUpdated="November 5, 2026"
      sections={sections}
    >
      {/* Clause 1 */}
      <section id="acceptance" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          1. Acceptance of Terms & Parties
        </h2>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;Customer&rdquo;, &ldquo;User&rdquo;, or &ldquo;you&rdquo;) and Relaymark (&ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), having its primary registered offices at <span className="font-mono bg-slate-100 dark:bg-white/10 px-1 py-0.5 rounded text-[11px]">[PLACEHOLDER: Legal Entity Name, Company Registration Number, Registered Physical Address]</span>.
        </p>
        <p>
          By creating a workspace, generating an API key, issuing command-line requests, or connecting an autonomous AI agent to the Relaymark Model Context Protocol (MCP) server, you explicitly represent that you have the legal capacity to enter into these Terms and agree to be bound by them in full.
        </p>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 font-mono text-[11px] text-slate-600 dark:text-slate-400">
          [PLACEHOLDER: Corporate signing authority clause and minimum age representation (e.g., 18 years old or legal age of majority)]
        </div>
      </section>

      {/* Clause 2 */}
      <section id="services" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          2. Services & Anycast Routing Architecture
        </h2>
        <p>
          Relaymark provides an API-first programmatic link redirection platform, real-time analytics aggregation, webhook delivery queues, and an MCP server for autonomous agents (collectively, the &ldquo;Service&rdquo;).
        </p>
        <p>
          Redirects are resolved globally across distributed Anycast edge forwarders. We strive to maintain continuous availability and low latency, but we do not guarantee uninterrupted uptime unless explicitly covered by a signed Service Level Agreement (SLA) on an Enterprise plan.
        </p>
      </section>

      {/* Clause 3 */}
      <section id="accounts" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          3. Workspaces, Account Security & API Keys
        </h2>
        <p>
          You are solely responsible for maintaining the confidentiality of your workspace credentials, Bearer API keys (<code className="font-mono text-[11px]">rl_live_...</code>), and webhook secret tokens. Any HTTP request, link generation, or administrative modification executed with your API key will be deemed authorized by you.
        </p>
        <p>
          You must notify us immediately at <span className="font-mono text-blue-600 dark:text-blue-400">security@relaymark.dev</span> upon discovering any unauthorized token disclosure, credential compromise, or security anomaly.
        </p>
      </section>

      {/* Clause 4 */}
      <section id="agents" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          4. Autonomous AI Agents & Model Context Protocol (MCP)
        </h2>
        <p>
          When you configure autonomous LLM agents (including Claude Desktop, Cursor, LangChain, or custom agent swarms) with Relaymark MCP credentials, you are strictly liable for the actions, links generated, destination URLs targeted, and rate consumed by such agents.
        </p>
        <p>
          You represent that your AI agents are configured with appropriate destination safety checks and rate controls. We reserve the right to throttle or block any MCP connection generating abusive or automated recursive loops.
        </p>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 font-mono text-[11px] text-slate-600 dark:text-slate-400">
          [PLACEHOLDER: Legal allocation of liability regarding hallucinated links and agentic third-party web scraping]
        </div>
      </section>

      {/* Clause 5 */}
      <section id="quotas" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          5. Enforced Quotas & Fair Usage
        </h2>
        <p>
          All link creation quotas, redirect volumes, member seat counts, and API rate limits are strictly enforced at the gateway layer using sliding window token buckets. If your workspace exhausts its monthly link quota, additional link creation requests will return HTTP 429 until the beginning of the next billing cycle.
        </p>
        <p>
          Existing active links will continue resolving during quota exhaustion unless suspended for Acceptable Use Policy violations.
        </p>
      </section>

      {/* Clause 6 */}
      <section id="domains" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          6. Custom Domains & Intellectual Property Rights
        </h2>
        <p>
          You retain all right, title, and interest in your custom domain names, destination content, and proprietary brand marks. By attaching a custom apex or subdomain (e.g. <code className="font-mono text-[11px]">go.yourbrand.dev</code>), you grant us a worldwide, non-exclusive license solely to route incoming HTTP traffic and provision automated TLS certificates.
        </p>
        <p>
          Relaymark retains all intellectual property in the software, API schemas, Anycast edge routing daemons, documentation, and the Relaymark brand name and logo.
        </p>
      </section>

      {/* Clause 7 */}
      <section id="billing" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          7. Subscriptions, Fees & Payment Terms
        </h2>
        <p>
          Paid plans (Pro and Team) are billed in advance on a recurring monthly or annual basis. Fees are non-refundable except as explicitly provided in our <a href="/legal/refunds" className="text-blue-600 dark:text-blue-400 underline">Refund Policy</a>.
        </p>
        <p>
          We use Stripe for payment processing. By submitting payment details, you authorize our third-party payment processor to charge the applicable subscription fee.
        </p>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 font-mono text-[11px] text-slate-600 dark:text-slate-400">
          [PLACEHOLDER: Value-Added Tax (VAT) handling clause, reverse charge mechanism for EU B2B entities, and currency specifications]
        </div>
      </section>

      {/* Clause 8 */}
      <section id="termination" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          8. Suspension & Account Termination
        </h2>
        <p>
          We reserve the right to suspend or terminate your API keys, custom domains, or workspace access immediately without prior notice if we detect phishing, malware, spam, intellectual property infringement, or severe breach of our Acceptable Use Policy.
        </p>
        <p>
          You may terminate your account at any time via the workspace settings dashboard or by notifying support.
        </p>
      </section>

      {/* Clause 9 */}
      <section id="warranties" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          9. Disclaimer of Warranties
        </h2>
        <p className="uppercase text-[11px] font-semibold text-slate-500 tracking-wider">
          Standard Statutory Disclaimers
        </p>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SERVICE IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS, WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING WITHOUT LIMITATION WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </p>
      </section>

      {/* Clause 10 */}
      <section id="liability" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          10. Limitation of Liability
        </h2>
        <p>
          IN NO EVENT SHALL RELAYMARK BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH THE SERVICES OR ROUTING ERRORS.
        </p>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 font-mono text-[11px] text-slate-600 dark:text-slate-400">
          [PLACEHOLDER: Cap on total aggregate liability — e.g. amount paid by customer in the preceding 12 months or €100 / $100, whichever is greater]
        </div>
      </section>

      {/* Clause 11 */}
      <section id="governing-law" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          11. Governing Law & Dispute Resolution
        </h2>
        <p>
          These Terms and any dispute arising out of or related to them shall be governed by and construed in accordance with the substantive laws of <span className="font-mono bg-slate-100 dark:bg-white/10 px-1 py-0.5 rounded text-[11px]">[PLACEHOLDER: Legal Jurisdiction — e.g. Greece / European Union or State of Delaware, USA]</span>, without giving effect to any conflict of law principles.
        </p>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 font-mono text-[11px] text-slate-600 dark:text-slate-400">
          [PLACEHOLDER: Specific arbitration tribunal, seat of arbitration, and language of proceedings]
        </div>
      </section>

      {/* Clause 12 */}
      <section id="contact" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          12. Legal Inquiries & Amendments
        </h2>
        <p>
          We may update these Terms from time to time. If an amendment fundamentally alters your legal rights, we will provide at least 30 days notice via email or via a prominent notification in the developer console.
        </p>
        <p>
          For legal notices or questions regarding these terms, contact: <span className="font-mono text-blue-600 dark:text-blue-400 font-medium">legal@relaymark.dev</span>.
        </p>
      </section>
    </LegalDocumentLayout>
  );
};
