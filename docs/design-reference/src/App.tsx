import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { ToastProvider } from './context/ToastContext';
import { AppDataProvider } from './context/AppDataContext';
import { MarketingLayout } from './layouts/MarketingLayout';
import { AppLayout } from './layouts/AppLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Public Marketing Pages
import { LandingPage } from './pages/LandingPage';
import { PricingPage } from './pages/PricingPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { DocsPage } from './pages/DocsPage';
import { ChangelogPage } from './pages/ChangelogPage';
import { StatusPage } from './pages/StatusPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { BlogPage } from './pages/BlogPage';
import { SecurityPage } from './pages/SecurityPage';
import { ReportPage } from './pages/ReportPage';
import { QrCodesPage } from './pages/QrCodesPage';
import { LinkInBioPublicPage } from './pages/LinkInBioPublicPage';
import { UseCasesPage } from './pages/UseCasesPage';
import { DevelopersPage } from './pages/DevelopersPage';

// Authentication & Onboarding
import { LoginPage } from './pages/auth/LoginPage';
import { OnboardingPage } from './pages/auth/OnboardingPage';

// App Signed-In Product Pages
import { DashboardPage } from './pages/app/DashboardPage';
import { LinksPage } from './pages/app/LinksPage';
import { LinkDetailPage } from './pages/app/LinkDetailPage';
import { AnalyticsPage } from './pages/app/AnalyticsPage';
import { McpPage } from './pages/app/McpPage';
import { BioPage } from './pages/app/BioPage';

// App Settings Subpages
import { SettingsLayout } from './pages/app/settings/SettingsLayout';
import { KeysPage } from './pages/app/settings/KeysPage';
import { WebhooksPage } from './pages/app/settings/WebhooksPage';
import { MembersPage } from './pages/app/settings/MembersPage';
import { BillingPage } from './pages/app/settings/BillingPage';
import { UsagePage } from './pages/app/settings/UsagePage';
import { AccountPage } from './pages/app/settings/AccountPage';
import { AuditPage } from './pages/app/settings/AuditPage';

// Legal Documents
import { TermsPage } from './pages/legal/TermsPage';
import { PrivacyPage } from './pages/legal/PrivacyPage';
import { AupPage } from './pages/legal/AupPage';
import { CookiesPage } from './pages/legal/CookiesPage';
import { RefundsPage } from './pages/legal/RefundsPage';
import { DpaPage } from './pages/legal/DpaPage';
import { SubprocessorsPage } from './pages/legal/SubprocessorsPage';

// Admin Pages
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminFlaggedPage } from './pages/admin/AdminFlaggedPage';
import { AdminCustomersPage } from './pages/admin/AdminCustomersPage';
import { AdminFlagsPage } from './pages/admin/AdminFlagsPage';

// System Pages
import { NotFoundPage } from './pages/system/NotFoundPage';
import { ServerErrorPage } from './pages/system/ServerErrorPage';
import { RateLimitedPage } from './pages/system/RateLimitedPage';
import { MaintenancePage } from './pages/system/MaintenancePage';
import { ExpiredLinkPage } from './pages/system/ExpiredLinkPage';
import { BlockedLinkPage } from './pages/system/BlockedLinkPage';
import { EmailVerificationPage } from './pages/system/EmailVerificationPage';

// Showcase & Design System
import { DesignSystemPage } from './pages/DesignSystemPage';
import { ComponentShowcase } from './components/showcase/ComponentShowcase';
import { AdminPreview } from './components/showcase/AdminPreview';

export default function App() {
  return (
    <ThemeProvider>
      <WorkspaceProvider>
        <AppDataProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                {/* Standalone Auth & Onboarding Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />

                {/* Layout 1: MarketingLayout (Public Pages & Legal) */}
                <Route path="/" element={<MarketingLayout />}>
                  <Route index element={<LandingPage />} />
                  <Route path="pricing" element={<PricingPage />} />
                  <Route path="features" element={<FeaturesPage />} />
                  <Route path="docs" element={<DocsPage />} />
                  <Route path="changelog" element={<ChangelogPage />} />
                  <Route path="status" element={<StatusPage />} />
                  <Route path="about" element={<AboutPage />} />
                  <Route path="contact" element={<ContactPage />} />
                  <Route path="blog" element={<BlogPage />} />
                  <Route path="security" element={<SecurityPage />} />
                  <Route path="report" element={<ReportPage />} />

                  {/* New Public Pages */}
                  <Route path="qr-codes" element={<QrCodesPage />} />
                  <Route path="link-in-bio" element={<LinkInBioPublicPage />} />
                  <Route path="bio/:handle" element={<LinkInBioPublicPage />} />
                  <Route path="use-cases" element={<UseCasesPage />} />
                  <Route path="developers" element={<DevelopersPage />} />

                  {/* Legal & Compliance Routes */}
                  <Route path="legal/terms" element={<TermsPage />} />
                  <Route path="legal/privacy" element={<PrivacyPage />} />
                  <Route path="legal/aup" element={<AupPage />} />
                  <Route path="legal/cookies" element={<CookiesPage />} />
                  <Route path="legal/refunds" element={<RefundsPage />} />
                  <Route path="legal/dpa" element={<DpaPage />} />
                  <Route path="legal/subprocessors" element={<SubprocessorsPage />} />

                  {/* Design System Primitives & Tokens */}
                  <Route path="design-system" element={<DesignSystemPage />} />
                </Route>

                {/* Layout 2: AppLayout (Signed-In Product Pages) */}
                <Route path="/app" element={<AppLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="links" element={<LinksPage />} />
                  <Route path="links/:id" element={<LinkDetailPage />} />
                  <Route path="bio" element={<BioPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="mcp" element={<McpPage />} />

                  {/* Direct redirect shortcuts */}
                  <Route path="keys" element={<Navigate to="/app/settings/keys" replace />} />
                  <Route path="webhooks" element={<Navigate to="/app/settings/webhooks" replace />} />
                  <Route path="billing" element={<Navigate to="/app/settings/billing" replace />} />
                  <Route path="members" element={<Navigate to="/app/settings/members" replace />} />
                  <Route path="usage" element={<Navigate to="/app/settings/usage" replace />} />

                  {/* Settings Subsection */}
                  <Route path="settings" element={<SettingsLayout />}>
                    <Route index element={<Navigate to="/app/settings/keys" replace />} />
                    <Route path="keys" element={<KeysPage />} />
                    <Route path="webhooks" element={<WebhooksPage />} />
                    <Route path="members" element={<MembersPage />} />
                    <Route path="billing" element={<BillingPage />} />
                    <Route path="usage" element={<UsagePage />} />
                    <Route path="account" element={<AccountPage />} />
                    <Route path="audit" element={<AuditPage />} />
                  </Route>

                  {/* Design System Preview */}
                  <Route path="design-system" element={<DesignSystemPage />} />
                </Route>

                {/* Layout 3: AdminLayout (Cluster Admin Console) */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminOverviewPage />} />
                  <Route path="flagged" element={<AdminFlaggedPage />} />
                  <Route path="customers" element={<AdminCustomersPage />} />
                  <Route path="flags" element={<AdminFlagsPage />} />
                  <Route path="preview" element={<AdminPreview />} />
                </Route>

                {/* System & Fallback Standalone Pages */}
                <Route path="/404" element={<NotFoundPage />} />
                <Route path="/500" element={<ServerErrorPage />} />
                <Route path="/429" element={<RateLimitedPage />} />
                <Route path="/maintenance" element={<MaintenancePage />} />
                <Route path="/expired-link" element={<ExpiredLinkPage />} />
                <Route path="/blocked-link" element={<BlockedLinkPage />} />
                <Route path="/email-verification-needed" element={<EmailVerificationPage />} />
                <Route path="/verify-email" element={<EmailVerificationPage />} />

                {/* Fallback Catch-All to 404 */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </AppDataProvider>
      </WorkspaceProvider>
    </ThemeProvider>
  );
}
