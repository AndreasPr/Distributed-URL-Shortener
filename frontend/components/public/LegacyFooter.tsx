"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { publicPaths } from "../../lib/content/public-pages";
/** Keep existing footer DOM untouched everywhere except the explicitly opted-in pages. */
export function LegacyFooter({ children }: { children: ReactNode }) {
  return publicPaths.includes(usePathname()) ? null : children;
}
