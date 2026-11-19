import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  Send,
  X,
  Check,
  RefreshCw,
  Clock
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../design-system/Card';
import { Button } from '../../../design-system/Button';
import { Input } from '../../../design-system/Input';
import { Badge } from '../../../design-system/Badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../../design-system/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../design-system/Dialog';
import { EmptyState } from '../../../design-system/EmptyState';
import { Skeleton } from '../../../design-system/Skeleton';
import { PageStateSimulator, PageErrorAlert, PageDisplayState } from '../../../components/common/PageStateSimulator';
import { useAppData, PendingInvite } from '../../../context/AppDataContext';
import { useWorkspace } from '../../../context/WorkspaceContext';
import { useToast } from '../../../context/ToastContext';
import { WorkspaceRole } from '../../../mock/types';

export const MembersPage: React.FC = () => {
  const {
    members,
    pendingInvites,
    inviteMember,
    cancelInvite,
    updateMemberRole,
    removeMember,
  } = useAppData();
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [pageState, setPageState] = useState<PageDisplayState>('normal');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    inviteMember(inviteEmail.trim(), inviteRole);
    setIsInviteModalOpen(false);
    setInviteEmail('');
    toast({
      title: 'Invitation Dispatched',
      description: `Sent invite link to ${inviteEmail} with role "${inviteRole}".`,
      variant: 'success',
    });
  };

  const handleResendInvite = (inv: PendingInvite) => {
    toast({
      title: 'Invitation Resent',
      description: `Re-sent verification email to ${inv.email}.`,
      variant: 'info',
    });
  };

  const handleCancelInvite = (inv: PendingInvite) => {
    cancelInvite(inv.id);
    toast({
      title: 'Invitation Revoked',
      description: `Cancelled pending invitation for ${inv.email}.`,
      variant: 'info',
    });
  };

  const handleRoleChange = (memberId: string, newRole: WorkspaceRole) => {
    updateMemberRole(memberId, newRole);
    toast({
      title: 'Role Updated',
      description: `Member role set to ${newRole}.`,
      variant: 'success',
    });
  };

  const handleRemoveMember = (name: string, id: string) => {
    if (window.confirm(`Remove ${name} from ${activeWorkspace.name}?`)) {
      removeMember(id);
      toast({
        title: 'Member Removed',
        description: `Revoked workspace access for ${name}.`,
        variant: 'info',
      });
    }
  };

  const displayedMembers = pageState === 'empty' ? [] : members;
  const displayedInvites = pageState === 'empty' ? [] : pendingInvites;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Page State Simulator Control */}
      <PageStateSimulator
        currentState={pageState}
        onStateChange={setPageState}
        pageLabel="Team Members"
      />

      {/* ERROR STATE */}
      {pageState === 'error' && (
        <PageErrorAlert
          title="Directory Sync Failure"
          message="Could not reach the SCIM / SAML identity provider to synchronize workspace seat rosters."
          onRetry={() => {
            setPageState('loading');
            setTimeout(() => setPageState('normal'), 600);
          }}
        />
      )}

      {/* 2. Top Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Workspace Members & Roles</span>
            <Badge variant="agent" size="sm">
              {members.length} / 5 Seats Used
            </Badge>
          </h2>
          <p className="text-xs text-slate-500">
            Manage granular access control, member permissions, and pending invites in <strong>{activeWorkspace.name}</strong>
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsInviteModalOpen(true)}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Invite Member
        </Button>
      </div>

      {/* 3. Active Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Members</CardTitle>
          <CardDescription>
            Engineers and collaborators with active Bearer access to this workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {pageState === 'loading' ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
                  <Skeleton variant="circular" width={28} height={28} />
                  <Skeleton variant="text" width="40%" height={16} />
                  <Skeleton variant="text" width="20%" height={16} />
                </div>
              ))}
            </div>
          ) : displayedMembers.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No members found"
                description="Invite teammates to collaborate on short links and API token management."
                action={
                  <Button size="sm" variant="primary" onClick={() => setIsInviteModalOpen(true)}>
                    Invite First Member
                  </Button>
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email Address</TableHead>
                  <TableHead>Workspace Role</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <img
                          src={member.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                          alt={member.name}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-white/10 shrink-0"
                        />
                        <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                          {member.name}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-500 font-mono">
                      {member.email}
                    </TableCell>

                    <TableCell>
                      {member.role === 'owner' ? (
                        <Badge variant="primary" size="sm">
                          Owner
                        </Badge>
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as WorkspaceRole)}
                          className="h-7 px-2 text-xs rounded border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0f111a] text-slate-900 dark:text-slate-100 cursor-pointer"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-slate-500">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </TableCell>

                    <TableCell className="text-right">
                      {member.role !== 'owner' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.name, member.id)}
                          className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1.5"
                          title="Remove member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-400">Workspace Primary</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 4. Pending Invitations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Pending Invitations</span>
          </CardTitle>
          <CardDescription>
            Invites awaiting recipient email verification and acceptance
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {displayedInvites.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No pending invites for this workspace.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invited Email</TableHead>
                  <TableHead>Assigned Role</TableHead>
                  <TableHead>Sent Timestamp</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedInvites.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {inv.email}
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" size="sm" className="capitalize">
                        {inv.role}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs text-slate-500">
                      {new Date(inv.sentAt).toLocaleString()}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResendInvite(inv)}
                          leftIcon={<RefreshCw className="w-3 h-3" />}
                          className="text-xs"
                        >
                          Resend
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelInvite(inv)}
                          className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1.5"
                          title="Revoke invite"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <Dialog isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invite link to grant workspace dashboard and API access
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleSendInvite} className="space-y-4 py-1">
              <Input
                label="Teammate Email Address"
                type="email"
                placeholder="colleague@yourcompany.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                autoFocus
              />

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                  Select Role & Permissions
                </label>
                <div className="space-y-2 p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 text-xs">
                  {[
                    { id: 'admin', label: 'Admin', desc: 'Can manage links, API keys, webhooks, and billing' },
                    { id: 'member', label: 'Member', desc: 'Can create and inspect links, view analytics' },
                    { id: 'viewer', label: 'Viewer', desc: 'Read-only access to link traffic and reports' },
                  ].map((role) => (
                    <label key={role.id} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="invite-role"
                        checked={inviteRole === role.id}
                        onChange={() => setInviteRole(role.id as any)}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {role.label}
                        </span>
                        <p className="text-[11px] text-slate-500">{role.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsInviteModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" leftIcon={<Send className="w-3.5 h-3.5" />}>
                  Send Invitation
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
