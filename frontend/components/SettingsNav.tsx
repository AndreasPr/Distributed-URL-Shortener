"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDemoMode } from "../lib/auth/demo-route";

export function SettingsNav() {
  const path = usePathname();
  const demo = useDemoMode();
  const links = demo ? [["Appearance", "/demo/settings"]] : [
    ["Appearance", "/settings"], ["Account", "/account"], ["API keys", "/app/keys"],
  ];
  return <nav aria-label="Settings sections" className="flex flex-wrap gap-2 border-b pb-4">
    {links.map(([label, href]) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined}
      className={`rounded-md border px-3 py-2 text-sm ${path === href ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}>
      {label}
    </Link>)}
  </nav>;
}
