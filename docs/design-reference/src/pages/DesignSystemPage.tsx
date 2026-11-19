import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Copy,
  Check,
  Terminal,
  Shield,
  Activity,
  Sparkles,
  Bot,
  ExternalLink,
  Plus,
  ArrowRight,
  Sun,
  Moon,
  Columns,
  Eye,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Key,
  Users,
  Search,
  BookOpen
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
  EmptyState,
  Skeleton,
  CodeBlock,
  StatCard,
  PricingCard,
  RelayLogo,
  RelayMotif
} from '../design-system';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { mockShortLinks, mockBillingPlans } from '../mock';

export const DesignSystemPage: React.FC = () => {
  const { toast } = useToast();
  const { isDark, toggleTheme } = useTheme();

  // Mode: 'live' (uses ambient theme), 'side-by-side' (renders light & dark side by side)
  const [displayMode, setDisplayMode] = useState<'side-by-side' | 'live'>('side-by-side');
  const [isDemoDialogOpen, setIsDemoDialogOpen] = useState(false);
  const [sampleInputVal, setSampleInputVal] = useState('routing-edge-v2');
  const [sampleSelectVal, setSampleSelectVal] = useState('relay.mk');

  // Trigger sample toasts
  const triggerToast = (variant: 'success' | 'error' | 'info' | 'destructive' | 'default') => {
    toast({
      title: `${variant.toUpperCase()} Notification`,
      description: `Demonstrating accessible ${variant} feedback with WCAG AA contrast.`,
      variant: variant as any,
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-10 px-4 sm:px-6 space-y-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Relaymark Infrastructure Primitives
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              WCAG AA Verified
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Design System & Component Library
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Calm, precise, developer-first components built for high-throughput link management and AI agent workflows. Review primitives in Light mode, Dark mode, or side-by-side.
          </p>
        </div>

        {/* View Mode Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center p-1 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5">
            <button
              onClick={() => setDisplayMode('side-by-side')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                displayMode === 'side-by-side'
                  ? 'bg-white dark:bg-[#0f111a] text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Side-by-Side (Dual Theme)</span>
            </button>
            <button
              onClick={() => setDisplayMode('live')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                displayMode === 'live'
                  ? 'bg-white dark:bg-[#0f111a] text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Live Theme ({isDark ? 'Dark' : 'Light'})</span>
            </button>
          </div>

          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
            <span>{isDark ? 'Switch to Light' : 'Switch to Dark'}</span>
          </button>
        </div>
      </div>

      {/* Side-by-Side Dual-Theme Notice */}
      {displayMode === 'side-by-side' && (
        <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              <strong>Dual-Theme Comparison:</strong> Each section below is rendered in both <strong>Light Mode</strong> (left) and <strong>Dark Mode</strong> (right) to ensure zero contrast degradation and complete visibility.
            </span>
          </div>
          <span className="hidden sm:inline font-mono text-[10px] text-blue-600 dark:text-blue-400 uppercase font-semibold">
            4.5:1 Contrast Minimum
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. COLOR TOKENS & CONTRAST RATIOS */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            01. Color Palette Tokens & Contrast
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Calm, precise neutral surfaces with deliberate semantic accents. No generic purple gradients.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] space-y-2">
            <div className="h-10 rounded-md bg-blue-600 flex items-center justify-center text-white font-mono text-[11px] font-bold">
              #2563EB
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-900 dark:text-white block">Primary Blue</span>
              <span className="text-[10px] text-slate-500 font-mono">CTAs & Focus Rings</span>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] space-y-2">
            <div className="h-10 rounded-md bg-indigo-600 flex items-center justify-center text-white font-mono text-[11px] font-bold">
              #4F46E5
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-900 dark:text-white block">Agent Violet</span>
              <span className="text-[10px] text-slate-500 font-mono">MCP Protocol & AI</span>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] space-y-2">
            <div className="h-10 rounded-md bg-emerald-600 flex items-center justify-center text-white font-mono text-[11px] font-bold">
              #059669
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-900 dark:text-white block">Success Green</span>
              <span className="text-[10px] text-slate-500 font-mono">Active Links & SLA</span>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] space-y-2">
            <div className="h-10 rounded-md bg-amber-500 flex items-center justify-center text-slate-950 font-mono text-[11px] font-bold">
              #F59E0B
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-900 dark:text-white block">Warning Amber</span>
              <span className="text-[10px] text-slate-500 font-mono">Rate Limits & Quota</span>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] space-y-2">
            <div className="h-10 rounded-md bg-rose-600 flex items-center justify-center text-white font-mono text-[11px] font-bold">
              #E11D48
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-900 dark:text-white block">Threat Rose</span>
              <span className="text-[10px] text-slate-500 font-mono">Abuse & Kill Switches</span>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] space-y-2">
            <div className="h-10 rounded-md bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-white font-mono text-[11px] font-bold">
              #0F172A
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-900 dark:text-white block">Neutral Canvas</span>
              <span className="text-[10px] text-slate-500 font-mono">Infrastructure Base</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. BUTTON PRIMITIVES (LIGHT VS DARK) */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            02. Button Primitives
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Single-line actions with WCAG AA contrast, loading spinners, and clear focus-visible outlines.
          </p>
        </div>

        {displayMode === 'side-by-side' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Light Mode Column */}
            <div className="p-6 rounded-xl border border-slate-200 bg-white text-slate-900 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-mono text-xs font-bold text-slate-500 uppercase">Light Theme Preview</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">bg-white</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <Button variant="primary" size="sm">Primary</Button>
                <Button variant="secondary" size="sm">Secondary</Button>
                <Button variant="outline" size="sm">Outline</Button>
                <Button variant="ghost" size="sm">Ghost</Button>
                <Button variant="destructive" size="sm">Destructive</Button>
                <Button variant="link" size="sm">Link Action</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
                <Button size="sm" variant="primary">Small</Button>
                <Button size="md" variant="primary">Medium</Button>
                <Button size="lg" variant="primary">Large</Button>
                <Button size="sm" variant="primary" isLoading>Loading</Button>
                <Button size="sm" variant="outline" disabled>Disabled</Button>
              </div>
            </div>

            {/* Dark Mode Column */}
            <div className="dark p-6 rounded-xl border border-white/10 bg-[#0a0b12] text-slate-100 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="font-mono text-xs font-bold text-slate-400 uppercase">Dark Theme Preview</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-slate-300 font-mono">bg-[#0a0b12]</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <Button variant="primary" size="sm">Primary</Button>
                <Button variant="secondary" size="sm">Secondary</Button>
                <Button variant="outline" size="sm">Outline</Button>
                <Button variant="ghost" size="sm">Ghost</Button>
                <Button variant="destructive" size="sm">Destructive</Button>
                <Button variant="link" size="sm">Link Action</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-white/5">
                <Button size="sm" variant="primary">Small</Button>
                <Button size="md" variant="primary">Medium</Button>
                <Button size="lg" variant="primary">Large</Button>
                <Button size="sm" variant="primary" isLoading>Loading</Button>
                <Button size="sm" variant="outline" disabled>Disabled</Button>
              </div>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary Action</Button>
                <Button variant="secondary">Secondary Action</Button>
                <Button variant="outline">Outline Action</Button>
                <Button variant="ghost">Ghost Action</Button>
                <Button variant="destructive">Destructive Action</Button>
                <Button variant="link">Link Style</Button>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
                <Button size="sm" variant="primary">Small (sm)</Button>
                <Button size="md" variant="primary">Medium (md)</Button>
                <Button size="lg" variant="primary">Large (lg)</Button>
                <Button size="md" variant="primary" isLoading>Loading State</Button>
                <Button size="md" variant="outline" leftIcon={<Copy className="w-3.5 h-3.5" />}>With Icon</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 3. FORM CONTROLS: INPUTS & SELECTS */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            03. Form Inputs & Selects
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Domain-specific inputs with custom domain prefix addons, monospace shortcodes, and error states.
          </p>
        </div>

        {displayMode === 'side-by-side' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Light Form Controls */}
            <div className="p-6 rounded-xl border border-slate-200 bg-white text-slate-900 space-y-4">
              <span className="font-mono text-xs font-bold text-slate-500 uppercase block border-b border-slate-100 pb-2">
                Light Mode Form Controls
              </span>
              <Input
                label="Custom Short Slug"
                leftAddon="https://relay.mk/"
                placeholder="developer-api"
                value={sampleInputVal}
                onChange={(e) => setSampleInputVal(e.target.value)}
                isMonospace
                helperText="Alphanumeric with hyphens permitted."
              />
              <Select
                label="Domain Authority"
                value={sampleSelectVal}
                onChange={(e) => setSampleSelectVal(e.target.value)}
                options={[
                  { value: 'relay.mk', label: 'relay.mk (Global Anycast)' },
                  { value: 'go.acme.dev', label: 'go.acme.dev (Custom Domain)' },
                ]}
              />
              <Input
                label="Destination Target (Error State)"
                defaultValue="ftp://invalid-target"
                error="Only HTTPS destinations are accepted for security."
              />
            </div>

            {/* Dark Form Controls */}
            <div className="dark p-6 rounded-xl border border-white/10 bg-[#0a0b12] text-slate-100 space-y-4">
              <span className="font-mono text-xs font-bold text-slate-400 uppercase block border-b border-white/5 pb-2">
                Dark Mode Form Controls
              </span>
              <Input
                label="Custom Short Slug"
                leftAddon="https://relay.mk/"
                placeholder="developer-api"
                value={sampleInputVal}
                onChange={(e) => setSampleInputVal(e.target.value)}
                isMonospace
                helperText="Alphanumeric with hyphens permitted."
              />
              <Select
                label="Domain Authority"
                value={sampleSelectVal}
                onChange={(e) => setSampleSelectVal(e.target.value)}
                options={[
                  { value: 'relay.mk', label: 'relay.mk (Global Anycast)' },
                  { value: 'go.acme.dev', label: 'go.acme.dev (Custom Domain)' },
                ]}
              />
              <Input
                label="Destination Target (Error State)"
                defaultValue="ftp://invalid-target"
                error="Only HTTPS destinations are accepted for security."
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5 space-y-4">
              <Input
                label="Custom Short Slug"
                leftAddon="https://relay.mk/"
                placeholder="developer-api"
                value={sampleInputVal}
                onChange={(e) => setSampleInputVal(e.target.value)}
                isMonospace
                helperText="Alphanumeric with hyphens permitted."
              />
              <Input
                label="Destination Target (Error State)"
                defaultValue="ftp://invalid-target"
                error="Only HTTPS destinations are accepted for security."
              />
            </Card>
            <Card className="p-5 space-y-4">
              <Select
                label="Domain Authority"
                value={sampleSelectVal}
                onChange={(e) => setSampleSelectVal(e.target.value)}
                options={[
                  { value: 'relay.mk', label: 'relay.mk (Global Anycast)' },
                  { value: 'go.acme.dev', label: 'go.acme.dev (Custom Domain)' },
                  { value: 'rel.dev', label: 'rel.dev (Internal)' },
                ]}
                helperText="Let's Encrypt certificates provisioned automatically."
              />
              <Input
                label="API Token Prefix (Read-Only)"
                value="rl_live_8f3d9942a1bc..."
                isMonospace
                disabled
              />
            </Card>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 4. BADGES & STATUS TAGS */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            04. Badges & Semantic Status Tags
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Clear contrast ratios for latency, MCP agents, threat states, and routing status.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl border border-slate-200 bg-white text-slate-900 space-y-3">
            <span className="font-mono text-xs font-bold text-slate-500 uppercase block">Light Badges</span>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Active Route</Badge>
              <Badge variant="neutral">Neutral Tag</Badge>
              <Badge variant="success">P95: 11.8ms</Badge>
              <Badge variant="warning">Rate Limited</Badge>
              <Badge variant="destructive">Expired</Badge>
              <Badge variant="outline">Unpublished</Badge>
              <Badge variant="agent">mcp:claude-agent</Badge>
            </div>
          </div>

          <div className="dark p-5 rounded-xl border border-white/10 bg-[#0a0b12] text-slate-100 space-y-3">
            <span className="font-mono text-xs font-bold text-slate-400 uppercase block">Dark Badges</span>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Active Route</Badge>
              <Badge variant="neutral">Neutral Tag</Badge>
              <Badge variant="success">P95: 11.8ms</Badge>
              <Badge variant="warning">Rate Limited</Badge>
              <Badge variant="destructive">Expired</Badge>
              <Badge variant="outline">Unpublished</Badge>
              <Badge variant="agent">mcp:claude-agent</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. DATA TABLES & TABULAR FIGURES */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            05. High-Density Tables & Tabular Numerals
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict vertical number alignment with tabular figures (`tabular-nums`), clean hover states, and responsive overflow.
          </p>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Short Link & Alias</TableHead>
                  <TableHead>Destination Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Author / Source</TableHead>
                  <TableHead isNumeric>Clicks</TableHead>
                  <TableHead isNumeric>P95 Latency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockShortLinks.slice(0, 3).map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>
                      <div className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                        {link.domain}/{link.shortCode}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs text-slate-500 truncate max-w-xs">
                        {link.targetUrl}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={link.status === 'active' ? 'success' : 'destructive'} size="sm">
                        {link.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {link.createdBy.name}
                      </span>
                    </TableCell>
                    <TableCell isNumeric>
                      <span className="font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        {link.totalClicks.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell isNumeric>
                      <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                        11.8 ms
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </section>

      {/* ========================================================================= */}
      {/* 6. CODEBLOCK & SKELETONS */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            06. Code Blocks & Skeleton Placeholders
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Syntax highlighted terminal code with one-click copy, and zero-layout-shift loading skeletons.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Terminal Code Block:
            </span>
            <CodeBlock
              language="bash"
              title="cURL Link Creation API"
              code={`curl -X POST "https://api.relaymark.dev/v1/links" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -d '{"targetUrl": "https://github.com/relaymark"}'`}
            />
          </div>

          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Skeleton Loading States:
            </span>
            <div className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] space-y-3">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-3 w-3/4" />
              <div className="grid grid-cols-3 gap-2 pt-2">
                <Skeleton className="h-14 rounded-lg" />
                <Skeleton className="h-14 rounded-lg" />
                <Skeleton className="h-14 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. STAT & PRICING CARDS */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            07. Stat Cards & Pricing Architecture
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Calm infrastructure telemetry with percentage trends, and clear limits-enforced pricing tiers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Redirect Hits"
            value="148,290"
            trend={+18.4}
            subtext="vs previous 30-day window"
          />
          <StatCard
            label="P95 Edge Latency"
            value="11.8 ms"
            trend={-4.2}
            subtext="Global Anycast average"
          />
          <StatCard
            label="MCP Tool Invocations"
            value="42,109"
            trend={+64.0}
            subtext="Autonomous agent pipeline"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {mockBillingPlans.map((plan) => (
            <PricingCard
              key={plan.id}
              name={plan.name}
              tagline={plan.tagline}
              audience={plan.audience}
              price={plan.monthlyPriceUsd}
              features={plan.features}
              isPopular={plan.isPopular}
              ctaText={plan.monthlyPriceUsd === 0 ? 'Free Tier' : 'Select Tier'}
              onSelect={() => triggerToast('info')}
            />
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. DIALOGS, EMPTY STATES & TOASTS */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            08. Dialogs, Feedback & Empty States
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Accessible modal dialogues, toast notifications, and helpful zero-data empty states.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Interactive Dialog Demo */}
          <Card className="p-6 space-y-4">
            <CardTitle>Accessible Dialog Trigger</CardTitle>
            <CardDescription>
              Traps focus, supports Escape key dismiss, and manages aria-modal attributes automatically.
            </CardDescription>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="primary" onClick={() => setIsDemoDialogOpen(true)}>
                Open Accessible Modal
              </Button>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Trigger Toast Notifications:
              </span>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => triggerToast('success')}>
                  Success Toast
                </Button>
                <Button size="sm" variant="outline" onClick={() => triggerToast('error')}>
                  Error Toast
                </Button>
                <Button size="sm" variant="outline" onClick={() => triggerToast('destructive')}>
                  Destructive Toast
                </Button>
                <Button size="sm" variant="outline" onClick={() => triggerToast('info')}>
                  Info Toast
                </Button>
              </div>
            </div>
          </Card>

          {/* Empty State Component */}
          <Card className="p-6">
            <EmptyState
              title="No Webhook Endpoints Active"
              description="Configure an HTTPS URL to receive real-time redirect and rate limit events."
              actionLabel="Add Webhook Endpoint"
              onAction={() => triggerToast('info')}
            />
          </Card>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. ACCESSIBILITY & REDUCED MOTION SPECIFICATION */}
      {/* ========================================================================= */}
      <section className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0a0b12] space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Accessibility (a11y) & Reduced Motion Invariants
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="space-y-1">
            <strong className="text-slate-900 dark:text-slate-200 block font-mono">
              WCAG AA Contrast
            </strong>
            <p>All body text exceeds 4.5:1 contrast against canvas and card surfaces in both themes.</p>
          </div>
          <div className="space-y-1">
            <strong className="text-slate-900 dark:text-slate-200 block font-mono">
              Keyboard Navigation
            </strong>
            <p>Every control has visible `focus-visible:ring-2` outline and can be navigated via Tab and Enter.</p>
          </div>
          <div className="space-y-1">
            <strong className="text-slate-900 dark:text-slate-200 block font-mono">
              Prefers-Reduced-Motion
            </strong>
            <p>All transitions respect user vestibular preferences by reducing or disabling translation animations.</p>
          </div>
        </div>
      </section>

      {/* Demo Dialog Modal */}
      {isDemoDialogOpen && (
        <Dialog
          isOpen={isDemoDialogOpen}
          onClose={() => setIsDemoDialogOpen(false)}
          title="Create Scoped API Key"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-400">
              Generated keys are hashed with Argon2id. The raw secret is displayed only once.
            </p>
            <Input
              label="Key Identifier Name"
              placeholder="e.g., ci-deploy-bot"
              defaultValue="production-worker-key"
            />
            <Select
              label="Environment Scope"
              defaultValue="production"
              options={[
                { value: 'production', label: 'Production (5,000 req/min)' },
                { value: 'development', label: 'Development (1,000 req/min)' },
              ]}
            />
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
              <Button variant="outline" size="sm" onClick={() => setIsDemoDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsDemoDialogOpen(false);
                  triggerToast('success');
                }}
              >
                Generate Key
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
