"use client";
import { usePathname } from "next/navigation";
export function useDemoMode() {
  const path = usePathname();
  return path === "/demo" || path.startsWith("/demo/");
}
