import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Cpu, Zap, Shield, LayoutGrid, Terminal } from 'lucide-react';
import { Button } from '../../design-system/Button';
import { Badge } from '../../design-system/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../design-system/Card';
import { PricingCard } from '../../design-system/PricingCard';
import { RelayMotif } from '../../design-system/Icons';
import { mockBillingPlans } from '../../mock';
import { useToast } from '../../context/ToastContext';

export const MarketingPreview: React.FC = () => {
  const { toast } = useToast();

  return (
    <div className="w-full space-y-20 py-12 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Layout Switch Banner for Reviewer */}
      <div className="p-3.5 rounded-lg border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Badge variant="agent" size="sm">
            LAYOUT SHELL DEMO
          </Badge>
          <span className="text-slate-700 dark:text-slate-300">
            Currently previewing: <strong>MarketingLayout</strong> (Header + Content + Footer)
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/app/links">
            <Button size="sm" variant="primary" leftIcon={<LayoutGrid className="w-3.5 h-3.5" />}>
              Switch to AppLayout
            </Button>
          </Link>
          <Link to="/admin">
            <Button size="sm" variant="outline" leftIcon={<Terminal className="w-3.5 h-3.5" />}>
              Switch to AdminLayout
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto space-y-6 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-700 dark:text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Model Context Protocol (MCP) Server 2.4 Live</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
          API-First Link Infrastructure for Developers & AI Agents
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
          Ultra low-latency Anycast routing, cryptographic API keys, real-time click telemetry, and a native MCP server for autonomous agent workflows.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to="/app/links">
            <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Open App Console
            </Button>
          </Link>
          <Link to="/app/design-system">
            <Button size="lg" variant="outline" leftIcon={<LayoutGrid className="w-4 h-4" />}>
              View Design System
            </Button>
          </Link>
        </div>

        {/* Abstract Relay Graphic */}
        <div className="pt-8 flex justify-center">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] shadow-xs">
            <RelayMotif className="w-24 h-24 text-blue-600 dark:text-blue-400" />
            <p className="mt-3 text-[11px] font-mono text-slate-500">
              Deterministic Packet Routing · P95 &lt; 12ms
            </p>
          </div>
        </div>
      </section>

      {/* Feature Pillar Cards */}
      <section id="features" className="space-y-6">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Engineered for High Concurrency
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Built from first principles for programmatic access and autonomous agent execution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
                <Zap className="w-4.5 h-4.5" />
              </div>
              <CardTitle>Sub-12ms Anycast Latency</CardTitle>
              <CardDescription>
                Edge network across 320 global PoPs with in-memory Redis cluster caching ensures redirects happen before browsers finish DNS resolution.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
                <Bot className="w-4.5 h-4.5" />
              </div>
              <CardTitle>Native MCP Server for Agents</CardTitle>
              <CardDescription>
                Autonomous agents running in Claude Desktop, Cursor, or LangChain discover tools to shorten, inspect safety, and query telemetry without custom glue code.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2">
                <Shield className="w-4.5 h-4.5" />
              </div>
              <CardTitle>Cryptographic API Governance</CardTitle>
              <CardDescription>
                Scoped tokens, HMAC signature validation for webhooks, passkey protection, and complete audit provenance for every redirect event.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Pricing Preview with PricingCard */}
      <section id="pricing" className="space-y-6 pt-4">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Predictable Infrastructure Tiers
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Zero hidden fees. Generous redirect quotas with soft limits and self-hosted MCP options.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mockBillingPlans.map((plan) => (
            <PricingCard
              key={plan.id}
              name={plan.name}
              tagline={plan.tagline}
              audience={plan.audience}
              price={plan.monthlyPriceUsd}
              features={plan.features}
              isPopular={plan.isPopular}
              onSelect={() => {
                toast({
                  title: `Plan ${plan.name}`,
                  description: `Redirecting to workspace provisioning...`,
                  variant: 'info',
                });
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
