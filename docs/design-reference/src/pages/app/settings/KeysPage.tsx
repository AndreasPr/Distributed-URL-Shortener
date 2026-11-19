import React, { useState } from 'react';
import {
  KeyRound,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Layers,
  CheckCircle2
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
import { ApiKey } from '../../../mock/types';

export const KeysPage: React.FC = () => {
  const { apiKeys, createApiKey, revokeApiKey } = useAppData();
  const { toast } = useToast();

  const [pageState, setPageState] = useState<PageDisplayState>('normal');
  const [copiedPrefix, setCopiedPrefix] = useState<string | null>(null);

  // Create Key Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [keyEnv, setKeyEnv] = useState<'production' | 'staging'>('production');
  const [selectedScopes, setSelectedScopes] = useState<ApiKey['scope']>([
    'links:read',
    'links:write',
  ]);

  // Show Secret Once Modal
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Revoke Key Confirmation Modal
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);

  const handleScopeToggle = (scope: ApiKey['scope'][number]) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    const { key, fullSecret } = createApiKey(keyName.trim(), selectedScopes, keyEnv);
    setIsCreateOpen(false);
    setKeyName('');
    setRevealedSecret(fullSecret);
  };

  const handleCopySecret = () => {
    if (!revealedSecret) return;
    navigator.clipboard.writeText(revealedSecret);
    setCopiedSecret(true);
    toast({
      title: 'Secret Key Copied',
      description: 'Saved full bearer token to clipboard.',
      variant: 'success',
    });
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleCopyPrefix = (prefix: string) => {
    navigator.clipboard.writeText(prefix);
    setCopiedPrefix(prefix);
    toast({
      title: 'Key Prefix Copied',
      description: prefix,
      variant: 'info',
    });
    setTimeout(() => setCopiedPrefix(null), 2000);
  };

  const handleConfirmRevoke = () => {
    if (keyToRevoke) {
      revokeApiKey(keyToRevoke.id);
      toast({
        title: 'API Key Revoked',
        description: `Permanently invalidated ${keyToRevoke.name}`,
        variant: 'info',
      });
      setKeyToRevoke(null);
    }
  };

  const displayedKeys = pageState === 'empty' ? [] : apiKeys;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Page State Simulator Control */}
      <PageStateSimulator
        currentState={pageState}
        onStateChange={setPageState}
        pageLabel="API Keys"
      />

      {/* ERROR STATE */}
      {pageState === 'error' && (
        <PageErrorAlert
          title="Vault Token Ingress Unavailable"
          message="Could not communicate with the secrets management cluster. API key revocations or generations are temporarily queued."
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
            <span>API Authentication Tokens</span>
            <Badge variant="agent" size="sm">
              {apiKeys.length} Active
            </Badge>
          </h2>
          <p className="text-xs text-slate-500">
            Cryptographic Bearer keys for CLI automation, backend microservices, and AI agent execution
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Generate New Key
        </Button>
      </div>

      {/* 3. API Keys Table */}
      <Card>
        <CardContent className="p-0">
          {pageState === 'loading' ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
                  <Skeleton variant="text" width="30%" height={16} />
                  <Skeleton variant="text" width="25%" height={16} />
                  <Skeleton variant="text" width="20%" height={16} />
                </div>
              ))}
            </div>
          ) : displayedKeys.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No active API keys"
                description="Generate an API key to authenticate programmatic HTTP requests and autonomous MCP agents."
                action={
                  <Button size="sm" variant="primary" onClick={() => setIsCreateOpen(true)}>
                    Generate First API Key
                  </Button>
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key Name</TableHead>
                  <TableHead>Token Identifier</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Allowed Scopes</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead isNumeric>Rate Limit</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                      {key.name}
                    </TableCell>

                    <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span>{key.prefix}</span>
                        <button
                          onClick={() => handleCopyPrefix(key.prefix)}
                          aria-label={`Copy prefix for ${key.name}`}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                        >
                          {copiedPrefix === key.prefix ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={key.environment === 'production' ? 'primary' : 'neutral'}
                        size="sm"
                      >
                        {key.environment}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {key.scope.map((s) => (
                          <span
                            key={s}
                            className="font-mono text-[10px] bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 px-1.5 py-0.2 rounded"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-500">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never used'}
                    </TableCell>

                    <TableCell isNumeric className="font-mono text-xs">
                      {key.rateLimitPerMin.toLocaleString()}/min
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setKeyToRevoke(key)}
                        className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1.5"
                        title="Revoke key"
                        aria-label={`Revoke ${key.name}`}
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

      {/* 4. CREATE KEY MODAL */}
      {isCreateOpen && (
        <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle>Generate API Key</DialogTitle>
                  <DialogDescription>
                    Create a scoped token for CI pipelines, scripts, or AI agent tools
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleCreateKey} className="space-y-4 py-1">
              <Input
                label="Key Description"
                placeholder="e.g. GitHub Actions CI, Claude Desktop MCP"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                required
                autoFocus
              />

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                  Environment
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setKeyEnv('production')}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                      keyEnv === 'production'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 font-semibold'
                        : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <p>Production</p>
                    <p className="text-[10px] text-slate-400 font-mono">rl_live_...</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setKeyEnv('staging')}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                      keyEnv === 'staging'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 font-semibold'
                        : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <p>Staging</p>
                    <p className="text-[10px] text-slate-400 font-mono">rl_test_...</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                  Granular Scopes
                </label>
                <div className="space-y-2 p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 text-xs">
                  {[
                    { id: 'links:read', label: 'links:read', desc: 'Query short links and metadata' },
                    { id: 'links:write', label: 'links:write', desc: 'Create, update, and delete short links' },
                    { id: 'analytics:read', label: 'analytics:read', desc: 'Retrieve click streams & geo metrics' },
                    { id: 'mcp:invoke', label: 'mcp:invoke', desc: 'Authorize Model Context Protocol agent tools' },
                    { id: 'webhooks:manage', label: 'webhooks:manage', desc: 'Configure webhook endpoints' },
                  ].map((scope) => (
                    <label key={scope.id} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(scope.id as any)}
                        onChange={() => handleScopeToggle(scope.id as any)}
                        className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {scope.label}
                        </span>
                        <p className="text-[11px] text-slate-500">{scope.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Generate Key
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* 5. SHOW SECRET ONCE MODAL */}
      {revealedSecret && (
        <Dialog isOpen={Boolean(revealedSecret)} onClose={() => setRevealedSecret(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle>API Key Generated</DialogTitle>
                  <DialogDescription>
                    Copy your API token now. For security, it will never be displayed again.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Store this secret key securely in your environment variables (<code className="font-mono">RELAYMARK_API_KEY</code>). Once you close this modal, Relaymark hashes the key and cannot recover the plaintext.
                </p>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40">
                <code className="flex-1 font-mono text-xs text-slate-900 dark:text-slate-100 select-all break-all">
                  {revealedSecret}
                </code>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleCopySecret}
                  leftIcon={copiedSecret ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {copiedSecret ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setRevealedSecret(null)}
              >
                I have saved my key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 6. REVOKE CONFIRMATION MODAL */}
      {keyToRevoke && (
        <Dialog isOpen={Boolean(keyToRevoke)} onClose={() => setKeyToRevoke(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle>Revoke API Key</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to permanently revoke this key?
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="py-2 text-xs text-slate-600 dark:text-slate-400 space-y-2">
              <p>
                Any active applications, scripts, or autonomous AI agents relying on <strong className="font-mono text-slate-900 dark:text-slate-100">{keyToRevoke.prefix}</strong> ({keyToRevoke.name}) will immediately fail with HTTP 401 Unauthorized.
              </p>
              <p className="text-rose-600 dark:text-rose-400 font-semibold">
                This action is irreversible.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setKeyToRevoke(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleConfirmRevoke}>
                Yes, Revoke Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
