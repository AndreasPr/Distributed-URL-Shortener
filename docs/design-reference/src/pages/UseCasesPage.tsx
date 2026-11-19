import React from 'react';
import { Link } from 'react-router-dom';
import {
  Share2,
  Mail,
  Printer,
  Calendar,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  Globe2,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';

export const UseCasesPage: React.FC = () => {
  const useCases = [
    {
      id: 'social',
      title: 'Social Media & Influencer Campaigns',
      subtitle: 'Instagram · TikTok · YouTube · X (Twitter)',
      icon: Share2,
      badge: 'High Click-Through',
      color: 'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/40',
      description:
        'Social bios only allow a single clickable URL. Relaymark gives creators, agencies, and brands clean short links and beautiful profile pages that load in milliseconds.',
      features: [
        'Custom memorable branded slugs (e.g. relay.mk/fall-drop)',
        'Built-in Link-in-Bio profiles with zero intrusive ads',
        'UTM attribution to track which platform actually drives sales',
        'Instant redirect destination editing without updating your bio link',
      ],
      example: {
        scenario: 'Fashion brand running 10 creator sponsorships simultaneously',
        solution: 'Generates relay.mk/creator-name with unique UTM tags to calculate true ROAS per influencer.',
      },
    },
    {
      id: 'email',
      title: 'Email Marketing & Newsletters',
      subtitle: 'Substack · Mailchimp · Klaviyo · Customer.io',
      icon: Mail,
      badge: 'Precise Attribution',
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40',
      description:
        'Default email links often break or get flagged by spam filters when ESPs rewrite long, query-heavy tracking strings. Relaymark keeps your email deliverability pristine.',
      features: [
        'Clean short links that don’t trigger spam spam-heuristics',
        'Built-in UTM builder for campaigns, mediums, and content tags',
        'Batch CSV import for generating hundreds of personalized links',
        'Automatic HTTPS enforcement and malware safe-browsing checks',
      ],
      example: {
        scenario: 'Weekly tech newsletter reaching 50,000 subscribers',
        solution: 'Relaymark provides real-time click heatmaps showing exactly which article link captured the most interest.',
      },
    },
    {
      id: 'print',
      title: 'Print Media & Packaging',
      subtitle: 'Menus · Product Boxes · Flyers · Direct Mail',
      icon: Printer,
      badge: 'Dynamic QR Codes',
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
      description:
        'Printing permanent URLs on thousands of physical brochures, food menus, or product boxes is risky. If a link changes or has a typo, you would have to scrap physical inventory.',
      features: [
        'Dynamic QR codes: change the destination URL after printing',
        'Print-ready vector SVG downloads for professional prepress software',
        'Custom colors, corner eyes, and logo center stamps to match your brand',
        'Foot traffic scan telemetry to measure offline print campaigns',
      ],
      example: {
        scenario: 'Restaurant chain printing table QR stickers across 8 locations',
        solution: 'Seasonal menus update instantly in the Relaymark dashboard without replacing the vinyl table stickers.',
      },
    },
    {
      id: 'events',
      title: 'Live Events & Conferences',
      subtitle: 'Stage Slides · Attendee Badges · Booths · Hackathons',
      icon: Calendar,
      badge: 'Instant Redirects',
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40',
      description:
        'Speakers need attendees to type links quickly from their smartphone screens while looking at auditorium slides. Relaymark short links are short, clean, and unambiguous.',
      features: [
        'Short, human-readable slugs easy to type from the back row (e.g. relay.mk/ai-deck)',
        'Big high-contrast QR codes displayed on slide presentations',
        'Auto-expiration dates for flash giveaways or private conference discounts',
        'Passkey/password gating for attendee-only workshops',
      ],
      example: {
        scenario: 'Keynote speaker presenting to 2,000 attendees',
        solution: 'Displays a high-contrast QR code on slide 1; gets 1,200 real-time scans captured and analyzed on the stage monitor.',
      },
    },
  ];

  return (
    <div className="w-full space-y-16 py-12 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="agent" size="sm">
          REAL-WORLD USE CASES
        </Badge>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Built for every link your audience touches.
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          From creator bio links and newsletter campaigns to retail storefront QR codes and keynote stage slides, Relaymark powers trusted redirects everywhere.
        </p>
      </div>

      {/* 4 Deep-Dive Use Cases */}
      <div className="space-y-10">
        {useCases.map((uc, idx) => (
          <Card key={uc.id} className="overflow-hidden">
            <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Icon & Story */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${uc.color}`}>
                    <uc.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      {uc.title}
                    </h2>
                    <p className="text-xs font-mono text-slate-500">{uc.subtitle}</p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {uc.description}
                </p>

                {/* Key Capabilities */}
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Why Relaymark excels for this channel:
                  </p>
                  <ul className="space-y-1.5">
                    {uc.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right Column: Realistic Example Box */}
              <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Practical Workflow Example
                  </span>
                  <Badge variant="neutral" size="sm">
                    {uc.badge}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block">Scenario:</span>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">{uc.example.scenario}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-white/5">
                    <span className="font-semibold text-blue-600 dark:text-blue-400 block">Relaymark Solution:</span>
                    <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                      {uc.example.solution}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <Link to="/pricing">
                    <Button variant="outline" size="sm" className="w-full justify-center">
                      Explore Plans for {uc.title.split(' ')[0]}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="p-8 sm:p-10 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] text-center space-y-4 max-w-3xl mx-auto shadow-xs">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Have a unique campaign in mind?
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl mx-auto">
          Start on our free tier with 25 links, 5 QR codes, and 1 link-in-bio page. Upgrade to Pro when your campaigns require custom domains and bulk CSV imports.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link to="/login">
            <Button variant="primary">Get Started Free</Button>
          </Link>
          <Link to="/qr-codes">
            <Button variant="outline">Test QR Generator</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
