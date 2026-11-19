import React, { useState } from 'react';
import {
  Users,
  Search,
  Building,
  Link as LinkIcon,
  DollarSign,
  Calendar,
  MessageSquare,
  Plus,
  Shield,
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  User,
  Filter,
} from 'lucide-react';
import { Card } from '../../design-system/Card';
import { Badge } from '../../design-system/Badge';
import { Button } from '../../design-system/Button';
import { Input } from '../../design-system/Input';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import { CustomerAccount } from '../../mock/types';

export const AdminCustomersPage: React.FC = () => {
  const { customers, addCustomerNote } = useAppData();
  const { addToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'developer' | 'team' | 'enterprise'>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [newNoteContent, setNewNoteContent] = useState('');

  const filteredCustomers = customers.filter((cust) => {
    const matchesSearch =
      cust.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cust.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cust.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPlan = planFilter === 'all' || cust.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || filteredCustomers[0];

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || !selectedCustomer) return;

    addCustomerNote(selectedCustomer.id, newNoteContent.trim());
    setNewNoteContent('');
    addToast({
      title: 'Support Note Logged',
      description: `Note added to ${selectedCustomer.name}'s internal profile.`,
      variant: 'default',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Customer & Tenant Directory
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Inspect customer workspaces, billing tier status, resource limits, and internal operator support notes.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search customers by name, email, or account ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPlanFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                planFilter === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              All Tiers ({customers.length})
            </button>
            <button
              onClick={() => setPlanFilter('developer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                planFilter === 'developer'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Free
            </button>
            <button
              onClick={() => setPlanFilter('team')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                planFilter === 'team'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Pro ($9)
            </button>
            <button
              onClick={() => setPlanFilter('enterprise')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                planFilter === 'enterprise'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Team ($29)
            </button>
          </div>
        </div>
      </Card>

      {/* Split View: Customers List on Left, Detail & Support Notes on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Customer List Column */}
        <div className="lg:col-span-5 space-y-2">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No customers match search parameters.</p>
            </div>
          ) : (
            filteredCustomers.map((cust) => {
              const isSelected = cust.id === selectedCustomer?.id;
              return (
                <div
                  key={cust.id}
                  onClick={() => setSelectedCustomerId(cust.id)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {cust.avatarUrl ? (
                        <img
                          src={cust.avatarUrl}
                          alt={cust.name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300">
                          {cust.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          {cust.name}
                          {cust.status === 'suspended' && (
                            <Badge variant="destructive" size="sm">
                              Suspended
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[190px]">
                          {cust.email}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <Badge
                        variant={
                          cust.plan === 'enterprise'
                            ? 'agent'
                            : cust.plan === 'team'
                            ? 'default'
                            : 'secondary'
                        }
                        size="sm"
                      >
                        {cust.plan === 'developer' ? 'Free' : cust.plan === 'team' ? 'Pro' : 'Team'}
                      </Badge>
                      <div className="font-mono text-[11px] font-bold text-slate-900 dark:text-slate-200 mt-1">
                        ${cust.monthlySpendUsd}/mo
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>{cust.workspacesCount} workspace{cust.workspacesCount > 1 ? 's' : ''}</span>
                    <span>{cust.linksCount.toLocaleString()} links</span>
                    <span>{cust.supportNotes.length} notes</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Customer Detail Column */}
        <div className="lg:col-span-7">
          {selectedCustomer ? (
            <div className="space-y-6">
              {/* Account Overview Card */}
              <Card className="p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                  <div className="flex items-center gap-4">
                    {selectedCustomer.avatarUrl ? (
                      <img
                        src={selectedCustomer.avatarUrl}
                        alt={selectedCustomer.name}
                        className="w-12 h-12 rounded-full object-cover border border-slate-300 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-700 dark:text-slate-200">
                        {selectedCustomer.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          {selectedCustomer.name}
                        </h2>
                        <Badge
                          variant={
                            selectedCustomer.plan === 'enterprise'
                              ? 'agent'
                              : selectedCustomer.plan === 'team'
                              ? 'default'
                              : 'secondary'
                          }
                          size="sm"
                        >
                          {selectedCustomer.plan === 'developer'
                            ? 'Free'
                            : selectedCustomer.plan === 'team'
                            ? 'Pro'
                            : 'Team'}
                        </Badge>
                      </div>
                      <div className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {selectedCustomer.email} • ID: {selectedCustomer.id}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedCustomer.status === 'suspended' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Account Suspended
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Active & In Good Standing
                      </span>
                    )}
                  </div>
                </div>

                {/* Account Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Workspaces</span>
                    <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                      {selectedCustomer.workspacesCount}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Active Links</span>
                    <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                      {selectedCustomer.linksCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Monthly Spend</span>
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      ${selectedCustomer.monthlySpendUsd}/mo
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Joined Date</span>
                    <span className="text-xs font-medium text-slate-900 dark:text-slate-200 mt-1 block">
                      {new Date(selectedCustomer.joinedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Support Notes Section */}
              <Card className="p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Internal Support & Compliance Notes ({selectedCustomer.supportNotes.length})
                    </h3>
                  </div>
                  <Badge variant="outline" size="sm">
                    Operator Only
                  </Badge>
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="space-y-2">
                  <textarea
                    placeholder="Log a support interaction, custom SLA agreement, or compliance memo..."
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    rows={2}
                    className="w-full p-3 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!newNoteContent.trim()}
                      className="text-xs"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Add Support Note
                    </Button>
                  </div>
                </form>

                {/* Notes Timeline */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {selectedCustomer.supportNotes.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 italic">
                      No support notes recorded yet for this customer account.
                    </div>
                  ) : (
                    selectedCustomer.supportNotes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                            <User className="w-3 h-3 text-indigo-400" />
                            {note.author}
                          </span>
                          <span className="text-slate-400 font-mono text-[10px]">
                            {new Date(note.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {note.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          ) : (
            <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Select a customer account to inspect details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
