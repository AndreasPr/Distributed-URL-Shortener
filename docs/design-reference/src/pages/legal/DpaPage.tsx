import React from 'react';
import { LegalDocumentLayout, TocSection } from './LegalDocumentLayout';
import { Link } from 'react-router-dom';

export const DpaPage: React.FC = () => {
  const sections: TocSection[] = [
    { id: 'definitions', title: '1. Definitions & Framework (GDPR Art. 28)' },
    { id: 'roles', title: '2. Controller & Processor Designations' },
    { id: 'scope', title: '3. Scope, Nature & Purpose of Processing' },
    { id: 'obligations', title: '4. Processor Obligations & Instructions' },
    { id: 'subprocessors', title: '5. Subprocessors & Advance Notice' },
    { id: 'security-toms', title: '6. Technical & Organizational Measures (TOMs)' },
    { id: 'breach', title: '7. Personal Data Breach Notification (48h)' },
    { id: 'audits', title: '8. Audits & Inspections' },
    { id: 'transfers', title: '9. International Data Transfers & SCCs' },
    { id: 'termination', title: '10. Deletion & Return of Personal Data' },
  ];

  return (
    <LegalDocumentLayout
      title="Data Processing Agreement (DPA)"
      documentType="GDPR ARTICLE 28 COMPLIANCE"
      lastUpdated="November 5, 2026"
      sections={sections}
    >
      {/* 1. Definitions */}
      <section id="definitions" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          1. Definitions & Framework (GDPR Article 28)
        </h2>
        <p>
          This Data Processing Agreement (&ldquo;DPA&rdquo;) supplements the Relaymark <Link to="/legal/terms" className="text-blue-600 dark:text-blue-400 underline">Terms of Service</Link> between Customer (&ldquo;Controller&rdquo;) and Relaymark (&ldquo;Processor&rdquo;).
        </p>
        <p>
          Terms such as &ldquo;Personal Data&rdquo;, &ldquo;Processing&rdquo;, &ldquo;Data Subject&rdquo;, &ldquo;Controller&rdquo;, and &ldquo;Processor&rdquo; shall have the meanings ascribed to them under Regulation (EU) 2016/679 (&ldquo;GDPR&rdquo;) and equivalent UK Data Protection laws.
        </p>
      </section>

      {/* 2. Roles */}
      <section id="roles" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          2. Controller & Processor Designations
        </h2>
        <p>
          Regarding any Personal Data contained within end-user redirection traffic, request headers, or autonomous agent tool invocations submitted by Customer to the Service:
        </p>
        <ul className="list-disc list-inside space-y-1 pl-2 text-slate-600 dark:text-slate-400">
          <li><strong>Customer is the Data Controller</strong> determine the purposes, target destinations, and legitimate basis for collecting end-user traffic.</li>
          <li><strong>Relaymark is the Data Processor</strong> processing traffic strictly on behalf of and under the documented instructions of the Customer.</li>
        </ul>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 font-mono text-[11px] text-slate-600 dark:text-slate-400">
          [PLACEHOLDER: Customer corporate identity, legal entity designation, and EU/UK Article 27 representative]
        </div>
      </section>

      {/* 3. Scope */}
      <section id="scope" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          3. Scope, Nature & Purpose of Processing
        </h2>
        <div className="space-y-2 text-xs">
          <p><strong>Subject Matter:</strong> Provision of programmatic link shortening, HTTP Anycast redirection, aggregated click analytics, and webhook dispatching.</p>
          <p><strong>Duration of Processing:</strong> For the duration of the Customer subscription until account deletion.</p>
          <p><strong>Categories of Data Subjects:</strong> End visitors clicking shortened URLs; Customer software developers and administrators configuring workspace resources.</p>
          <p><strong>Types of Personal Data:</strong> Truncated IP addresses, User-Agent strings, referer headers, timestamp of click event, and coarse geo-coordinates.</p>
        </div>
      </section>

      {/* 4. Obligations */}
      <section id="obligations" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          4. Processor Obligations & Instructions
        </h2>
        <p>
          Relaymark covenants and agrees that it shall:
        </p>
        <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400">
          <li>Process Personal Data solely on documented instructions from Customer, including regarding transfers of Personal Data to third countries.</li>
          <li>Ensure that all personnel authorized to process Customer Personal Data have committed themselves to strict confidentiality agreements.</li>
          <li>Promptly notify Controller if, in Processor&rsquo;s opinion, an instruction infringes GDPR or other applicable data protection provisions.</li>
          <li>Assist Controller in responding to requests from Data Subjects exercising their Chapter III GDPR rights (access, rectification, erasure).</li>
        </ul>
      </section>

      {/* 5. Subprocessors */}
      <section id="subprocessors" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          5. Subprocessors & Advance Notice
        </h2>
        <p>
          Controller grants Processor general written authorization to engage third-party subprocessors for hosting, caching, and infrastructure operations. A complete list of authorized subprocessors is published at <Link to="/legal/subprocessors" className="text-blue-600 dark:text-blue-400 underline font-medium">/legal/subprocessors</Link>.
        </p>
        <p>
          Processor shall provide at least thirty (30) days prior electronic notice before engaging a new subprocessor. Controller may object to new subprocessors on reasonable data protection grounds.
        </p>
      </section>

      {/* 6. TOMs */}
      <section id="security-toms" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          6. Technical & Organizational Measures (TOMs)
        </h2>
        <p>
          Processor maintains state-of-the-art security measures pursuant to Article 32 GDPR, including:
        </p>
        <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400">
          <li><strong>Pseudonymization & Truncation:</strong> Immediate IP truncation at edge ingress prior to database persistence.</li>
          <li><strong>Encryption:</strong> TLS 1.3 encryption in transit for all redirects and API calls; AES-256 encryption at rest for customer databases.</li>
          <li><strong>Resilience & Redundancy:</strong> Distributed Anycast DNS architecture and automated failover multi-cloud nodes.</li>
          <li><strong>Access Governance:</strong> Role-based access control (RBAC), multi-factor authentication (MFA), and audit logging.</li>
        </ul>
      </section>

      {/* 7. Breach Notification */}
      <section id="breach" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          7. Personal Data Breach Notification (48 Hours)
        </h2>
        <p>
          Processor shall notify Controller without undue delay and, where feasible, not later than <strong>forty-eight (48) hours</strong> after becoming aware of a confirmed Personal Data Breach affecting Customer Personal Data.
        </p>
        <p>
          The notification shall describe the nature of the breach, estimated affected records, likely consequences, and remediation actions taken.
        </p>
      </section>

      {/* 8. Audits */}
      <section id="audits" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          8. Audits & Inspections
        </h2>
        <p>
          Processor shall make available to Controller all information reasonably necessary to demonstrate compliance with Article 28 GDPR and allow for and contribute to audits conducted by Controller or an independent auditor.
        </p>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 font-mono text-[11px] text-slate-600 dark:text-slate-400">
          [PLACEHOLDER: Frequency limitations on customer physical on-site audits, security report sharing (SOC 2 / ISO 27001), and cost allocation]
        </div>
      </section>

      {/* 9. Transfers */}
      <section id="transfers" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          9. International Data Transfers & Standard Contractual Clauses (SCCs)
        </h2>
        <p>
          To the extent Customer transfers Personal Data originating in the European Economic Area (EEA), Switzerland, or the United Kingdom to countries without an adequacy decision, the European Commission&rsquo;s Standard Contractual Clauses (Module 2: Controller-to-Processor) are hereby incorporated by reference.
        </p>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 font-mono text-[11px] text-slate-600 dark:text-slate-400">
          [PLACEHOLDER: Annex I and Annex II technical schedules specifying competent supervisory authority and transfer details]
        </div>
      </section>

      {/* 10. Termination */}
      <section id="termination" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          10. Deletion & Return of Personal Data
        </h2>
        <p>
          Upon termination of the Services or written request by Customer, Processor shall, at Controller&rsquo;s choice, delete or securely return all Customer Personal Data within thirty (30) days, unless applicable Union or Member State law requires continued archival storage.
        </p>
      </section>
    </LegalDocumentLayout>
  );
};
