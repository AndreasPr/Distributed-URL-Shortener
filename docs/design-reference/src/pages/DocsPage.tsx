import React, { useState } from 'react';
import {
  BookOpen,
  KeyRound,
  Code2,
  Bot,
  Zap,
  AlertCircle,
  Copy,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../design-system/Table';
import { Badge } from '../design-system/Badge';
import { Button } from '../design-system/Button';
import { CodeBlock } from '../design-system/CodeBlock';

export const DocsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('quickstart');

  const navSections = [
    { id: 'quickstart', label: 'Quickstart Guide', icon: Zap },
    { id: 'authentication', label: 'Authentication & Headers', icon: KeyRound },
    { id: 'api-reference', label: 'API Reference Sample', icon: Code2 },
    { id: 'mcp-guide', label: 'MCP Guide for AI Agents', icon: Bot },
    { id: 'rate-limits', label: 'Rate Limits & Quotas', icon: AlertCircle },
    { id: 'error-codes', label: 'HTTP Error Codes', icon: BookOpen },
  ];

  const errorCodes = [
    { code: '400 Bad Request', reason: 'Invalid JSON payload or malformed destination URL scheme.' },
    { code: '401 Unauthorized', reason: 'Missing or expired Bearer token in the Authorization header.' },
    { code: '403 Forbidden', reason: 'Token lacks required scope (e.g. attempting to create with a read-only key).' },
    { code: '404 Not Found', reason: 'Requested shortCode does not exist or has been deleted.' },
    { code: '409 Conflict', reason: 'Requested custom slug is already claimed within this domain.' },
    { code: '422 Unprocessable', reason: 'Destination URL was flagged as malicious by safety filters.' },
    { code: '429 Too Many Requests', reason: 'Rate limit or monthly link creation quota exhausted for current workspace.' },
    { code: '500 Server Error', reason: 'Internal edge forwarder fault. Automated alert dispatched to on-call.' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto py-10 px-4 sm:px-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sticky Documentation Sidebar */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="sticky top-20 space-y-2">
            <div className="px-2 pb-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Documentation Index
            </div>

            <nav className="space-y-1">
              {navSections.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      const el = document.getElementById(item.id);
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900'
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-slate-200 dark:border-white/10 px-2 space-y-2">
              <span className="text-[10px] text-slate-500 font-mono">SPEC: v2.4.1 (2026-11)</span>
              <a
                href="https://github.com/relaymark/mcp-server-relay"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
              >
                <span>GitHub Repository</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </aside>

        {/* Right Main Documentation Body */}
        <div className="lg:col-span-3 space-y-12">
          {/* Section 1: Quickstart */}
          <section id="quickstart" className="space-y-4 scroll-mt-24">
            <div className="border-b border-slate-200 dark:border-white/10 pb-3">
              <Badge variant="agent" size="sm">
                GETTING STARTED
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-2">
                Quickstart Guide
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                Learn how to authenticate, create your first short link via cURL, and resolve redirects under 12ms.
              </p>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Relaymark provides standard REST API endpoints at <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono text-[11px]">https://api.relaymark.dev/v1</code>. Every request expects JSON payloads and returns JSON responses with standard HTTP status codes.
            </p>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Step 1: Execute your first shorten request
              </span>
              <CodeBlock
                language="bash"
                title="Create Shortlink"
                code={`curl -X POST "https://api.relaymark.dev/v1/links" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "targetUrl": "https://example.com/deep/resource/path",
    "shortCode": "my-route",
    "tags": ["quickstart"]
  }'`}
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Step 2: Expected JSON Response (HTTP 201 Created)
              </span>
              <CodeBlock
                language="json"
                title="Response 201 Created"
                code={`{
  "code": "my-route",
  "shortUrl": "https://relay.mk/my-route",
  "targetUrl": "https://example.com/deep/resource/path",
  "createdAt": "2026-11-05T12:00:00Z",
  "clicks": 0,
  "isActive": true
}`}
              />
            </div>
          </section>

          {/* Section 2: Authentication */}
          <section id="authentication" className="space-y-4 scroll-mt-24 pt-6 border-t border-slate-200 dark:border-white/10">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Authentication & Headers
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Authenticate all API calls using Bearer tokens generated from your workspace dashboard.
              </p>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              API tokens start with environment-specific prefixes to prevent accidental usage of live tokens in staging environments:
            </p>

            <ul className="space-y-2 text-xs font-mono">
              <li className="flex items-center gap-2">
                <Badge variant="success" size="sm">rl_live_</Badge>
                <span className="font-sans text-slate-700 dark:text-slate-300">Production token. Live Anycast routing and permanent metrics.</span>
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="neutral" size="sm">rl_test_</Badge>
                <span className="font-sans text-slate-700 dark:text-slate-300">Staging sandbox token. Mock redirect endpoints for automated CI/CD.</span>
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="agent" size="sm">rl_agent_</Badge>
                <span className="font-sans text-slate-700 dark:text-slate-300">MCP Agent token. Grants tools to Claude Desktop, Cursor, or LangChain.</span>
              </li>
            </ul>

            <CodeBlock
              language="bash"
              title="Authentication Header"
              code={`Authorization: Bearer rl_live_8f3d9942a1bc`}
            />
          </section>

          {/* Section 3: API Reference Sample */}
          <section id="api-reference" className="space-y-4 scroll-mt-24 pt-6 border-t border-slate-200 dark:border-white/10">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                API Reference Sample
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Overview of the core REST endpoints available across all workspace tiers.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white font-mono">
                    POST
                  </span>
                  <code className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
                    /v1/links
                  </code>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Create a shortened URL with optional custom slug, expiration date, and password key.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white font-mono">
                    GET
                  </span>
                  <code className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
                    /v1/links/:code/analytics
                  </code>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Query real-time click volume, P95 latency, geographic breakdown, and agent vs human attribution.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white font-mono">
                    DELETE
                  </span>
                  <code className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
                    /v1/links/:code
                  </code>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Revoke a shortcode permanently. The route will return HTTP 410 Gone across all Anycast PoPs in &lt; 500ms.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: MCP Guide for AI Agents */}
          <section id="mcp-guide" className="space-y-4 scroll-mt-24 pt-6 border-t border-slate-200 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="agent" size="sm">
                  ANTHROPIC MCP SPEC
                </Badge>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
                Model Context Protocol (MCP) Guide
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Equip Claude Desktop, Cursor, or OpenAI Swarm agents with verified link routing tools.
              </p>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              To connect Relaymark as an MCP server in Claude Desktop, edit your <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono text-[11px]">claude_desktop_config.json</code>:
            </p>

            <CodeBlock
              language="json"
              title="claude_desktop_config.json"
              code={`{
  "mcpServers": {
    "relaymark": {
      "command": "npx",
      "args": ["-y", "@relaymark/mcp-server@latest"],
      "env": {
        "RELAYMARK_API_KEY": "rl_agent_mcp_5409a82"
      }
    }
  }
}`}
            />

            <div className="pt-2">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Tools Automatically Exposed to the Agent:
              </p>
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <li><code className="font-mono text-blue-600 dark:text-blue-400">create_short_link(targetUrl, shortCode?, tags?)</code>: Generates verified short URL.</li>
                <li><code className="font-mono text-blue-600 dark:text-blue-400">query_link_analytics(shortCode, period?)</code>: Retrieves click metrics and latency.</li>
                <li><code className="font-mono text-blue-600 dark:text-blue-400">inspect_link_safety(targetUrl)</code>: Scans destination security and SSL validity.</li>
              </ul>
            </div>
          </section>

          {/* Section 5: Rate Limits & Quotas */}
          <section id="rate-limits" className="space-y-4 scroll-mt-24 pt-6 border-t border-slate-200 dark:border-white/10">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Rate Limits & Quotas
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Enforced by Redis sliding window token buckets to guarantee infrastructure stability.
              </p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace Plan</TableHead>
                  <TableHead isNumeric>Burst Limit (req/sec)</TableHead>
                  <TableHead isNumeric>API Key Rate (req/min)</TableHead>
                  <TableHead isNumeric>Monthly Link Quota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-semibold">Free ($0)</TableCell>
                  <TableCell isNumeric>10 rps</TableCell>
                  <TableCell isNumeric>120 req/min</TableCell>
                  <TableCell isNumeric>50 links/mo</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold text-blue-600 dark:text-blue-400">Pro ($9/mo)</TableCell>
                  <TableCell isNumeric>50 rps</TableCell>
                  <TableCell isNumeric>1,200 req/min</TableCell>
                  <TableCell isNumeric>1,000 links/mo</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">Team ($29/mo)</TableCell>
                  <TableCell isNumeric>250 rps</TableCell>
                  <TableCell isNumeric>10,000 req/min</TableCell>
                  <TableCell isNumeric>10,000 links/mo</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </section>

          {/* Section 6: Error Codes */}
          <section id="error-codes" className="space-y-4 scroll-mt-24 pt-6 border-t border-slate-200 dark:border-white/10">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                HTTP Status & Error Codes
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Standard HTTP status codes paired with detailed JSON problem details.
              </p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">Status Code</TableHead>
                  <TableHead>Diagnostic Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errorCodes.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono font-semibold text-xs text-slate-900 dark:text-slate-100">
                      {item.code}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                      {item.reason}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </div>
      </div>
    </div>
  );
};
