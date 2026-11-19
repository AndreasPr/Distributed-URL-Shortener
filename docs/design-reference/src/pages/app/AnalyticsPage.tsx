import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  Globe2,
  Compass,
  Bot,
  Zap,
  TrendingUp,
  Download,
  Filter,
  Activity,
  ArrowRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../design-system/Card';
import { Button } from '../../design-system/Button';
import { Badge } from '../../design-system/Badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../design-system/Table';
import { Skeleton } from '../../design-system/Skeleton';
import { EmptyState } from '../../design-system/EmptyState';
import { PageStateSimulator, PageErrorAlert, PageDisplayState } from '../../components/common/PageStateSimulator';
import { useAppData } from '../../context/AppDataContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { mockAnalytics } from '../../mock';

export const AnalyticsPage: React.FC = () => {
  const { links } = useAppData();
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [pageState, setPageState] = useState<PageDisplayState>('normal');
  const [selectedRange, setSelectedRange] = useState<'24h' | '7d' | '30d' | '90d' | 'custom'>('7d');
  const [customStartDate, setCustomStartDate] = useState('2026-10-25');
  const [customEndDate, setCustomEndDate] = useState('2026-11-05');
  const [hoveredPoint, setHoveredPoint] = useState<{ timestamp: string; clicks: number; humanClicks: number; agentClicks: number } | null>(null);

  // Time series
  const timeSeries = mockAnalytics.timeSeries;
  const maxClicks = Math.max(...timeSeries.map((d) => d.clicks)) * 1.15 || 25000;
  const chartWidth = 720;
  const chartHeight = 180;
  const paddingX = 30;
  const paddingY = 20;

  const points = timeSeries.map((d, i) => {
    const x = paddingX + (i / (timeSeries.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (d.clicks / maxClicks) * (chartHeight - paddingY * 2);
    const agentY = chartHeight - paddingY - (d.agentClicks / maxClicks) * (chartHeight - paddingY * 2);
    return { x, y, agentY, data: d };
  });

  const pathD = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
  const agentPathD = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.agentY}` : `${acc} L ${p.x} ${p.agentY}`), '');

  const handleExportCsv = () => {
    const headers = 'Timestamp,TotalClicks,HumanClicks,AgentClicks\n';
    const rows = timeSeries.map((d) => `${d.timestamp},${d.clicks},${d.humanClicks},${d.agentClicks}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relaymark-analytics-${selectedRange}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: 'Analytics Exported',
      description: 'Downloaded CSV telemetry ledger.',
      variant: 'success',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Page State Simulator Control */}
      <PageStateSimulator
        currentState={pageState}
        onStateChange={setPageState}
        pageLabel="Real-Time Analytics"
      />

      {/* ERROR STATE */}
      {pageState === 'error' && (
        <PageErrorAlert
          title="Analytics Pipeline Stream Error"
          message="Failed to query distributed Prometheus / ClickHouse aggregators. Redis connection reset by peer."
          onRetry={() => {
            setPageState('loading');
            setTimeout(() => setPageState('normal'), 600);
          }}
        />
      )}

      {/* 2. Top Header & Date-Range Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Real-Time Traffic Analytics</span>
            <Badge variant="agent" size="sm">
              Anycast P95: 14.2ms
            </Badge>
          </h1>
          <p className="text-xs text-slate-500">
            Granular traffic breakdown for <strong>{activeWorkspace.name}</strong>
          </p>
        </div>

        {/* Date Range Picker Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-white/10 rounded-lg text-xs">
            {(['24h', '7d', '30d', '90d', 'custom'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedRange(r)}
                className={`px-2.5 py-1 rounded capitalize transition-colors ${
                  selectedRange === r
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {r === '24h'
                  ? '24 Hours'
                  : r === '7d'
                  ? '7 Days'
                  : r === '30d'
                  ? '30 Days'
                  : r === '90d'
                  ? '90 Days'
                  : 'Custom'}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Custom Date Range Picker Accordion */}
      {selectedRange === 'custom' && (
        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f111a] flex flex-wrap items-center gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="h-8 px-2 rounded border border-slate-300 dark:border-white/10 bg-white dark:bg-black/30 font-mono text-xs text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="h-8 px-2 rounded border border-slate-300 dark:border-white/10 bg-white dark:bg-black/30 font-mono text-xs text-slate-900 dark:text-slate-100"
            />
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              toast({
                title: 'Custom Range Applied',
                description: `Filtering from ${customStartDate} to ${customEndDate}`,
                variant: 'info',
              });
            }}
          >
            Apply Filter
          </Button>
        </div>
      )}

      {/* 3. Primary Line Chart: Human Clicks vs Autonomous AI Agents */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Redirect Velocity & Agent Invocations</span>
            </CardTitle>
            <CardDescription>
              Blue: Total Traffic · Indigo: Autonomous AI Agent Invocations (MCP)
            </CardDescription>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span className="text-slate-600 dark:text-slate-400">Total Redirects</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span className="text-slate-600 dark:text-slate-400">AI Agents</span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {pageState === 'loading' ? (
            <Skeleton variant="rectangular" width="100%" height={180} />
          ) : pageState === 'empty' ? (
            <EmptyState
              title="No analytics recorded for this range"
              description="Adjust the date range or create links to stream real-time traffic."
            />
          ) : (
            <div className="space-y-3">
              <div className="relative w-full overflow-hidden">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-48 sm:h-56 select-none"
                >
                  {/* Grid Lines */}
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

                  {/* Total Traffic Line (Blue) */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Agent Invocations Line (Indigo) */}
                  <path
                    d={agentPathD}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2"
                    strokeDasharray="5 3"
                    strokeLinecap="round"
                  />

                  {/* Points */}
                  {points.map((p, idx) => (
                    <circle
                      key={idx}
                      cx={p.x}
                      cy={p.y}
                      r={hoveredPoint?.timestamp === p.data.timestamp ? 5 : 3.5}
                      className="fill-white dark:fill-[#0f111a] stroke-blue-600 cursor-pointer"
                      strokeWidth="2"
                      onMouseEnter={() => setHoveredPoint(p.data)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  ))}
                </svg>

                {hoveredPoint && (
                  <div className="absolute top-2 right-4 p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0c0d15]/95 backdrop-blur-xs shadow-lg text-xs space-y-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                      {hoveredPoint.timestamp}
                    </p>
                    <div className="flex items-center justify-between gap-4 text-[11px]">
                      <span className="text-slate-500">Total:</span>
                      <span className="font-bold font-mono text-blue-600">
                        {hoveredPoint.clicks.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-[11px]">
                      <span className="text-slate-500">Human:</span>
                      <span className="font-mono text-emerald-600">
                        {hoveredPoint.humanClicks.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-[11px]">
                      <span className="text-slate-500">AI Agents:</span>
                      <span className="font-mono text-indigo-500">
                        {hoveredPoint.agentClicks.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-white/5">
                <span>Start: {timeSeries[0].timestamp}</span>
                <span>End: {timeSeries[timeSeries.length - 1].timestamp}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Three Distribution Cards: Geo, Referrers, Latency Percentiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Geographic Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Globe2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Countries & Regions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pageState === 'loading' ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} variant="text" width="100%" height={16} />)}
              </div>
            ) : pageState === 'empty' ? (
              <p className="text-xs text-slate-500">No geo data.</p>
            ) : (
              mockAnalytics.countries.map((c) => (
                <div key={c.countryCode} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-slate-400">{c.countryCode}</span>
                      <span>{c.countryName}</span>
                    </span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {c.clicks.toLocaleString()} ({c.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full"
                      style={{ width: `${c.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Referrers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Attribution Referrers</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pageState === 'loading' ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} variant="text" width="100%" height={16} />)}
              </div>
            ) : pageState === 'empty' ? (
              <p className="text-xs text-slate-500">No referrer data.</p>
            ) : (
              mockAnalytics.referrers.map((r) => (
                <div key={r.source} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[170px]">
                      {r.source}
                    </span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {r.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full"
                      style={{ width: `${r.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Latency Percentiles & Quality */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Anycast Latency SLAs</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">P50 Median Latency:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {mockAnalytics.p50LatencyMs} ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">P95 Anycast Latency:</span>
                <span className="font-mono font-bold text-emerald-600">
                  {mockAnalytics.p95LatencyMs} ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">P99 Tail Latency:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {mockAnalytics.p99LatencyMs} ms
                </span>
              </div>
            </div>

            <div className="space-y-1 text-xs text-slate-500">
              <p className="font-semibold text-slate-900 dark:text-slate-100">Zero-Buffering Forwarding</p>
              <p className="text-[11px] leading-relaxed">
                All 301 and 307 redirects resolve without round-tripping to centralized origin databases.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. Top Performing Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Performing Short Links</CardTitle>
          <CardDescription>
            High-traffic routes resolved during the selected time period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pageState === 'loading' ? (
            <Skeleton variant="rectangular" width="100%" height={140} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Short Link</TableHead>
                  <TableHead>Target Title</TableHead>
                  <TableHead isNumeric>Clicks</TableHead>
                  <TableHead isNumeric>Unique Visitors</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.slice(0, 5).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                      <Link to={`/app/links/${l.id}`} className="hover:underline">
                        {l.domain}/{l.shortCode}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 dark:text-slate-300">
                      {l.title}
                    </TableCell>
                    <TableCell isNumeric className="font-mono font-semibold">
                      {l.totalClicks.toLocaleString()}
                    </TableCell>
                    <TableCell isNumeric className="font-mono text-slate-500">
                      {l.uniqueVisitors.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/app/links/${l.id}`}>
                        <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3 h-3" />}>
                          Inspect
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
