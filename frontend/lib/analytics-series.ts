import { timestamp } from './link-dates';
export type DayClicks = { day: string; clicks: number };
export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
/** Local calendar arithmetic (not 24-hour subtraction) handles DST transitions. */
export function analyticsSeries(timestamps: string[], days: 7 | 30 | 90 = 30, now = new Date()) {
  const counts = new Map<string,number>();
  let first = Infinity, last = -Infinity, total = 0;
  for (const value of timestamps) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)) continue;
    const [year, month, day] = value.slice(0,10).split('-').map(Number);
    const calendar = new Date(Date.UTC(year,month-1,day));
    if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month-1 || calendar.getUTCDate() !== day) continue;
    const time = timestamp(value);
    if (!Number.isFinite(time)) continue;
    const key = localDayKey(new Date(time)); counts.set(key,(counts.get(key) || 0)+1);
    total++; first = Math.min(first,time); last = Math.max(last,time);
  }
  const today = new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const series: DayClicks[] = [];
  let last7 = 0, last30 = 0;
  for (let ago=89; ago>=0; ago--) {
    const date = new Date(today); date.setDate(today.getDate()-ago);
    const day = localDayKey(date), clicks = counts.get(day) || 0;
    if (ago<30) last30+=clicks; if (ago<7) last7+=clicks;
    if (ago<days) series.push({day,clicks});
  }
  const peak = series.reduce<DayClicks | null>((best,row) => row.clicks > (best?.clicks ?? 0) ? row : best,null);
  return {series,total,first:total ? new Date(first).toISOString():null,last:total ? new Date(last).toISOString():null,peak,last7,last30};
}
