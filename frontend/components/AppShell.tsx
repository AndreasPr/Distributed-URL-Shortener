"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Link2,
  ChartNoAxesCombined,
  ShieldCheck,
  KeyRound,
  Settings,
  Activity,
  Menu,
  Search,
  Palette,
  Plus,
} from "lucide-react";
import { BrandMark } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "./ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "./ui/command";
import { DEMO_MODE } from "../lib/api";
const pages = [
  { href: "/dashboard", label: "Links", icon: Link2 },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { href: "/flagged", label: "Review queue", icon: ShieldCheck },
  { href: "/api-keys", label: "API keys", icon: KeyRound },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/health", label: "Health", icon: Activity },
  { href: "/design", label: "Design system", icon: Palette },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [command, setCommand] = useState(false);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommand((value) => !value);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const navigation = (
    <>
      <Link
        href="/"
        className="flex items-center gap-3 px-3 py-6 text-xl font-semibold"
        onClick={() => setMenu(false)}
      >
        <BrandMark />
        Relaymark
      </Link>
      <p className="px-3 pb-3 text-xs font-semibold tracking-widest text-muted-foreground">
        LINK WORKSPACE
      </p>
      <nav aria-label="Main navigation" className="space-y-1">
        {pages.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMenu(false)}
            aria-current={pathname === href ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${pathname === href ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <Icon size={18} aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
      <p className="mt-8 border-t px-3 pt-4 text-xs leading-relaxed text-muted-foreground">
        Small links.
        <br />A clearer picture.
      </p>
    </>
  );
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-100 focus:bg-card focus:p-4"
      >
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r bg-sidebar px-4 md:block">
        {navigation}
      </aside>
      <div className="min-h-screen md:pl-60">
        <header className="sticky top-0 z-30 flex h-18 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-8">
          <Dialog open={menu} onOpenChange={setMenu}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="md:hidden"
                aria-label="Open navigation"
              >
                <Menu />
              </Button>
            </DialogTrigger>
            <DialogContent className="top-0 left-0 h-dvh w-72 max-w-[85vw] translate-x-0 translate-y-0 content-start rounded-none sm:max-w-72">
              <DialogTitle className="sr-only">Navigation</DialogTitle>
              <DialogDescription className="sr-only">
                Choose a workspace page.
              </DialogDescription>
              {navigation}
            </DialogContent>
          </Dialog>
          <Dialog open={command} onOpenChange={setCommand}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="mr-auto justify-start text-muted-foreground sm:w-72"
                aria-label="Open command palette"
              >
                <Search size={16} />
                <span className="hidden sm:inline">Search workspace</span>
                <kbd className="ml-auto hidden text-xs sm:inline">
                  Ctrl / ⌘ K
                </kbd>
              </Button>
            </DialogTrigger>
            <DialogContent className="p-0 pt-5 sm:max-w-lg">
              <DialogTitle className="px-4">Go anywhere</DialogTitle>
              <DialogDescription className="sr-only">
                Search pages. Use arrow keys and Enter to navigate.
              </DialogDescription>
              <Command label="Search commands">
                <CommandInput
                  aria-label="Search commands"
                  placeholder="Search pages…"
                />
                <CommandList>
                  <CommandEmpty>No matching pages.</CommandEmpty>
                  <CommandGroup heading="Workspace">
                    {[
                      { href: "/", label: "Create link", icon: Plus },
                      ...pages,
                    ].map(({ href, label, icon: Icon }) => (
                      <CommandItem
                        key={href}
                        onSelect={() => {
                          setCommand(false);
                          router.push(href);
                        }}
                      >
                        <Icon size={16} aria-hidden />
                        {label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </DialogContent>
          </Dialog>
          <ThemeToggle />
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/">
              <Plus size={16} />
              Create link
            </Link>
          </Button>
        </header>
        {DEMO_MODE && (
          <aside
            aria-label="Demo mode"
            className="border-b bg-accent px-4 py-3 text-center text-xs leading-relaxed text-accent-foreground"
          >
            Demo mode: sample data, nothing is sent to a server. Run it yourself
            with make demo.
          </aside>
        )}
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
      </div>
    </>
  );
}
