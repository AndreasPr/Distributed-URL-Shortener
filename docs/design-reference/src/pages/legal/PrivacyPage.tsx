import React from 'react';
import { LegalDocumentLayout, TocSection } from './LegalDocumentLayout';

export const PrivacyPage: React.FC = () => {
  const sections: TocSection[] = [
    { id: 'controller', title: '1. Data Controller Identification' },
    { id: 'collection', title: '2. Information We Collect' },
    { id: 'legal-bases', title: '3. Legal Bases for Processing (GDPR)' },
    { id: 'ip-privacy', title: '4. IP Address Truncation & GeoIP' },
    { id: 'subprocessors', title: '5. Subprocessors & Third-Party Sharing' },
    { id: 'transfers', title: '6. International Data Transfers' },
    { id: 'retention', title: '7. Data Retention Schedules' },
    { id: 'user-rights', title: '8. Data Subject Rights (GDPR & CCPA)' },
    { id: 'security', title: '9. Technical & Organizational Measures' },
    { id: 'contact', title: '10. DPO & Supervisory Authorities' },
  ];

  return (
    <LegalDocumentLayout
      title="Privacy Policy"
      documentType="DATA PRIVACY & GDPR"
      lastUpdated="November 5, 2026"
      sections={sections}
    >
      <section id="controller" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          1. Data Controller Identification
        </h2>
        <p>
          Relaymark (&ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) acts as the Data Controller regarding customer account registration data, workspace administrative records, and payment contact details.
        </p>
        <p>
          For end-user redirection traffic routed through Customer shortlinks, Customer acts as the Data Controller and Relaymark acts as the Data Processor, governed by our <a href="/legal/dpa" className="text-blue-600 dark:text-blue-400 underline">Data Processing Agreement (DPA)</a>.
        </p>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 font-mono text-[11px] text-slate-600 dark:text-slate-400">
          [PLACEHOLDER: Legal Controller Name, Official Registration Address, EU Article 27 Representative if applicable]
        </div>
      </section>

      <section id="collection" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          2. Information We Collect
        </h2>
        <p>We strictly limit data collection to technical necessity:</p>
        <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400">
          <li><strong>Workspace Account Data:</strong> Name, business email address, hashed passwords, and authentication credentials.</li>
          <li><strong>Billing Information:</strong> Processed directly by Stripe. We store only billing email, VAT ID, card last4, and expiration date.</li>
          <li><strong>Redirect Telemetry:</strong> HTTP request headers, User-Agent string, referring URL, timestamp, and coarse geographic country/city.</li>
          <li><strong>Autonomous Agent Metadata:</strong> Client identifier tags sent via the Model Context Protocol (MCP) tool calls (e.g. <code className="font-mono text-[11px]">mcp:claude-desktop</code>).</li>
        </ul>
      </section>

      <section id="legal-bases" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          3. Legal Bases for Processing (GDPR Article 6)
        </h2>
        <p>We process personal data under the following GDPR legal bases:</p>
        <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400">
          <li><strong>Performance of a Contract (Art. 6(1)(b)):</strong> To execute link redirects, deliver webhook notifications, and provide customer support.</li>
          <li><strong>Legitimate Interests (Art. 6(1)(f)):</strong> To detect automated bot abuse, mitigate distributed denial of service (DDoS) attacks, and enforce rate limits.</li>
          <li><strong>Legal Obligation (Art. 6(1)(c)):</strong> To maintain financial ledgers and respond to valid law enforcement subpoenas.</li>
        </ul>
      </section>

      <section id="ip-privacy" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          4. IP Address Truncation & Privacy-Preserving GeoIP
        </h2>
        <p>
          We do not store raw, unmodified IPv4 or IPv6 addresses in permanent analytics databases. Incoming IP addresses are processed in volatile memory by the Anycast forwarder to determine rough geolocation (Country, Region, City), after which the IP address is truncated (e.g. <code className="font-mono text-[11px]">192.0.2.0/24</code>) or discarded.
        </p>
        <p>
          We never correlate individual browsing profiles across multiple unrelated customer domains.
        </p>
      </section>

      <section id="subprocessors" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          5. Subprocessors & Third-Party Sharing
        </h2>
        <p>
          We partner with specialized infrastructure vendors for cloud hosting, DNS Anycast routing, database management, and payment processing. A complete and current list of third-party vendors is maintained at <a href="/legal/subprocessors" className="text-blue-600 dark:text-blue-400 underline font-medium">/legal/subprocessors</a>.
        </p>
        <p>
          We do not sell personal data, license user behavior to data brokers, or permit third-party ad networks to track redirect traffic.
        </p>
      </section>

      <section id="transfers" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          6. International Data Transfers
        </h2>
        <p>
          Because Relaymark operates a global Anycast network, redirect telemetry may be processed in edge nodes closest to the user (e.g., in Europe, the United States, Japan, or Singapore).
        </p>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 font-mono text-[11px] text-slate-600 dark:text-slate-400">
          [PLACEHOLDER: Standard Contractual Clauses (SCCs) mechanism and EU-U.S. Data Privacy Framework certification details]
        </div>
      </section>

      <section id="retention" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          7. Data Retention Schedules
        </h2>
        <p>
          Analytics time-series data is retained according to your workspace tier (Free: 7 days, Pro: 30 days, Team: 90 days). After the retention window expires, granular telemetry is permanently purged from Redis Cluster memory.
        </p>
        <p>
          Account records and invoice histories are retained for statutory accounting periods (typically 5 to 7 years depending on jurisdiction).
        </p>
      </section>

      <section id="user-rights" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          8. Data Subject Rights (GDPR & CCPA)
        </h2>
        <p>
          Under European and California privacy statutes, you possess rights to access, rectify, delete, restrict processing, and port your personal data.
        </p>
        <p>
          To exercise any statutory right, submit a request to <span className="font-mono text-blue-600 dark:text-blue-400">privacy@relaymark.dev</span>. We respond to all verified requests within 30 days.
        </p>
      </section>

      <section id="security" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          9. Technical & Organizational Measures
        </h2>
        <p>
          We employ industry-standard technical controls: full TLS 1.3 encryption in transit, Argon2id password hashing, AES-256 database encryption, least-privilege API token scoping, and automated threat probers.
        </p>
      </section>

      <section id="contact" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          10. Data Protection Officer (DPO) & Inquiries
        </h2>
        <p>
          For privacy inquiries, contact our Data Protection Office:
        </p>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 font-mono text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
          <p>Email: privacy@relaymark.dev</p>
          <p>[PLACEHOLDER: DPO Postal Address & Supervisory Authority of Main Establishment (e.g. Hellenic Data Protection Authority - HDPA)]</p>
        </div>
      </section>
    </LegalDocumentLayout>
  );
};
