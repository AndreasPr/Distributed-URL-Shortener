import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Link2,
  Search,
  Plus,
  Filter,
  Copy,
  Check,
  QrCode as QrIcon,
  Edit2,
  Trash2,
  ExternalLink,
  Lock,
  Calendar,
  Layers,
  ArrowUpDown,
  MoreVertical,
  CheckSquare,
  Square
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../design-system/Card';
import { Button } from '../../design-system/Button';
import { Input } from '../../design-system/Input';
import { Select } from '../../design-system/Select';
import { Badge } from '../../design-system/Badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../design-system/Table';
import { EmptyState } from '../../design-system/EmptyState';
import { Skeleton } from '../../design-system/Skeleton';
import { PageStateSimulator, PageErrorAlert, PageDisplayState } from '../../components/common/PageStateSimulator';
import { CreateEditLinkModal } from '../../components/links/CreateEditLinkModal';
import { QrCodeModal } from '../../components/links/QrCodeModal';
import { UtmBuilderModal } from '../../components/links/UtmBuilderModal';
import { CsvImportModal } from '../../components/links/CsvImportModal';
import { useAppData } from '../../context/AppDataContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { ShortLink } from '../../mock/types';
import { SlidersHorizontal } from 'lucide-react';

export const LinksPage: React.FC = () => {
  const {
    links,
    deleteLink,
    bulkDeleteLinks,
    openCreateLinkModal,
    isUtmModalOpen,
    openUtmModal,
    closeUtmModal,
    isCsvImportModalOpen,
    openCsvImportModal,
    closeCsvImportModal,
  } = useAppData();
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [pageState, setPageState] = useState<PageDisplayState>('normal');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived' | 'expired'>('all');
  const [creatorFilter, setCreatorFilter] = useState<'all' | 'human' | 'agent' | 'api'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [linkToEdit, setLinkToEdit] = useState<ShortLink | null>(null);
  const [selectedQrLink, setSelectedQrLink] = useState<ShortLink | null>(null);

  // Filtered links
  const filteredLinks = useMemo(() => {
    if (pageState === 'empty') return [];

    return links.filter((link) => {
      const matchesSearch =
        searchQuery === '' ||
        link.shortCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        link.targetUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
        link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        link.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || link.status === statusFilter;
      const matchesCreator = creatorFilter === 'all' || link.createdBy.type === creatorFilter;

      return matchesSearch && matchesStatus && matchesCreator;
    });
  }, [links, searchQuery, statusFilter, creatorFilter, pageState]);

  // Bulk Selection Handlers
  const handleSelectAll = () => {
    if (selectedIds.length === filteredLinks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLinks.map((l) => l.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast({
      title: 'Link Copied',
      description: url,
      variant: 'success',
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBulkCopy = () => {
    const urls = filteredLinks
      .filter((l) => selectedIds.includes(l.id))
      .map((l) => `https://${l.domain}/${l.shortCode}`)
      .join('\n');

    navigator.clipboard.writeText(urls);
    toast({
      title: 'Bulk Links Copied',
      description: `Copied ${selectedIds.length} short URLs to clipboard.`,
      variant: 'success',
    });
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected links?`)) {
      bulkDeleteLinks(selectedIds);
      toast({
        title: 'Links Deleted',
        description: `Successfully removed ${selectedIds.length} short links.`,
        variant: 'info',
      });
      setSelectedIds([]);
    }
  };

  const handleDeleteSingle = (link: ShortLink) => {
    if (window.confirm(`Delete short link ${link.domain}/${link.shortCode}?`)) {
      deleteLink(link.id);
      toast({
        title: 'Link Deleted',
        description: `Removed ${link.domain}/${link.shortCode}`,
        variant: 'info',
      });
    }
  };

  const handleOpenEdit = (link: ShortLink) => {
    setLinkToEdit(link);
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Page State Simulator Control */}
      <PageStateSimulator
        currentState={pageState}
        onStateChange={setPageState}
        pageLabel="Short Links Directory"
      />

      {/* ERROR STATE */}
      {pageState === 'error' && (
        <PageErrorAlert
          title="Failed to Load Short Links Directory"
          message="The API gateway experienced an SSL handshake timeout while synchronizing domain manifest records. Please verify routing rules."
          onRetry={() => {
            setPageState('loading');
            setTimeout(() => setPageState('normal'), 600);
          }}
        />
      )}

      {/* 2. Top Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Short Links Management</span>
            <Badge variant="neutral" size="sm">
              {filteredLinks.length} Links
            </Badge>
          </h1>
          <p className="text-xs text-slate-500">
            Search, filter, inspect analytics, and configure Anycast redirects in <strong>{activeWorkspace.name}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={openUtmModal}
            leftIcon={<SlidersHorizontal className="w-4 h-4" />}
          >
            UTM Builder
          </Button>

          <Button
            variant="outline"
            onClick={openCsvImportModal}
            leftIcon={<Layers className="w-4 h-4" />}
          >
            Import CSV
          </Button>

          <Button
            variant="primary"
            onClick={openCreateLinkModal}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Short Link
          </Button>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by slug, URL, title, or #tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0f111a] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
              />
            </div>

            {/* Status Filter */}
            <div className="sm:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                aria-label="Filter by link status"
                className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0f111a] text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active (Routing)</option>
                <option value="expired">Expired</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Creator Filter */}
            <div className="sm:col-span-3">
              <select
                value={creatorFilter}
                onChange={(e) => setCreatorFilter(e.target.value as any)}
                aria-label="Filter by creator type"
                className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0f111a] text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
              >
                <option value="all">All Creators</option>
                <option value="human">Human Developers</option>
                <option value="agent">AI Agents (MCP)</option>
                <option value="api">Automated CI/API</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions Banner (When items selected) */}
          {selectedIds.length > 0 && (
            <div className="p-2.5 rounded-lg border border-blue-500/40 bg-blue-50/70 dark:bg-blue-950/30 flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-blue-900 dark:text-blue-100">
                  {selectedIds.length} {selectedIds.length === 1 ? 'link' : 'links'} selected
                </span>
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Clear Selection
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkCopy}
                  leftIcon={<Copy className="w-3.5 h-3.5" />}
                >
                  Copy URLs
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleBulkDelete}
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Delete Selected
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Links Table */}
      <Card>
        <CardContent className="p-0">
          {pageState === 'loading' ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-100 dark:border-white/5">
                  <Skeleton variant="circular" width={18} height={18} />
                  <Skeleton variant="text" width="25%" height={16} />
                  <Skeleton variant="text" width="35%" height={16} />
                  <Skeleton variant="text" width="15%" height={16} />
                  <Skeleton variant="text" width="15%" height={16} />
                </div>
              ))}
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No matching short links"
                description={
                  searchQuery || statusFilter !== 'all' || creatorFilter !== 'all'
                    ? 'Try adjusting your search query or status filters.'
                    : 'Create your first short link to start routing traffic.'
                }
                action={
                  <Button size="sm" variant="primary" onClick={openCreateLinkModal}>
                    Create Short Link
                  </Button>
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <button
                      onClick={handleSelectAll}
                      aria-label="Select all links"
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                      {selectedIds.length === filteredLinks.length && filteredLinks.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>Short Link & Alias</TableHead>
                  <TableHead>Target Destination</TableHead>
                  <TableHead>Origin Creator</TableHead>
                  <TableHead isNumeric>Total Clicks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLinks.map((link) => {
                  const isSelected = selectedIds.includes(link.id);
                  const fullShortUrl = `https://${link.domain}/${link.shortCode}`;

                  return (
                    <TableRow key={link.id} data-state={isSelected ? 'selected' : undefined}>
                      {/* Checkbox */}
                      <TableCell className="w-10">
                        <button
                          onClick={() => handleToggleSelect(link.id)}
                          aria-label={`Select ${link.shortCode}`}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </TableCell>

                      {/* Short Link & Details */}
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold">
                            <Link
                              to={`/app/links/${link.id}`}
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {link.domain}/{link.shortCode}
                            </Link>

                            {link.hasPassword && (
                              <Lock className="w-3 h-3 text-amber-500" title="Password Gated" />
                            )}
                            {link.expiresAt && (
                              <Calendar className="w-3 h-3 text-slate-400" title={`Expires: ${link.expiresAt}`} />
                            )}
                          </div>

                          <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium truncate max-w-xs">
                            {link.title || link.shortCode}
                          </p>

                          {link.tags && link.tags.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap pt-0.5">
                              {link.tags.map((t) => (
                                <span
                                  key={t}
                                  className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-white/5 px-1.5 py-0.2 rounded"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Destination Target */}
                      <TableCell className="align-top text-xs text-slate-500 max-w-sm">
                        <a
                          href={link.targetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-slate-900 dark:hover:text-slate-100 break-all block truncate"
                          title={link.targetUrl}
                        >
                          {link.targetUrl}
                        </a>
                        <p className="text-[10px] text-slate-400 font-mono pt-1">
                          Created {new Date(link.createdAt).toLocaleDateString()}
                        </p>
                      </TableCell>

                      {/* Creator */}
                      <TableCell className="align-top text-xs">
                        {link.createdBy.type === 'agent' ? (
                          <div className="space-y-0.5">
                            <Badge variant="agent" size="sm">
                              {link.createdBy.name}
                            </Badge>
                            {link.createdBy.agentIdentifier && (
                              <p className="text-[10px] font-mono text-indigo-400 truncate max-w-[120px]">
                                {link.createdBy.agentIdentifier}
                              </p>
                            )}
                          </div>
                        ) : link.createdBy.type === 'api' ? (
                          <Badge variant="outline" size="sm">
                            API Worker
                          </Badge>
                        ) : (
                          <span className="text-slate-600 dark:text-slate-400">
                            {link.createdBy.name}
                          </span>
                        )}
                      </TableCell>

                      {/* Total Clicks */}
                      <TableCell isNumeric className="align-top font-semibold font-mono">
                        {link.totalClicks.toLocaleString()}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="align-top">
                        <Badge
                          variant={link.status === 'active' ? 'success' : 'neutral'}
                          size="sm"
                        >
                          {link.status}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="align-top text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Copy URL */}
                          <button
                            onClick={() => handleCopyLink(fullShortUrl, link.id)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                            title="Copy URL"
                            aria-label={`Copy URL for ${link.shortCode}`}
                          >
                            {copiedId === link.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* QR Code */}
                          <button
                            onClick={() => setSelectedQrLink(link)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                            title="Show QR Code"
                            aria-label={`Show QR for ${link.shortCode}`}
                          >
                            <QrIcon className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Link */}
                          <button
                            onClick={() => handleOpenEdit(link)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                            title="Edit Link Configuration"
                            aria-label={`Edit ${link.shortCode}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteSingle(link)}
                            className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 transition-colors"
                            title="Delete Short Link"
                            aria-label={`Delete ${link.shortCode}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Link Modal */}
      {isEditModalOpen && (
        <CreateEditLinkModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setLinkToEdit(null);
          }}
          linkToEdit={linkToEdit}
        />
      )}

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

      {/* UTM Builder Modal */}
      {isUtmModalOpen && (
        <UtmBuilderModal
          isOpen={isUtmModalOpen}
          onClose={closeUtmModal}
        />
      )}

      {/* Bulk CSV Import Modal */}
      {isCsvImportModalOpen && (
        <CsvImportModal
          isOpen={isCsvImportModalOpen}
          onClose={closeCsvImportModal}
        />
      )}
    </div>
  );
};
