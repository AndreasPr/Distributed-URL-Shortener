import React, { useState, useRef, useEffect } from 'react';
import { ChevronsUpDown, Check, Plus, ShieldCheck, Cpu } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Badge } from '../../design-system/Badge';

export const WorkspaceSwitcher: React.FC = () => {
  const { workspaces, activeWorkspace, setActiveWorkspaceId, createWorkspace } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    createWorkspace(newWsName.trim(), 'team');
    setNewWsName('');
    setIsCreating(false);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="w-full flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] text-left transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-blue-600 dark:bg-blue-600/30 border border-blue-500/20 flex items-center justify-center text-white shrink-0 font-bold text-xs">
            {activeWorkspace.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
              {activeWorkspace.name}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
              <span className="capitalize">{activeWorkspace.plan}</span>
              <span>·</span>
              <span>{activeWorkspace.currentLinksCount} links</span>
            </div>
          </div>
        </div>

        <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1.5 w-full z-50 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] shadow-lg p-1 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Available Workspaces
          </div>

          <div className="space-y-0.5 max-h-56 overflow-y-auto">
            {workspaces.map((ws) => {
              const isSelected = ws.id === activeWorkspace.id;
              return (
                <button
                  key={ws.id}
                  onClick={() => {
                    setActiveWorkspaceId(ws.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-md text-xs transition-colors text-left cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-medium'
                      : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {ws.name.charAt(0)}
                    </div>
                    <div className="truncate">
                      <p className="truncate leading-none">{ws.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {ws.slug}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <Badge variant={ws.plan === 'enterprise' ? 'agent' : 'neutral'} size="sm">
                      {ws.plan}
                    </Badge>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* New Workspace Creation Form */}
          <div className="pt-1.5 mt-1.5 border-t border-slate-100 dark:border-white/5">
            {isCreating ? (
              <form onSubmit={handleCreate} className="p-1 space-y-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="New workspace name..."
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-white/10 bg-white dark:bg-[#07080c] text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600 dark:focus:border-blue-500"
                />
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-2 py-1 text-[11px] rounded text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-[11px] rounded bg-blue-600 text-white font-medium hover:bg-blue-700"
                  >
                    Create
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center gap-2 p-2 text-xs rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Create Workspace</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
