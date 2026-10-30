import ApiKeySettings from "../../components/ApiKeySettings";
export default function ApiKeysPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-4 sm:p-8">
      <h1 className="text-3xl font-semibold">API keys</h1>
      <p className="text-muted-foreground">
        Connect this tab to your local API. Create and revoke keys using the
        server CLI; this page does not issue credentials.
      </p>
      <section
        className="rounded-xl border bg-card p-6"
        aria-label="API credentials"
      >
        <ApiKeySettings />
      </section>
    </main>
  );
}
