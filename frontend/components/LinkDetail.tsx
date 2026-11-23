'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiClient, type Analytics, type UrlStatus, type URLEntry } from '../lib/api';
import { useDemoMode } from '../lib/auth/demo-route';
import { designFont } from '../lib/design-font';
import { shortLink } from '../lib/short-link';
import { formatDate } from '../lib/link-dates';
import { useWorkspaceIdentity } from './WorkspaceIdentity';
import { AnalyticsResults } from './AnalyticsResults';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog';
export default function LinkDetail({code}: {code: string}) {
  const demo = useDemoMode(), router = useRouter(), shared = useWorkspaceIdentity();
  const [result,setResult] = useState<{status:UrlStatus; analytics:Analytics; link?:URLEntry} | null>(null);
  const [error,setError] = useState(''), [missing,setMissing] = useState(false), [loading,setLoading] = useState(true), [attempt,setAttempt] = useState(0);
  const [confirm,setConfirm] = useState(false), [busy,setBusy] = useState(false), [deleteError,setDeleteError] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all([apiClient.getUrlStatus(code),apiClient.getAnalytics(code),apiClient.listUrls(100)]).then(([status,analytics,links]) => { if(active) setResult({status,analytics,link:links.find(link => link.short_code===code)}); }).catch(cause => {
      if(active) { setMissing(cause?.status===404); setError(cause instanceof Error ? cause.message : 'Could not load link.'); }
    }).finally(() => { if(active) setLoading(false); });
    return () => { active=false; };
  },[code,attempt]);
  const retry = () => { setLoading(true);setError('');setMissing(false);setAttempt(value => value+1); };
  async function remove() {
    setBusy(true);setDeleteError('');
    try { await apiClient.deleteUrl(code);setConfirm(false);toast.success('Link deleted.');router.push(demo ? '/demo/dashboard' : '/dashboard'); }
    catch(cause) { setDeleteError(cause instanceof Error ? cause.message : 'Could not delete link.'); }
    finally { setBusy(false); }
  }
  async function copy() { try { await navigator.clipboard.writeText(demo ? code : shortLink(code));toast.success('Copied.'); } catch { toast.error('Copy unavailable; select the link to copy it manually.'); } }
  return <main data-design="v2" className={`${designFont.variable} p-4 sm:p-8`}><div className="mx-auto max-w-5xl space-y-6">
    <h1 className="text-3xl font-semibold">Link detail</h1>
    {loading ? <p role="status">Loading link…</p> : missing ? <section><h2 className="text-xl">Link not found</h2><p>This link is unavailable in your workspace.</p></section> : error ? <div role="alert"><p>{error}</p><Button onClick={retry}>Retry</Button></div> : result && <>
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <p className="break-all font-mono">{demo ? code : shortLink(code)}</p><Button onClick={copy}>Copy</Button>
        {demo && <p>This is not a working redirect link.</p>}
        <p>Status: <Badge variant="secondary">{result.status.status}</Badge></p>
        <p>Expiry: {result.status.expires_at ? formatDate(result.status.expires_at) : 'No expiry'}</p>
        <p>Safety review: {result.status.verdict ?? 'Not available'}</p>
        {result.link ? <><p className="break-all">Destination: {result.link.long_url}</p><p>Created: {formatDate(result.link.created_at)}</p></> : <p>Destination not shown (not among your latest 100 links)</p>}
        {result.status.status==='blocked' && <p>This link is blocked by abuse review. <Link className="underline" href="/abuse">About abuse reporting</Link></p>}
      </div>
      <AnalyticsResults data={result.analytics} />
      {(demo || (shared?.identity && shared.identity.role!=='viewer')) && <Dialog open={confirm} onOpenChange={open => { if(!busy) setConfirm(open); }}>
        <DialogTrigger asChild><Button variant="outline" onClick={() => setDeleteError('')}>Delete link</Button></DialogTrigger>
        <DialogContent data-design="v2" className={designFont.variable}><DialogTitle>Delete link?</DialogTitle><DialogDescription>It will stop redirecting. This cannot be undone here.</DialogDescription>
          {deleteError && <p role="alert">{deleteError}</p>}
          <Button variant="outline" disabled={busy} onClick={() => setConfirm(false)}>Cancel</Button><Button disabled={busy} onClick={remove}>{busy ? 'Deleting…' : 'Confirm delete'}</Button>
        </DialogContent>
      </Dialog>}
    </>}
  </div></main>;
}
