import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ShortLink,
  ApiKey,
  WebhookEndpoint,
  WorkspaceMember,
  AuditLogItem,
  BillingPlan,
  FlaggedLink,
  CustomerAccount,
  AdminSystemFlags,
  BioProfile,
  BioLink,
} from '../mock/types';
import {
  mockShortLinks,
  mockApiKeys,
  mockWebhooks,
  mockAuditLogs,
  mockCurrentUser,
  mockBillingPlans,
  mockFlaggedLinks,
  mockCustomers,
  mockInitialSystemFlags,
  mockInitialBioProfile,
} from '../mock';

export interface PendingInvite {
  id: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  sentAt: string;
}

export interface InvoiceItem {
  id: string;
  number: string;
  date: string;
  amount: string;
  status: 'paid' | 'pending';
  downloadUrl: string;
}

export interface WebhookDeliveryLog {
  id: string;
  webhookId: string;
  event: string;
  url: string;
  statusCode: number;
  durationMs: number;
  timestamp: string;
  status: 'delivered' | 'failed';
  attempts: number;
}

interface AppDataContextType {
  // Links
  links: ShortLink[];
  addLink: (link: Partial<ShortLink> & { targetUrl: string }) => ShortLink;
  bulkAddLinks: (newLinks: Array<Partial<ShortLink> & { targetUrl: string }>) => number;
  updateLink: (id: string, updates: Partial<ShortLink>) => void;
  deleteLink: (id: string) => void;
  bulkDeleteLinks: (ids: string[]) => void;
  getLinkById: (id: string) => ShortLink | undefined;

  // Link-in-Bio
  bioProfile: BioProfile;
  updateBioProfile: (updates: Partial<BioProfile>) => void;
  addBioLink: (linkOrTitle: string | { title: string; url: string; isActive?: boolean }, maybeUrl?: string) => void;
  updateBioLink: (id: string, updates: Partial<BioLink>) => void;
  deleteBioLink: (id: string) => void;

  // API Keys
  apiKeys: ApiKey[];
  createApiKey: (name: string, scope: ApiKey['scope'], environment: ApiKey['environment']) => { key: ApiKey; fullSecret: string };
  revokeApiKey: (id: string) => void;

  // Webhooks
  webhooks: WebhookEndpoint[];
  webhookLogs: WebhookDeliveryLog[];
  addWebhook: (url: string, description: string, events: string[]) => WebhookEndpoint;
  deleteWebhook: (id: string) => void;
  retryWebhookDelivery: (logId: string) => void;

  // Members
  members: WorkspaceMember[];
  pendingInvites: PendingInvite[];
  inviteMember: (email: string, role: 'admin' | 'member' | 'viewer') => void;
  cancelInvite: (id: string) => void;
  updateMemberRole: (memberId: string, role: 'owner' | 'admin' | 'member') => void;
  removeMember: (memberId: string) => void;

  // Billing & Invoices
  currentPlanId: string;
  changePlan: (planId: string) => void;
  invoices: InvoiceItem[];

  // User Profile
  currentUser: WorkspaceMember;
  updateCurrentUser: (updates: Partial<WorkspaceMember>) => void;

  // Audit Logs
  auditLogs: AuditLogItem[];

  // Admin Features
  flaggedLinks: FlaggedLink[];
  disableFlaggedLink: (id: string) => void;
  dismissFlaggedReport: (id: string) => void;
  banWorkspaceByFlag: (workspaceId: string) => void;
  customers: CustomerAccount[];
  addCustomerNote: (customerId: string, content: string) => void;
  systemFlags: AdminSystemFlags;
  toggleSystemFlag: (flagKey: keyof AdminSystemFlags) => void;

  // Command Palette Global State
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;

  // Modals Global State
  isCreateLinkModalOpen: boolean;
  setCreateLinkModalOpen: (open: boolean) => void;
  openCreateLinkModal: () => void;
  closeCreateLinkModal: () => void;

  isUtmModalOpen: boolean;
  setUtmModalOpen: (open: boolean) => void;
  openUtmModal: () => void;
  closeUtmModal: () => void;

  isCsvImportModalOpen: boolean;
  setCsvImportModalOpen: (open: boolean) => void;
  openCsvImportModal: () => void;
  closeCsvImportModal: () => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [links, setLinks] = useState<ShortLink[]>(() => {
    const saved = localStorage.getItem('relaymark_links');
    return saved ? JSON.parse(saved) : mockShortLinks;
  });

  const [apiKeys, setApiKeys] = useState<ApiKey[]>(() => {
    const saved = localStorage.getItem('relaymark_api_keys');
    return saved ? JSON.parse(saved) : mockApiKeys;
  });

  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>(() => {
    const saved = localStorage.getItem('relaymark_webhooks');
    return saved ? JSON.parse(saved) : mockWebhooks;
  });

  const [webhookLogs, setWebhookLogs] = useState<WebhookDeliveryLog[]>([
    {
      id: 'log_wh_1',
      webhookId: 'wh_prod_telemetry',
      event: 'link.clicked',
      url: 'https://telemetry.acme.dev/v1/relay-events',
      statusCode: 200,
      durationMs: 42,
      timestamp: '2026-11-05T12:44:10Z',
      status: 'delivered',
      attempts: 1,
    },
    {
      id: 'log_wh_2',
      webhookId: 'wh_prod_telemetry',
      event: 'link.created',
      url: 'https://telemetry.acme.dev/v1/relay-events',
      statusCode: 200,
      durationMs: 38,
      timestamp: '2026-11-05T12:30:05Z',
      status: 'delivered',
      attempts: 1,
    },
    {
      id: 'log_wh_3',
      webhookId: 'wh_slack_alerts',
      event: 'security.spike',
      url: 'https://hooks.slack.com/services/T00/B00/X88f9910',
      statusCode: 504,
      durationMs: 3000,
      timestamp: '2026-11-05T11:15:20Z',
      status: 'failed',
      attempts: 3,
    },
    {
      id: 'log_wh_4',
      webhookId: 'wh_prod_telemetry',
      event: 'link.rate_limited',
      url: 'https://telemetry.acme.dev/v1/relay-events',
      statusCode: 200,
      durationMs: 29,
      timestamp: '2026-11-05T10:02:18Z',
      status: 'delivered',
      attempts: 1,
    },
  ]);

  const [members, setMembers] = useState<WorkspaceMember[]>([
    mockCurrentUser,
    {
      id: 'usr_sarah',
      name: 'Sarah Chen',
      email: 'sarah.chen@acme.dev',
      role: 'admin',
      joinedAt: '2026-02-10T14:30:00Z',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    },
    {
      id: 'usr_marcus',
      name: 'Marcus Vance',
      email: 'm.vance@acme.dev',
      role: 'member',
      joinedAt: '2026-04-18T10:15:00Z',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    },
    {
      id: 'usr_elena',
      name: 'Elena Rostova',
      email: 'elena@acme.dev',
      role: 'member',
      joinedAt: '2026-06-22T09:00:00Z',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
    },
  ]);

  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([
    {
      id: 'inv_david',
      email: 'david.kim@acme.dev',
      role: 'member',
      sentAt: '2026-11-03T16:20:00Z',
    },
    {
      id: 'inv_qa_team',
      email: 'qa-automation@acme.dev',
      role: 'viewer',
      sentAt: '2026-11-04T11:00:00Z',
    },
  ]);

  const [currentPlanId, setCurrentPlanId] = useState<'developer' | 'team' | 'enterprise'>('team');

  const [invoices] = useState<InvoiceItem[]>([
    {
      id: 'inv_nov_2026',
      number: 'INV-2026-011',
      date: 'Nov 1, 2026',
      amount: '$9.00',
      status: 'paid',
      downloadUrl: '#download-inv-nov',
    },
    {
      id: 'inv_oct_2026',
      number: 'INV-2026-010',
      date: 'Oct 1, 2026',
      amount: '$9.00',
      status: 'paid',
      downloadUrl: '#download-inv-oct',
    },
    {
      id: 'inv_sep_2026',
      number: 'INV-2026-009',
      date: 'Sep 1, 2026',
      amount: '$9.00',
      status: 'paid',
      downloadUrl: '#download-inv-sep',
    },
    {
      id: 'inv_aug_2026',
      number: 'INV-2026-008',
      date: 'Aug 1, 2026',
      amount: '$9.00',
      status: 'paid',
      downloadUrl: '#download-inv-aug',
    },
  ]);

  const [currentUser, setCurrentUser] = useState<WorkspaceMember>(mockCurrentUser);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(mockAuditLogs);

  // Admin states
  const [flaggedLinks, setFlaggedLinks] = useState<FlaggedLink[]>(() => {
    const saved = localStorage.getItem('relaymark_flagged_links');
    return saved ? JSON.parse(saved) : mockFlaggedLinks;
  });

  const [customers, setCustomers] = useState<CustomerAccount[]>(() => {
    const saved = localStorage.getItem('relaymark_customers');
    return saved ? JSON.parse(saved) : mockCustomers;
  });

  const [systemFlags, setSystemFlags] = useState<AdminSystemFlags>(() => {
    const saved = localStorage.getItem('relaymark_system_flags');
    return saved ? JSON.parse(saved) : mockInitialSystemFlags;
  });

  useEffect(() => {
    localStorage.setItem('relaymark_flagged_links', JSON.stringify(flaggedLinks));
  }, [flaggedLinks]);

  useEffect(() => {
    localStorage.setItem('relaymark_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('relaymark_system_flags', JSON.stringify(systemFlags));
  }, [systemFlags]);

  const disableFlaggedLink = (id: string) => {
    setFlaggedLinks((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'disabled' } : item))
    );
  };

  const dismissFlaggedReport = (id: string) => {
    setFlaggedLinks((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'dismissed' } : item))
    );
  };

  const banWorkspaceByFlag = (workspaceId: string) => {
    // Mark all flagged links from this workspace as disabled
    setFlaggedLinks((prev) =>
      prev.map((item) => (item.workspaceId === workspaceId ? { ...item, status: 'disabled' } : item))
    );
    // Mark customer workspace status as suspended
    setCustomers((prev) =>
      prev.map((cust) =>
        cust.email.includes(workspaceId.replace('ws_', '')) || cust.name.toLowerCase().includes('shadow')
          ? {
              ...cust,
              status: 'suspended',
              supportNotes: [
                {
                  id: `note_${Date.now()}`,
                  author: 'Operator',
                  timestamp: new Date().toISOString(),
                  content: `Workspace ${workspaceId} banned due to abuse reports.`,
                },
                ...cust.supportNotes,
              ],
            }
          : cust
      )
    );
  };

  const addCustomerNote = (customerId: string, content: string) => {
    const newNote = {
      id: `note_${Date.now()}`,
      author: 'Operator (You)',
      timestamp: new Date().toISOString(),
      content,
    };
    setCustomers((prev) =>
      prev.map((cust) =>
        cust.id === customerId
          ? { ...cust, supportNotes: [newNote, ...cust.supportNotes] }
          : cust
      )
    );
  };

  const toggleSystemFlag = (flagKey: keyof AdminSystemFlags) => {
    setSystemFlags((prev) => ({
      ...prev,
      [flagKey]: !prev[flagKey],
    }));
  };

  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isCreateLinkModalOpen, setCreateLinkModalOpen] = useState(false);
  const [isUtmModalOpen, setUtmModalOpen] = useState(false);
  const [isCsvImportModalOpen, setCsvImportModalOpen] = useState(false);

  // Link-in-Bio state
  const [bioProfile, setBioProfile] = useState<BioProfile>(() => {
    const saved = localStorage.getItem('relaymark_bio_profile');
    return saved ? JSON.parse(saved) : mockInitialBioProfile;
  });

  useEffect(() => {
    localStorage.setItem('relaymark_bio_profile', JSON.stringify(bioProfile));
  }, [bioProfile]);

  const updateBioProfile = (updates: Partial<BioProfile>) => {
    setBioProfile((prev) => ({ ...prev, ...updates }));
  };

  const addBioLink = (linkOrTitle: string | { title: string; url: string; isActive?: boolean }, maybeUrl?: string) => {
    let title = '';
    let url = '';
    if (typeof linkOrTitle === 'object') {
      title = linkOrTitle.title;
      url = linkOrTitle.url;
    } else {
      title = linkOrTitle;
      url = maybeUrl || '';
    }

    const newLink: BioLink = {
      id: `bl_${Date.now()}`,
      title,
      url,
      isActive: true,
      clicks: 0,
      clickCount: 0,
    };
    setBioProfile((prev) => ({
      ...prev,
      links: [newLink, ...prev.links],
    }));
  };

  const updateBioLink = (linkId: string, updates: Partial<BioLink>) => {
    setBioProfile((prev) => ({
      ...prev,
      links: prev.links.map((link) => (link.id === linkId ? { ...link, ...updates } : link)),
    }));
  };

  const deleteBioLink = (linkId: string) => {
    setBioProfile((prev) => ({
      ...prev,
      links: prev.links.filter((link) => link.id !== linkId),
    }));
  };

  // Sync links to localStorage
  useEffect(() => {
    localStorage.setItem('relaymark_links', JSON.stringify(links));
  }, [links]);

  // Sync API keys to localStorage
  useEffect(() => {
    localStorage.setItem('relaymark_api_keys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  // Global Keyboard listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addLink = (newLinkData: Partial<ShortLink> & { targetUrl: string }) => {
    const shortCode = newLinkData.shortCode?.trim() || Math.random().toString(36).substring(2, 8);
    const domain = newLinkData.domain || 'relay.mk';
    const newLink: ShortLink = {
      id: `lnk_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      shortCode,
      domain,
      targetUrl: newLinkData.targetUrl,
      title: newLinkData.title || shortCode,
      description: newLinkData.description || 'Quick redirect link',
      tags: newLinkData.tags || ['general'],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalClicks: 0,
      uniqueVisitors: 0,
      createdBy: {
        type: 'human',
        name: currentUser.name,
      },
      hasPassword: Boolean(newLinkData.hasPassword),
      expiresAt: newLinkData.expiresAt,
      utmParams: newLinkData.utmParams,
    };

    setLinks((prev) => [newLink, ...prev]);

    // Add audit log
    const auditItem: AuditLogItem = {
      id: `aud_${Date.now()}`,
      actor: currentUser.name,
      actorType: 'user',
      action: 'link.create',
      target: `${domain}/${shortCode}`,
      ipAddress: '85.74.19.241',
      timestamp: new Date().toISOString(),
      status: 'success',
    };
    setAuditLogs((prev) => [auditItem, ...prev]);

    return newLink;
  };

  const bulkAddLinks = (newLinksList: Array<Partial<ShortLink> & { targetUrl: string }>) => {
    const created: ShortLink[] = newLinksList.map((item, index) => {
      const shortCode = item.shortCode?.trim() || Math.random().toString(36).substring(2, 8);
      const domain = item.domain || 'relay.mk';
      return {
        id: `lnk_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 5)}`,
        shortCode,
        domain,
        targetUrl: item.targetUrl,
        title: item.title || shortCode,
        description: item.description || 'Imported via CSV',
        tags: item.tags || ['imported'],
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalClicks: 0,
        uniqueVisitors: 0,
        createdBy: {
          type: 'human',
          name: currentUser.name,
        },
        hasPassword: Boolean(item.hasPassword),
        expiresAt: item.expiresAt,
        utmParams: item.utmParams,
      };
    });

    setLinks((prev) => [...created, ...prev]);

    const auditItem: AuditLogItem = {
      id: `aud_${Date.now()}`,
      actor: currentUser.name,
      actorType: 'user',
      action: 'link.bulk_csv_import',
      target: `${created.length} short links`,
      ipAddress: '85.74.19.241',
      timestamp: new Date().toISOString(),
      status: 'success',
    };
    setAuditLogs((prev) => [auditItem, ...prev]);

    return created.length;
  };

  const updateLink = (id: string, updates: Partial<ShortLink>) => {
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l))
    );
  };

  const deleteLink = (id: string) => {
    const target = links.find((l) => l.id === id);
    setLinks((prev) => prev.filter((l) => l.id !== id));
    if (target) {
      const auditItem: AuditLogItem = {
        id: `aud_${Date.now()}`,
        actor: currentUser.name,
        actorType: 'user',
        action: 'link.delete',
        target: `${target.domain}/${target.shortCode}`,
        ipAddress: '85.74.19.241',
        timestamp: new Date().toISOString(),
        status: 'success',
      };
      setAuditLogs((prev) => [auditItem, ...prev]);
    }
  };

  const bulkDeleteLinks = (ids: string[]) => {
    setLinks((prev) => prev.filter((l) => !ids.includes(l.id)));
  };

  const getLinkById = (id: string) => {
    return links.find((l) => l.id === id);
  };

  const createApiKey = (
    name: string,
    scope: ApiKey['scope'],
    environment: ApiKey['environment']
  ) => {
    const randomHex = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    const prefix = environment === 'production' ? 'rl_live_' : 'rl_test_';
    const fullSecret = `${prefix}${randomHex}`;
    const displayPrefix = `${prefix}${randomHex.substring(0, 12)}...`;

    const newKey: ApiKey = {
      id: `key_${Date.now()}`,
      name,
      prefix: displayPrefix,
      scope,
      environment,
      createdAt: new Date().toISOString(),
      rateLimitPerMin: environment === 'production' ? 5000 : 1000,
      requestCount30d: 0,
    };

    setApiKeys((prev) => [newKey, ...prev]);

    // Audit log
    const auditItem: AuditLogItem = {
      id: `aud_${Date.now()}`,
      actor: currentUser.name,
      actorType: 'user',
      action: 'apikey.create',
      target: displayPrefix,
      ipAddress: '85.74.19.241',
      timestamp: new Date().toISOString(),
      status: 'success',
    };
    setAuditLogs((prev) => [auditItem, ...prev]);

    return { key: newKey, fullSecret };
  };

  const revokeApiKey = (id: string) => {
    const key = apiKeys.find((k) => k.id === id);
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
    if (key) {
      const auditItem: AuditLogItem = {
        id: `aud_${Date.now()}`,
        actor: currentUser.name,
        actorType: 'user',
        action: 'apikey.revoke',
        target: key.prefix,
        ipAddress: '85.74.19.241',
        timestamp: new Date().toISOString(),
        status: 'success',
      };
      setAuditLogs((prev) => [auditItem, ...prev]);
    }
  };

  const addWebhook = (url: string, description: string, events: string[]) => {
    const secretRandom = Math.random().toString(36).substring(2, 10);
    const newWh: WebhookEndpoint = {
      id: `wh_${Date.now()}`,
      url,
      description,
      status: 'healthy',
      subscribedEvents: events,
      successRate: 100.0,
      createdAt: new Date().toISOString(),
      secretPrefix: `whsec_${secretRandom}...`,
    };
    setWebhooks((prev) => [newWh, ...prev]);
    return newWh;
  };

  const deleteWebhook = (id: string) => {
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  };

  const retryWebhookDelivery = (logId: string) => {
    setWebhookLogs((prev) =>
      prev.map((log) =>
        log.id === logId
          ? {
              ...log,
              statusCode: 200,
              status: 'delivered',
              attempts: log.attempts + 1,
              timestamp: new Date().toISOString(),
            }
          : log
      )
    );
  };

  const inviteMember = (email: string, role: 'admin' | 'member' | 'viewer') => {
    const newInv: PendingInvite = {
      id: `inv_${Date.now()}`,
      email,
      role,
      sentAt: new Date().toISOString(),
    };
    setPendingInvites((prev) => [newInv, ...prev]);
  };

  const cancelInvite = (id: string) => {
    setPendingInvites((prev) => prev.filter((inv) => inv.id !== id));
  };

  const updateMemberRole = (memberId: string, role: 'owner' | 'admin' | 'member') => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role } : m))
    );
  };

  const removeMember = (memberId: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  const changePlan = (planId: string) => {
    setCurrentPlanId(planId as any);
  };

  const updateCurrentUser = (updates: Partial<WorkspaceMember>) => {
    setCurrentUser((prev) => ({ ...prev, ...updates }));
  };

  return (
    <AppDataContext.Provider
      value={{
        links,
        addLink,
        bulkAddLinks,
        updateLink,
        deleteLink,
        bulkDeleteLinks,
        getLinkById,
        // Link-in-Bio
        bioProfile,
        updateBioProfile,
        addBioLink,
        updateBioLink,
        deleteBioLink,
        apiKeys,
        createApiKey,
        revokeApiKey,
        webhooks,
        webhookLogs,
        addWebhook,
        deleteWebhook,
        retryWebhookDelivery,
        members,
        pendingInvites,
        inviteMember,
        cancelInvite,
        updateMemberRole,
        removeMember,
        currentPlanId,
        changePlan,
        invoices,
        currentUser,
        updateCurrentUser,
        auditLogs,
        // Admin
        flaggedLinks,
        disableFlaggedLink,
        dismissFlaggedReport,
        banWorkspaceByFlag,
        customers,
        addCustomerNote,
        systemFlags,
        toggleSystemFlag,
        isCommandPaletteOpen,
        setCommandPaletteOpen,
        openCommandPalette: () => setCommandPaletteOpen(true),
        closeCommandPalette: () => setCommandPaletteOpen(false),
        isCreateLinkModalOpen,
        setCreateLinkModalOpen,
        openCreateLinkModal: () => setCreateLinkModalOpen(true),
        closeCreateLinkModal: () => setCreateLinkModalOpen(false),
        isUtmModalOpen,
        setUtmModalOpen,
        openUtmModal: () => setUtmModalOpen(true),
        closeUtmModal: () => setUtmModalOpen(false),
        isCsvImportModalOpen,
        setCsvImportModalOpen,
        openCsvImportModal: () => setCsvImportModalOpen(true),
        closeCsvImportModal: () => setCsvImportModalOpen(false),
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = (): AppDataContextType => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};
