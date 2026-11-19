import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Link2,
  Copy,
  Check,
  ExternalLink,
  QrCode as QrIcon,
  Edit2,
  Trash2,
  Calendar,
  Lock,
  Globe2,
  Compass,
  Laptop,
  Bot,
  Activity,
  History,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../design-system/Card';
import { Button } from '../../design-system/Button';
import { Badge } from '../../design-system/Badge';
import { Skeleton } from '../../design-system/Skeleton';
import { EmptyState } from '../../design-system/EmptyState';
import { PageStateSimulator, PageErrorAlert, PageDisplayState } from '../../components/common/PageStateSimulator';
import { QrCodeModal } from '../../components/links/QrCodeModal';
import { CreateEditLinkModal } from '../../components/links/CreateEditLinkModal';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import { mockAnalytics } from '../../mock';
import { ShortLink } from '../../mock/types';

export const LinkDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getLinkById, deleteLink } = useAppData();
  const { toast } = useToast();

  const [pageState, setPageState] = useState<PageDisplayState>('normal');
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'qr'>('overview');
  const [copied, setCopied] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const link = getLinkById(id || '');

  // Fallback if link not found or empty state
  if (!link && pageState !== 'loading' && pageState !== 'error') {
    return (
      <div className="space-y-6">
        <Link to="/app/links" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Short Links</span>
        </Link>
        <EmptyState
          title="Short link not found"
          description={`The link identifier "${id}" does not exist in this workspace or was permanently deleted.`}
          action={
            <Button size="sm" variant="primary" onClick={() => navigate('/app/links')}>
              Return to Links Directory
            </Button>
          }
        />
      </div>
    );
  }

  const currentLink = link as ShortLink;
  const fullShortUrl = `https://${currentLink?.domain || 'relay.mk'}/${currentLink?.shortCode || 'demo'}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullShortUrl);
    setCopied(true);
    toast({
      title: 'Link Copied',
      description: fullShortUrl,
      variant: 'success',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    if (window.confirm(`Delete short link ${fullShortUrl}?`)) {
      deleteLink(currentLink.id);
      toast({
        title: 'Link Deleted',
        description: `Removed ${fullShortUrl}`,
        variant: 'info',
      });
      navigate('/app/links');
    }
  };

  // Mock Link Specific History
  const linkHistory = [
    {
      id: 'h_1',
      event: 'Tool Invoked (MCP Agent)',
      actor: 'claude-desktop-worker',
      timestamp: '2026-11-05T11:51:02Z',
      details: 'Agent resolved destination and queried real-time attribution.',
    },
    {
      id: 'h_2',
      event: 'Traffic Anomaly Evaluated',
      actor: 'Anycast Heuristic Engine',
      timestamp: '2026-11-04T16:30:00Z',
      details: 'Verified safe destination with Google Safe Browsing hash lookups.',
    },
    {
      id: 'h_3',
      event: 'Link Created',
      actor: currentLink?.createdBy?.name || 'Andreas Priftis',
      timestamp: currentLink?.createdAt || '2026-10-20T08:12:00Z',
      details: `Created route to ${currentLink?.targetUrl}`,
    },
  ];

  // Chart Coordinates
  const timeSeries = mockAnalytics.timeSeries;
  const maxClicks = Math.max(...timeSeries.map((d) => d.clicks)) * 1.15 || 25000;
  const chartWidth = 700;
  const chartHeight = 160;
  const paddingX = 25;
  const paddingY = 15;

  const points = timeSeries.map((d, i) => {
    const x = paddingX + (i / (timeSeries.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (d.clicks / maxClicks) * (chartHeight - paddingY * 2);
    return { x, y, data: d };
  });

  const pathD = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Page State Simulator Control */}
      <PageStateSimulator
        currentState={pageState}
        onStateChange={setPageState}
        pageLabel={`Link Detail (${currentLink?.shortCode})`}
      />

      {/* ERROR STATE */}
      {pageState === 'error' && (
        <PageErrorAlert
          title="Telemetry Aggregation Unavailable"
          message="Could not stream per-link breakdown counters from the Ashburn edge cluster."
          onRetry={() => {
            setPageState('loading');
            setTimeout(() => setPageState('normal'), 600);
          }}
        />
      )}

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/app/links" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Short Links</span>
        </Link>
        <span>/</span>
        <span className="font-mono text-slate-900 dark:text-slate-100 font-semibold">
          {currentLink?.shortCode}
        </span>
      </div>

      {/* 2. Link Header Card */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] shadow-xs space-y-4">
        {pageState === 'loading' ? (
          <div className="space-y-3">
            <Skeleton variant="text" width="40%" height={24} />
            <Skeleton variant="text" width="60%" height={16} />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-blue-600 dark:text-blue-400">
                  {currentLink?.domain}/{currentLink?.shortCode}
                </h1>
                <Badge
                  variant={currentLink?.status === 'active' ? 'success' : 'neutral'}
                  size="sm"
                >
                  {currentLink?.status}
                </Badge>
                {currentLink?.hasPassword && (
                  <Badge variant="warning" size="sm">
                    Passkey Protected
                  </Badge>
                )}
              </div>

              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {currentLink?.title}
              </p>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Target:</span>
                <a
                  href={currentLink?.targetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-slate-700 dark:text-slate-300 hover:underline flex items-center gap-1 max-w-md truncate"
                >
                  <span>{currentLink?.targetUrl}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="primary"
                size="sm"
                onClick={handleCopyLink}
                leftIcon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copied ? 'Copied URL' : 'Copy URL'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsQrModalOpen(true)}
                leftIcon={<QrIcon className="w-3.5 h-3.5" />}
              >
                QR Code
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              >
                Edit
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Selection: Analytics & Overview vs Dedicated QR Studio */}
      <div className="flex border-b border-slate-200 dark:border-white/10 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveDetailTab('overview')}
          className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeDetailTab === 'overview'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Performance & Analytics</span>
        </button>

        <button
          onClick={() => setActiveDetailTab('qr')}
          className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeDetailTab === 'qr'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <QrIcon className="w-3.5 h-3.5" />
          <span>Dynamic QR Code</span>
        </button>
      </div>

      {activeDetailTab === 'qr' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <QrIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Dynamic QR Code for {currentLink?.shortCode}</span>
            </CardTitle>
            <CardDescription>
              Scannable vector QR code linked directly to this Anycast redirect URL
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex flex-col md:flex-row items-center gap-8">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0d15] shadow-xs">
              <svg viewBox="0 0 160 160" className="w-48 h-48 select-none">
                <rect width="160" height="160" fill="white" rx="10" />
                {/* Eyes */}
                <rect x="12" y="12" width="36" height="36" fill="none" stroke="#2563eb" strokeWidth="6" rx="4" />
                <rect x="22" y="22" width="16" height="16" fill="#2563eb" rx="2" />
                <rect x="112" y="12" width="36" height="36" fill="none" stroke="#2563eb" strokeWidth="6" rx="4" />
                <rect x="122" y="22" width="16" height="16" fill="#2563eb" rx="2" />
                <rect x="12" y="112" width="36" height="36" fill="none" stroke="#2563eb" strokeWidth="6" rx="4" />
                <rect x="22" y="122" width="16" height="16" fill="#2563eb" rx="2" />
                {/* Bits */}
                <rect x="60" y="15" width="12" height="12" fill="#2563eb" rx="2" />
                <rect x="80" y="15" width="14" height="25" fill="#2563eb" rx="2" />
                <rect x="15" y="60" width="25" height="14" fill="#2563eb" rx="2" />
                <rect x="15" y="85" width="14" height="20" fill="#2563eb" rx="2" />
                <rect x="60" y="55" width="40" height="40" fill="none" stroke="#2563eb" strokeWidth="4" rx="4" />
                <text x="80" y="78" fill="#2563eb" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">RELAY</text>
                <rect x="115" y="60" width="20" height="12" fill="#2563eb" rx="2" />
                <rect x="125" y="80" width="15" height="25" fill="#2563eb" rx="2" />
                <rect x="60" y="115" width="20" height="12" fill="#2563eb" rx="2" />
                <rect x="85" y="115" width="14" height="25" fill="#2563eb" rx="2" />
                <rect x="110" y="125" width="28" height="20" fill="#2563eb" rx="2" />
              </svg>
            </div>

            <div className="space-y-4 max-w-md">
              <div className="space-y-1">
                <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  Ready for Print & Packaging
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Export this code for physical store signage, conference presentations, or product packaging. If you ever need to change the destination, simply edit the link URL above without reprinting.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsQrModalOpen(true)}
                  leftIcon={<QrIcon className="w-3.5 h-3.5" />}
                >
                  Open QR Customizer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  leftIcon={<Copy className="w-3.5 h-3.5" />}
                >
                  Copy Short Link
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>

      {/* 3. Link Clicks Chart */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Link Click Volume Over Time</span>
            </CardTitle>
            <CardDescription>
              Anycast edge redirects recorded for this specific short URL
            </CardDescription>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500">Total All-Time:</span>
            <span className="font-mono font-bold text-base text-slate-900 dark:text-slate-100">
              {pageState === 'empty' ? '0' : currentLink?.totalClicks.toLocaleString()}
            </span>
          </div>
        </CardHeader>

        <CardContent>
          {pageState === 'loading' ? (
            <Skeleton variant="rectangular" width="100%" height={160} />
          ) : pageState === 'empty' ? (
            <EmptyState
              title="No click events recorded for this link"
              description="Share this link or integrate via MCP to begin collecting performance metrics."
            />
          ) : (
            <div className="space-y-2">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-44 select-none"
              >
                {/* Horizontal Grid */}
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

                {/* Main Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Points */}
                {points.map((p, idx) => (
                  <circle
                    key={idx}
                    cx={p.x}
                    cy={p.y}
                    r={3.5}
                    className="fill-white dark:fill-[#0f111a] stroke-blue-600"
                    strokeWidth="2"
                  />
                ))}
              </svg>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>{timeSeries[0].timestamp}</span>
                <span>{timeSeries[timeSeries.length - 1].timestamp}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Three Distribution Columns: Referrers, Countries, Devices */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Referrers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Top Referrers</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pageState === 'loading' ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} variant="text" width="100%" height={16} />)}
              </div>
            ) : pageState === 'empty' ? (
              <p className="text-xs text-slate-500">No referrer data collected yet.</p>
            ) : (
              mockAnalytics.referrers.slice(0, 5).map((ref) => (
                <div key={ref.source} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                      {ref.source}
                    </span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {ref.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full"
                      style={{ width: `${ref.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Geographic Countries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Globe2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Geographic Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pageState === 'loading' ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} variant="text" width="100%" height={16} />)}
              </div>
            ) : pageState === 'empty' ? (
              <p className="text-xs text-slate-500">No geographic data collected yet.</p>
            ) : (
              mockAnalytics.countries.slice(0, 5).map((geo) => (
                <div key={geo.countryCode} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-slate-400">{geo.countryCode}</span>
                      <span>{geo.countryName}</span>
                    </span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {geo.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full"
                      style={{ width: `${geo.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Devices & Autonomous Agents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-indigo-500" />
              <span>Client & Agent Breakdown</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pageState === 'loading' ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} variant="text" width="100%" height={16} />)}
              </div>
            ) : pageState === 'empty' ? (
              <p className="text-xs text-slate-500">No client data collected yet.</p>
            ) : (
              mockAnalytics.devices.map((dev) => (
                <div key={dev.deviceType} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">
                      {dev.deviceType.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {dev.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        dev.deviceType === 'agent_headless' ? 'bg-indigo-500' : 'bg-slate-700 dark:bg-slate-300'
                      }`}
                      style={{ width: `${dev.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. Audit History Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <span>Link Lifecycle & Routing History</span>
          </CardTitle>
          <CardDescription>
            Audit log of modifications, security checks, and tool invocations for this link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {linkHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 pb-3 border-b border-slate-100 dark:border-white/5 last:border-0"
              >
                <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                <div className="flex-1 space-y-0.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {item.event}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">{item.details}</p>
                  <p className="text-[11px] font-mono text-slate-400">Actor: {item.actor}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </>
      )}

      {/* Modals */}
      {isQrModalOpen && currentLink && (
        <QrCodeModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          url={fullShortUrl}
          title={currentLink.title}
          shortCode={currentLink.shortCode}
        />
      )}

      {isEditModalOpen && currentLink && (
        <CreateEditLinkModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          linkToEdit={currentLink}
        />
      )}
    </div>
  );
};
