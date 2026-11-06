import Settings from "../../settings/page";
import Design from "../../design/page";
import Dashboard from "../../dashboard/page";
import Analytics from "../../analytics/page";
import Flagged from "../../flagged/page";
import Health from "../../health/page";
import ShortenForm from "../../../components/ShortenForm";
import { notFound } from "next/navigation";
export default async function Demo({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const path = (await params).path?.join("/") || "";
  if (!path)
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-3xl font-semibold mb-6">Explore Relaymark</h1>
        <ShortenForm />
      </main>
    );
  if (path === "dashboard") return <Dashboard />;
  if (path === "analytics") return <Analytics />;
  if (path === "flagged") return <Flagged />;
  if (path === "health") return <Health />;
  if (path === "settings") return <Settings />;
  if (path === "design") return <Design />;
  if (path === "app/keys")
    return (
      <main className="p-8">
        <h1 className="text-2xl">Sample workspace</h1>
        <p>Account settings and real API keys are available after sign-in.</p>
      </main>
    );
  notFound();
}
