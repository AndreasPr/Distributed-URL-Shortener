import React from 'react';
import { ShieldCheck, Lock, Key, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { Badge } from '../design-system/Badge';
import { Button } from '../design-system/Button';
import { CodeBlock } from '../design-system/CodeBlock';
import { useToast } from '../context/ToastContext';

export const SecurityPage: React.FC = () => {
  const { toast } = useToast();

  const practices = [
    {
      title: 'Encryption In-Transit & At Rest',
      desc: 'All HTTP and WebSocket traffic terminates over TLS 1.3 with strict HSTS headers. Database backends and Redis memory instances are encrypted at rest with AES-256-GCM.',
    },
    {
      title: 'Argon2id Password Key Hashing',
      desc: 'When short links are passkey-gated, passwords are never stored in plaintext. They are salted and hashed using Argon2id with memory-hard cost parameters.',
    },
    {
      title: 'Automated Threat Intelligence Ingestion',
      desc: 'Destination URLs are evaluated against Google Safe Browsing and commercial feeds upon submission and periodically re-verified. Malicious targets are quarantined instantly.',
    },
    {
      title: 'HMAC-SHA256 Signed Webhooks',
      desc: 'Every webhook delivery payload includes an X-Relaymark-Signature header computed using your private webhook secret, guarding against replay attacks and spoofing.',
    },
    {
      title: 'Zero Egress Tracking Script Injection',
      desc: 'We never inject third-party ad pixels or behavioral tracking scripts into redirect targets. Only standard HTTP 301/302 headers are issued.',
    },
    {
      title: 'Least-Privilege Scoped API Keys',
      desc: 'API keys support granular capability scopes (links:read, links:write, analytics:read, mcp:invoke). Tokens can be revoked in sub-second time across all edge PoPs.',
    },
  ];

  const pgpKey = `-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: Keybase OpenPGP v2.1.13
Comment: https://keybase.io/crypto

mQGNBF/9k2cBDADZ0m...RELAYMARK_SECURITY_CONTACT_KEY...
f410a992bb3ef88ad2149b...
-----END PGP PUBLIC KEY BLOCK-----`;

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-4 sm:px-6 space-y-12">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-3">
        <Badge variant="agent" size="sm">
          SECURITY & TRUST
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Security Practices & Governance
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          How we safeguard link destinations, protect automated API keys, and respond to vulnerabilities.
        </p>
      </div>

      {/* Security Practices Grid */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
          Core Security Controls
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {practices.map((item, idx) => (
            <Card key={idx} className="p-5 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {item.title}
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-6">
                {item.desc}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Responsible Disclosure Section */}
      <section className="p-6 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f111a] space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Vulnerability Disclosure & Bug Bounty
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            We value the security research community. If you discover a vulnerability in Relaymark’s API, edge forwarders, or MCP server, we encourage responsible disclosure.
          </p>
        </div>

        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            Our Safe Harbor Commitment:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2 text-slate-600 dark:text-slate-400">
            <li>We will not initiate legal action against researchers acting in good faith.</li>
            <li>We will acknowledge your vulnerability report within 24 hours.</li>
            <li>We will provide an estimated timeline for remediation and keep you informed.</li>
            <li>We offer bounty rewards for critical remote execution or authentication bypass findings.</li>
          </ul>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/5">
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Security Contact & PGP Encryption
          </span>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Send reports directly to <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">security@relaymark.dev</span>. For sensitive reports, please encrypt with our PGP key:
          </p>
          <CodeBlock
            language="bash"
            title="Relaymark Security PGP Key"
            code={pgpKey}
          />
        </div>
      </section>
    </div>
  );
};
