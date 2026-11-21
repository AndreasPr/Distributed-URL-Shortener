import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";
import type { Metadata } from "next";
import { SessionLink } from "../SessionLink";
import { ThemeToggle } from "../ThemeToggle";
import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { CodeBlock } from "../ui/code-block";
import { BrandMark } from "../Brand";
import { contentFor, publicCopy, evidenceUrl, siteOrigin, repository } from "../../lib/content/public-pages";
import { changelog } from "../../lib/content/changelog";
const font = localFont({ src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2", variable: "--font-design", display: "swap", weight: "100 900" });
export function publicMetadata(path: string): Metadata {
  const content = contentFor(path);
  const title = `Relaymark | ${content.title.replace(/\.$/, "")}`;
  const url = new URL(path, siteOrigin).href;
  return { title, description: content.lead.text, alternates: { canonical: url }, openGraph: { title, description: content.lead.text, url, type: "website", images: ["/opengraph-image"] }, twitter: { card: "summary_large_image", title, description: content.lead.text } };
}
function EvidenceLink({ file }: { file: string }) {
  return <a className="mt-3 inline-block text-sm text-muted-foreground underline underline-offset-4" href={evidenceUrl(file)} rel="noopener noreferrer">{publicCopy.evidenceLabel}</a>;
}
export function PublicPage({ path, children }: { path: string; children?: ReactNode }) {
  const content = contentFor(path);
  const home = path === "/";
  const local = process.env.NEXT_PUBLIC_LOCAL_AUTH === "true";
  const contact = process.env.ABUSE_CONTACT_EMAIL;
  const apiOrigin = process.env.NEXT_PUBLIC_API_URL;
  return <div data-design="v2" data-public-page={path} className={`${font.variable} min-h-screen`}>
    <a href="#public-content" className="sr-only fixed left-4 top-4 z-50 rounded-md bg-primary p-3 text-primary-foreground focus:not-sr-only">{publicCopy.skip}</a>
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2 text-xl font-semibold" aria-label="Relaymark home"><BrandMark />{publicCopy.brand}</Link>
        <nav aria-label="Public navigation" className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-medium">
          {publicCopy.nav.map(item => <Link key={item.href} href={item.href} aria-current={path === item.href ? "page" : undefined} className="underline-offset-4 hover:underline">{item.label}</Link>)}
          <SessionLink />
          <ThemeToggle />
        </nav>
      </div>
    </header>
    <main id="public-content" tabIndex={-1} className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <header className={`mb-12 ${home ? "max-w-4xl" : "max-w-3xl"}`}>
        <p className="mb-5 text-xs font-semibold tracking-widest text-primary">{content.eyebrow}</p>
        <h1 className={`${home ? "text-5xl sm:text-7xl" : "text-4xl sm:text-5xl"} font-semibold tracking-tight`}>{content.title}</h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">{content.lead.text}</p>
        {home && <div className="mt-8 flex flex-wrap gap-3"><Button asChild><Link href={local ? "/dashboard" : "/login"}>{local ? publicCopy.local : publicCopy.login}</Link></Button><Button asChild variant="outline"><Link href="/demo">{publicCopy.demo}</Link></Button></div>}
        <EvidenceLink file={content.lead.evidence} />
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        {content.sections.map(section => <Card key={section.title}><CardHeader><CardTitle role="heading" aria-level={2}>{section.title}</CardTitle></CardHeader><CardContent className="space-y-5 leading-relaxed">
          {section.claims.map(item => <div key={item.text}><p>{item.text}</p><EvidenceLink file={item.evidence} /></div>)}
          {section.link && <Link className="inline-block font-medium text-primary underline underline-offset-4" href={section.link.href} rel={section.link.href.startsWith("https:") ? "noopener noreferrer" : undefined}>{section.link.label}</Link>}
        </CardContent></Card>)}
      </div>
      {home && <section className="mt-12 rounded-xl border bg-card p-5 sm:p-8" aria-labelledby="architecture-heading">
        <h2 id="architecture-heading" className="text-2xl font-semibold">{publicCopy.architectureTitle}</h2>
        <figure className="mt-6"><Image src="/architecture.svg" alt={publicCopy.architectureAlt} width={960} height={270} className="w-full rounded-md bg-white" />
          <figcaption className="mt-5 text-sm leading-relaxed text-muted-foreground">{publicCopy.architectureCaption.text}</figcaption></figure>
        <EvidenceLink file="docs/claims.md" />
      </section>}
      {path === "/developers" && <section className="mt-8 space-y-4">
        <p className="break-all text-sm text-muted-foreground">{apiOrigin ? `${publicCopy.originLabel} ${apiOrigin}` : publicCopy.originMissing}</p>
        <CodeBlock title={publicCopy.exampleTitle} code={publicCopy.curl} />
      </section>}
      {path === "/contact" && <section className="mt-8 rounded-lg border p-6">
        {contact ? <p>{publicCopy.contactLabel} <a className="break-all underline" href={`mailto:${contact}`}>{contact}</a></p> : <p role="status">{publicCopy.contactMissing.text}</p>}
      </section>}
      {path === "/changelog" && <ol className="space-y-5">{changelog.map(entry => <li key={entry.pr} className="rounded-lg border bg-card p-6">
        <p className="mb-2 text-sm text-muted-foreground"><time dateTime={entry.date}>{entry.date}</time> · {entry.step}</p>
        <h2 className="text-xl font-semibold">{entry.title}</h2>
        <a className="mt-3 inline-block text-primary underline" rel="noopener noreferrer" href={`${repository}/pull/${entry.pr}`}>PR #{entry.pr}</a>
      </li>)}</ol>}
      {children}
    </main>
    <footer className="border-t"><div className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-8">
      <nav aria-label="More about Relaymark" className="flex flex-wrap gap-5 text-sm">{publicCopy.more.map(item => <Link href={item.href} key={item.href} className="underline underline-offset-4">{item.label}</Link>)}</nav>
      <nav aria-label="Public footer" className="flex flex-wrap gap-5 text-sm text-muted-foreground">{publicCopy.footer.map(item => <Link href={item.href} key={item.href} className="underline underline-offset-4" rel={item.href.startsWith("https:") ? "noopener noreferrer" : undefined}>{item.label}</Link>)}</nav>
    </div></footer>
  </div>;
}
