import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  ExternalLink,
  Download,
  AlertCircle,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../design-system/Card';
import { Button } from '../../../design-system/Button';
import { Badge } from '../../../design-system/Badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../../design-system/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../design-system/Dialog';
import { EmptyState } from '../../../design-system/EmptyState';
import { Skeleton } from '../../../design-system/Skeleton';
import { PageStateSimulator, PageErrorAlert, PageDisplayState } from '../../../components/common/PageStateSimulator';
import { useAppData } from '../../../context/AppDataContext';
import { useWorkspace } from '../../../context/WorkspaceContext';
import { useToast } from '../../../context/ToastContext';
import { mockBillingPlans } from '../../../mock';

export const BillingPage: React.FC = () => {
  const { currentPlanId, changePlan, invoices } = useAppData();
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [pageState, setPageState] = useState<PageDisplayState>('normal');
  const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);

  const activePlan = mockBillingPlans.find((p) => p.id === currentPlanId) || mockBillingPlans[1];

  const handleManageInStripe = () => {
    setIsStripeModalOpen(true);
  };

  const handleConfirmPlanChange = (planId: string) => {
    changePlan(planId);
    toast({
      title: 'Plan Updated',
      description: `Switched workspace tier to ${planId.toUpperCase()}. Quota limits adjusted immediately.`,
      variant: 'success',
    });
  };

  const handleDownloadInvoice = (invNumber: string) => {
    toast({
      title: 'Invoice PDF Downloaded',
      description: `Downloaded tax receipt for ${invNumber}`,
      variant: 'success',
    });
  };

  const clickUsagePercent = Math.min(
    100,
    Math.round((activeWorkspace.monthlyClicks / activeWorkspace.maxMonthlyClicks) * 100)
  );

  const linkUsagePercent = Math.min(
    100,
    Math.round((activeWorkspace.currentLinksCount / activeWorkspace.maxLinks) * 100)
  );

  const displayedInvoices = pageState === 'empty' ? [] : invoices;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Page State Simulator Control */}
      <PageStateSimulator
        currentState={pageState}
        onStateChange={setPageState}
        pageLabel="Billing & Invoices"
      />

      {/* ERROR STATE */}
      {pageState === 'error' && (
        <PageErrorAlert
          title="Stripe Billing Gateway Offline"
          message="Could not synchronize recurring subscription status or load recent invoices from the Stripe Customer API."
          onRetry={() => {
            setPageState('loading');
            setTimeout(() => setPageState('normal'), 600);
          }}
        />
      )}

      {/* 2. Current Plan & Usage Summary Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Overview Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Current Subscription</CardTitle>
                <Badge variant="primary" size="sm">
                  Active
                </Badge>
              </div>
              <CardDescription>
                Billed monthly via Stripe with automated invoice generation
              </CardDescription>
            </div>

            {/* Manage in Stripe Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageInStripe}
              rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
            >
              Manage in Stripe
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20">
              <div>
                <p className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-slate-100">
                  {activePlan.name} Plan
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activePlan.tagline}
                </p>
              </div>

              <div className="text-right">
                <span className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100">
                  ${activePlan.monthlyPriceUsd}
                </span>
                <span className="text-xs text-slate-500 font-mono"> / month</span>
                <p className="text-[11px] text-slate-400">Renews on Dec 1, 2026</p>
              </div>
            </div>

            {/* Dual Usage Meters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Monthly Links Meter */}
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Monthly Links
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {linkUsagePercent}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${linkUsagePercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>{activeWorkspace.currentLinksCount.toLocaleString()} created</span>
                  <span>/ {activeWorkspace.maxLinks.toLocaleString()} quota</span>
                </div>
              </div>

              {/* Monthly Redirect Bandwidth */}
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Monthly Redirects
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {clickUsagePercent}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all"
                    style={{ width: `${clickUsagePercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>{activeWorkspace.monthlyClicks.toLocaleString()} hits</span>
                  <span>/ {activeWorkspace.maxMonthlyClicks.toLocaleString()} quota</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-slate-500" />
              <span>Payment Details</span>
            </CardTitle>
            <CardDescription>Primary payment method on file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center gap-3">
              <div className="w-10 h-7 rounded border border-slate-300 dark:border-white/20 bg-white dark:bg-black/40 flex items-center justify-center font-bold font-mono text-xs text-blue-600">
                VISA
              </div>
              <div className="text-xs">
                <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                  •••• •••• •••• 4242
                </p>
                <p className="text-[11px] text-slate-500">Expires 08/29 · Default</p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-500">
              <div className="flex items-center justify-between">
                <span>Billing Contact:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">andreas@relaymark.dev</span>
              </div>
              <div className="flex items-center justify-between">
                <span>VAT / Tax ID:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">EL998822104</span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageInStripe}
                className="w-full justify-center"
              >
                Update Payment Method
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Change Plan Comparison Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Change Workspace Tier</span>
          </CardTitle>
          <CardDescription>
            Switch seamlessly between plan tiers. Upgrades and quota increases take effect immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockBillingPlans.map((plan) => {
              const isCurrent = plan.id === currentPlanId;

              return (
                <div
                  key={plan.id}
                  className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
                    isCurrent
                      ? 'border-blue-600 bg-blue-50/20 dark:bg-blue-950/20 ring-1 ring-blue-600'
                      : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                        {plan.name}
                      </h3>
                      {isCurrent ? (
                        <Badge variant="primary" size="sm">
                          Current Plan
                        </Badge>
                      ) : plan.isPopular ? (
                        <Badge variant="agent" size="sm">
                          Recommended
                        </Badge>
                      ) : null}
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                        ${plan.monthlyPriceUsd}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">/mo</span>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      {plan.tagline}
                    </p>

                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-white/5">
                      {plan.features.slice(0, 4).map((f) => (
                        <li key={f} className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-5">
                    {isCurrent ? (
                      <Button variant="outline" size="sm" disabled className="w-full justify-center">
                        Active Tier
                      </Button>
                    ) : (
                      <Button
                        variant={plan.id === 'team' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => handleConfirmPlanChange(plan.id)}
                        className="w-full justify-center"
                      >
                        {plan.monthlyPriceUsd > activePlan.monthlyPriceUsd ? 'Upgrade Plan' : 'Downgrade Plan'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 4. Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing History & Tax Invoices</CardTitle>
          <CardDescription>
            Download official PDF receipts and tax statements for your accounting records
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {pageState === 'loading' ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
                  <Skeleton variant="text" width="25%" height={16} />
                  <Skeleton variant="text" width="20%" height={16} />
                  <Skeleton variant="text" width="15%" height={16} />
                </div>
              ))}
            </div>
          ) : displayedInvoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No invoice records found for this workspace.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Billing Date</TableHead>
                  <TableHead>Amount Billed</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {inv.number}
                    </TableCell>

                    <TableCell className="text-xs text-slate-500">
                      {inv.date}
                    </TableCell>

                    <TableCell className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {inv.amount}
                    </TableCell>

                    <TableCell>
                      <Badge variant="success" size="sm">
                        Paid (Auto-Charge)
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadInvoice(inv.number)}
                        leftIcon={<Download className="w-3.5 h-3.5" />}
                        className="text-xs"
                      >
                        Download PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Stripe Customer Portal Modal Placeholder */}
      {isStripeModalOpen && (
        <Dialog isOpen={isStripeModalOpen} onClose={() => setIsStripeModalOpen(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs font-mono">
                  S
                </div>
                <div>
                  <DialogTitle>Stripe Customer Billing Portal</DialogTitle>
                  <DialogDescription>
                    Self-serve billing management and tax profile
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <p>
                In production, clicking <strong>&ldquo;Manage in Stripe&rdquo;</strong> securely redirects the workspace owner to Stripe&rsquo;s self-serve customer portal to:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Add or replace credit cards and SEPA Direct Debit mandates.</li>
                <li>Download historical European VAT invoices and receipts.</li>
                <li>Update corporate billing address and tax ID numbers.</li>
                <li>Cancel or pause subscription without phone calls.</li>
              </ul>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 font-mono text-[11px] text-slate-500">
                [Stripe Customer Session Placeholder · Session ID: cus_relaymark_99fa1]
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsStripeModalOpen(false);
                  toast({
                    title: 'Stripe Portal Simulated',
                    description: 'Customer portal session opened successfully.',
                    variant: 'info',
                  });
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
