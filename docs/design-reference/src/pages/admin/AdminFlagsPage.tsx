import React, { useState } from 'react';
import {
  Zap,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  Lock,
  Bot,
  ShieldCheck,
  ServerCrash,
  Radio,
} from 'lucide-react';
import { Card } from '../../design-system/Card';
import { Badge } from '../../design-system/Badge';
import { Button } from '../../design-system/Button';
import { Dialog } from '../../design-system/Dialog';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import { AdminSystemFlags } from '../../mock/types';

export const AdminFlagsPage: React.FC = () => {
  const { systemFlags, toggleSystemFlag } = useAppData();
  const { addToast } = useToast();

  const [pendingFlagToggle, setPendingFlagToggle] = useState<{
    key: keyof AdminSystemFlags;
    name: string;
    willEnable: boolean;
    isKillSwitch: boolean;
  } | null>(null);

  const handleRequestToggle = (
    key: keyof AdminSystemFlags,
    name: string,
    isKillSwitch = false
  ) => {
    const willEnable = !systemFlags[key];
    // If it's a kill switch or changing critical security posture, prompt for confirmation
    if (isKillSwitch || key === 'strictThreatScanning' || key === 'mcpAgentToolAccess') {
      setPendingFlagToggle({ key, name, willEnable, isKillSwitch });
    } else {
      toggleSystemFlag(key);
      addToast({
        title: `Flag Updated: ${name}`,
        description: `Status changed to ${willEnable ? 'ENABLED' : 'DISABLED'}.`,
        variant: 'default',
      });
    }
  };

  const handleConfirmToggle = () => {
    if (!pendingFlagToggle) return;
    toggleSystemFlag(pendingFlagToggle.key);
    addToast({
      title: pendingFlagToggle.isKillSwitch
        ? `CIRCUIT BREAKER: ${pendingFlagToggle.name} ${pendingFlagToggle.willEnable ? 'ENGAGED' : 'DISENGAGED'}`
        : `Flag Updated: ${pendingFlagToggle.name}`,
      description: pendingFlagToggle.willEnable
        ? 'Enforced globally across all Anycast edge nodes in real time.'
        : 'Reverted to standard operational baseline.',
      variant: pendingFlagToggle.isKillSwitch && pendingFlagToggle.willEnable ? 'destructive' : 'default',
    });
    setPendingFlagToggle(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            System Flags & Circuit Breakers
          </h1>
          <Badge variant="agent" size="sm">
            High Severity
          </Badge>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Zero-latency kill switches and runtime feature gates propagated instantly to all 320 Anycast PoPs.
        </p>
      </div>

      {/* Kill Switches Section (Primary User Requirement) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-rose-500 font-bold text-sm uppercase tracking-wider font-mono">
          <ShieldAlert className="w-4 h-4" />
          <span>Emergency Circuit Breakers (Kill Switches)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kill Switch 1: Signups */}
          <Card
            className={`p-6 border transition-all ${
              systemFlags.killSwitchSignups
                ? 'border-rose-500 bg-rose-500/10 shadow-lg shadow-rose-950/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Kill Switch: User Signups
                  </h3>
                  {systemFlags.killSwitchSignups ? (
                    <Badge variant="destructive" size="sm" className="animate-pulse">
                      ACTIVATED
                    </Badge>
                  ) : (
                    <Badge variant="outline" size="sm">
                      Normal / Standby
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Immediately halts all new user registrations across GitHub, Google OAuth, and email flows. Existing users retain full access to their workspaces.
                </p>
              </div>

              <button
                onClick={() =>
                  handleRequestToggle('killSwitchSignups', 'Kill Switch: User Signups', true)
                }
                className={`p-2 rounded-lg transition-colors ${
                  systemFlags.killSwitchSignups
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-white'
                }`}
                title={systemFlags.killSwitchSignups ? 'Deactivate kill switch' : 'Activate kill switch'}
              >
                {systemFlags.killSwitchSignups ? (
                  <ToggleRight className="w-8 h-8 text-rose-100" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-400" />
                )}
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Response Code</span>
              <span className="text-slate-700 dark:text-slate-300">
                {systemFlags.killSwitchSignups ? 'HTTP 503 (Signups Closed)' : 'HTTP 201 (Created)'}
              </span>
            </div>
          </Card>

          {/* Kill Switch 2: Link Creation */}
          <Card
            className={`p-6 border transition-all ${
              systemFlags.killSwitchLinkCreation
                ? 'border-rose-500 bg-rose-500/10 shadow-lg shadow-rose-950/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Kill Switch: Link Creation
                  </h3>
                  {systemFlags.killSwitchLinkCreation ? (
                    <Badge variant="destructive" size="sm" className="animate-pulse">
                      ACTIVATED
                    </Badge>
                  ) : (
                    <Badge variant="outline" size="sm">
                      Normal / Standby
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Halts link creation via API, MCP agents, and the dashboard. Existing redirects are completely unaffected and continue executing at the edge.
                </p>
              </div>

              <button
                onClick={() =>
                  handleRequestToggle('killSwitchLinkCreation', 'Kill Switch: Link Creation', true)
                }
                className={`p-2 rounded-lg transition-colors ${
                  systemFlags.killSwitchLinkCreation
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-white'
                }`}
                title={systemFlags.killSwitchLinkCreation ? 'Deactivate kill switch' : 'Activate kill switch'}
              >
                {systemFlags.killSwitchLinkCreation ? (
                  <ToggleRight className="w-8 h-8 text-rose-100" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-400" />
                )}
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Response Code</span>
              <span className="text-slate-700 dark:text-slate-300">
                {systemFlags.killSwitchLinkCreation ? 'HTTP 503 (Creation Suspended)' : 'HTTP 200 (OK)'}
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* Auxiliary Operational & Security Flags */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-indigo-500 font-bold text-sm uppercase tracking-wider font-mono">
          <ShieldCheck className="w-4 h-4" />
          <span>Auxiliary Security & Tooling Flags</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Strict Threat Scanning */}
          <Card className="p-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-900 dark:text-white">
                  Strict Threat Scanning
                </span>
                <span className="text-xs">
                  {systemFlags.strictThreatScanning ? (
                    <Badge variant="default" size="sm">Active</Badge>
                  ) : (
                    <Badge variant="outline" size="sm">Bypassed</Badge>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Reject any target URL matching Google Safe Browsing or VirusTotal threat lists with zero grace window.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">Pre-flight checks</span>
              <Button
                variant={systemFlags.strictThreatScanning ? 'outline' : 'default'}
                size="sm"
                onClick={() => handleRequestToggle('strictThreatScanning', 'Strict Threat Scanning')}
                className="text-xs h-7 px-2.5"
              >
                {systemFlags.strictThreatScanning ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </Card>

          {/* MCP Agent Tool Access */}
          <Card className="p-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-900 dark:text-white">
                  MCP Agent Tool Access
                </span>
                <span className="text-xs">
                  {systemFlags.mcpAgentToolAccess ? (
                    <Badge variant="agent" size="sm">Enabled</Badge>
                  ) : (
                    <Badge variant="destructive" size="sm">Disabled</Badge>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Allow Claude Desktop, Cursor, and LangChain agents to invoke tools over stdio/SSE gateways.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">Agent transports</span>
              <Button
                variant={systemFlags.mcpAgentToolAccess ? 'outline' : 'default'}
                size="sm"
                onClick={() => handleRequestToggle('mcpAgentToolAccess', 'MCP Agent Tool Access')}
                className="text-xs h-7 px-2.5"
              >
                {systemFlags.mcpAgentToolAccess ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </Card>

          {/* Require Passkey For All Links */}
          <Card className="p-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-900 dark:text-white">
                  Force Passkey Requirement
                </span>
                <span className="text-xs">
                  {systemFlags.requirePasskeyForAllLinks ? (
                    <Badge variant="warning" size="sm">Enforced</Badge>
                  ) : (
                    <Badge variant="outline" size="sm">Optional</Badge>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Enforces password protection on all newly created links across all workspaces globally.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">Default security</span>
              <Button
                variant={systemFlags.requirePasskeyForAllLinks ? 'outline' : 'default'}
                size="sm"
                onClick={() => handleRequestToggle('requirePasskeyForAllLinks', 'Force Passkey Requirement')}
                className="text-xs h-7 px-2.5"
              >
                {systemFlags.requirePasskeyForAllLinks ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      {pendingFlagToggle && (
        <Dialog
          isOpen={Boolean(pendingFlagToggle)}
          onClose={() => setPendingFlagToggle(null)}
          title={pendingFlagToggle.isKillSwitch ? 'Emergency Circuit Breaker Confirmation' : 'Confirm System Flag Change'}
        >
          <div className="space-y-4 text-xs">
            <div
              className={`p-3.5 rounded-lg border flex items-start gap-2.5 ${
                pendingFlagToggle.isKillSwitch
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">
                  {pendingFlagToggle.isKillSwitch ? 'Emergency Operation' : 'Configuration Change'}
                </span>
                <span>
                  You are about to{' '}
                  <strong className="text-white">
                    {pendingFlagToggle.willEnable ? 'ENABLE' : 'DISABLE'}
                  </strong>{' '}
                  "{pendingFlagToggle.name}".
                  {pendingFlagToggle.isKillSwitch &&
                    ' This will directly alter edge ingress behavior for thousands of concurrent requests across all Anycast PoPs.'}
                </span>
              </div>
            </div>

            <p className="text-slate-600 dark:text-slate-400">
              Do you want to broadcast this state change to all cluster ingress nodes immediately?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPendingFlagToggle(null)}
              >
                Cancel
              </Button>
              <Button
                variant={pendingFlagToggle.isKillSwitch ? 'destructive' : 'default'}
                size="sm"
                onClick={handleConfirmToggle}
              >
                Confirm & Propagate
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
