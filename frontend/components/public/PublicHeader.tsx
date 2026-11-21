"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Menu } from "lucide-react";
import { BrandMark } from "../Brand";
import { SessionLink } from "../SessionLink";
import { ThemeToggle } from "../ThemeToggle";
import { Button } from "../ui/button";
import { publicCopy } from "../../lib/content/public-pages";
export function PublicHeader({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return <header className="border-b" onKeyDown={event => {
    if (event.key === "Escape" && open) { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
  }}>
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-5 sm:px-8">
      <Link href="/" className="flex items-center gap-2 text-xl font-semibold" aria-label="Relaymark home"><BrandMark />{publicCopy.brand}</Link>
      <Button ref={trigger} variant="outline" size="icon" className="sm:hidden" aria-label="Public menu" aria-expanded={open} aria-controls="public-navigation" onClick={() => setOpen(!open)}><Menu /></Button>
      <nav id="public-navigation" aria-label="Public navigation" className={`${open ? "flex" : "hidden"} w-full flex-col items-start gap-x-5 gap-y-3 text-sm font-medium sm:flex sm:w-auto sm:flex-row sm:items-center`} onClick={event => { if ((event.target as HTMLElement).closest('a')) setOpen(false); }}>
        {publicCopy.nav.map(item => <Link key={item.href} href={item.href} aria-current={path === item.href ? "page" : undefined} className="underline-offset-4 hover:underline">{item.label}</Link>)}
        <SessionLink /><ThemeToggle />
      </nav>
    </div>
  </header>;
}
