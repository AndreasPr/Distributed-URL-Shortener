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
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  Info,
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
import { publicPaths } from "../lib/content/public-pages";
import { SessionLink } from "./SessionLink";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { WorkspaceIdentityProvider, useWorkspaceIdentity } from "./WorkspaceIdentity";
import { ShellAccountMenu } from "./ShellAccountMenu";
import { designFont } from "../lib/design-font";
const pages = [
  { href: "/dashboard", label: "Links", icon: Link2 },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { href: "/flagged", label: "Review queue", icon: ShieldCheck },
  { href: "/app/keys", label: "API keys", icon: KeyRound },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/health", label: "Health", icon: Activity },
  { href: "/design", label: "Design system", icon: Palette },
];
const isLegacy = (path: string) => ['/login', '/signup', '/forgot-password', '/reset-password', '/terms', '/privacy', '/abuse'].includes(path) || path.startsWith('/warn/') || path.startsWith('/report/');
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const realShell = !publicPaths.includes(path) && !isLegacy(path) && path !== '/demo' && !path.startsWith('/demo/');
  const shell = <Shell>{children}</Shell>;
  return realShell ? <WorkspaceIdentityProvider>{shell}</WorkspaceIdentityProvider> : shell;
}
function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const demo = pathname === '/demo' || pathname.startsWith('/demo/');
  const publicPage = pathname === '/' || ['/login', '/signup', '/forgot-password', '/reset-password', '/terms', '/privacy', '/abuse'].includes(pathname) || pathname.startsWith('/warn/') || pathname.startsWith('/report/');
  const pathFor = (href: string) => demo ? '/demo' + (href === '/' ? '' : href) : href;
  const shared = useWorkspaceIdentity();
  const visiblePages = pages.filter(page => page.href !== '/flagged' || demo || shared?.identity?.platform_admin === true);
  const [collapsed, setCollapsed] = useState(false);
  const scope = demo ? {} : { 'data-design': 'v2' };
  const font = demo ? '' : designFont.variable;
  const [generation, setGeneration] = useState(0);
  useEffect(() => { const change = () => setGeneration(v => v + 1); window.addEventListener("workspace-changed", change); return () => window.removeEventListener("workspace-changed", change) }, []);
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
  if (publicPaths.includes(pathname)) return <>{children}</>;
  if (publicPage) return <><header className="flex items-center justify-between border-b p-4"><Link href="/" className="font-semibold">Relaymark</Link><SessionLink /></header><div id="main-content">{children}</div></>;
  const navigation = (compact = false) => (
    <>
      <Link
        href="/"
        className="flex items-center gap-3 px-3 py-6 text-xl font-semibold"
        onClick={() => setMenu(false)}
      >
        <BrandMark />
        <span className={compact ? "sr-only" : undefined}>Relaymark</span>
      </Link>
      <p className={`${compact ? "sr-only" : ""} px-3 pb-3 text-xs font-semibold tracking-widest text-muted-foreground`}>
        LINK WORKSPACE
      </p>
      <nav aria-label="Main navigation" className="space-y-1">
        {visiblePages.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={pathFor(href)}
            onClick={() => setMenu(false)}
            aria-current={pathname === pathFor(href) ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${pathname === pathFor(href) ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <Icon size={18} aria-hidden />
            <span className={compact ? "sr-only" : undefined}>{label}</span>
          </Link>
        ))}
      </nav>
      <p className={`${compact ? "sr-only" : ""} mt-8 border-t px-3 pt-4 text-xs leading-relaxed text-muted-foreground`}>
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
      <div className={demo ? undefined : "flex items-start"}>
      <aside {...scope} className={`${font} ${demo ? "fixed inset-y-0 left-0" : "sticky top-0 h-dvh shrink-0"} hidden overflow-y-auto border-r px-4 md:block ${!demo && collapsed ? "w-20" : "w-60"} ${demo ? "bg-sidebar" : "bg-background"}`}>
        {navigation(!demo && collapsed)}
        {!demo && <Button variant="ghost" size="icon" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</Button>}
      </aside>
      <div className={`min-h-screen min-w-0 ${demo ? "md:pl-60" : "flex-1"}`}>
        <header {...scope} className={`${font} sticky top-0 z-30 flex items-center gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-8 ${demo ? "h-18" : "min-h-18 flex-wrap py-3"}`}>
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
            <DialogContent {...scope} className={`${font} top-0 left-0 h-dvh w-72 max-w-[85vw] translate-x-0 translate-y-0 content-start overflow-y-auto rounded-none sm:max-w-72 motion-reduce:animate-none`}>
              <DialogTitle className="sr-only">Navigation</DialogTitle>
              <DialogDescription className="sr-only">
                Choose a workspace page.
              </DialogDescription>
              {navigation()}
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
                <span className="hidden sm:inline">Go to page</span>
                <kbd className="ml-auto hidden text-xs sm:inline">
                  Ctrl / ⌘ K
                </kbd>
              </Button>
            </DialogTrigger>
            <DialogContent {...scope} className={`${font} p-0 pt-5 sm:max-w-lg motion-reduce:animate-none`}>
              <DialogTitle className="px-4">Go to page</DialogTitle>
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
                      { href: "/dashboard", label: "Create link", icon: Plus },
                      ...visiblePages,
                      { href: "/account", label: "Account", icon: UserRound },
                      { href: "/pricing", label: "Free plan limits", icon: Info },
                    ].map(({ href, label, icon: Icon }) => (
                      <CommandItem
                        key={label}
                        onSelect={() => {
                          setCommand(false);
                          router.push(["/account", "/pricing"].includes(href) ? href : pathFor(href));
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
          {!demo && <WorkspaceSwitcher />}
          {demo ? <Link href="/login">Sign in</Link> : <ShellAccountMenu />}
          <ThemeToggle />
          <Button asChild className="hidden sm:inline-flex">
            <Link href={pathFor("/dashboard")}>
              <Plus size={16} />
              Create link
            </Link>
          </Button>
        </header>
        {demo && (
          <aside
            aria-label="Demo mode"
            className="border-b bg-accent px-4 py-3 text-center text-xs leading-relaxed text-accent-foreground"
          >
            Demo mode: sample data, nothing is sent to a server. Run it yourself
            with make demo.
          </aside>
        )}
        <div key={generation} id="main-content" tabIndex={-1}>
          {children}
        </div>
      </div>
      </div>
    </>
  );
}
