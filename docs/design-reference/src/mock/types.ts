/**
 * Relaymark Typed Mock Data Models
 * API-First Link Management for Developers & AI Agents
 */

export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  avatarUrl?: string;
  joinedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: 'developer' | 'team' | 'enterprise';
  membersCount: number;
  role: WorkspaceRole;
  currentLinksCount: number;
  maxLinks: number;
  monthlyClicks: number;
  maxMonthlyClicks: number;
  customDomains: string[];
}

export type LinkStatus = 'active' | 'archived' | 'expired' | 'rate_limited';

export interface LinkTargetRule {
  id: string;
  condition: 'country' | 'device' | 'agent' | 'percentage';
  matchValue: string;
  targetUrl: string;
}

export interface ShortLink {
  id: string;
  shortCode: string;
  domain: string;
  targetUrl: string;
  title: string;
  description?: string;
  tags: string[];
  status: LinkStatus;
  createdAt: string;
  updatedAt: string;
  lastClickedAt?: string;
  totalClicks: number;
  uniqueVisitors: number;
  createdBy: {
    type: 'human' | 'agent' | 'api';
    name: string;
    agentIdentifier?: string; // e.g. "mcp:cursor-agent", "mcp:claude-researcher"
  };
  hasPassword?: boolean;
  expiresAt?: string;
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
  rules?: LinkTargetRule[];
}

export interface ClickDataPoint {
  timestamp: string;
  clicks: number;
  humanClicks: number;
  agentClicks: number;
}

export interface GeographicMetric {
  countryCode: string;
  countryName: string;
  clicks: number;
  percentage: number;
}

export interface ReferrerMetric {
  source: string;
  clicks: number;
  percentage: number;
}

export interface DeviceMetric {
  deviceType: 'desktop' | 'mobile' | 'agent_headless' | 'tablet';
  clicks: number;
  percentage: number;
}

export interface LinkAnalytics {
  linkId: string;
  period: '24h' | '7d' | '30d' | '90d';
  totalClicks: number;
  humanClicks: number;
  agentInvocations: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  timeSeries: ClickDataPoint[];
  countries: GeographicMetric[];
  referrers: ReferrerMetric[];
  devices: DeviceMetric[];
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string; // e.g. "rl_live_8f3d..."
  scope: ('links:read' | 'links:write' | 'analytics:read' | 'mcp:invoke' | 'webhooks:manage')[];
  environment: 'production' | 'staging' | 'development';
  createdAt: string;
  lastUsedAt?: string;
  rateLimitPerMin: number;
  requestCount30d: number;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  description: string;
  status: 'healthy' | 'failing' | 'disabled';
  subscribedEvents: string[];
  successRate: number;
  lastDeliveryAt?: string;
  createdAt: string;
  secretPrefix: string;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  enabled: boolean;
  totalAgentCalls: number;
}

export interface McpServerConfig {
  serverName: string;
  version: string;
  protocolVersion: string;
  transport: 'stdio' | 'sse' | 'http';
  endpointUrl: string;
  activeAgentsCount: number;
  tools: McpToolDefinition[];
}

export interface BillingPlan {
  id: string;
  name: string;
  tagline: string;
  audience: string;
  monthlyPriceUsd: number;
  annualPriceUsd: number;
  category: 'personal' | 'developer' | 'both';
  features: string[];
  limitations: {
    links: string;
    clicks: string;
    qrCodes?: string;
    linkInBio?: string;
    teamSeats: string;
    domains: string;
    mcpAgents?: string;
    analyticsRetention: string;
    apiKeys?: string;
    rateLimits?: string;
  };
  isPopular?: boolean;
}

export interface BioLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
  isActive: boolean;
  clicks: number;
  clickCount?: number;
}

export interface BioTheme {
  id: string;
  name: string;
  bgColor: string;
  cardBg: string;
  cardBorder: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
}

export interface BioProfile {
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  themeId: string;
  socials: {
    twitter?: string;
    github?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    website?: string;
  };
  links: BioLink[];
  pageViews: number;
}

export interface AdminClusterNode {
  id: string;
  region: string;
  provider: 'edge-cloudflare' | 'fastly' | 'aws-lambda-edge';
  status: 'healthy' | 'syncing' | 'degraded';
  latencyMs: number;
  activeReroutesPerSec: number;
  uptime: string;
}

export interface AuditLogItem {
  id: string;
  actor: string;
  actorType: 'user' | 'agent' | 'apiKey';
  action: string;
  target: string;
  ipAddress: string;
  timestamp: string;
  status: 'success' | 'failure';
}

export interface BlogPost {
  slug: string;
  title: string;
  summary: string;
  content: string[];
  category: string;
  author: {
    name: string;
    role: string;
  };
  publishedAt: string;
  readTime: string;
}

export interface ChangelogItem {
  version: string;
  date: string;
  title: string;
  description: string;
  changes: {
    type: 'feature' | 'improvement' | 'fix' | 'security';
    text: string;
  }[];
}

export interface StatusComponent {
  id: string;
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  uptime90d: number;
  description: string;
}

export interface StatusIncident {
  id: string;
  title: string;
  date: string;
  impact: 'none' | 'minor' | 'major';
  status: 'resolved' | 'monitoring' | 'investigating';
  timeline: {
    timestamp: string;
    message: string;
  }[];
}

export interface FaqItem {
  question: string;
  answer: string;
  category?: string;
}

export interface FlaggedLink {
  id: string;
  shortUrl: string;
  targetUrl: string;
  workspaceName: string;
  workspaceId: string;
  reportedBy: string;
  reportedAt: string;
  reason: 'phishing' | 'malware' | 'smishing' | 'spam' | 'illegal';
  details: string;
  status: 'pending' | 'disabled' | 'dismissed';
  creatorType: 'human' | 'agent' | 'api';
  clickCount: number;
}

export interface CustomerSupportNote {
  id: string;
  author: string;
  timestamp: string;
  content: string;
}

export interface CustomerAccount {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  plan: 'developer' | 'team' | 'enterprise';
  status: 'active' | 'suspended' | 'delinquent';
  workspacesCount: number;
  linksCount: number;
  monthlySpendUsd: number;
  joinedAt: string;
  lastActiveAt: string;
  supportNotes: CustomerSupportNote[];
}

export interface AdminSystemFlags {
  killSwitchSignups: boolean;
  killSwitchLinkCreation: boolean;
  requirePasskeyForAllLinks: boolean;
  strictThreatScanning: boolean;
  mcpAgentToolAccess: boolean;
}
