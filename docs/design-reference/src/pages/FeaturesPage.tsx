import React from 'react';
import { Link } from 'react-router-dom';
import {
  Code2,
  BarChart3,
  Webhook,
  Bot,
  Shield,
  Activity,
  ArrowRight,
  Zap,
  Lock,
  Globe,
  Terminal,
  Cpu
} from 'lucide-react';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { CodeBlock } from '../design-system/CodeBlock';
import { StatCard } from '../design-system/StatCard';

export const FeaturesPage: React.FC = () => {
  return (
    <div className="w-full space-y-20 py-12 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <Badge variant="agent" size="sm">
          PLATFORM ARCHITECTURE
        </Badge>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Core Infrastructure Capabilities
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Six deeply integrated pillars engineered for software engineers, automated pipelines, and autonomous AI agents.
        </p>
      </div>

      {/* 1. REST & Command-Line API */}
      <section id="api" className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center pt-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Code2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Section 01 · Developer API
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Deterministic, Idempotent REST API
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Create single shortlinks or batch process thousands of URLs in milliseconds. Full support for custom slugs, passkey protection, expiration timestamps, and metadata tags.
          </p>

          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>Standard RFC 7807 problem details for programmatic error handling</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>Batch endpoint POST /v1/links/bulk with transactional idempotency</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>OpenAPI 3.1 & JSON Schema specifications available</span>
            </li>
          </ul>

          <div className="pt-2">
            <Link to="/docs#api-reference">
              <Button size="sm" variant="outline" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Read API Reference
              </Button>
            </Link>
          </div>
        </div>

        <div>
          <CodeBlock
            language="bash"
            title="cURL Link Creation with Tags"
            code={`curl -X POST "https://api.relaymark.dev/v1/links" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "targetUrl": "https://company.org/releases/v3.0.0",
    "shortCode": "v3-release",
    "tags": ["changelog", "production"],
    "expiresAt": "2026-12-31T23:59:59Z"
  }'`}
          />
        </div>
      </section>

      {/* 2. Real-Time Analytics */}
      <section id="analytics" className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center pt-8 border-t border-slate-200 dark:border-white/10">
        <div className="order-2 lg:order-1">
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Click Ingestion Latency"
              value="< 450 ms"
              subtitle="Streamed to dashboards"
              icon={<Zap className="w-4 h-4 text-emerald-500" />}
            />
            <StatCard
              title="GeoIP Edge Accuracy"
              value="99.4%"
              subtitle="Country, Region, City"
              icon={<Globe className="w-4 h-4 text-blue-500" />}
            />
            <StatCard
              title="Bot Traffic Classification"
              value="100% Non-JS"
              subtitle="Zero heavy client captcha"
              icon={<Bot className="w-4 h-4 text-indigo-500" />}
            />
            <StatCard
              title="Data Retention"
              value="90 Days"
              subtitle="Granular time-series"
              icon={<Activity className="w-4 h-4 text-amber-500" />}
            />
          </div>
        </div>

        <div className="space-y-4 order-1 lg:order-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Section 02 · Click Telemetry
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Real-Time Edge Analytics
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Understand exactly where your clicks originate. Our Anycast edge forwarders log country, referring domain, and device parameters without adding cookie banners or tracking pixels.
          </p>

          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span>Direct export to NDJSON or CSV for internal data warehouses</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span>Attribution breakdown: Human browsers vs Headless agent workers</span>
            </li>
          </ul>
        </div>
      </section>

      {/* 3. Event Webhooks */}
      <section id="webhooks" className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center pt-8 border-t border-slate-200 dark:border-white/10">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Webhook className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Section 03 · Event Streaming
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            HMAC-Signed Webhook Pipelines
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Trigger downstream actions in your own microservices or Slack notifications the instant an audience member clicks your short link or an agent creates a new route.
          </p>

          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              <span>Cryptographic header verification with X-Relaymark-Signature</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              <span>Configurable retry policies with exponential jitter</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              <span>Full request/response delivery logs in the developer console</span>
            </li>
          </ul>
        </div>

        <div>
          <CodeBlock
            language="json"
            title="Sample Webhook Payload (link.clicked)"
            code={`{
  "event": "link.clicked",
  "eventId": "evt_99ad24f0",
  "timestamp": "2026-11-05T12:00:15Z",
  "data": {
    "shortCode": "agent-gateway",
    "domain": "relay.mk",
    "targetUrl": "https://github.com/relaymark/mcp-server",
    "visitor": {
      "country": "US",
      "device": "desktop",
      "referrer": "GitHub README"
    }
  }
}`}
          />
        </div>
      </section>

      {/* 4. Model Context Protocol (MCP) for AI Agents */}
      <section id="mcp" className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center pt-8 border-t border-slate-200 dark:border-white/10">
        <div className="order-2 lg:order-1">
          <CodeBlock
            language="json"
            title="Claude Desktop & Cursor Configuration"
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
        </div>

        <div className="space-y-4 order-1 lg:order-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Bot className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Section 04 · Autonomous Agents
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Native Model Context Protocol (MCP) Server
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Eliminate fragile curl hallucinations from your LLM agent workflows. Relaymark implements the official MCP standard, giving Claude, Cursor, and OpenAI Swarm assistants verifiable tools.
          </p>

          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>create_short_link: Automated generation with structured tags</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>query_link_analytics: Programmatic telemetry lookup</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>inspect_link_safety: Pre-flight domain verification</span>
            </li>
          </ul>

          <div className="pt-2">
            <Link to="/docs#mcp">
              <Button size="sm" variant="outline" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Read MCP Guide
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Security Architecture */}
      <section id="security" className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center pt-8 border-t border-slate-200 dark:border-white/10">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Section 05 · Security & Governance
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Enterprise Security & Abuse Defense
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Link shorteners are frequent targets for phishing and malware distributors. We maintain multi-layer defense mechanisms at both ingress and forwarding layers.
          </p>

          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
              <span>Automated Google Safe Browsing and commercial feed scanning</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
              <span>Argon2id password hashing for sensitive redirect gating</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
              <span>Public /report intake and 2-minute emergency domain blacklisting</span>
            </li>
          </ul>

          <div className="pt-2">
            <Link to="/security">
              <Button size="sm" variant="outline" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Security Practices & Bug Bounty
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Continuous Threat Protection</CardTitle>
            <CardDescription>
              Every URL added or resolved is checked against real-time threat intelligence.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30 flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-900 dark:text-emerald-200">Safe Browsing API</span>
              <Badge variant="success" size="sm">Active (0ms overhead)</Badge>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/30 flex items-center justify-between text-xs">
              <span className="font-semibold text-blue-900 dark:text-blue-200">TLS Auto-Provisioning</span>
              <Badge variant="default" size="sm">Let’s Encrypt 2048-bit</Badge>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/30 flex items-center justify-between text-xs">
              <span className="font-semibold text-purple-900 dark:text-purple-200">Rate Limiter</span>
              <Badge variant="agent" size="sm">Redis Token Bucket</Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 6. System Observability */}
      <section id="observability" className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center pt-8 border-t border-slate-200 dark:border-white/10">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Activity className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Section 06 · Edge Observability
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Cluster Transparency & SLA Metrics
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Monitor our globally distributed forwarder nodes in real time. We publish live latency percentiles, uptime logs, and incident postmortems publicly.
          </p>

          <div className="pt-2 flex items-center gap-3">
            <Link to="/status">
              <Button size="sm" variant="primary" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Check Live Uptime & Status
              </Button>
            </Link>
            <Link to="/changelog">
              <Button size="sm" variant="outline">
                Changelog
              </Button>
            </Link>
          </div>
        </div>

        <div className="p-5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f111a] font-mono text-xs text-slate-700 dark:text-slate-300 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-200 dark:border-white/5">
            <span>METRIC PROBER</span>
            <span>VALUE</span>
          </div>
          <div className="flex justify-between">
            <span>HTTP P50 Latency</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">8.4 ms</span>
          </div>
          <div className="flex justify-between">
            <span>HTTP P95 Latency</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">14.2 ms</span>
          </div>
          <div className="flex justify-between">
            <span>HTTP P99 Latency</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold">22.8 ms</span>
          </div>
          <div className="flex justify-between">
            <span>Active Anycast PoPs</span>
            <span className="font-bold">320 PoPs</span>
          </div>
          <div className="flex justify-between">
            <span>Cluster 90-Day SLA</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">99.995%</span>
          </div>
        </div>
      </section>
    </div>
  );
};
