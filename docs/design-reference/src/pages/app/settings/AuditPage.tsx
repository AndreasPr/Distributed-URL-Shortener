import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  Bot,
  User,
  KeyRound,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../design-system/Card';
import { Button } from '../../../design-system/Button';
import { Badge } from '../../../design-system/Badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../../design-system/Table';
import { EmptyState } from '../../../design-system/EmptyState';
import { Skeleton } from '../../../design-system/Skeleton';
import { PageStateSimulator, PageErrorAlert, PageDisplayState } from '../../../components/common/PageStateSimulator';
import { useAppData } from '../../../context/AppDataContext';
import { useToast } from '../../../context/ToastContext';

export const AuditPage: React.FC = () => {
  const { auditLogs } = useAppData();
  const { toast } = useToast();

  const [pageState, setPageState] = useState<PageDisplayState>('normal');
  const [searchQuery, setSearchQuery] = useState('');
  const [actorTypeFilter, setActorTypeFilter] = useState<'all' | 'user' | 'agent' | 'apiKey'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failure'>('all');

  const filteredLogs = useMemo(() => {
    if (pageState === 'empty') return [];

    return auditLogs.filter((log) => {
      const matchesSearch =
        searchQuery === '' ||
        log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.ipAddress.includes(searchQuery);

      const matchesActor = actorTypeFilter === 'all' || log.actorType === actorTypeFilter;
      const matchesStatus = statusFilter === 'all' || log.status === statusFilter;

      return matchesSearch && matchesActor && matchesStatus;
    });
  }, [auditLogs, searchQuery, actorTypeFilter, statusFilter, pageState]);

  const handleExportAudit = () => {
    const csvContent =
      'ID,Actor,ActorType,Action,Target,IPAddress,Timestamp,Status\n' +
      filteredLogs
        .map((l) => `${l.id},"${l.actor}",${l.actorType},"${l.action}","${l.target}",${l.ipAddress},${l.timestamp},${l.status}`)
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relaymark-audit-log-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Audit Log Exported',
      description: `Downloaded ${filteredLogs.length} audit entries.`,
      variant: 'success',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Page State Simulator Control */}
      <PageStateSimulator
        currentState={pageState}
        onStateChange={setPageState}
        pageLabel="Security Audit Log"
      />

      {/* ERROR STATE */}
      {pageState === 'error' && (
        <PageErrorAlert
          title="Audit Log Ingestion Pipeline Blocked"
          message="Could not stream cryptographic tamper-evident audit ledgers from the secure compliance node."
          onRetry={() => {
            setPageState('loading');
            setTimeout(() => setPageState('normal'), 600);
          }}
        />
      )}

      {/* 2. Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Security & Compliance Audit Log</span>
            <Badge variant="agent" size="sm">
              Append-Only Ledger
            </Badge>
          </h2>
          <p className="text-xs text-slate-500">
            Immutable trace of all administrative modifications, token generations, and autonomous agent tool invocations
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportAudit}
          leftIcon={<Download className="w-3.5 h-3.5" />}
        >
          Export Audit Trail (CSV)
        </Button>
      </div>

      {/* 3. Search & Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter by actor, action, target resource, or IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0f111a] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
              />
            </div>

            {/* Actor Type Filter */}
            <div className="sm:col-span-3">
              <select
                value={actorTypeFilter}
                onChange={(e) => setActorTypeFilter(e.target.value as any)}
                aria-label="Filter by actor type"
                className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0f111a] text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
              >
                <option value="all">All Actor Types</option>
                <option value="user">Human Developers</option>
                <option value="agent">Autonomous Agents (MCP)</option>
                <option value="apiKey">API Tokens & Workers</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="sm:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                aria-label="Filter by execution outcome"
                className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0f111a] text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
              >
                <option value="all">All Status Outcomes</option>
                <option value="success">Success (Allowed)</option>
                <option value="failure">Failure / Denied</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Audit Log Table */}
      <Card>
        <CardContent className="p-0">
          {pageState === 'loading' ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
                  <Skeleton variant="text" width="20%" height={16} />
                  <Skeleton variant="text" width="30%" height={16} />
                  <Skeleton variant="text" width="25%" height={16} />
                  <Skeleton variant="text" width="15%" height={16} />
                </div>
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No audit events found"
                description="Try clearing your search query or actor filters."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Actor & Type</TableHead>
                  <TableHead>Action Operation</TableHead>
                  <TableHead>Target Resource</TableHead>
                  <TableHead>Origin IP</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead className="text-right">Outcome</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="align-top">
                      <div className="flex items-center gap-2">
                        {log.actorType === 'agent' ? (
                          <Bot className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        ) : log.actorType === 'apiKey' ? (
                          <KeyRound className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        )}
                        <div>
                          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate block max-w-[150px]">
                            {log.actor}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 capitalize">
                            {log.actorType}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="align-top font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {log.action}
                    </TableCell>

                    <TableCell className="align-top font-mono text-xs text-slate-500 max-w-xs truncate">
                      {log.target}
                    </TableCell>

                    <TableCell className="align-top font-mono text-xs text-slate-500">
                      {log.ipAddress}
                    </TableCell>

                    <TableCell className="align-top text-xs text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>

                    <TableCell className="align-top text-right">
                      <Badge
                        variant={log.status === 'success' ? 'success' : 'danger'}
                        size="sm"
                      >
                        {log.status === 'success' ? 'Success' : 'Denied'}
                      </Badge>
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
