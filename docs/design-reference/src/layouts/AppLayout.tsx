import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/navigation/Sidebar';
import { Topbar } from '../components/navigation/Topbar';
import { CommandPalette } from '../components/navigation/CommandPalette';
import { CreateEditLinkModal } from '../components/links/CreateEditLinkModal';
import { useAppData } from '../context/AppDataContext';

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isCreateLinkModalOpen, closeCreateLinkModal } = useAppData();

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#07080c] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Sidebar navigation */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main viewport offset by 256px on lg screens */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Topbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette />

      {/* Global Create Link Modal */}
      {isCreateLinkModalOpen && (
        <CreateEditLinkModal
          isOpen={isCreateLinkModalOpen}
          onClose={closeCreateLinkModal}
        />
      )}
    </div>
  );
};
