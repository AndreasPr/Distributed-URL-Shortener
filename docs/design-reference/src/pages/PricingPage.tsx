import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, AlertTriangle, ChevronDown, ArrowRight, User, Terminal } from 'lucide-react';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../design-system/Table';
import { PricingCard } from '../design-system/PricingCard';
import { mockBillingPlans, mockFaqs } from '../mock';
import { useToast } from '../context/ToastContext';

export const PricingPage: React.FC = () => {
  const { toast } = useToast();
  const [isAnnual, setIsAnnual] = useState(false);
  const [planCategory, setPlanCategory] = useState<'personal' | 'developer'>('personal');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  // Filter plans based on the toggle:
  // Personal shows: Free, Pro, Team
  // Developer shows: Free, Developer, Team
  const visiblePlans = mockBillingPlans.filter((p) => {
    if (planCategory === 'personal') {
      return p.category === 'personal' || p.category === 'both';
    } else {
      return p.category === 'developer' || p.category === 'both';
    }
  });

  // Comparison matrix rows
  const comparisonRows = [
    { feature: 'New links created per month', free: '25 links', pro: '500 links', team: '10,000 links', dev: '5,000 links' },
    { feature: 'Dynamic QR codes', free: '5 codes', pro: 'Unlimited', team: 'Unlimited', dev: 'Unlimited' },
    { feature: 'Link-in-Bio profiles', free: '1 page', pro: '5 pages', team: 'Unlimited', dev: '3 pages' },
    { feature: 'Analytics data retention', free: '30 days', pro: '1 year', team: 'Unlimited', dev: '1 year' },
    { feature: 'Custom back-halves (slugs)', free: false, pro: true, team: true, dev: true },
    { feature: 'UTM Campaign builder', free: false, pro: true, team: true, dev: true },
    { feature: 'Bulk CSV import', free: false, pro: true, team: true, dev: true },
    { feature: 'Workspace member seats', free: '1 seat', pro: '1 seat', team: '5 seats', dev: '2 seats' },
    { feature: 'Audit log & RBAC roles', free: false, pro: false, team: true, dev: false },
    { feature: 'API Keys & REST endpoints', free: '1 key', pro: '2 keys', team: 'Unlimited', dev: '10 keys' },
    { feature: 'Model Context Protocol (MCP)', free: false, pro: false, team: true, dev: true },
    { feature: 'Real-time Webhook streaming', free: false, pro: false, team: true, dev: true },
    { feature: 'API Gateway rate limit', free: '60 req/min', pro: '300 req/min', team: '5,000 req/min', dev: '5,000 req/min' },
    { feature: 'Support SLA', free: 'Community', pro: 'Standard email', team: 'Priority (< 4h)', dev: 'Developer chat' },
  ];

  return (
    <div className="w-full space-y-16 py-12 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* 1. Header & Toggles */}
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <Badge variant="agent" size="sm">
          CLEAR & HONEST PRICING
        </Badge>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Plans for individuals, businesses, & developers
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          No hidden usage penalties or surprise overages. Choose the right plan for your link volume and scale as you grow.
        </p>

        {/* Focus Selector: Personal / Creator vs Developer */}
        <div className="pt-2 flex items-center justify-center">
          <div className="inline-flex p-1 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5">
            <button
              type="button"
              onClick={() => setPlanCategory('personal')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                planCategory === 'personal'
                  ? 'bg-white dark:bg-[#0f111a] text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Personal & Business</span>
            </button>
            <button
              type="button"
              onClick={() => setPlanCategory('developer')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                planCategory === 'developer'
                  ? 'bg-white dark:bg-[#0f111a] text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Developer & AI Agents</span>
            </button>
          </div>
        </div>

        {/* Monthly / Annual Billing Toggle */}
        <div className="pt-1 flex items-center justify-center gap-3">
          <span className={`text-xs font-medium ${!isAnnual ? 'text-slate-900 dark:text-slate-100 font-bold' : 'text-slate-500'}`}>
            Monthly
          </span>

          <button
            type="button"
            role="switch"
            aria-checked={isAnnual}
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
              isAnnual ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                isAnnual ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>

          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-medium ${isAnnual ? 'text-slate-900 dark:text-slate-100 font-bold' : 'text-slate-500'}`}>
              Annual
            </span>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-1.5 py-0.5 rounded">
              Save 20%
            </span>
          </div>
        </div>
      </div>

      {/* 2. Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {visiblePlans.map((plan) => {
          const price = isAnnual ? plan.annualPriceUsd : plan.monthlyPriceUsd;
          return (
            <PricingCard
              key={plan.id}
              name={plan.name}
              tagline={plan.tagline}
              audience={plan.audience}
              price={price}
              interval={isAnnual ? 'mo (billed annually)' : 'month'}
              features={plan.features}
              isPopular={plan.isPopular}
              ctaText={plan.monthlyPriceUsd === 0 ? 'Start Free' : 'Choose Plan'}
              onSelect={() => {
                toast({
                  title: `Selected ${plan.name} Plan`,
                  description: `Proceeding to checkout with ${isAnnual ? 'annual' : 'monthly'} billing.`,
                  variant: 'info',
                });
              }}
            />
          );
        })}
      </div>

      {/* 3. Explicit "Limits are enforced" Note */}
      <div className="p-4 rounded-lg border border-amber-300 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200 max-w-3xl mx-auto">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-xs text-amber-950 dark:text-amber-100">
            Important Note on Limits: Quotas are enforced at the API & dashboard layer
          </p>
          <p className="leading-relaxed text-[11px] text-amber-900 dark:text-amber-300">
            To guarantee sub-12ms Anycast edge routing for all customers, link creation and redirect rate limits are enforced with sliding window counters. If your workspace reaches its monthly link creation quota, you will be prompted to upgrade. Your existing live links never stop resolving.
          </p>
        </div>
      </div>

      {/* 4. Complete Comparison Table */}
      <div className="space-y-4">
        <div className="text-center max-w-lg mx-auto">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Side-by-Side Feature Comparison
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Review every feature, limit, and architectural capability across our plans.
          </p>
        </div>

        <Card className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/4">Feature or Capability</TableHead>
                <TableHead className="text-center">Free ($0)</TableHead>
                <TableHead className="text-center font-bold text-blue-600 dark:text-blue-400">
                  Pro ($9/mo)
                </TableHead>
                <TableHead className="text-center font-bold text-indigo-600 dark:text-indigo-400">
                  Developer ($19/mo)
                </TableHead>
                <TableHead className="text-center">Team ($29/mo)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonRows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                    {row.feature}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {typeof row.free === 'boolean' ? (
                      row.free ? (
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                      )
                    ) : (
                      row.free
                    )}
                  </TableCell>
                  <TableCell className="text-center font-mono font-semibold text-blue-900 dark:text-blue-200">
                    {typeof row.pro === 'boolean' ? (
                      row.pro ? (
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                      )
                    ) : (
                      row.pro
                    )}
                  </TableCell>
                  <TableCell className="text-center font-mono font-semibold text-indigo-900 dark:text-indigo-200">
                    {typeof row.dev === 'boolean' ? (
                      row.dev ? (
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                      )
                    ) : (
                      row.dev
                    )}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {typeof row.team === 'boolean' ? (
                      row.team ? (
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                      )
                    ) : (
                      row.team
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* 5. Pricing FAQ */}
      <div className="max-w-3xl mx-auto space-y-6 pt-4">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Pricing & Quota FAQs
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Answers to common questions regarding billing cycles, upgrades, and limits.
          </p>
        </div>

        <div className="space-y-3">
          {mockFaqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] overflow-hidden transition-colors"
            >
              <button
                onClick={() => toggleFaq(idx)}
                aria-expanded={openFaqIndex === idx}
                className="w-full flex items-center justify-between p-4 text-left font-medium text-xs sm:text-sm text-slate-900 dark:text-slate-100 cursor-pointer select-none"
              >
                <span>{faq.question}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
                    openFaqIndex === idx ? 'rotate-180 text-blue-600' : ''
                  }`}
                />
              </button>

              {openFaqIndex === idx && (
                <div className="px-4 pb-4 pt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-white/5 animate-in fade-in">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
