"use client";
import { Toaster as Sonner } from "sonner";
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      closeButton
      toastOptions={{
        style: {
          background: "var(--popover)",
          color: "var(--popover-foreground)",
          borderColor: "var(--border)",
          fontFamily: "inherit",
        },
      }}
    />
  );
}
