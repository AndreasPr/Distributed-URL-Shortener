import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Link2,
  BarChart3,
  Bot,
  Zap,
  Copy,
  Check,
  ExternalLink,
  Plus,
  ArrowRight,
  TrendingUp,
  Activity,
  Globe2,
  Clock,
  Sparkles,
  QrCode as QrIcon
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../design-system/Card';
import { StatCard } from '../../design-system/StatCard';
import { Button } from '../../design-system/Button';
import { Badge } from '../../design-system/Badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../design-system/Table';
import { EmptyState } from '../../design-system/EmptyState';
import { Skeleton } from '../../design-system/Skeleton';
import { PageStateSimulator, PageErrorAlert, PageDisplayState } from '../../components/common/PageStateSimulator';
import { QrCodeModal } from '../../components/links/QrCodeModal';
import { useAppData } from '../../context/AppDataContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { mockAnalytics } from '../../mock';
import { ShortLink } from '../../mock/types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { links, addLink, openCreateLinkModal } = useAppData();
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [pageState, setPageState] = useState<PageDisplayState>('normal');
  const [quickUrl, setQuickUrl] = useState('');
  const [quickCreatedLink, setQuickCreatedLink] = useState<ShortLink | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedQrLink, setSelectedQrLink] = useState<ShortLink | null>(null);
  const [chartPeriod, setChartPeriod] = useState<'7d' | '30d'>('7d');
  const [hoveredPoint, setHoveredPoint] = useState<{ timestamp: string; clicks: number; humanClicks: number; agentClicks: number } | null>(null);

  // Quick Create Link Handler
  const handleQuickCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrl.trim()) return;

    if (!/^https?:\/\//i.test(quickUrl.trim())) {
      toast({
        title: 'Invalid URL Format',
        description: 'Please include http:// or https://',
        variant: 'error',
      });
      return;
    }

    const newLink = addLink({
      targetUrl: quickUrl.trim(),
      domain: activeWorkspace.customDomains[0] || 'relay.mk',
    });

    setQuickCreatedLink(newLink);
    setQuickUrl('');
    toast({
      title: 'Short Link Created',
      description: `https://${newLink.domain}/${newLink.shortCode}`,
      variant: 'success',
    });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({
      title: 'Copied to Clipboard',
      description: text,
      variant: 'success',
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  // SVG Line Chart coordinates calculation
  const timeSeries = mockAnalytics.timeSeries;
  const maxClicks = Math.max(...timeSeries.map((d) => d.clicks)) * 1.15 || 25000;
  const chartWidth = 700;
  const chartHeight = 180;
  const paddingX = 30;
  const paddingY = 20;

  const points = timeSeries.map((d, i) => {
    const x = paddingX + (i / (timeSeries.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (d.clicks / maxClicks) * (chartHeight - paddingY * 2);
    return { x, y, data: d };
  });

  const pathD = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

  // Filter recent links for normal vs empty state
  const displayedLinks = pageState === 'empty' ? [] : links.slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Page State Simulator Control */}
      <PageStateSimulator
        currentState={pageState}
        onStateChange={setPageState}
        pageLabel="Dashboard Overview"
      />

      {/* ERROR STATE */}
      {pageState === 'error' && (
        <PageErrorAlert
          title="Edge Telemetry Pipeline Unreachable"
          message="Could not stream real-time click series and recent link manifests from the primary Redis cluster. Re-attempting handshake with secondary replica in Frankfurt..."
          onRetry={() => {
            setPageState('loading');
            setTimeout(() => setPageState('normal'), 600);
          }}
        />
      )}

      {/* 2. Top Banner & Quick Create Box */}
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Workspace Dashboard</span>
              <Badge variant="agent" size="sm">
                {activeWorkspace.plan.toUpperCase()}
              </Badge>
            </h1>
            <p className="text-xs text-slate-500">
              High-throughput edge routing and autonomous agent attribution for <strong>{activeWorkspace.name}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/app/links')}
              leftIcon={<Link2 className="w-3.5 h-3.5" />}
            >
              Browse All Links ({links.length})
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={openCreateLinkModal}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              New Short Link
            </Button>
          </div>
        </div>

        {/* Quick Create Input Bar */}
        <form onSubmit={handleQuickCreate} className="pt-2">
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <div className="relative flex-1">
              <input
                type="url"
                placeholder="Paste destination URL to instantly shorten (e.g. https://github.com/my-org/repo)..."
                value={quickUrl}
                onChange={(e) => setQuickUrl(e.target.value)}
                className="w-full h-10 px-3.5 pr-24 rounded-lg border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-colors"
              />
              <span className="absolute right-3 top-2.5 text-[10px] font-mono text-slate-400 select-none hidden md:inline">
                {activeWorkspace.customDomains[0] || 'relay.mk'}
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              className="sm:w-auto"
            >
              Quick Shorten
            </Button>
          </div>
        </form>

        {/* Instant Created Link Banner */}
        {quickCreatedLink && (
          <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-slate-600 dark:text-slate-300">New link active:</span>
              <a
                href={`https://${quickCreatedLink.domain}/${quickCreatedLink.shortCode}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono font-semibold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1"
              >
                <span>{quickCreatedLink.domain}/{quickCreatedLink.shortCode}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleCopy(
                    `https://${quickCreatedLink.domain}/${quickCreatedLink.shortCode}`,
                    'quick'
                  )
                }
                leftIcon={copiedId === 'quick' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              >
                {copiedId === 'quick' ? 'Copied' : 'Copy URL'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedQrLink(quickCreatedLink)}
                leftIcon={<QrIcon className="w-3 h-3" />}
              >
                QR Code
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Stat Cards Row */}
      {pageState === 'loading' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] space-y-3">
              <Skeleton variant="text" width="40%" height={14} />
              <Skeleton variant="rectangular" width="70%" height={28} />
              <Skeleton variant="text" width="60%" height={12} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Monthly Clicks"
            value={pageState === 'empty' ? '0' : activeWorkspace.monthlyClicks.toLocaleString()}
            change={{
              value: '+18.4%',
              trend: 'up',
              label: 'vs previous 30d',
            }}
            icon={<BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
          />

          <StatCard
            title="Active Short Links"
            value={pageState === 'empty' ? '0' : links.length.toString()}
            subtitle={`Quota: ${activeWorkspace.maxLinks.toLocaleString()} links`}
            icon={<Link2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
          />

          <StatCard
            title="Edge Anycast Latency"
            value="14.2ms"
            change={{
              value: 'P95',
              trend: 'neutral',
              label: 'across 320 PoPs',
            }}
            icon={<Zap className="w-4 h-4 text-amber-500" />}
          />

          <StatCard
            title="AI Agent Invocations"
            value={pageState === 'empty' ? '0' : '44,450'}
            change={{
              value: '31.1%',
              trend: 'up',
              label: 'MCP traffic share',
            }}
            icon={<Bot className="w-4 h-4 text-indigo-500" />}
          />
        </div>
      )}

      {/* 4. Clicks Line Chart Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Redirect Traffic & Agent Attribution</span>
            </CardTitle>
            <CardDescription>
              Time-series resolution across edge Anycast nodes and autonomous MCP tool executions
            </CardDescription>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-lg text-xs">
            <button
              onClick={() => setChartPeriod('7d')}
              className={`px-2.5 py-1 rounded transition-colors ${
                chartPeriod === '7d'
                  ? 'bg-white dark:bg-[#0f111a] text-blue-600 font-semibold shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setChartPeriod('30d')}
              className={`px-2.5 py-1 rounded transition-colors ${
                chartPeriod === '30d'
                  ? 'bg-white dark:bg-[#0f111a] text-blue-600 font-semibold shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Last 30 Days
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {pageState === 'loading' ? (
            <div className="h-48 w-full flex flex-col justify-end gap-2 p-4">
              <Skeleton variant="rectangular" width="100%" height={140} />
            </div>
          ) : pageState === 'empty' ? (
            <EmptyState
              title="No click events recorded yet"
              description="Share your first short link or connect an MCP autonomous agent to begin streaming live redirect traffic."
              action={
                <Button size="sm" variant="primary" onClick={openCreateLinkModal}>
                  Create First Link
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {/* Responsive SVG Line Chart */}
              <div className="relative w-full overflow-hidden">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-48 sm:h-56 select-none"
                >
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
                    const y = chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);
                    return (
                      <line
                        key={ratio}
                        x1={paddingX}
                        y1={y}
                        x2={chartWidth - paddingX}
                        y2={y}
                        stroke="currentColor"
                        className="text-slate-200 dark:text-white/5"
                        strokeDasharray="4 4"
                      />
                    );
                  })}

                  {/* Area fill */}
                  <path d={areaD} fill="url(#chartGradient)" />

                  {/* Main Line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Interactive Points */}
                  {points.map((p, idx) => (
                    <circle
                      key={idx}
                      cx={p.x}
                      cy={p.y}
                      r={hoveredPoint?.timestamp === p.data.timestamp ? 5 : 3.5}
                      className="fill-white dark:fill-[#0f111a] stroke-blue-600 transition-all cursor-pointer"
                      strokeWidth="2"
                      onMouseEnter={() => setHoveredPoint(p.data)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  ))}
                </svg>

                {/* Hover Tooltip Overlay */}
                {hoveredPoint && (
                  <div className="absolute top-2 right-4 p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0c0d15]/95 backdrop-blur-xs shadow-lg text-xs space-y-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                      {hoveredPoint.timestamp}
                    </p>
                    <div className="flex items-center justify-between gap-4 text-[11px]">
                      <span className="text-slate-500">Total Clicks:</span>
                      <span className="font-bold font-mono text-blue-600">
                        {hoveredPoint.clicks.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-[11px]">
                      <span className="text-slate-500">Human Visitors:</span>
                      <span className="font-mono text-emerald-600">
                        {hoveredPoint.humanClicks.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-[11px]">
                      <span className="text-slate-500">AI Agents (MCP):</span>
                      <span className="font-mono text-indigo-500">
                        {hoveredPoint.agentClicks.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Chart Legends */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <span>Total Redirect Volume</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <span>Agent Tool Calls</span>
                  </div>
                </div>

                <span className="font-mono text-[11px] text-slate-400">
                  Updated 1m ago · Anycast Sync Healthy
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Recent Links Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Recent Short Links</CardTitle>
            <CardDescription>
              Most recently deployed routing rules and custom domain aliases
            </CardDescription>
          </div>

          <Link to="/app/links">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              View All Links
            </Button>
          </Link>
        </CardHeader>

        <CardContent>
          {pageState === 'loading' ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
                  <Skeleton variant="text" width="30%" height={16} />
                  <Skeleton variant="text" width="40%" height={16} />
                  <Skeleton variant="text" width="15%" height={16} />
                </div>
              ))}
            </div>
          ) : displayedLinks.length === 0 ? (
            <EmptyState
              title="No short links in this workspace yet"
              description="Create a branded short link or connect an API key to view redirects here."
              action={
                <Button size="sm" variant="primary" onClick={openCreateLinkModal}>
                  Create Short Link
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Short Link</TableHead>
                  <TableHead>Destination Target</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead isNumeric>Clicks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedLinks.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell className="font-mono text-xs font-semibold">
                      <Link
                        to={`/app/links/${link.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <span>{link.domain}/{link.shortCode}</span>
                      </Link>
                    </TableCell>

                    <TableCell className="text-xs text-slate-500 max-w-xs truncate">
                      <a
                        href={link.targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-slate-800 dark:hover:text-slate-200 truncate block"
                        title={link.targetUrl}
                      >
                        {link.targetUrl}
                      </a>
                    </TableCell>

                    <TableCell className="text-xs">
                      {link.createdBy.type === 'agent' ? (
                        <Badge variant="agent" size="sm">
                          {link.createdBy.name}
                        </Badge>
                      ) : link.createdBy.type === 'api' ? (
                        <Badge variant="outline" size="sm">
                          API / Bot
                        </Badge>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400">
                          {link.createdBy.name}
                        </span>
                      )}
                    </TableCell>

                    <TableCell isNumeric className="font-semibold">
                      {link.totalClicks.toLocaleString()}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={link.status === 'active' ? 'success' : 'neutral'}
                        size="sm"
                      >
                        {link.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(`https://${link.domain}/${link.shortCode}`, link.id)}
                          title="Copy shortlink"
                          aria-label={`Copy link ${link.shortCode}`}
                          className="p-1.5"
                        >
                          {copiedId === link.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedQrLink(link)}
                          title="Show QR Code"
                          aria-label={`Show QR for ${link.shortCode}`}
                          className="p-1.5"
                        >
                          <QrIcon className="w-3.5 h-3.5" />
                        </Button>

                        <Link to={`/app/links/${link.id}`}>
                          <Button variant="ghost" size="sm" className="text-xs">
                            Details
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* QR Code Modal */}
      {selectedQrLink && (
        <QrCodeModal
          isOpen={Boolean(selectedQrLink)}
          onClose={() => setSelectedQrLink(null)}
          url={`https://${selectedQrLink.domain}/${selectedQrLink.shortCode}`}
          title={selectedQrLink.title}
          shortCode={selectedQrLink.shortCode}
        />
      )}
    </div>
  );
};
