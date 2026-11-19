import React from 'react';
import {
  Users,
  Layers,
  Link as LinkIcon,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Server,
  Zap,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { Card } from '../../design-system/Card';
import { Badge } from '../../design-system/Badge';
import { Button } from '../../design-system/Button';
import { mockAdminOverviewMetrics, mockAdminClusterNodes } from '../../mock';
import { useAppData } from '../../context/AppDataContext';
import { Link } from 'react-router-dom';

export const AdminOverviewPage: React.FC = () => {
  const { flaggedLinks, systemFlags } = useAppData();
  const pendingAbuseCount = flaggedLinks.filter((l) => l.status === 'pending').length;

  const m = mockAdminOverviewMetrics;

  return (
    <div className="space-y-8">
      {/* Kill Switch Active Banner if any switch is on */}
      {(systemFlags.killSwitchSignups || systemFlags.killSwitchLinkCreation) && (
        <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
            <div>
              <div className="font-semibold text-sm text-white">Emergency Circuit Breaker Engaged</div>
              <p className="text-xs text-rose-200">
                {systemFlags.killSwitchSignups && '• New user signups are globally disabled. '}
                {systemFlags.killSwitchLinkCreation && '• New link creation is globally rejected (HTTP 503).'}
              </p>
            </div>
          </div>
          <Link to="/admin/flags">
            <Button size="sm" variant="destructive">
              Manage Kill Switches
            </Button>
          </Link>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Cluster Telemetry & Health
            </h1>
            <Badge variant="agent" size="sm">
              Live Edge View
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Global metrics across 320 Anycast Edge PoPs, tenant workspaces, and traffic ingestion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/admin/flagged">
            <Button variant={pendingAbuseCount > 0 ? 'destructive' : 'outline'} size="sm" className="relative">
              <AlertTriangle className="w-4 h-4 mr-1.5" />
              <span>Abuse Queue</span>
              {pendingAbuseCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-600 text-white">
                  {pendingAbuseCount}
                </span>
              )}
            </Button>
          </Link>
          <Link to="/admin/flags">
            <Button variant="outline" size="sm">
              <Zap className="w-4 h-4 mr-1.5 text-amber-500" />
              <span>Kill Switches</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* High-Level Stat Cards Grid (Signups, Active Workspaces, Links Created, Error Rate, Plan Counts, MRR) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Signups */}
        <Card className="p-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
              User Accounts
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {m.signups.total.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-emerald-500 flex items-center">
              +{m.signups.today} today
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
            <span>Last 30 days: +{m.signups.last30d}</span>
            <span className="text-emerald-500 font-medium">+{m.signups.growthPercent}% MoM</span>
          </div>
        </Card>

        {/* Active Workspaces */}
        <Card className="p-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Workspaces
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {m.activeWorkspaces.total.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              multitenant
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
            <span>With Custom Apex: {m.activeWorkspaces.withCustomDomains}</span>
            <span className="font-mono text-indigo-400">{m.activeWorkspaces.enterpriseCount} Team tier</span>
          </div>
        </Card>

        {/* Links Created */}
        <Card className="p-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Links Created
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <LinkIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {m.linksCreated.total.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-emerald-500">
              +{m.linksCreated.today.toLocaleString()}/24h
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
            <span>AI Agent Origin: {m.linksCreated.agentGeneratedPercent}%</span>
            <Badge variant="agent" size="sm">MCP Gateway</Badge>
          </div>
        </Card>

        {/* Global Error Rate */}
        <Card className="p-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Edge Ingress Error Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {m.errorRate.rate}
            </span>
            <span className="text-xs text-emerald-500 font-medium">
              Nominal SLA
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
            <span>P99 Redirect Latency</span>
            <span className="font-mono text-slate-800 dark:text-slate-200">{m.errorRate.p99LatencyMs}ms</span>
          </div>
        </Card>

        {/* Plan Breakdown */}
        <Card className="p-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Plan Distribution
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                {m.planCounts.developer + m.planCounts.team + m.planCounts.enterprise}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5">total</span>
            </div>
            <div className="text-right text-xs">
              <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">
                {m.planCounts.team + m.planCounts.enterprise} Paid
              </span>
            </div>
          </div>
          {/* Progress bar breakdown */}
          <div className="mt-3 flex h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 gap-0.5">
            <div
              style={{ width: `${(m.planCounts.developer / 1428) * 100}%` }}
              className="bg-slate-400 dark:bg-slate-600"
              title={`Free: ${m.planCounts.developer}`}
            />
            <div
              style={{ width: `${(m.planCounts.team / 1428) * 100}%` }}
              className="bg-blue-500"
              title={`Pro: ${m.planCounts.team}`}
            />
            <div
              style={{ width: `${(m.planCounts.enterprise / 1428) * 100}%` }}
              className="bg-indigo-500"
              title={`Team: ${m.planCounts.enterprise}`}
            />
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Free: {m.planCounts.developer}</span>
            <span>Pro ($9): {m.planCounts.team}</span>
            <span>Team ($29): {m.planCounts.enterprise}</span>
          </div>
        </Card>

        {/* Estimated MRR */}
        <Card className="p-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Estimated MRR
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              ${m.estimatedMrr.amountUsd.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-emerald-500">
              +{m.estimatedMrr.growthPercent}%
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
            <span>Annual Run Rate (ARR)</span>
            <span className="font-mono text-slate-900 dark:text-slate-100 font-semibold">
              ${m.estimatedMrr.annualRunRateUsd.toLocaleString()}
            </span>
          </div>
        </Card>
      </div>

      {/* Cluster Node Status & Core Edge Health */}
      <Card className="border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/60 shadow-sm">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Primary Edge Routing PoPs
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Zero-allocation Go reverse proxies executing 301/302 redirects with distributed Redis sync.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" size="sm" className="font-mono">
              BGP Anycast AS398124
            </Badge>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Node ID</th>
                <th className="py-3 px-4">Region / Location</th>
                <th className="py-3 px-4">Edge Transit</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">P95 Latency</th>
                <th className="py-3 px-4">Throughput</th>
                <th className="py-3 px-4 text-right">90-Day SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {mockAdminClusterNodes.map((node) => (
                <tr key={node.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-900 dark:text-slate-200">
                    {node.id}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                    {node.region}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {node.provider}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {node.status === 'healthy' ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Healthy
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-amber-500 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Re-syncing
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                    {node.latencyMs} ms
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                    {node.activeReroutesPerSec.toLocaleString()} req/s
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                    {node.uptime}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Operator Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/admin/flagged"
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/40 p-4 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500 group-hover:bg-rose-500/20 transition-colors">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm text-slate-900 dark:text-white">
                Abuse Queue
              </span>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-200" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Review reported phishing, malware, and spam URLs. Disable links or ban offending workspaces.
          </p>
        </Link>

        <Link
          to="/admin/customers"
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/40 p-4 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20 transition-colors">
                <Users className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm text-slate-900 dark:text-white">
                Customer Database
              </span>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-200" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Lookup user accounts by email or plan. View workspace quotas and log internal support notes.
          </p>
        </Link>

        <Link
          to="/admin/flags"
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/40 p-4 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20 transition-colors">
                <Zap className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm text-slate-900 dark:text-white">
                Emergency Circuit Breakers
              </span>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-200" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Kill switches for user registration and link provisioning during active edge DDoS or zero-days.
          </p>
        </Link>
      </div>
    </div>
  );
};
