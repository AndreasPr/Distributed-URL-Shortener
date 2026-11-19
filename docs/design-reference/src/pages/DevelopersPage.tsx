import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Terminal,
  Code2,
  Bot,
  Webhook,
  KeyRound,
  Zap,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  Copy,
  Check,
  Activity,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { CodeBlock } from '../design-system/CodeBlock';
import { useToast } from '../context/ToastContext';

export const DevelopersPage: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'curl' | 'mcp' | 'node' | 'python'>('curl');

  const snippets = {
    curl: `# Create an Anycast short link with custom slug and tags
curl -X POST https://api.relaymark.com/v1/links \\
  -H "Authorization: Bearer <API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "target_url": "https://myapp.com/releases/v3.2.0?ref=agent",
    "custom_slug": "release-v3",
    "tags": ["ci", "release", "github-action"]
  }'`,

    mcp: `// Configure Relaymark MCP Server for Claude Desktop or Cursor
{
  "mcpServers": {
    "relaymark": {
      "command": "npx",
      "args": ["-y", "@relaymark/mcp-server"],
      "env": {
        "RELAYMARK_API_KEY": "EXAMPLE_PLACEHOLDER"
      }
    }
  }
}

// In chat, ask your agent:
// "Shorten this GitHub PR link and tell me the click analytics."`,

    node: `import { Relaymark } from '@relaymark/sdk';

const client = new Relaymark({ apiKey: process.env.RELAYMARK_API_KEY });

const link = await client.links.create({
  targetUrl: 'https://docs.mycompany.io/guides/quickstart',
  customSlug: 'quickstart',
  utmParams: {
    source: 'readme',
    medium: 'github',
    campaign: 'v4-launch'
  }
});

console.log('Created short link:', link.shortUrl);`,

    python: `from relaymark import Relaymark

client = Relaymark(api_key="EXAMPLE_PLACEHOLDER")

link = client.links.create(
    target_url="https://machinelearning.io/papers/transformer-v2.pdf",
    custom_slug="paper-v2",
    tags=["research", "arxiv"]
)

print(f"Short link live at: {link.short_url}")`,
  };

  return (
    <div className="w-full space-y-16 py-12 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* 1. Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="agent" size="sm">
          ENGINEERED FOR WORKERS & AGENTS
        </Badge>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Programmable link routing for developers & AI agents.
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          Clean REST APIs, sub-12ms Anycast edge redirects, cryptographically signed webhooks, and a native Model Context Protocol (MCP) server so autonomous agents can shorten, route, and inspect links.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to="/docs">
            <Button variant="primary" leftIcon={<BookOpen className="w-4 h-4" />}>
              Read API Documentation
            </Button>
          </Link>
          <Link to="/app/settings/keys">
            <Button variant="outline" leftIcon={<KeyRound className="w-4 h-4" />}>
              Generate API Key
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Interactive Code Studio */}
      <Card className="max-w-4xl mx-auto overflow-hidden">
        <div className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              API & MCP Quickstart
            </span>
          </div>

          <div className="flex items-center gap-1">
            {(['curl', 'mcp', 'node', 'python'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-xs rounded-md font-mono uppercase transition-colors cursor-pointer ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-[#0a0b12]">
          <CodeBlock
            code={snippets[activeTab]}
            language={activeTab === 'curl' ? 'bash' : activeTab === 'mcp' ? 'json' : activeTab}
          />
        </div>
      </Card>

      {/* 3. Core Developer Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Anycast Edge Routing
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Global BGP Anycast routes incoming requests to the closest edge point-of-presence, resolving 301/302 redirects with P95 latency under 12ms.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Model Context Protocol (MCP)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Plug-and-play MCP tools allow Claude, Cursor, and custom LLM agents to autonomously generate links, fetch analytics, and safely gate URLs.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Webhook className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              HMAC Signed Webhooks
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Stream live click events, QR scans, and threat detections to your backend with cryptographically verified SHA-256 signatures and exponential backoff retry.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Automated Safe Browsing
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Every target destination is evaluated against malware lists, phishing heuristics, and Google Safe Browsing before accepting redirect requests.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 4. MCP Deep Dive Section */}
      <div className="p-8 rounded-2xl border border-indigo-200 dark:border-indigo-950/40 bg-indigo-50/40 dark:bg-indigo-950/10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="agent" size="sm">
                STANDARDIZED PROTOCOL
              </Badge>
              <span className="text-xs font-mono text-indigo-700 dark:text-indigo-300">
                @relaymark/mcp-server
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Turn your AI assistant into a link routing orchestrator
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              Model Context Protocol is the open standard developed by Anthropic. Relaymark publishes a certified MCP server with three foundational primitives:
            </p>
          </div>

          <Link to="/app/mcp" className="shrink-0">
            <Button variant="primary" size="sm">
              Open Agent Playground
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-white/60 dark:border-white/10 bg-white dark:bg-[#0f111a] space-y-1.5">
            <code className="font-mono text-blue-600 dark:text-blue-400 font-bold">
              tool: create_short_link
            </code>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Allows the model to shorten messy deep links when outputting markdown documents or user summaries.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-white/60 dark:border-white/10 bg-white dark:bg-[#0f111a] space-y-1.5">
            <code className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              tool: get_link_analytics
            </code>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Retrieves click counts, referrer sources, and geo distribution to formulate campaign analysis.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-white/60 dark:border-white/10 bg-white dark:bg-[#0f111a] space-y-1.5">
            <code className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
              tool: inspect_threat_verdict
            </code>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Verifies if an untrusted web link submitted by a user contains malicious redirection or phishing indicators.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Bottom Call to Action */}
      <div className="text-center space-y-4 max-w-xl mx-auto">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Ready to build with Relaymark?
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Generate an API key in the console and make your first programmatic curl request in 60 seconds.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/login">
            <Button variant="primary">Create Developer Account</Button>
          </Link>
          <Link to="/docs">
            <Button variant="outline">Browse API Reference</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
