import type { ReactNode } from "react";
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <section className="rounded-lg border border-dashed p-8 text-center">
    <h2 className="text-lg font-semibold">{title}</h2>
    <p className="my-3 text-sm text-muted-foreground">{description}</p>
    {action}
  </section>;
}
