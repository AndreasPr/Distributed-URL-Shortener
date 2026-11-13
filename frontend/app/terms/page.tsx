import Link from "next/link";
export default function Page() {
  return <main className="mx-auto max-w-2xl space-y-4 p-8"><h1 className="text-2xl font-bold">Terms of use</h1>
    <p><strong>Template, not legal advice. The operator must review and adapt this before public service launch.</strong></p>
    <p>Do not use Relaymark for phishing, malware, spam, impersonation, unlawful content, or attempts to evade abuse controls. You are responsible for destinations you submit.</p>
    <p>Link creation requires an active verified account or its authorized API key. The free plan defaults to 20 creations per user per UTC day and 200 active links per workspace. The operator may configure different limits.</p>
    <p>Automated checks are imperfect. Links can be warned about, disabled or removed after review. Availability and retention are not guaranteed by this portfolio deployment; there is no paid service or uptime commitment.</p>
    <p>Report suspected abuse through <Link className="underline" href="/abuse">the abuse contact</Link>. See <Link className="underline" href="/privacy">privacy and data rights</Link>.</p>
  </main>;
}
