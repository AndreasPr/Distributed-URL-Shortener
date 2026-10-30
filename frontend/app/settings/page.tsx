"use client";
import { useTheme } from "next-themes";
import { Button } from "../../components/ui/button";
export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-4 sm:p-8">
      <h1 className="text-3xl font-semibold">Settings</h1>
      <section className="space-y-4 rounded-xl border bg-card p-6">
        <h2 className="text-xl font-semibold">Appearance</h2>
        <p className="text-muted-foreground">
          Choose a theme. Only this preference is saved in your browser; API
          keys and sample edits are not persisted.
        </p>
        <div className="flex flex-wrap gap-3">
          {["light", "dark", "system"].map((value) => (
            <Button
              key={value}
              variant="outline"
              aria-pressed={theme === value}
              onClick={() => setTheme(value)}
              className="capitalize"
            >
              {value}
            </Button>
          ))}
        </div>
      </section>
    </main>
  );
}
