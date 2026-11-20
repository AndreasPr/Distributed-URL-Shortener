import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./card";
export function StatCard({ title, value, description }: { title: string; value: string; description: string }) {
  return <Card><CardHeader><CardTitle role="heading" aria-level={2}>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
    <CardContent><p className="text-3xl font-semibold tabular-nums">{value}</p></CardContent></Card>;
}
