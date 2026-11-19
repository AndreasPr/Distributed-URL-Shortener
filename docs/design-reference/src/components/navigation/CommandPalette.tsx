import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Link2,
  KeyRound,
  Webhook,
  Bot,
  CreditCard,
  Settings,
  BarChart3,
  Users,
  Shield,
  FileText,
  Activity,
  Sun,
  Moon,
  Plus,
  ArrowRight,
  X,
  Layers,
  ShieldAlert,
  Zap,
  Gauge,
  Key,
  SlidersHorizontal,
} from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    closeCommandPalette,
    openCreateLinkModal,
    openUtmModal,
    openCsvImportModal,
    links,
  } = useAppData();

  const { workspaces, activeWorkspace, setActiveWorkspaceId } = useWorkspace();
  const { isDark, toggleTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  interface CommandItem {
    id: string;
    category: 'Actions' | 'Links' | 'Navigation' | 'Workspaces' | 'Admin (Operator)' | 'System';
    label: string;
    subtext?: string;
    icon: React.ReactNode;
    action: () => void;
  }

  // Base list of commands
  const allCommands: CommandItem[] = [
    // Actions
    {
      id: 'act_create_link',
      category: 'Actions',
      label: 'Create new short link',
      subtext: 'Open modal to create a programmatic alias',
      icon: <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      action: () => {
        closeCommandPalette();
        openCreateLinkModal();
      },
    },
    {
      id: 'act_create_key',
      category: 'Actions',
      label: 'Generate API authentication key',
      subtext: 'Jump to /app/settings/keys',
      icon: <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      action: () => {
        closeCommandPalette();
        navigate('/app/settings/keys');
      },
    },
    {
      id: 'act_utm_builder',
      category: 'Actions',
      label: 'Open Campaign UTM Builder',
      subtext: 'Construct parameterized marketing tracking URLs',
      icon: <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      action: () => {
        closeCommandPalette();
        openUtmModal();
      },
    },
    {
      id: 'act_csv_import',
      category: 'Actions',
      label: 'Bulk CSV Link Importer',
      subtext: 'Batch provision short links from spreadsheet',
      icon: <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      action: () => {
        closeCommandPalette();
        openCsvImportModal();
      },
    },
    {
      id: 'act_toggle_theme',
      category: 'Actions',
      label: `Switch to ${isDark ? 'Light' : 'Dark'} Mode`,
      subtext: 'Toggle application theme appearance',
      icon: isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />,
      action: () => {
        toggleTheme();
        closeCommandPalette();
        toast({
          title: 'Theme Toggled',
          description: `Now using ${isDark ? 'light' : 'dark'} mode.`,
          variant: 'info',
        });
      },
    },
    {
      id: 'act_invite_member',
      category: 'Actions',
      label: 'Invite team member to workspace',
      subtext: 'Jump to /app/settings/members',
      icon: <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
      action: () => {
        closeCommandPalette();
        navigate('/app/settings/members');
      },
    },

    // Navigation
    {
      id: 'nav_qr_codes',
      category: 'Navigation',
      label: 'Dynamic QR Code Studio',
      subtext: '/qr-codes · Vector SVG & color customizer',
      icon: <Link2 className="w-4 h-4 text-blue-500" />,
      action: () => {
        closeCommandPalette();
        navigate('/qr-codes');
      },
    },
    {
      id: 'nav_link_in_bio',
      category: 'Navigation',
      label: 'Link-in-Bio Profile Studio',
      subtext: '/app/bio · Manage profile and buttons',
      icon: <Layers className="w-4 h-4 text-pink-500" />,
      action: () => {
        closeCommandPalette();
        navigate('/app/bio');
      },
    },
    {
      id: 'nav_developers',
      category: 'Navigation',
      label: 'Developer Landing & MCP Agent Tools',
      subtext: '/developers · REST API, MCP, webhooks',
      icon: <Bot className="w-4 h-4 text-indigo-500" />,
      action: () => {
        closeCommandPalette();
        navigate('/developers');
      },
    },

    // Navigation
    {
      id: 'nav_dashboard',
      category: 'Navigation',
      label: 'Dashboard Overview',
      subtext: '/app',
      icon: <Activity className="w-4 h-4 text-slate-400" />,
      action: () => {
        closeCommandPalette();
        navigate('/app');
      },
    },
    {
      id: 'nav_links',
      category: 'Navigation',
      label: 'Short Links Directory',
      subtext: '/app/links',
      icon: <Link2 className="w-4 h-4 text-slate-400" />,
      action: () => {
        closeCommandPalette();
        navigate('/app/links');
      },
    },
    {
      id: 'nav_analytics',
      category: 'Navigation',
      label: 'Real-Time Analytics & Geo Heatmap',
      subtext: '/app/analytics',
      icon: <BarChart3 className="w-4 h-4 text-slate-400" />,
      action: () => {
        closeCommandPalette();
        navigate('/app/analytics');
      },
    },
    {
      id: 'nav_mcp',
      category: 'Navigation',
      label: 'AI Agent Model Context Protocol (MCP)',
      subtext: '/app/mcp',
      icon: <Bot className="w-4 h-4 text-indigo-500" />,
      action: () => {
        closeCommandPalette();
        navigate('/app/mcp');
      },
    },
    {
      id: 'nav_keys',
      category: 'Navigation',
      label: 'API Keys Settings',
      subtext: '/app/settings/keys',
      icon: <KeyRound className="w-4 h-4 text-slate-400" />,
      action: () => {
        closeCommandPalette();
        navigate('/app/settings/keys');
      },
    },
    {
      id: 'nav_webhooks',
      category: 'Navigation',
      label: 'Webhooks & HMAC Event Stream',
      subtext: '/app/settings/webhooks',
      icon: <Webhook className="w-4 h-4 text-slate-400" />,
      action: () => {
        closeCommandPalette();
        navigate('/app/settings/webhooks');
      },
    },
    {
      id: 'nav_billing',
      category: 'Navigation',
      label: 'Billing, Invoices & Plan Quotas',
      subtext: '/app/settings/billing',
      icon: <CreditCard className="w-4 h-4 text-slate-400" />,
      action: () => {
        closeCommandPalette();
        navigate('/app/settings/billing');
      },
    },
    {
      id: 'nav_audit',
      category: 'Navigation',
      label: 'Security Audit Log Table',
      subtext: '/app/settings/audit',
      icon: <Shield className="w-4 h-4 text-slate-400" />,
      action: () => {
        closeCommandPalette();
        navigate('/app/settings/audit');
      },
    },
    {
      id: 'nav_docs',
      category: 'Navigation',
      label: 'Developer API Documentation',
      subtext: '/docs',
      icon: <FileText className="w-4 h-4 text-slate-400" />,
      action: () => {
        closeCommandPalette();
        navigate('/docs');
      },
    },

    // Operator & Cluster Admin
    {
      id: 'nav_admin_overview',
      category: 'Admin (Operator)',
      label: 'Cluster Admin Overview & Telemetry',
      subtext: '/admin · MRR, signups, nodes',
      icon: <Activity className="w-4 h-4 text-amber-500" />,
      action: () => {
        closeCommandPalette();
        navigate('/admin');
      },
    },
    {
      id: 'nav_admin_flagged',
      category: 'Admin (Operator)',
      label: 'Abuse & Phishing Queue',
      subtext: '/admin/flagged · Disable, dismiss, ban',
      icon: <ShieldAlert className="w-4 h-4 text-rose-500" />,
      action: () => {
        closeCommandPalette();
        navigate('/admin/flagged');
      },
    },
    {
      id: 'nav_admin_customers',
      category: 'Admin (Operator)',
      label: 'Customer Accounts & Notes',
      subtext: '/admin/customers · Support logs & spend',
      icon: <Users className="w-4 h-4 text-blue-500" />,
      action: () => {
        closeCommandPalette();
        navigate('/admin/customers');
      },
    },
    {
      id: 'nav_admin_flags',
      category: 'Admin (Operator)',
      label: 'Circuit Breakers & Kill Switches',
      subtext: '/admin/flags · Halt signups or link creation',
      icon: <Zap className="w-4 h-4 text-amber-500" />,
      action: () => {
        closeCommandPalette();
        navigate('/admin/flags');
      },
    },

    // System Pages
    {
      id: 'nav_sys_status',
      category: 'System',
      label: 'System Status & PoPs',
      subtext: '/status',
      icon: <Activity className="w-4 h-4 text-emerald-500" />,
      action: () => {
        closeCommandPalette();
        navigate('/status');
      },
    },
    {
      id: 'nav_sys_blocked',
      category: 'System',
      label: 'Blocked Abuse Notice Page',
      subtext: '/blocked-link',
      icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
      action: () => {
        closeCommandPalette();
        navigate('/blocked-link');
      },
    },
    {
      id: 'nav_sys_expired',
      category: 'System',
      label: 'Expired Link Notice Page',
      subtext: '/expired-link',
      icon: <Key className="w-4 h-4 text-amber-400" />,
      action: () => {
        closeCommandPalette();
        navigate('/expired-link');
      },
    },
    {
      id: 'nav_sys_ratelimit',
      category: 'System',
      label: '429 Rate Limit Exceeded Page',
      subtext: '/429',
      icon: <Gauge className="w-4 h-4 text-amber-400" />,
      action: () => {
        closeCommandPalette();
        navigate('/429');
      },
    },

    // Workspaces
    ...workspaces.map((ws) => ({
      id: `ws_${ws.id}`,
      category: 'Workspaces' as const,
      label: `Switch to ${ws.name}`,
      subtext: `${ws.plan.toUpperCase()} plan · ${ws.currentLinksCount} links`,
      icon: <Layers className="w-4 h-4 text-blue-500" />,
      action: () => {
        setActiveWorkspaceId(ws.id);
        closeCommandPalette();
        toast({
          title: 'Workspace Switched',
          description: `Active workspace: ${ws.name}`,
          variant: 'success',
        });
      },
    })),

    // Dynamic Short Links
    ...links.map((link) => ({
      id: `link_${link.id}`,
      category: 'Links' as const,
      label: `${link.domain}/${link.shortCode}`,
      subtext: link.title || link.targetUrl,
      icon: <Link2 className="w-4 h-4 text-blue-500" />,
      action: () => {
        closeCommandPalette();
        navigate(`/app/links/${link.id}`);
      },
    })),
  ];

  // Filter commands by query
  const filtered = query.trim()
    ? allCommands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(query.toLowerCase()) ||
          cmd.subtext?.toLowerCase().includes(query.toLowerCase()) ||
          cmd.category.toLowerCase().includes(query.toLowerCase())
      )
    : allCommands;

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeCommandPalette();
    }
  };

  if (!isCommandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4">
      {/* Backdrop */}
      <div
        onClick={closeCommandPalette}
        aria-hidden="true"
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative z-50 w-full max-w-xl rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0d15] text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-100"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-white/10">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, page name, or search short links..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/10 text-[10px] font-mono bg-slate-100 dark:bg-white/5 text-slate-500">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-white/5">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching commands or links found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0">{cmd.icon}</div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{cmd.label}</p>
                      {cmd.subtext && (
                        <p className="text-[11px] text-slate-400 truncate">{cmd.subtext}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                      {cmd.category}
                    </span>
                    {isSelected && <ArrowRight className="w-3 h-3 text-blue-500" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Helper */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono text-[10px] bg-slate-200 dark:bg-white/10 px-1 py-0.5 rounded">↑↓</kbd> navigate
            </span>
            <span>
              <kbd className="font-mono text-[10px] bg-slate-200 dark:bg-white/10 px-1 py-0.5 rounded">↵</kbd> select
            </span>
          </div>
          <span>
            Active: <strong>{activeWorkspace.name}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
