import React, { useState } from 'react';
import {
  Gauge,
  Link2,
  Activity,
  Globe2,
  KeyRound,
  Webhook,
  Users,
  Bot,
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../design-system/Card';
import { Button } from '../../../design-system/Button';
import { Badge } from '../../../design-system/Badge';
import { Skeleton } from '../../../design-system/Skeleton';
import { PageStateSimulator, PageErrorAlert, PageDisplayState } from '../../../components/common/PageStateSimulator';
import { useAppData } from '../../../context/AppDataContext';
import { useWorkspace } from '../../../context/WorkspaceContext';

export const UsagePage: React.FC = () => {
  const { links, webhooks, members, apiKeys } = useAppData();
  const { activeWorkspace } = useWorkspace();

  const [pageState, setPageState] = useState<PageDisplayState>('normal');

  const meters = [
    {
      title: 'Monthly Short Links Created',
      icon: <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      used: activeWorkspace.currentLinksCount,
      limit: activeWorkspace.maxLinks,
      unit: 'links',
      description: 'Programmatic short URLs generated in the current monthly billing period.',
      exceededPolicy: 'Returns HTTP 429 Too Many Requests. Existing links continue resolving indefinitely.',
    },
    {
      title: 'Monthly Anycast Redirect Volume',
      icon: <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      used: activeWorkspace.monthlyClicks,
      limit: activeWorkspace.maxMonthlyClicks,
      unit: 'clicks',
      description: 'Edge HTTP 301/307 redirects resolved globally across 320 Anycast PoPs.',
      exceededPolicy: 'Soft cap with 14-day grace notification prior to tier adjustment.',
    },
    {
      title: 'Custom Verified Domains',
      icon: <Globe2 className="w-4 h-4 text-indigo-500" />,
      used: activeWorkspace.customDomains.length,
      limit: activeWorkspace.plan === 'enterprise' ? 10 : 2,
      unit: 'domains',
      description: 'Branded custom apex or subdomains with automated Let’s Encrypt TLS certificates.',
      exceededPolicy: 'Cannot attach additional apex domains without upgrading to Team tier.',
    },
    {
      title: 'Active Team Member Seats',
      icon: <Users className="w-4 h-4 text-amber-500" />,
      used: members.length,
      limit: activeWorkspace.plan === 'developer' ? 1 : 5,
      unit: 'members',
      description: 'Engineers with RBAC credentials and dashboard administration privileges.',
      exceededPolicy: 'Invitations will be blocked until unused seats are freed or tier upgraded.',
    },
    {
      title: 'API Gateway Rate Limits',
      icon: <KeyRound className="w-4 h-4 text-cyan-500" />,
      used: 1240,
      limit: 5000,
      unit: 'req / min',
      description: 'Sliding window token bucket rate limit enforced on REST ingress.',
      exceededPolicy: 'Throttled with standard Retry-After HTTP headers.',
    },
    {
      title: 'Monthly Webhook Event Dispatches',
      icon: <Webhook className="w-4 h-4 text-rose-500" />,
      used: 18450,
      limit: 50000,
      unit: 'events',
      description: 'HMAC-signed HTTP POST payload dispatches to customer webhook receivers.',
      exceededPolicy: 'Events spooled in Redis stream queues for up to 72 hours.',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Page State Simulator Control */}
      <PageStateSimulator
        currentState={pageState}
        onStateChange={setPageState}
        pageLabel="Quota Usage"
      />

      {/* ERROR STATE */}
      {pageState === 'error' && (
        <PageErrorAlert
          title="Quota Telemetry Prober Unavailable"
          message="Could not stream real-time token bucket balances from the Anycast gateway layer."
          onRetry={() => {
            setPageState('loading');
            setTimeout(() => setPageState('normal'), 600);
          }}
        />
      )}

      {/* 2. Top Header & Quota Policy Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Workspace Quota Usage</span>
            <Badge variant="agent" size="sm">
              {activeWorkspace.plan.toUpperCase()} TIER
            </Badge>
          </h2>
          <p className="text-xs text-slate-500">
            Real-time capacity monitors and hard limit enforcement policies for <strong>{activeWorkspace.name}</strong>
          </p>
        </div>

        <Link to="/app/settings/billing">
          <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            Upgrade Quotas
          </Button>
        </Link>
      </div>

      {/* Quota Guarantee Notice */}
      <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 text-xs text-slate-700 dark:text-slate-300 space-y-1">
        <p className="font-semibold text-blue-950 dark:text-blue-100 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>Our Guarantee on Quota Limits</span>
        </p>
        <p className="text-[11px] leading-relaxed text-blue-900/90 dark:text-blue-200/90">
          When link creation limits are exhausted, only <em>new link creation</em> returns HTTP 429. Your existing short links <strong>never stop resolving</strong> and will continue redirecting traffic uninterrupted.
        </p>
      </div>

      {/* 3. Detailed Quota Meters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pageState === 'loading'
          ? [1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="p-5 space-y-3">
                <Skeleton variant="text" width="50%" height={16} />
                <Skeleton variant="rectangular" width="100%" height={10} />
                <Skeleton variant="text" width="70%" height={12} />
              </Card>
            ))
          : meters.map((meter) => {
              const percent = Math.min(100, Math.round((meter.used / meter.limit) * 100));
              const isWarning = percent >= 80;

              return (
                <Card key={meter.title} className="p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      {meter.icon}
                      <span>{meter.title}</span>
                    </span>
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {percent}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 dark:bg-white/10 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isWarning ? 'bg-amber-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                    <span>
                      {meter.used.toLocaleString()} {meter.unit} used
                    </span>
                    <span>
                      / {meter.limit.toLocaleString()} {meter.unit} cap
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-white/5 leading-relaxed">
                    {meter.description}
                  </p>

                  <div className="p-2 rounded bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 text-[10px] font-mono text-slate-500">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Policy: </span>
                    {meter.exceededPolicy}
                  </div>
                </Card>
              );
            })}
      </div>
    </div>
  );
};
