"use client";
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { apiClient, APIError, type URLEntry } from '../lib/api';
import { useDemoMode } from '../lib/auth/demo-route';
import { shortLink } from '../lib/short-link';
import { expiryState, formatDate } from '../lib/link-dates';
import { designFont } from '../lib/design-font';
import { useWorkspaceIdentity } from './WorkspaceIdentity';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { EmptyState } from './ui/empty-state';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';

type Props = { entries: URLEntry[]; loading?: boolean; error?: string | null; reload: () => void };
export default function URLTable({ entries, loading, error, reload }: Props) {
  const demo = useDemoMode();
  const shared = useWorkspaceIdentity();
  const canDelete = demo || (!!shared?.identity && shared.identity.role !== 'viewer');
  const [selected, setSelected] = useState<URLEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const trigger = useRef<HTMLButtonElement | null>(null);
  const heading = useRef<HTMLParagraphElement | null>(null);
  async function remove() {
    if (!selected || busy) return;
    setBusy(true); setFailure('');
    try {
      let alreadyGone = false;
      try { await apiClient.deleteUrl(selected.short_code); }
      catch (error) { if (!(error instanceof APIError && error.status === 404)) throw error; alreadyGone = true; }
      setSelected(null); reload(); toast.success(alreadyGone ? 'Link unavailable; list refreshed.' : 'Link deleted.');
    } catch (error) { setFailure(error instanceof Error ? error.message : 'Could not delete link.'); }
    finally { setBusy(false); }
  }
  async function copy(entry: URLEntry) {
    try { await navigator.clipboard.writeText(demo ? entry.short_code : shortLink(entry.short_code)); toast.success('Copied.'); window.dispatchEvent(new CustomEvent('onboarding', { detail: 'copy' })); }
    catch { toast.error('Copy unavailable; select the link to copy it manually.'); }
  }
  return <section aria-label="Recent links" className="space-y-4">
    <p ref={heading} tabIndex={-1} className="text-sm text-muted-foreground">Showing the latest 20 links</p>
    {loading ? <div role="status" aria-label="Loading links" className="space-y-3"><span className="sr-only">Loading recent URLs...</span>{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      : error ? <div role="alert" className="rounded-lg border p-4"><p>{error}</p><Button variant="outline" onClick={reload}>Retry</Button></div>
      : !entries.length ? <EmptyState title="No links yet" description={canDelete ? "Create your first link using the form above." : "This workspace has no links to view."} action={canDelete ? <a className="underline" href="#create-link">Go to create form</a> : undefined} />
      : <table className="block w-full md:table md:table-fixed">
        <thead className="sr-only md:not-sr-only md:table-header-group"><tr>{['Short link','Destination','Clicks','Created','Expires','Actions'].map(label => <th key={label} scope="col" className="p-3 text-left text-sm">{label}</th>)}</tr></thead>
        <tbody className="block space-y-4 md:table-row-group md:space-y-0">{entries.map(entry => <tr key={entry.short_code} className="block rounded-lg border p-3 md:table-row md:rounded-none md:p-0">
          <td className="block break-all p-3 md:table-cell"><span className="block text-xs text-muted-foreground md:hidden">Short link</span><span className="font-mono text-sm">{demo ? entry.short_code : shortLink(entry.short_code)}</span><Button size="sm" variant="outline" className="mt-2" aria-label={`Copy ${entry.short_code}`} onClick={() => copy(entry)}>Copy</Button>{demo && <p className="text-xs">This is not a working redirect link.</p>}</td>
          <td className="block break-all p-3 text-sm md:table-cell"><span className="block text-xs text-muted-foreground md:hidden">Destination</span>{entry.long_url}</td>
          <td className="block p-3 md:table-cell"><span className="text-xs text-muted-foreground md:hidden">Clicks: </span>{entry.click_count}</td>
          <td className="block p-3 text-sm md:table-cell"><span className="block text-xs text-muted-foreground md:hidden">Created</span>{formatDate(entry.created_at)}</td>
          <td className="block break-words p-3 text-sm md:table-cell"><Badge variant="secondary" className="whitespace-normal">{expiryState(entry.expires_at) === 'expired' ? 'Expired' : expiryState(entry.expires_at) === 'none' ? 'No expiry' : expiryState(entry.expires_at) === 'invalid' ? 'Expiry unavailable' : `Expires ${formatDate(entry.expires_at)}`}</Badge></td>
          <td className="block p-3 md:table-cell">{canDelete && <Button variant="outline" size="sm" aria-label={`Delete ${entry.short_code}`} onClick={event => { trigger.current = event.currentTarget; setFailure(''); setSelected(entry); }}>Delete</Button>}</td>
        </tr>)}</tbody>
      </table>}
    <Dialog open={!!selected} onOpenChange={open => { if (!open && !busy) setSelected(null); }}>
      <DialogContent data-design="v2" className={designFont.variable} onCloseAutoFocus={event => { event.preventDefault(); (trigger.current?.isConnected ? trigger.current : heading.current)?.focus(); }}>
        <DialogTitle>Delete link?</DialogTitle><DialogDescription className="break-all">Remove {selected?.short_code}? It will stop redirecting. This cannot be undone here.</DialogDescription>
        {failure && <p role="alert">{failure}</p>}
        <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={busy} onClick={() => setSelected(null)}>Cancel</Button><Button disabled={busy} onClick={remove}>{busy ? 'Deleting…' : 'Confirm delete'}</Button></div>
      </DialogContent>
    </Dialog>
  </section>;
}
