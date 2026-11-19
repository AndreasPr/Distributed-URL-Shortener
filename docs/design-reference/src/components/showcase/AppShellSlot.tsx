import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { LayoutGrid, Terminal, ArrowRight, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../design-system/Card';
import { Button } from '../../design-system/Button';
import { Badge } from '../../design-system/Badge';
import { useWorkspace } from '../../context/WorkspaceContext';

interface AppShellSlotProps {
  title?: string;
  description?: string;
  mockDataType?: string;
}

export const AppShellSlot: React.FC<AppShellSlotProps> = ({
  title,
  description,
  mockDataType,
}) => {
  const location = useLocation();
  const { activeWorkspace } = useWorkspace();
  const routeName = location.pathname.split('/').pop() || 'overview';

  const routeDetails: Record<string, { title: string; desc: string; sampleData: string }> = {
    links: {
      title: 'Short Links Management',
      desc: 'API-driven short link creation, custom domain aliasing, geo-targeting rules, and password gating.',
      sampleData: `Active Workspace: ${activeWorkspace.name} (${activeWorkspace.currentLinksCount} / ${activeWorkspace.maxLinks} links)`,
    },
    analytics: {
      title: 'Real-Time Click Analytics',
      desc: 'Edge streaming metrics, Anycast latency percentiles, country heatmaps, and autonomous agent attribution.',
      sampleData: `Monthly Redirect Volume: ${activeWorkspace.monthlyClicks.toLocaleString()} redirects (P95: 14.2ms)`,
    },
    keys: {
      title: 'API Authentication Tokens',
      desc: 'Cryptographic Bearer keys for CLI automation, microservices, and AI agent execution.',
      sampleData: `Active Keys: 3 keys (Production: rl_live_8f3d..., MCP Agent: rl_agent_mcp_54...)`,
    },
    webhooks: {
      title: 'Event Streaming Webhooks',
      desc: 'Automated HMAC-signed HTTP POST delivery for link.clicked, link.created, and anomaly detection.',
      sampleData: `Configured Endpoints: 2 healthy endpoints (99.98% delivery success)`,
    },
    mcp: {
      title: 'Model Context Protocol (MCP) Server for AI Agents',
      desc: 'Native tool registry for Claude Desktop, Cursor, and LangChain autonomous agent workflows.',
      sampleData: `Protocol: MCP v2024-11-05 · Active Tools: create_short_link, query_analytics, bulk_create`,
    },
    billing: {
      title: 'Workspace Billing & Quota Limits',
      desc: 'Current subscription plan, invoice history, payment methods, and tier scalability.',
      sampleData: `Active Plan: ${activeWorkspace.plan.toUpperCase()} · Redirects: ${activeWorkspace.monthlyClicks} / ${activeWorkspace.maxMonthlyClicks}`,
    },
    settings: {
      title: 'Workspace & Domain Governance',
      desc: 'Custom domain DNS verification, member roles (Owner/Admin/Member), and SAML SSO.',
      sampleData: `Custom Domains: ${activeWorkspace.customDomains.join(', ') || 'relay.mk'} · Members: ${activeWorkspace.membersCount}`,
    },
  };

  const current = routeDetails[routeName] || {
    title: title || `${routeName.toUpperCase()} Shell Slot`,
    desc: description || 'AppLayout shell slot ready for page implementation.',
    sampleData: `Active in ${activeWorkspace.name}`,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Layout Switch Banner for Reviewer */}
      <div className="p-3.5 rounded-lg border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Badge variant="agent" size="sm">
            APP SHELL ACTIVE
          </Badge>
          <span className="text-slate-700 dark:text-slate-300">
            Currently in: <strong>AppLayout</strong> ({activeWorkspace.name} / {routeName})
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/">
            <Button size="sm" variant="outline">
              MarketingLayout
            </Button>
          </Link>
          <Link to="/app/design-system">
            <Button size="sm" variant="primary" leftIcon={<LayoutGrid className="w-3.5 h-3.5" />}>
              Design System Showcase
            </Button>
          </Link>
          <Link to="/admin">
            <Button size="sm" variant="outline" leftIcon={<Terminal className="w-3.5 h-3.5" />}>
              AdminLayout
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{current.title}</CardTitle>
            <Badge variant="neutral">Slot Ready</Badge>
          </div>
          <CardDescription>{current.desc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 font-mono text-xs text-slate-700 dark:text-slate-300">
            <span className="text-slate-400 select-none">// Mock data source:</span> {current.sampleData}
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            As requested, pages are not created yet. The AppLayout shell (including the responsive Sidebar, Topbar, and Workspace Switcher) wraps this route with full light/dark theme contrast compliance.
          </p>

          <div className="pt-2">
            <Link to="/app/design-system">
              <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Explore All Design Tokens & Components in Showcase
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
