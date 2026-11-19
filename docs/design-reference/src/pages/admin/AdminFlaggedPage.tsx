import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Ban,
  Eye,
  ExternalLink,
  Search,
  Filter,
  ArrowUpRight,
  UserCheck,
  Bot,
  User,
  Key,
  Info,
} from 'lucide-react';
import { Card } from '../../design-system/Card';
import { Badge } from '../../design-system/Badge';
import { Button } from '../../design-system/Button';
import { Input } from '../../design-system/Input';
import { Dialog } from '../../design-system/Dialog';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import { FlaggedLink } from '../../mock/types';

export const AdminFlaggedPage: React.FC = () => {
  const { flaggedLinks, disableFlaggedLink, dismissFlaggedReport, banWorkspaceByFlag } = useAppData();
  const { addToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'disabled' | 'dismissed'>('all');
  const [selectedLink, setSelectedLink] = useState<FlaggedLink | null>(null);
  const [confirmBanModal, setConfirmBanModal] = useState<FlaggedLink | null>(null);

  const filteredLinks = flaggedLinks.filter((item) => {
    const matchesSearch =
      item.shortUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.targetUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.workspaceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reportedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reason.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = flaggedLinks.filter((l) => l.status === 'pending').length;

  const handleDisable = (link: FlaggedLink) => {
    disableFlaggedLink(link.id);
    addToast({
      title: 'Shortlink Disabled',
      description: `${link.shortUrl} was immediately suspended and returns HTTP 451.`,
      variant: 'destructive',
    });
    if (selectedLink?.id === link.id) {
      setSelectedLink(null);
    }
  };

  const handleDismiss = (link: FlaggedLink) => {
    dismissFlaggedReport(link.id);
    addToast({
      title: 'Report Dismissed',
      description: `Report on ${link.shortUrl} was marked as false positive/dismissed.`,
      variant: 'default',
    });
    if (selectedLink?.id === link.id) {
      setSelectedLink(null);
    }
  };

  const handleConfirmBan = (link: FlaggedLink) => {
    banWorkspaceByFlag(link.workspaceId);
    addToast({
      title: 'Workspace Suspended',
      description: `Workspace "${link.workspaceName}" (${link.workspaceId}) was banned and all its links deactivated.`,
      variant: 'destructive',
    });
    setConfirmBanModal(null);
    if (selectedLink?.id === link.id) {
      setSelectedLink(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Abuse & Threat Moderation Queue
            </h1>
            {pendingCount > 0 && (
              <Badge variant="destructive" size="sm">
                {pendingCount} Pending Review
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Incoming telemetry reports from Google Safe Browsing, VirusTotal, and user complaints.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by shortlink, target URL, workspace, reporter, or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({flaggedLinks.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === 'pending'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-amber-500'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('disabled')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === 'disabled'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-500'
              }`}
            >
              Disabled ({flaggedLinks.filter((l) => l.status === 'disabled').length})
            </button>
            <button
              onClick={() => setStatusFilter('dismissed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === 'dismissed'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-emerald-500'
              }`}
            >
              Dismissed ({flaggedLinks.filter((l) => l.status === 'dismissed').length})
            </button>
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <Card className="border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/60 shadow-sm">
        {filteredLinks.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              No Flagged Items Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              There are no abuse reports matching the current filter parameters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Shortlink & Target Preview</th>
                  <th className="py-3 px-4">Workspace / Origin</th>
                  <th className="py-3 px-4">Threat Reason</th>
                  <th className="py-3 px-4">Reporter</th>
                  <th className="py-3 px-4">Clicks</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {filteredLinks.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                      item.status === 'disabled' ? 'opacity-70 bg-rose-500/5' : ''
                    }`}
                  >
                    {/* Link Preview */}
                    <td className="py-3.5 px-4 max-w-xs sm:max-w-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {item.shortUrl}
                        </span>
                        <button
                          onClick={() => setSelectedLink(item)}
                          className="p-1 rounded text-slate-400 hover:text-indigo-400 transition-colors"
                          title="Inspect destination details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs" title={item.targetUrl}>
                        ↳ {item.targetUrl}
                      </div>
                    </td>

                    {/* Workspace */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 dark:text-slate-200">
                        {item.workspaceName}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        {item.creatorType === 'agent' && (
                          <span className="text-indigo-500 flex items-center gap-0.5 font-bold">
                            <Bot className="w-3 h-3" /> Agent
                          </span>
                        )}
                        {item.creatorType === 'human' && (
                          <span className="text-slate-500 flex items-center gap-0.5">
                            <User className="w-3 h-3" /> Human
                          </span>
                        )}
                        {item.creatorType === 'api' && (
                          <span className="text-amber-500 flex items-center gap-0.5 font-mono">
                            <Key className="w-3 h-3" /> API Key
                          </span>
                        )}
                        <span>• {item.workspaceId}</span>
                      </div>
                    </td>

                    {/* Threat Reason */}
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          item.reason === 'phishing'
                            ? 'destructive'
                            : item.reason === 'malware'
                            ? 'destructive'
                            : item.reason === 'smishing'
                            ? 'warning'
                            : 'secondary'
                        }
                        size="sm"
                      >
                        {item.reason.toUpperCase()}
                      </Badge>
                    </td>

                    {/* Reporter */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-700 dark:text-slate-300 font-mono text-[11px] truncate max-w-[140px]" title={item.reportedBy}>
                        {item.reportedBy}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(item.reportedAt).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Click Count */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900 dark:text-slate-200">
                      {item.clickCount.toLocaleString()}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {item.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 text-amber-500 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          Pending
                        </span>
                      )}
                      {item.status === 'disabled' && (
                        <span className="inline-flex items-center gap-1 text-rose-500 font-medium">
                          <Ban className="w-3.5 h-3.5" />
                          Disabled
                        </span>
                      )}
                      {item.status === 'dismissed' && (
                        <span className="inline-flex items-center gap-1 text-emerald-500 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Dismissed
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.status !== 'disabled' ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDisable(item)}
                            className="text-xs h-7 px-2.5"
                          >
                            Disable Link
                          </Button>
                        ) : (
                          <span className="text-[11px] font-mono text-rose-400 italic mr-2">
                            Link Suspended
                          </span>
                        )}

                        {item.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDismiss(item)}
                            className="text-xs h-7 px-2.5"
                          >
                            Dismiss
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmBanModal(item)}
                          className="text-xs h-7 px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                          title="Ban entire workspace and suspend tenant"
                        >
                          Ban Workspace
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Link Detail Preview Modal */}
      {selectedLink && (
        <Dialog
          isOpen={Boolean(selectedLink)}
          onClose={() => setSelectedLink(null)}
          title="Threat Inspection & Link Details"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/80 space-y-2">
              <div>
                <span className="font-mono text-slate-500 block text-[10px] uppercase">Short URL</span>
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                  https://{selectedLink.shortUrl}
                </span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700/80 pt-2">
                <span className="font-mono text-slate-500 block text-[10px] uppercase">Destination Target</span>
                <div className="font-mono text-rose-600 dark:text-rose-400 break-all select-all font-medium">
                  {selectedLink.targetUrl}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Workspace</span>
                <span className="font-medium text-slate-900 dark:text-slate-200">{selectedLink.workspaceName}</span>
                <div className="font-mono text-[10px] text-slate-500">{selectedLink.workspaceId}</div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Reported By</span>
                <span className="font-mono text-slate-900 dark:text-slate-200">{selectedLink.reportedBy}</span>
                <div className="text-[10px] text-slate-500">{new Date(selectedLink.reportedAt).toLocaleString()}</div>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <span className="text-slate-400 block text-[10px] uppercase font-mono mb-1">Telemetry Report Details</span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {selectedLink.details}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedLink(null)}
                >
                  Close
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {selectedLink.status === 'pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDismiss(selectedLink)}
                  >
                    Dismiss Report
                  </Button>
                )}
                {selectedLink.status !== 'disabled' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDisable(selectedLink)}
                  >
                    Disable Link Immediately
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* Confirm Ban Workspace Dialog */}
      {confirmBanModal && (
        <Dialog
          isOpen={Boolean(confirmBanModal)}
          onClose={() => setConfirmBanModal(null)}
          title="Ban Workspace & Terminate Tenant"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">Destructive Operator Action</span>
                <span>
                  Banning workspace <strong className="text-white">"{confirmBanModal.workspaceName}"</strong> ({confirmBanModal.workspaceId}) will instantly revoke all API keys, deactivate all existing shortlinks with HTTP 451, and terminate active member sessions.
                </span>
              </div>
            </div>

            <p className="text-slate-600 dark:text-slate-400">
              Are you sure you want to proceed with banning this tenant? An immutable audit trail entry will be created.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmBanModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleConfirmBan(confirmBanModal)}
              >
                Confirm Ban Workspace
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
