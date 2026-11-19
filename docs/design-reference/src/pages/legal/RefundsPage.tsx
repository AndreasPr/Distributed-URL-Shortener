import React from 'react';
import { LegalDocumentLayout, TocSection } from './LegalDocumentLayout';
import { Badge } from '../../design-system/Badge';
import { Check, AlertCircle, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const RefundsPage: React.FC = () => {
  const sections: TocSection[] = [
    { id: 'overview', title: '1. Billing Philosophy & Overview' },
    { id: 'cooling-off', title: '2. 14-Day Money-Back Guarantee' },
    { id: 'cancellation', title: '3. Self-Serve Cancellation Mechanics' },
    { id: 'downgrade-impact', title: '4. Impact of Downgrading on Active Links' },
    { id: 'annual-plans', title: '5. Annual Plan Refunds & Pro-Ration' },
    { id: 'ineligible', title: '6. Ineligibility & Abuse Exceptions' },
    { id: 'process', title: '7. How to Request a Refund' },
  ];

  return (
    <LegalDocumentLayout
      title="Refund & Cancellation Policy"
      documentType="BILLING & REFUND TERMS"
      lastUpdated="November 5, 2026"
      sections={sections}
    >
      {/* 1. Overview */}
      <section id="overview" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          1. Billing Philosophy & Overview
        </h2>
        <p>
          Relaymark operates on a transparent, developer-first billing model. We do not use dark patterns, hidden renewal clauses, or friction-heavy cancellation flows.
        </p>
        <p>
          All subscription plans (Pro at $9/month, Team at $29/month, and discounted annual commitments) are billed in advance via Stripe. You can upgrade, downgrade, or cancel your subscription at any time directly through your workspace settings.
        </p>
      </section>

      {/* 2. 14-Day Guarantee */}
      <section id="cooling-off" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5 flex items-center gap-2">
          <span>2. 14-Day Money-Back Guarantee</span>
          <Badge variant="success" size="sm">Standard Guarantee</Badge>
        </h2>
        <p>
          If you upgrade to a paid Relaymark tier (Pro or Team) and determine that our API, edge latency, or MCP capabilities do not meet your technical expectations, you are entitled to a <strong>full 100% refund</strong> within fourteen (14) calendar days of your initial purchase.
        </p>
        <p>
          Simply email <span className="font-mono text-blue-600 dark:text-blue-400">billing@relaymark.dev</span> within the 14-day window. No tedious interrogation or retention pitch is required.
        </p>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 font-mono text-[11px] text-slate-600 dark:text-slate-400">
          [PLACEHOLDER: Statutory EU Consumer Rights Directive cooling-off waiver acknowledgment for digital supply contracts under Art 16(m)]
        </div>
      </section>

      {/* 3. Self-Serve Cancellation */}
      <section id="cancellation" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          3. Self-Serve Cancellation Mechanics
        </h2>
        <p>
          You may cancel your active subscription at any point during your billing cycle:
        </p>
        <ol className="list-decimal list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400">
          <li>Navigate to your workspace <strong>Settings &rarr; Billing</strong>.</li>
          <li>Click <strong>&ldquo;Cancel Subscription&rdquo;</strong> to open the self-serve Stripe customer portal.</li>
          <li>Confirm cancellation. Your subscription will remain fully active with high-tier quotas until the end of your prepaid period.</li>
        </ol>
        <p className="text-xs text-slate-500">
          Once your billing period ends, your workspace gracefully transitions to the Free plan. We never delete your data upon cancellation.
        </p>
      </section>

      {/* 4. Downgrade Impact on Links */}
      <section id="downgrade-impact" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          4. Impact of Downgrading on Active Short Links
        </h2>
        <p>
          A core Relaymark promise is link permanence. If your workspace downgrades from Team (10,000 links/mo) to Free (50 links/mo):
        </p>
        <div className="space-y-2">
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a]">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="text-slate-900 dark:text-slate-100">Existing Links Stay Alive:</strong> All previously created short links continue to redirect and resolve at the edge without interruption.
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a]">
            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="text-slate-900 dark:text-slate-100">Creation Capped to Free Quota:</strong> Programmatic creation of <em>new</em> links will be limited to 50 links per month.
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a]">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="text-slate-900 dark:text-slate-100">Secondary Features Paused:</strong> Webhook queues, custom apex SSL certificates, and excess team seats will pause until resubscription.
            </div>
          </div>
        </div>
      </section>

      {/* 5. Annual Plans */}
      <section id="annual-plans" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          5. Annual Plan Refunds & Pro-Ration
        </h2>
        <p>
          Annual subscriptions receive a 20% discount compared to monthly billing. After the 14-day initial trial window, annual subscriptions are generally non-refundable.
        </p>
        <p>
          However, in cases of extraordinary operational cessation or corporate dissolution, we may at our sole discretion offer pro-rated platform credit or refund calculated on the remaining unused calendar months.
        </p>
      </section>

      {/* 6. Ineligible */}
      <section id="ineligible" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          6. Ineligibility & Abuse Exceptions
        </h2>
        <p>
          Refunds will not be issued under the following circumstances:
        </p>
        <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600 dark:text-slate-400">
          <li>Accounts suspended or terminated for violating our <Link to="/legal/aup" className="text-blue-600 dark:text-blue-400 underline">Acceptable Use Policy</Link> (including phishing, malware distribution, or spam campaigns).</li>
          <li>Chargeback dispute filings made without prior communication with our billing desk.</li>
          <li>Subsequent refund requests for repeated sign-up and cancellation cycles by the same entity.</li>
        </ul>
      </section>

      {/* 7. Process */}
      <section id="process" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-1.5">
          7. How to Request a Refund
        </h2>
        <p>
          To request a refund within your 14-day window:
        </p>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 space-y-2 text-xs">
          <p>
            Email: <a href="mailto:billing@relaymark.dev" className="font-mono text-blue-600 dark:text-blue-400 font-semibold">billing@relaymark.dev</a>
          </p>
          <p>Include your workspace name, owner email address, and Stripe invoice ID (formatted like <code className="font-mono text-[11px]">in_1M...</code>).</p>
          <p>Approved refunds are processed to your original payment method within 5–10 business days.</p>
        </div>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 font-mono text-[11px] text-slate-600 dark:text-slate-400">
          [PLACEHOLDER: Legal counsel statutory refund policy compliance by national jurisdiction (UK, Australia, Japan)]
        </div>
      </section>
    </LegalDocumentLayout>
  );
};
