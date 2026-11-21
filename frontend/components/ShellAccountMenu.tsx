"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signOut } from "../lib/auth/browser";
import { designFont } from "../lib/design-font";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "./ui/dropdown-menu";
import { SessionLink } from "./SessionLink";
export function ShellAccountMenu() {
  const router = useRouter();
  if (process.env.NEXT_PUBLIC_LOCAL_AUTH === "true") return <SessionLink />;
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" aria-label="Account menu">Account</Button></DropdownMenuTrigger>
    <DropdownMenuContent data-design="v2" className={designFont.variable} align="end">
      <DropdownMenuItem asChild><Link href="/account">Account</Link></DropdownMenuItem>
      <DropdownMenuItem asChild><Link href="/settings">Settings</Link></DropdownMenuItem>
      <DropdownMenuItem onSelect={async () => { try { await signOut(); router.replace("/login"); router.refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Sign out failed"); } }}>Sign out</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
