"use client";

import { ReliabilityBanner } from "./ReliabilityBanner";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "./ui/tooltip";
import { Toaster } from "./ui/sonner";
export function Providers({ children, nonce }: { children: React.ReactNode; nonce: string }) {
  return (
    <ThemeProvider
      nonce={nonce}
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="relaymark-theme"
      disableTransitionOnChange
    >
      <TooltipProvider>
        <ReliabilityBanner />
        {children}
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}
