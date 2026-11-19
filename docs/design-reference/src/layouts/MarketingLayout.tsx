import React from 'react';
import { Outlet } from 'react-router-dom';
import { MarketingHeader } from '../components/navigation/MarketingHeader';
import { MarketingFooter } from '../components/navigation/MarketingFooter';

export const MarketingLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#07080c] text-slate-900 dark:text-slate-100 transition-colors">
      <MarketingHeader />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <MarketingFooter />
    </div>
  );
};
