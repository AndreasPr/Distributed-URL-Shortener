/** Backend timestamps without an offset are UTC, never browser-local wall time. */
export function timestamp(value: string): number {
  return Date.parse(/(?:Z|[+-]\d\d:\d\d)$/i.test(value) ? value : `${value}Z`);
}
export function expiryState(value: string | null, now = Date.now()): 'none' | 'expired' | 'future' | 'invalid' {
  if (!value) return 'none';
  const time = timestamp(value);
  return !Number.isFinite(time) ? 'invalid' : time <= now ? 'expired' : 'future';
}
export function formatDate(value: string | null): string {
  if (!value || !Number.isFinite(timestamp(value))) return 'Unknown date';
  return new Date(timestamp(value)).toLocaleString();
}
export function linkStats(rows: { click_count: number; expires_at: string | null }[], now = Date.now()) {
  return {
    links: rows.length,
    clicks: rows.reduce((sum, row) => sum + row.click_count, 0),
    expired: rows.filter(row => expiryState(row.expires_at, now) === 'expired').length,
    expiring: rows.filter(row => row.expires_at && expiryState(row.expires_at, now) === 'future' && timestamp(row.expires_at) <= now + 7 * 86400000).length,
  };
}
