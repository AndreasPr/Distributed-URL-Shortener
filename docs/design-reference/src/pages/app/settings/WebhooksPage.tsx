import React, { useState } from 'react';
import {
  Webhook,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Activity,
  Send
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../design-system/Card';
import { Button } from '../../../design-system/Button';
import { Input } from '../../../design-system/Input';
import { Badge } from '../../../design-system/Badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../../design-system/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../design-system/Dialog';
import { EmptyState } from '../../../design-system/EmptyState';
import { Skeleton } from '../../../design-system/Skeleton';
import { PageStateSimulator, PageErrorAlert, PageDisplayState } from '../../../components/common/PageStateSimulator';
import { useAppData } from '../../../context/AppDataContext';
import { useToast } from '../../../context/ToastContext';
import { WebhookEndpoint } from '../../../mock/types';

export const WebhooksPage: React.FC = () => {
  const { webhooks, webhookLogs, addWebhook, deleteWebhook, retryWebhookDelivery } = useAppData();
  const { toast } = useToast();

  const [pageState, setPageState] = useState<PageDisplayState>('normal');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [endpointUrl, setEndpointUrl] = useState('');
  const [endpointDesc, setEndpointDesc] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    'link.clicked',
    'link.created',
  ]);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const availableEvents = [
    { id: 'link.clicked', label: 'link.clicked', desc: 'Fires every time an Anycast node resolves a redirect' },
    { id: 'link.created', label: 'link.created', desc: 'Fires when a new short link is created via API or MCP' },
    { id: 'link.rate_limited', label: 'link.rate_limited', desc: 'Fires when request quotas trigger HTTP 429' },
    { id: 'security.spike', label: 'security.spike', desc: 'Fires when rapid brute-force or threat prober hits are flagged' },
  ];

  const handleEventToggle = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId]
    );
  };

  const handleAddEndpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!endpointUrl.trim()) return;

    if (!/^https:\/\//i.test(endpointUrl.trim())) {
      toast({
        title: 'HTTPS Required',
        description: 'Webhook receiver endpoints must use secure HTTPS.',
        variant: 'error',
      });
      return;
    }

    addWebhook(endpointUrl.trim(), endpointDesc.trim(), selectedEvents);
    setIsAddModalOpen(false);
    setEndpointUrl('');
    setEndpointDesc('');
    toast({
      title: 'Webhook Endpoint Created',
      description: 'Listening for subscribed events with HMAC-SHA256 signatures.',
      variant: 'success',
    });
  };

  const handleDeleteEndpoint = (wh: WebhookEndpoint) => {
    if (window.confirm(`Delete webhook endpoint ${wh.url}?`)) {
      deleteWebhook(wh.id);
      toast({
        title: 'Webhook Endpoint Deleted',
        description: `Removed endpoint ${wh.url}`,
        variant: 'info',
      });
    }
  };

  const handleRetry = (logId: string) => {
    setRetryingId(logId);
    setTimeout(() => {
      retryWebhookDelivery(logId);
      setRetryingId(null);
      toast({
        title: 'Webhook Delivery Retried',
        description: 'Received HTTP 200 OK response from destination endpoint.',
        variant: 'success',
      });
    }, 600);
  };

  const displayedWebhooks = pageState === 'empty' ? [] : webhooks;
  const displayedLogs = pageState === 'empty' ? [] : webhookLogs;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Page State Simulator Control */}
      <PageStateSimulator
        currentState={pageState}
        onStateChange={setPageState}
        pageLabel="Webhooks & Events"
      />

      {/* ERROR STATE */}
      {pageState === 'error' && (
        <PageErrorAlert
          title="Webhook Dispatch Workers Offline"
          message="Background queue worker threads experienced connection timeouts reaching Redis message streams. Dispatches are temporarily spooled to local memory."
          onRetry={() => {
            setPageState('loading');
            setTimeout(() => setPageState('normal'), 600);
          }}
        />
      )}

      {/* 2. Top Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Webhook Endpoints</span>
            <Badge variant="agent" size="sm">
              HMAC-SHA256 Verified
            </Badge>
          </h2>
          <p className="text-xs text-slate-500">
            Real-time HTTP POST event dispatching for redirects, link creation, and security anomalies
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsAddModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Webhook Endpoint
        </Button>
      </div>

      {/* 3. Webhook Endpoints List */}
      <Card>
        <CardContent className="p-0">
          {pageState === 'loading' ? (
            <div className="p-4 space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
                  <Skeleton variant="text" width="40%" height={16} />
                  <Skeleton variant="text" width="25%" height={16} />
                  <Skeleton variant="text" width="15%" height={16} />
                </div>
              ))}
            </div>
          ) : displayedWebhooks.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No webhook endpoints configured"
                description="Register a destination URL to receive streaming HTTP event payloads whenever a link is clicked."
                action={
                  <Button size="sm" variant="primary" onClick={() => setIsAddModalOpen(true)}>
                    Register First Endpoint
                  </Button>
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receiver URL</TableHead>
                  <TableHead>Subscribed Events</TableHead>
                  <TableHead>Health & SLA</TableHead>
                  <TableHead>Signing Secret</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedWebhooks.map((wh) => (
                  <TableRow key={wh.id}>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 break-all block">
                          {wh.url}
                        </span>
                        {wh.description && (
                          <p className="text-[11px] text-slate-500">{wh.description}</p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="align-top">
                      <div className="flex items-center gap-1 flex-wrap">
                        {wh.subscribedEvents.map((evt) => (
                          <span
                            key={evt}
                            className="font-mono text-[10px] bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 px-1.5 py-0.2 rounded"
                          >
                            {evt}
                          </span>
                        ))}
                      </div>
                    </TableCell>

                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <Badge
                          variant={wh.status === 'healthy' ? 'success' : 'danger'}
                          size="sm"
                        >
                          {wh.status === 'healthy' ? 'Healthy (99.98%)' : 'Failing'}
                        </Badge>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Last delivery: {wh.lastDeliveryAt ? new Date(wh.lastDeliveryAt).toLocaleTimeString() : 'N/A'}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="align-top font-mono text-xs text-slate-500">
                      {wh.secretPrefix}
                    </TableCell>

                    <TableCell className="align-top text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteEndpoint(wh)}
                        className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1.5"
                        title="Delete endpoint"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 4. Webhook Delivery Log Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Recent Webhook Delivery Log</span>
            </CardTitle>
            <CardDescription>
              Inspection ledger of dispatched HTTP POST events with latency and retry capabilities
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {pageState === 'loading' ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
                  <Skeleton variant="text" width="30%" height={16} />
                  <Skeleton variant="text" width="40%" height={16} />
                  <Skeleton variant="text" width="15%" height={16} />
                </div>
              ))}
            </div>
          ) : displayedLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No delivery events logged yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Target URL</TableHead>
                  <TableHead>HTTP Status</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {log.event}
                    </TableCell>

                    <TableCell className="font-mono text-xs text-slate-500 truncate max-w-xs">
                      {log.url}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={log.statusCode === 200 ? 'success' : 'danger'}
                        size="sm"
                      >
                        {log.statusCode === 200 ? '200 OK' : `${log.statusCode} Error`}
                      </Badge>
                    </TableCell>

                    <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                      {log.durationMs} ms
                    </TableCell>

                    <TableCell className="font-mono text-xs text-slate-500">
                      {log.attempts}x
                    </TableCell>

                    <TableCell className="text-xs text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </TableCell>

                    <TableCell className="text-right">
                      {log.statusCode !== 200 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(log.id)}
                          isLoading={retryingId === log.id}
                          leftIcon={<RefreshCw className="w-3 h-3 text-amber-500" />}
                          className="text-xs"
                        >
                          Retry
                        </Button>
                      ) : (
                        <span className="text-[11px] font-mono text-emerald-600 flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Delivered</span>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Webhook Endpoint Modal */}
      {isAddModalOpen && (
        <Dialog isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Webhook className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle>Add Webhook Endpoint</DialogTitle>
                  <DialogDescription>
                    Receive signed event notifications at your application HTTP server
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleAddEndpoint} className="space-y-4 py-1">
              <Input
                label="Endpoint Destination URL"
                type="url"
                placeholder="https://api.yourdomain.com/v1/relaymark-webhook"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                helperText="Must be an HTTPS endpoint with public ingress"
                required
                autoFocus
              />

              <Input
                label="Description (Optional)"
                placeholder="e.g. Telemetry ingestion worker, Slack alert bridge"
                value={endpointDesc}
                onChange={(e) => setEndpointDesc(e.target.value)}
              />

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                  Subscribed Event Types
                </label>
                <div className="space-y-2 p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 text-xs">
                  {availableEvents.map((evt) => (
                    <label key={evt.id} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(evt.id)}
                        onChange={() => handleEventToggle(evt.id)}
                        className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {evt.label}
                        </span>
                        <p className="text-[11px] text-slate-500">{evt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Register Endpoint
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
