'use client';
import { useMemo, useState } from 'react';
import type { Analytics } from '../lib/api';
import { analyticsSeries } from '../lib/analytics-series';
import { formatDate } from '../lib/link-dates';
import { StatCard } from './ui/stat-card';
import { EmptyState } from './ui/empty-state';
import { Button } from './ui/button';
import AnalyticsChart from './AnalyticsChart';
export const analyticsPrivacy = 'Relaymark records click time only. Country, device, browser, referrer and unique-visitor data are not collected.';
export function AnalyticsResults({ data }: {data: Analytics}) {
  const [days,setDays] = useState<7|30|90>(30);
  const [table,setTable] = useState(false);
  const [now] = useState(() => new Date());
  const result = useMemo(() => analyticsSeries(data.timestamps,days,now),[data.timestamps,days,now]);
  return <section className="space-y-5" aria-label="Click analytics">
    <p className="break-all font-mono">{data.short_code}</p>
    <p className="text-sm">Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Days follow your local calendar.</p>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard title="Total Clicks" value={String(data.total_clicks)} description="Reported by the analytics endpoint" />
      <StatCard title="Last 7 days" value={String(result.last7)} description="Calendar days including today" />
      <StatCard title="Last 30 days" value={String(result.last30)} description="Calendar days including today" />
      <StatCard title="First click" value={result.first ? formatDate(result.first) : 'None'} description="From valid recorded timestamps" />
      <StatCard title="Last click" value={result.last ? formatDate(result.last) : 'None'} description="From valid recorded timestamps" />
      <StatCard title="Peak day" value={result.peak ? `${result.peak.day} (${result.peak.clicks})` : 'None'} description="Within the selected window; earliest day wins ties" />
    </div>
    <label className="block">Visible window <select className="ml-2 rounded border bg-background p-2" value={days} onChange={e => setDays(Number(e.target.value) as 7|30|90)}>{[7,30,90].map(day => <option key={day} value={day}>Last {day} days</option>)}</select></label>
    {!result.total ? <EmptyState title="No clicks recorded" description="Click timestamps will appear here after processing." /> : <>
      {!result.series.some(day => day.clicks) && <p>No clicks in this window.</p>}
      <AnalyticsChart data={result.series} />
      <Button variant="outline" aria-expanded={table} aria-controls="click-table" onClick={() => setTable(!table)}>{table ? 'Hide table' : 'Show as table'}</Button>
      {table && <table id="click-table" className="w-full"><caption>Daily clicks in the selected window</caption><thead><tr><th scope="col">Local day</th><th scope="col">Clicks</th></tr></thead><tbody>{result.series.map(day => <tr key={day.day}><th scope="row" className="p-2 font-normal">{day.day}</th><td className="text-center">{day.clicks}</td></tr>)}</tbody></table>}
    </>}
    <p className="text-sm text-muted-foreground">{analyticsPrivacy}</p>
    {result.total !== data.total_clicks && <p role="status">The timestamp count differs from the reported total; invalid or incomplete records may be present.</p>}
  </section>;
}
