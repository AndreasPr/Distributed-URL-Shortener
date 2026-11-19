import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  KeyRound,
  Webhook,
  Users,
  CreditCard,
  Gauge,
  UserCheck,
  ShieldAlert,
  Settings
} from 'lucide-react';
import { useWorkspace } from '../../../context/WorkspaceContext';

export const SettingsLayout: React.FC = () => {
  const { activeWorkspace } = useWorkspace();

  const settingsTabs = [
    { label: 'API Keys', path: '/app/settings/keys', icon: KeyRound },
    { label: 'Webhooks & Events', path: '/app/settings/webhooks', icon: Webhook },
    { label: 'Team Members', path: '/app/settings/members', icon: Users },
    { label: 'Billing & Invoices', path: '/app/settings/billing', icon: CreditCard },
    { label: 'Quota Usage', path: '/app/settings/usage', icon: Gauge },
    { label: 'Account Profile', path: '/app/settings/account', icon: UserCheck },
    { label: 'Security Audit Log', path: '/app/settings/audit', icon: ShieldAlert },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Settings Title */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-500" />
          <span>Workspace & Platform Settings</span>
        </h1>
        <p className="text-xs text-slate-500">
          Governance, credentials, billing schedules, and audit streams for <strong>{activeWorkspace.name}</strong>
        </p>
      </div>

      {/* Horizontal Subnavigation Tabs */}
      <div className="w-full overflow-x-auto pb-1 border-b border-slate-200 dark:border-white/10">
        <nav aria-label="Settings Subsections" className="flex items-center gap-1 min-w-max">
          {settingsTabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                }`
              }
            >
              <tab.icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Child Tab Content */}
      <div className="pt-2">
        <Outlet />
      </div>
    </div>
  );
};
