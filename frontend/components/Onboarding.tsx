"use client";
import { useDemoMode } from "../lib/auth/demo-route";
import Link from "next/link";
import { useEffect, useState } from "react";

// Non-sensitive, tab-only progress. Workspace switching remounts the checklist.
export function Onboarding() {
  const demo = useDemoMode();
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => {
    const update = (event: Event) =>
      setDone((previous) => [
        ...new Set([...previous, (event as CustomEvent<string>).detail]),
      ]);
    window.addEventListener("onboarding", update);
    return () => window.removeEventListener("onboarding", update);
  }, []);
  return (
    <section aria-label="First-run checklist" className="space-y-2">
      <h2 className="text-xl font-semibold">Get started</h2>
      <ul>
        {[
          ["create", "Create your first link"],
          ["copy", "Copy it"],
          ["analytics", "Open analytics"],
        ].map(([id, title]) => (
          <li key={id}>
            <span
              role="img"
              aria-label={done.includes(id) ? "Completed" : "Not completed"}
            >
              {done.includes(id) ? "✓" : "○"}
            </span>{" "}
            {id === "analytics" ? (
              <Link
                className="underline"
                href={demo ? "/demo/analytics" : "/analytics"}
                onClick={() => setDone([...done, "analytics"])}
              >
                {title}
              </Link>
            ) : (
              title
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
