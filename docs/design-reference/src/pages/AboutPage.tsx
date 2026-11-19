import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Globe, Heart, Shield, Terminal, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { Badge } from '../design-system/Badge';
import { Button } from '../design-system/Button';
import { RelayLogo } from '../design-system/Icons';

export const AboutPage: React.FC = () => {
  return (
    <div className="w-full max-w-3xl mx-auto py-12 px-4 sm:px-6 space-y-12">
      {/* Header */}
      <div className="space-y-3">
        <Badge variant="agent" size="sm">
          ORIGIN & VALUES
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Built by a developer who needed faster redirects
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          An honest, transparent infrastructure product created from scratch without venture capital hype or bloated tracking code.
        </p>
      </div>

      {/* The Story */}
      <section className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          The Story Behind Relaymark
        </h2>

        <p>
          I started Relaymark because existing link shorteners felt like products built in 2012 that had spent the intervening decade adding marketing bloat. When testing autonomous AI agents in Cursor and Claude Desktop, I kept encountering link services that broke automated curls, injected heavy JavaScript interstitial trackers, or charged $200/month just for basic API key access.
        </p>

        <p>
          Redirects are fundamentally simple network primitives: inspect a path, look up a key, and return a 301/302 HTTP response. There is no legitimate technical reason for a redirect to take 250 milliseconds or require five third-party analytics pixels.
        </p>

        <p>
          Relaymark is my attempt to build what link infrastructure should look like today: written in lightweight Go, cached across an Anycast edge, and natively compatible with both human command lines and modern AI agent protocols.
        </p>
      </section>

      {/* Core Principles */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Operating Principles
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-4 space-y-2">
            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
              01. Raw Performance
            </span>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Sub-12ms Global P95
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Redirects resolve at the nearest Anycast edge forwarder in memory. Zero round-trips to distant origin servers.
            </p>
          </Card>

          <Card className="p-4 space-y-2">
            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
              02. Zero Tracking Bloat
            </span>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Clean HTTP Headers
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              No interstitial screens, no JavaScript tracking scripts, no privacy invasion. Fast, respect-first link forwarding.
            </p>
          </Card>

          <Card className="p-4 space-y-2">
            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
              03. First-Class AI Citizens
            </span>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Native MCP Protocols
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              AI agents running in Claude or Cursor are treated with the same ergonomic respect as human developers.
            </p>
          </Card>

          <Card className="p-4 space-y-2">
            <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
              04. Honest Enforced Limits
            </span>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              No Surprise Invoices
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Quotas are predictable and enforced at the gateway. You will never open your email to an unexpected $1,500 overage bill.
            </p>
          </Card>
        </div>
      </section>

      {/* Who Builds It */}
      <section className="p-6 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f111a] space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
          Who Builds It
        </h2>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80"
            alt="Andreas Priftis"
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-full object-cover border-2 border-slate-300 dark:border-white/20 shrink-0"
          />

          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Andreas Priftis
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Software Engineer & Distributed Systems Architect · Athens, Greece
            </p>
            <div className="flex items-center gap-4 pt-1 text-xs">
              <a
                href="https://github.com/AndreasPr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Github className="w-3.5 h-3.5" />
                <span>GitHub Profile</span>
              </a>
              <Link to="/contact" className="text-slate-600 dark:text-slate-400 hover:text-slate-900">
                Contact Andreas
              </Link>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-2 border-t border-slate-200 dark:border-white/5">
          Relaymark is an independent software business. Every line of backend Go code, edge routing rule, and customer support email is handled directly by me. When you email support, you are speaking directly with the engineer who wrote the code.
        </p>
      </section>

      {/* CTA */}
      <div className="pt-4 flex items-center justify-between">
        <Link to="/pricing">
          <Button variant="outline" size="sm">
            View Pricing Plans
          </Button>
        </Link>
        <Link to="/app/links">
          <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            Start free
          </Button>
        </Link>
      </div>
    </div>
  );
};
