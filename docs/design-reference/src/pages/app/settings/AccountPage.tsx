import React, { useState } from 'react';
import {
  UserCheck,
  Download,
  Trash2,
  AlertTriangle,
  Check,
  ShieldAlert,
  FileJson,
  Key
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../design-system/Card';
import { Button } from '../../../design-system/Button';
import { Input } from '../../../design-system/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../design-system/Dialog';
import { PageStateSimulator, PageErrorAlert, PageDisplayState } from '../../../components/common/PageStateSimulator';
import { useAppData } from '../../../context/AppDataContext';
import { useToast } from '../../../context/ToastContext';

export const AccountPage: React.FC = () => {
  const { currentUser, updateCurrentUser, links, apiKeys, webhooks, auditLogs } = useAppData();
  const { toast } = useToast();

  const [pageState, setPageState] = useState<PageDisplayState>('normal');
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [timezone, setTimezone] = useState('Europe/Athens (UTC+2)');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentUser({ name, email, avatarUrl });
    toast({
      title: 'Profile Updated',
      description: 'Saved your account preferences.',
      variant: 'success',
    });
  };

  const handleExportData = () => {
    const exportPayload = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        version: 'v2.4.1',
        format: 'GDPR Article 20 Portable Archive',
      },
      userProfile: currentUser,
      workspaceLinks: links,
      apiKeys: apiKeys.map((k) => ({ id: k.id, name: k.name, prefix: k.prefix, scope: k.scope, environment: k.environment })),
      webhooks: webhooks,
      auditLogs: auditLogs,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `relaymark-export-${currentUser.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    toast({
      title: 'Data Archive Exported',
      description: `Downloaded JSON ledger for ${currentUser.email}.`,
      variant: 'success',
    });
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmationText !== 'DELETE MY ACCOUNT') return;

    setIsDeleteModalOpen(false);
    toast({
      title: 'Account Deletion Scheduled',
      description: 'Your account and workspace data will be permanently wiped in 14 days.',
      variant: 'error',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Page State Simulator Control */}
      <PageStateSimulator
        currentState={pageState}
        onStateChange={setPageState}
        pageLabel="Account Profile"
      />

      {/* ERROR STATE */}
      {pageState === 'error' && (
        <PageErrorAlert
          title="Profile Store Synchronizer Offline"
          message="Could not read user profile metadata from the primary user database."
          onRetry={() => {
            setPageState('loading');
            setTimeout(() => setPageState('normal'), 600);
          }}
        />
      )}

      {/* 2. Profile Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Developer Profile Details</span>
          </CardTitle>
          <CardDescription>
            Manage your personal profile and account credentials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
            <div className="flex items-center gap-4 pb-2">
              <img
                src={avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                alt={name}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-full object-cover border border-slate-300 dark:border-white/20"
              />
              <div className="space-y-0.5">
                <p className="font-semibold text-xs text-slate-900 dark:text-slate-100">{name}</p>
                <p className="text-[11px] text-slate-500 font-mono">User ID: {currentUser.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="Primary Account Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Input
              label="Avatar Image URL"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
            />

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                Preferred Timezone (Analytics)
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0f111a] text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
              >
                <option value="Europe/Athens (UTC+2)">Europe/Athens (UTC+2)</option>
                <option value="Europe/London (UTC+0)">Europe/London (UTC+0)</option>
                <option value="Europe/Frankfurt (UTC+1)">Europe/Frankfurt (UTC+1)</option>
                <option value="America/New_York (UTC-5)">America/New_York (UTC-5)</option>
                <option value="America/Los_Angeles (UTC-8)">America/Los_Angeles (UTC-8)</option>
                <option value="Asia/Tokyo (UTC+9)">Asia/Tokyo (UTC+9)</option>
              </select>
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" size="sm">
                Save Profile Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 3. Export My Data (GDPR Portability) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileJson className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Export Personal Data (GDPR Portability)</span>
          </CardTitle>
          <CardDescription>
            Download a portable, machine-readable JSON archive of all links, API keys, and audit ledgers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
            Pursuant to Article 20 of the GDPR, you have the right to receive all personal data and configuration records associated with your Relaymark developer account in a structured, commonly used format.
          </p>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export All Data (.json)
          </Button>
        </CardContent>
      </Card>

      {/* 4. Danger Zone: Delete Account */}
      <div className="p-6 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 space-y-4">
        <div>
          <h3 className="font-bold text-base text-rose-950 dark:text-rose-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>Danger Zone: Delete Account</span>
          </h3>
          <p className="text-xs text-rose-800 dark:text-rose-300 mt-1 max-w-2xl">
            Permanently delete your personal profile, all owned workspaces, active shortlinks, and API keys. This action cannot be reversed.
          </p>
        </div>

        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            setDeleteConfirmationText('');
            setIsDeleteModalOpen(true);
          }}
          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
        >
          Delete Account
        </Button>
      </div>

      {/* Delete Account Modal with Confirmation Word */}
      {isDeleteModalOpen && (
        <Dialog isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle>Confirm Permanent Deletion</DialogTitle>
                  <DialogDescription>
                    This will permanently destroy all short links and active API keys
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs text-slate-600 dark:text-slate-400">
              <p>
                To prevent accidental deletion, please type <strong className="font-mono text-rose-600 dark:text-rose-400">DELETE MY ACCOUNT</strong> in the field below:
              </p>

              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-rose-300 dark:border-rose-900 bg-white dark:bg-[#0f111a] text-rose-900 dark:text-rose-100 outline-none focus:ring-1 focus:ring-rose-500"
                autoFocus
              />
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={deleteConfirmationText !== 'DELETE MY ACCOUNT'}
                onClick={handleDeleteAccount}
              >
                Permanently Delete Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
