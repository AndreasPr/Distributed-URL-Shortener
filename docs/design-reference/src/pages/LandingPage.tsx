import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Zap,
  Shield,
  BarChart3,
  Webhook,
  Users,
  Activity,
  CheckCircle2,
  Terminal,
  ChevronDown,
  QrCode,
  Sparkles,
  Copy,
  Download,
  Link2,
  Share2,
  Smartphone,
  Store,
  Compass,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { CodeBlock } from '../design-system/CodeBlock';
import { PricingCard } from '../design-system/PricingCard';
import { RelayMotif } from '../design-system/Icons';
import { mockBillingPlans, mockFaqs } from '../mock';
import { useToast } from '../context/ToastContext';
import { useAppData } from '../context/AppDataContext';

export const LandingPage: React.FC = () => {
  const { toast } = useToast();
  const { addLink } = useAppData();

  // Quick shorten box state
  const [inputUrl, setInputUrl] = useState('');
  const [shortenedResult, setShortenedResult] = useState<{
    shortUrl: string;
    originalUrl: string;
    code: string;
  } | null>(null);
  const [isShortening, setIsShortening] = useState(false);
  const [copied, setCopied] = useState(false);

  // Audience tabs: Creators | Small business | Marketers | Developers
  const [activeAudience, setActiveAudience] = useState<'creators' | 'business' | 'marketers' | 'developers'>('creators');

  // Secondary developer code snippet tab
  const [codeSnippetTab, setCodeSnippetTab] = useState<'api' | 'mcp'>('api');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  const handleQuickShorten = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    let target = inputUrl.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `https://${target}`;
    }

    setIsShortening(true);
    setTimeout(() => {
      const code = Math.random().toString(36).substring(2, 8);
      const newShort = addLink({
        targetUrl: target,
        shortCode: code,
        title: `Quick link for ${new URL(target).hostname}`,
      });

      setShortenedResult({
        shortUrl: `https://relay.mk/${newShort.shortCode}`,
        originalUrl: target,
        code: newShort.shortCode,
      });
      setIsShortening(false);
      setCopied(false);
      toast({
        title: 'Link Shortened!',
        description: `Ready to share: https://relay.mk/${newShort.shortCode}`,
        variant: 'success',
      });
    }, 450);
  };

  const handleCopyShortUrl = () => {
    if (!shortenedResult) return;
    navigator.clipboard.writeText(shortenedResult.shortUrl);
    setCopied(true);
    toast({
      title: 'Copied to Clipboard',
      description: shortenedResult.shortUrl,
      variant: 'default',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!shortenedResult) return;
    toast({
      title: 'QR Code Generated',
      description: `Downloaded PNG for ${shortenedResult.shortUrl}`,
      variant: 'success',
    });
  };

  const curlExample = `curl -X POST "https://api.relaymark.dev/v1/links" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "targetUrl": "https://mystore.com/summer-sale",
    "shortCode": "summer-26",
    "tags": ["social", "campaign"]
  }'`;

  const mcpExample = `// Autonomous Claude / Cursor tool call:
await mcp.callTool("create_short_link", {
  targetUrl: "https://docs.relaymark.dev/v2/routing-engine",
  shortCode: "routing-docs",
  tags: ["automated-research", "claude-worker"]
});

// Response:
// { "shortUrl": "https://relay.mk/routing-docs", "p95Latency": "11.8ms" }`;

  return (
    <div className="w-full space-y-20 sm:space-y-28 py-10 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* 1. Hero Section: User-first headline & Quick Shorten Box */}
      <section className="text-center max-w-4xl mx-auto space-y-6 pt-4 sm:pt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-700 dark:text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Simple Short Links, Custom QR Codes & Link-in-Bio</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
          Short links and QR codes you can trust. Simple for everyone, powerful for developers.
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
          Create clean branded links, dynamic QR codes, and customizable link-in-bio pages in seconds. When you need to scale, integrate our high-speed API and native MCP server for AI agents.
        </p>

        {/* Prominent Quick-Shorten Box */}
        <div className="max-w-2xl mx-auto mt-8">
          <div className="p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] shadow-lg text-left space-y-3">
            <form onSubmit={handleQuickShorten} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Paste a long link here to shorten (e.g. https://my-store.com/summer-sale)..."
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="w-full h-12 px-4 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0a0b12] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isShortening}
                className="h-12 px-6 shrink-0 text-sm font-semibold"
              >
                Shorten
              </Button>
            </form>

            {/* Shortened Result Card */}
            {shortenedResult && (
              <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-mono font-bold text-blue-600 dark:text-blue-400 block">
                      Short Link Ready
                    </span>
                    <a
                      href={shortenedResult.shortUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-base font-bold text-slate-900 dark:text-white hover:underline truncate block"
                    >
                      {shortenedResult.shortUrl}
                    </a>
                    <span className="text-xs text-slate-500 truncate block mt-0.5">
                      ↳ {shortenedResult.originalUrl}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCopyShortUrl}
                      leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={handleDownloadQr}
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                    >
                      Download QR
                    </Button>
                  </div>
                </div>

                {/* Soft Prompt: Create a free account */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600 dark:text-slate-400">
                    💡 <strong>Want to track clicks?</strong> Create a free account to customize your slug, inspect real-time click telemetry, and build your custom link-in-bio page.
                  </span>
                  <Link
                    to="/login"
                    className="font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0 whitespace-nowrap"
                  >
                    Create free account →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feature Pill Anchors */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 pt-2">
          <Link to="/qr-codes" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5 text-blue-500" />
            <span>Custom QR Codes</span>
          </Link>
          <span>·</span>
          <Link to="/link-in-bio" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
            <span>Link-in-Bio Pages</span>
          </Link>
          <span>·</span>
          <Link to="/use-cases" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-emerald-500" />
            <span>Use Cases</span>
          </Link>
          <span>·</span>
          <Link to="/developers" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-amber-500" />
            <span>Developer Hub & MCP</span>
          </Link>
        </div>
      </section>

      {/* 2. Audience Tabs: Creators, Small Business, Marketers, Developers */}
      <section className="space-y-8 max-w-5xl mx-auto">
        <div className="text-center space-y-2">
          <Badge variant="neutral" size="sm">
            BUILT FOR EVERY WORKFLOW
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Tailored tools for how you share
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            From single Instagram bio links to million-click automated marketing campaigns and AI agents.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex justify-center">
          <div className="inline-flex p-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 gap-1 overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveAudience('creators')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeAudience === 'creators'
                  ? 'bg-white dark:bg-[#0f111a] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              For Creators
            </button>
            <button
              onClick={() => setActiveAudience('business')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeAudience === 'business'
                  ? 'bg-white dark:bg-[#0f111a] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Small Business
            </button>
            <button
              onClick={() => setActiveAudience('marketers')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeAudience === 'marketers'
                  ? 'bg-white dark:bg-[#0f111a] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Marketers
            </button>
            <button
              onClick={() => setActiveAudience('developers')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeAudience === 'developers'
                  ? 'bg-white dark:bg-[#0f111a] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Developers & AI
            </button>
          </div>
        </div>

        {/* Tab Content Cards */}
        <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] shadow-sm">
          {activeAudience === 'creators' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                  Audience Showcase · Creators
                </span>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  One clean bio link for all your content and socials.
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Consolidate your YouTube videos, merchandise shop, podcast, and newsletter into a responsive mobile-friendly profile page. No advertisements, no clutter, and 100% customizable themes.
                </p>
                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Personalized handle: <strong>relay.mk/bio/yourname</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Custom background palettes, card shapes, and typography</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Real-time link click analytics without tracking cookies</span>
                  </li>
                </ul>
                <div className="pt-2">
                  <Link to="/link-in-bio">
                    <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Explore Link-in-Bio Editor
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Creator Mock Bio Preview */}
              <div className="max-w-xs mx-auto w-full p-4 rounded-3xl border-4 border-slate-800 bg-slate-900 text-white shadow-xl space-y-3 text-center">
                <div className="w-16 h-16 rounded-full mx-auto overflow-hidden border-2 border-white/20">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
                    alt="Creator Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Elena Chen</h4>
                  <p className="text-[11px] text-slate-400">Design systems & photography</p>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-medium hover:bg-slate-700 transition-colors">
                    📸 View Photography Portfolio
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-medium hover:bg-slate-700 transition-colors">
                    ☕ Support My Weekly Newsletter
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-medium hover:bg-slate-700 transition-colors">
                    🎙️ Latest Podcast Episode (Ep. 42)
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeAudience === 'business' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 uppercase">
                  Audience Showcase · Small Business
                </span>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  High-resolution QR codes for print, storefronts, and menus.
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Generate print-ready QR codes in SVG and high-resolution PNG. Update the target destination anytime without having to reprint your stickers, packaging, or table tents.
                </p>
                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Dynamic redirection: change destination URL anytime</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Vector SVG download with zero pixelation at any scale</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Custom brand colors and center logo placeholder</span>
                  </li>
                </ul>
                <div className="pt-2">
                  <Link to="/qr-codes">
                    <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Customize Your QR Codes
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Business QR Mock Card */}
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#07090e] text-center space-y-4 max-w-xs mx-auto">
                <div className="p-4 rounded-xl bg-white dark:bg-white inline-block shadow-sm">
                  {/* SVG QR Code Illustration */}
                  <svg className="w-36 h-36 mx-auto" viewBox="0 0 100 100" fill="none">
                    <rect x="0" y="0" width="100" height="100" fill="white" />
                    <rect x="10" y="10" width="24" height="24" fill="#0f172a" rx="3" />
                    <rect x="14" y="14" width="16" height="16" fill="white" />
                    <rect x="18" y="18" width="8" height="8" fill="#0f172a" />
                    <rect x="66" y="10" width="24" height="24" fill="#0f172a" rx="3" />
                    <rect x="70" y="14" width="16" height="16" fill="white" />
                    <rect x="74" y="18" width="8" height="8" fill="#0f172a" />
                    <rect x="10" y="66" width="24" height="24" fill="#0f172a" rx="3" />
                    <rect x="14" y="70" width="16" height="16" fill="white" />
                    <rect x="18" y="74" width="8" height="8" fill="#0f172a" />
                    <circle cx="50" cy="50" r="10" fill="#2563eb" />
                    <rect x="42" y="15" width="6" height="6" fill="#0f172a" />
                    <rect x="42" y="27" width="6" height="6" fill="#0f172a" />
                    <rect x="52" y="21" width="6" height="6" fill="#0f172a" />
                    <rect x="70" y="46" width="6" height="6" fill="#0f172a" />
                    <rect x="76" y="56" width="6" height="6" fill="#0f172a" />
                    <rect x="66" y="76" width="6" height="6" fill="#0f172a" />
                    <rect x="76" y="80" width="6" height="6" fill="#0f172a" />
                  </svg>
                </div>
                <div className="font-mono text-xs text-slate-500">
                  relay.mk/menu-autumn
                </div>
                <p className="text-[11px] text-slate-500">
                  Scan to view daily specials & reservation book
                </p>
              </div>
            </div>
          )}

          {activeAudience === 'marketers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                  Audience Showcase · Marketers
                </span>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Built-in UTM campaign tagging and bulk CSV generation.
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Stop wrestling with messy spreadsheets. Attach UTM source, medium, campaign, and content tags with our interactive builder, and import hundreds of URLs at once via CSV.
                </p>
                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Visual UTM builder with automatic Google Analytics 4 tags</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Bulk CSV import: generate up to 500 links in a single upload</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Compare channels (Newsletter vs Twitter vs LinkedIn) side-by-side</span>
                  </li>
                </ul>
                <div className="pt-2">
                  <Link to="/use-cases">
                    <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Read Marketing Use Cases
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Marketer UTM Builder Card */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#07090e] space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-2">
                  <span className="font-bold text-slate-900 dark:text-white">Campaign Attribution</span>
                  <Badge variant="success" size="sm">UTM Enabled</Badge>
                </div>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5">
                    <span className="text-slate-400">utm_source:</span>
                    <span className="text-blue-500 font-bold">newsletter</span>
                  </div>
                  <div className="flex justify-between p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5">
                    <span className="text-slate-400">utm_medium:</span>
                    <span className="text-emerald-500 font-bold">email</span>
                  </div>
                  <div className="flex justify-between p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5">
                    <span className="text-slate-400">utm_campaign:</span>
                    <span className="text-amber-500 font-bold">black_friday_2026</span>
                  </div>
                </div>
                <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/30 text-[11px] text-blue-800 dark:text-blue-300 font-mono break-all">
                  relay.mk/bf-sale?utm_source=newsletter&utm_medium=email
                </div>
              </div>
            </div>
          )}

          {activeAudience === 'developers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase">
                  Audience Showcase · Developers
                </span>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Programmatic Anycast redirects and native MCP server for AI.
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Sub-12ms Anycast edge latency across 320 global PoPs. Built with Go and Redis Cluster, providing real-time HMAC webhooks and Model Context Protocol (MCP) tooling for Claude and Cursor.
                </p>
                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>REST API with 5,000 req/min token-bucket rate limits</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Native MCP stdio & SSE transport for Claude Desktop & Cursor</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Real-time webhook events with HMAC-SHA256 signatures</span>
                  </li>
                </ul>
                <div className="pt-2">
                  <Link to="/developers">
                    <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Open Developer Hub
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Developer Code Teaser */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Terminal cURL Execution</span>
                  <span className="text-emerald-500">P95: 11.8ms</span>
                </div>
                <CodeBlock
                  language="bash"
                  title="Direct Edge Ingestion"
                  code={`curl -X POST "https://api.relaymark.dev/v1/links" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -d '{"targetUrl": "https://company.com/report"}'`}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. Secondary Developer Section: Building something? Use API or MCP */}
      <section className="p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-900 text-white space-y-8 max-w-5xl mx-auto shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800 pb-6">
          <div className="space-y-2 max-w-xl">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              Developer & Agent Infrastructure
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Building something? Use the API or the MCP server for AI agents.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Programmatic link creation, bulk ingestion, webhooks, and verified tools for autonomous AI agents like Claude Desktop and Cursor.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link to="/developers">
              <Button variant="primary" size="sm">
                Developer Hub
              </Button>
            </Link>
            <Link to="/docs">
              <Button variant="outline" size="sm">
                API Docs
              </Button>
            </Link>
          </div>
        </div>

        {/* API vs MCP Code Snippet */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-lg border border-slate-700">
              <button
                onClick={() => setCodeSnippetTab('api')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  codeSnippetTab === 'api'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                cURL REST API
              </button>
              <button
                onClick={() => setCodeSnippetTab('mcp')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  codeSnippetTab === 'mcp'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Model Context Protocol (MCP)
              </button>
            </div>

            <span className="hidden sm:inline font-mono text-[11px] text-slate-400">
              Anycast P95: 11.8ms
            </span>
          </div>

          {codeSnippetTab === 'api' ? (
            <CodeBlock
              language="bash"
              title="Create Short Link via cURL"
              code={curlExample}
            />
          ) : (
            <CodeBlock
              language="typescript"
              title="Invoke create_short_link via Claude / Cursor MCP Server"
              code={mcpExample}
            />
          )}
        </div>
      </section>

      {/* 4. Complete Platform Features Grid */}
      <section className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge variant="neutral" size="sm">
            ALL-IN-ONE LINK PLATFORM
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Everything you need in one place
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Eliminating bloat in favor of fast redirects, customizable QR codes, bio pages, and privacy-first analytics.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
                <Link2 className="w-4 h-4" />
              </div>
              <CardTitle>Short Links & Custom Slugs</CardTitle>
              <CardDescription>
                Clean branded links with custom back-halves, link expiration dates, and password protection for private sharing.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
                <QrCode className="w-4 h-4" />
              </div>
              <CardTitle>Dynamic QR Codes</CardTitle>
              <CardDescription>
                Customize foreground & background colors, add center logos, and download in PNG or vector SVG format for crisp physical printing.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2">
                <Smartphone className="w-4 h-4" />
              </div>
              <CardTitle>Link-in-Bio Pages</CardTitle>
              <CardDescription>
                Build a stunning, responsive bio profile page for your Instagram, TikTok, and Twitter followers with multiple designer themes.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-2">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <CardTitle>UTM Builder & Bulk CSV</CardTitle>
              <CardDescription>
                Track campaign source, medium, and term with our visual builder. Import and export hundreds of links at once using CSV.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-2">
                <BarChart3 className="w-4 h-4" />
              </div>
              <CardTitle>Real-Time Analytics</CardTitle>
              <CardDescription>
                Monitor total clicks, unique visitors, top countries, referrers, and separate human visitors from automated AI bots.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-2">
                <Shield className="w-4 h-4" />
              </div>
              <CardTitle>Abuse & Malware Quarantine</CardTitle>
              <CardDescription>
                Continuous threat scanning against Google Safe Browsing and commercial feeds to keep your visitors protected from malicious domains.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* 5. Pricing Teaser */}
      <section className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Start for free today. Upgrade when you need custom back-halves, unlimited QR codes, or team workspaces.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {mockBillingPlans.map((plan) => (
            <PricingCard
              key={plan.id}
              name={plan.name}
              tagline={plan.tagline}
              audience={plan.audience}
              price={plan.monthlyPriceUsd}
              features={plan.features.slice(0, 5)}
              isPopular={plan.isPopular}
              ctaText={plan.monthlyPriceUsd === 0 ? 'Start Free' : 'Choose Plan'}
              onSelect={() => {
                toast({
                  title: `Selected ${plan.name} Plan`,
                  description: 'Redirecting to checkout & workspace setup...',
                  variant: 'info',
                });
              }}
            />
          ))}
        </div>

        <div className="text-center pt-2">
          <Link
            to="/pricing"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            <span>View Full Pricing Comparison & Personal vs Developer Tiers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* 6. FAQ Section */}
      <section className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Common questions about link expiration, dynamic QR codes, and API limits.
          </p>
        </div>

        <div className="space-y-3">
          {mockFaqs.slice(0, 4).map((faq, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] overflow-hidden transition-colors"
            >
              <button
                onClick={() => toggleFaq(idx)}
                aria-expanded={openFaqIndex === idx}
                className="w-full flex items-center justify-between p-4 text-left font-medium text-xs sm:text-sm text-slate-900 dark:text-slate-100 cursor-pointer select-none"
              >
                <span>{faq.question}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
                    openFaqIndex === idx ? 'rotate-180 text-blue-600' : ''
                  }`}
                />
              </button>

              {openFaqIndex === idx && (
                <div className="px-4 pb-4 pt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-white/5 animate-in fade-in">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 7. Final Call to Action */}
      <section className="p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-[#0f111a] text-center space-y-4 max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
          Ready to create your first short link or QR code?
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
          Join thousands of creators, businesses, and developers who rely on Relaymark. Free forever, no credit card required.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to="/login">
            <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Get started for free
            </Button>
          </Link>
          <Link to="/pricing">
            <Button size="lg" variant="outline">
              Compare plans
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};
