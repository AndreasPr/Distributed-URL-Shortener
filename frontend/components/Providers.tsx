"use client";
import { ApiKeyProvider } from "./ApiKeySettings";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "./ui/tooltip";
import { Toaster } from "./ui/sonner";
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="relaymark-theme"
      disableTransitionOnChange
    >
      <TooltipProvider>
        <ApiKeyProvider>
        {children}
        <Toaster />
      </ApiKeyProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
