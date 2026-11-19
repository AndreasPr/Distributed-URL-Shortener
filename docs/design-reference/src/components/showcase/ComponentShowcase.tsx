import React, { useState } from 'react';
import {
  Link2,
  Copy,
  Terminal,
  Shield,
  Activity,
  Layers,
  Sparkles,
  Bot,
  ExternalLink,
  Plus
} from 'lucide-react';
import {
  Button,
  Input,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  EmptyState,
  Skeleton,
  CodeBlock,
  StatCard,
  PricingCard,
  RelayLogo,
  RelayMotif
} from '../../design-system';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { mockShortLinks, mockBillingPlans, mockApiKeys } from '../../mock';

export const ComponentShowcase: React.FC = () => {
  const { toast } = useToast();
  const { isDark, toggleTheme } = useTheme();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('components');
  const [sampleInputVal, setSampleInputVal] = useState('api-v2-routing');
  const [sampleSelectVal, setSampleSelectVal] = useState('relay.mk');

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Design System & App Shell
            </span>
            <Badge variant="agent" size="sm">
              RELAYMARK v2.4
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Component Architecture & Tokens
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Calm, precise, developer-focused primitives designed for modern infrastructure. Fully compliant with WCAG AA contrast in both light and dark themes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            leftIcon={<span className="text-xs">{isDark ? '☀️' : '🌙'}</span>}
          >
            {isDark ? 'Preview Light Mode' : 'Preview Dark Mode'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              toast({
                title: 'Design System Verified',
                description: 'All 18 design components are responsive and contrast-tested.',
                variant: 'success',
              });
            }}
          >
            Test Toast
          </Button>
        </div>
      </div>

      {/* Tabs for Showcase Categories */}
      <Tabs defaultValue="components" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="components">UI Components</TabsTrigger>
          <TabsTrigger value="data-display">Tables & CodeBlocks</TabsTrigger>
          <TabsTrigger value="stat-pricing">Stats & Pricing Cards</TabsTrigger>
          <TabsTrigger value="feedback-empty">Dialogs & Feedback</TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* TAB 1: UI COMPONENTS */}
        {/* ========================================================================= */}
        <TabsContent value="components" className="space-y-6">
          {/* Buttons Matrix */}
          <Card>
            <CardHeader>
              <CardTitle>Button Primitives</CardTitle>
              <CardDescription>
                Accessible, single-line actions with loading, icons, and keyboard focus rings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary Action</Button>
                <Button variant="secondary">Secondary Action</Button>
                <Button variant="outline">Outline Action</Button>
                <Button variant="ghost">Ghost Action</Button>
                <Button variant="destructive">Destructive Action</Button>
                <Button variant="link">Inline Link</Button>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
                <Button size="sm" variant="primary">Small (sm)</Button>
                <Button size="md" variant="primary">Medium (md)</Button>
                <Button size="lg" variant="primary">Large (lg)</Button>
                <Button size="md" variant="primary" isLoading>Loading State</Button>
                <Button size="md" variant="outline" leftIcon={<Copy className="w-3.5 h-3.5" />}>
                  With Icon
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Form Controls: Inputs & Selects */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Input Component</CardTitle>
                <CardDescription>
                  Supports custom addons, icons, monospace styling for short codes, and error states.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Short Link Custom Alias"
                  leftAddon="https://relay.mk/"
                  placeholder="custom-slug"
                  value={sampleInputVal}
                  onChange={(e) => setSampleInputVal(e.target.value)}
                  isMonospace
                  helperText="Alphanumeric, lowercase, and hyphens permitted."
                />

                <Input
                  label="Destination URL"
                  placeholder="https://example.com/long-target-path"
                  defaultValue="https://github.com/relaymark/mcp-server"
                />

                <Input
                  label="Target Path with Validation Error"
                  placeholder="invalid-route"
                  defaultValue="ftp://unsupported"
                  error="Only secure HTTP and HTTPS protocols are accepted."
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Select & Badges</CardTitle>
                <CardDescription>
                  Clean segmented tags and dropdown controls with WCAG AA light & dark contrast.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  label="Routing Domain Authority"
                  value={sampleSelectVal}
                  onChange={(e) => setSampleSelectVal(e.target.value)}
                  options={[
                    { value: 'relay.mk', label: 'relay.mk (Global Anycast)' },
                    { value: 'go.acme.dev', label: 'go.acme.dev (Verified Custom Domain)' },
                    { value: 'l.infra.cloud', label: 'l.infra.cloud (Internal VPC Only)' },
                  ]}
                  helperText="Edge certificates auto-renew every 90 days."
                />

                <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Badge Status Variants:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">Active Route</Badge>
                    <Badge variant="neutral">Neutral Tag</Badge>
                    <Badge variant="success">P95: 12ms</Badge>
                    <Badge variant="warning">Rate Limited</Badge>
                    <Badge variant="destructive">Expired</Badge>
                    <Badge variant="outline">Unpublished</Badge>
                    <Badge variant="agent">mcp:claude-agent</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: DATA DISPLAY (TABLE & CODEBLOCK) */}
        {/* ========================================================================= */}
        <TabsContent value="data-display" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>High-Density Table Component</CardTitle>
                <CardDescription>
                  Tabular numbers (`tabular-nums`), clean alignment, and subtle row hover highlights.
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                Create Link
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Short Link & Alias</TableHead>
                    <TableHead>Destination Target</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Author / Provenance</TableHead>
                    <TableHead isNumeric>Total Clicks</TableHead>
                    <TableHead isNumeric>Unique IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockShortLinks.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                            {link.domain}/{link.shortCode}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-slate-600 dark:text-slate-400">
                        {link.targetUrl}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            link.status === 'active'
                              ? 'success'
                              : link.status === 'expired'
                              ? 'destructive'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {link.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {link.createdBy.type === 'agent' ? (
                            <Bot className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          )}
                          <span className="text-[11px] text-slate-700 dark:text-slate-300">
                            {link.createdBy.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell isNumeric>{link.totalClicks.toLocaleString()}</TableCell>
                      <TableCell isNumeric>{link.uniqueVisitors.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* CodeBlocks for Developers & AI Agents */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  cURL REST Shorten Request
                </span>
                <span className="text-[11px] text-slate-500 font-mono">POST /v1/links</span>
              </div>
              <CodeBlock
                language="bash"
                title="Create Shortlink"
                code={`curl -X POST "https://api.relaymark.dev/v1/links" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "targetUrl": "https://github.com/relaymark/mcp-server",
    "shortCode": "agent-hub",
    "tags": ["mcp", "ai-agents"]
  }'`}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Claude Desktop MCP Configuration
                </span>
                <span className="text-[11px] text-slate-500 font-mono">claude_desktop_config.json</span>
              </div>
              <CodeBlock
                language="json"
                title="Model Context Protocol"
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
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: STATS & PRICING CARDS */}
        {/* ========================================================================= */}
        <TabsContent value="stat-pricing" className="space-y-8">
          {/* Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Link Redirects"
              value="142,850"
              change={{ value: '+14.2%', trend: 'up', label: 'vs last 7d' }}
              icon={<Activity className="w-4 h-4" />}
            />
            <StatCard
              title="Autonomous Agent Clicks"
              value="44,450"
              change={{ value: '+28.6%', trend: 'up', label: '31.1% of traffic' }}
              icon={<Bot className="w-4 h-4 text-indigo-500" />}
            />
            <StatCard
              title="Global P95 Edge Latency"
              value="14.2 ms"
              change={{ value: '-1.8ms', trend: 'up', label: 'Faster' }}
              icon={<Terminal className="w-4 h-4" />}
            />
            <StatCard
              title="Active API Webhooks"
              value="99.98%"
              change={{ value: 'Nominal', trend: 'neutral', label: '0 failures' }}
              icon={<Shield className="w-4 h-4 text-emerald-500" />}
            />
          </div>

          {/* Pricing Cards Grid */}
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Transparent Infrastructure Pricing
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Targeted by audience with concrete limits, low latency SLAs, and MCP agent tool execution.
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
                  ctaText={plan.monthlyPriceUsd === 0 ? 'Start Free' : 'Upgrade Workspace'}
                  onSelect={() => {
                    toast({
                      title: `Selected ${plan.name}`,
                      description: `Ready to provision ${plan.audience}.`,
                      variant: 'info',
                    });
                  }}
                />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 4: FEEDBACK, DIALOG & EMPTY STATES */}
        {/* ========================================================================= */}
        <TabsContent value="feedback-empty" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Modal Dialog Trigger */}
            <Card>
              <CardHeader>
                <CardTitle>Accessible Dialog (Modal)</CardTitle>
                <CardDescription>
                  Focus-trapped dialog with backdrop dismiss, escape key support, and accessible ARIA tags.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Click the button below to launch the modal dialog. Verify keyboard ESC dismiss and backdrop click.
                </p>
                <Button variant="primary" onClick={() => setIsDialogOpen(true)}>
                  Launch Modal Dialog
                </Button>
              </CardContent>
            </Card>

            {/* Skeleton Loaders */}
            <Card>
              <CardHeader>
                <CardTitle>Skeleton Loaders</CardTitle>
                <CardDescription>
                  Smooth shimmer animations matching table rows and text headers to eliminate layout shifts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton variant="circular" width={36} height={36} />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" />
                  </div>
                </div>
                <Skeleton variant="rectangular" height={48} className="w-full mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Empty State Component */}
          <Card>
            <CardHeader>
              <CardTitle>Empty State Component</CardTitle>
              <CardDescription>
                Clean vector illustration and call-to-action for uninitialized views.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                title="No Custom Domains Configured"
                description="Connect your company apex domain (e.g. go.yourbrand.dev) to broadcast verified short links across your AI agents and social channels."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => {
                      toast({
                        title: 'Connect Domain',
                        description: 'DNS CNAME instructions opened.',
                        variant: 'info',
                      });
                    }}
                  >
                    Add Custom Domain
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Interactive Modal Dialog Instance */}
      <Dialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate New API Authentication Key</DialogTitle>
            <DialogDescription>
              Create a cryptographic token for your command-line scripts or autonomous agent integrations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Input
              label="Token Name"
              placeholder="e.g. production-crawler-bot"
              defaultValue="mcp-agent-worker"
            />
            <Select
              label="Environment Scope"
              options={[
                { value: 'prod', label: 'Production (Full Access)' },
                { value: 'staging', label: 'Staging Sandbox' },
                { value: 'readonly', label: 'Read-Only Analytics' },
              ]}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsDialogOpen(false);
                toast({
                  title: 'API Key Created',
                  description: 'Prefix: rl_live_77ac90... Token copied to memory.',
                  variant: 'success',
                });
              }}
            >
              Generate Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
