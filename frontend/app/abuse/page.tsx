import { ReportEntry } from "../../components/TrustPages";
import Link from "next/link";
export default function Page() {
  const contact = process.env.ABUSE_CONTACT_EMAIL;
  return <main className="mx-auto max-w-2xl space-y-4 p-8"><h1 className="text-2xl font-bold">Abuse and privacy contact</h1>
    <p><strong>Template, not legal advice.</strong></p>
    <p>The preferred way to report a Relaymark link is this form. Reports need no account and are protected by a security check.</p>
    <ReportEntry />
    {contact ? <p>Contact the operator: <a className="underline" href={`mailto:${contact}`}>{contact}</a></p> : <p role="status">The operator has not configured an abuse mailbox yet. Public launch is not ready until this contact is set.</p>}
    <p>Provide the short code and a concise explanation. Never send passwords, API keys or authentication tokens. Reports are reviewed; automated flags alone are not proof of wrongdoing.</p>
    <Link className="underline" href="/privacy">Privacy and retention</Link>
  </main>;
}
