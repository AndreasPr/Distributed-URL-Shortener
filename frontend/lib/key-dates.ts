import { timestamp } from "./link-dates";

/** API TIMESTAMP values omit offsets; interpret them as UTC, not local wall time. */
export function formatKeyDate(value: string | null): string {
  if (value === null) return "Never used";
  const time = timestamp(value);
  if (!Number.isFinite(time)) return "Date unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
  }).format(new Date(time)) + " UTC";
}
