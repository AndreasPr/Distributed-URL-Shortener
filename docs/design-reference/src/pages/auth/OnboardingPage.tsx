import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RelayLogo } from '../../design-system/Icons';
import { Button } from '../../design-system/Button';
import { Input } from '../../design-system/Input';
import { Badge } from '../../design-system/Badge';
import { CodeBlock } from '../../design-system/CodeBlock';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import {
  Layers,
  Link2,
  KeyRound,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Sparkles,
  Rocket
} from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { createWorkspace } = useWorkspace();
  const { addLink, createApiKey } = useAppData();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Workspace
  const [wsName, setWsName] = useState('Acme Core Infrastructure');
  const [wsPlan, setWsPlan] = useState<'developer' | 'team'>('team');

  // Step 2: First Link
  const [targetUrl, setTargetUrl] = useState('https://github.com/relaymark/mcp-server-relay');
  const [shortCode, setShortCode] = useState('mcp-repo');
  const [createdShortUrl, setCreatedShortUrl] = useState('');

  // Step 3: First API Key
  const [keyName, setKeyName] = useState('Production CI/CD Agent Key');
  const [keyEnvironment, setKeyEnvironment] = useState<'production' | 'staging'>('production');
  const [revealedSecret, setRevealedSecret] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);

  // Step 1 Submit
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim()) return;
    createWorkspace(wsName.trim(), wsPlan);
    toast({
      title: 'Workspace Created',
      description: `Initialized ${wsName} on the ${wsPlan.toUpperCase()} plan.`,
      variant: 'success',
    });
    setCurrentStep(2);
  };

  // Step 2 Submit
  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) return;
    const link = addLink({
      targetUrl: targetUrl.trim(),
      shortCode: shortCode.trim() || undefined,
      title: `${wsName} - First Link`,
      tags: ['onboarding', 'starter'],
    });
    setCreatedShortUrl(`https://${link.domain}/${link.shortCode}`);
    toast({
      title: 'First Link Shortened',
      description: `Resolving https://${link.domain}/${link.shortCode} at global edge.`,
      variant: 'success',
    });
    setCurrentStep(3);
  };

  // Step 3 Submit
  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    const { key, fullSecret } = createApiKey(
      keyName.trim(),
      ['links:read', 'links:write', 'mcp:invoke'],
      keyEnvironment
    );
    setRevealedSecret(fullSecret);
    toast({
      title: 'API Key Generated',
      description: 'Your bearer token is ready. Save it now as it will not be displayed again.',
      variant: 'success',
    });
    setCurrentStep(4);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(revealedSecret);
    setCopiedKey(true);
    toast({
      title: 'Secret Copied',
      description: 'API key copied to clipboard.',
      variant: 'success',
    });
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleFinishOnboarding = () => {
    toast({
      title: 'Setup Complete',
      description: `Welcome to ${wsName}. Your environment is initialized.`,
      variant: 'success',
    });
    navigate('/app');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-[#07080c] text-slate-900 dark:text-slate-100 p-4 sm:p-6">
      {/* Top Header */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <RelayLogo className="w-4 h-4" />
          </div>
          <span className="font-bold text-base tracking-tight text-slate-900 dark:text-slate-100">
            Relaymark Onboarding
          </span>
        </div>

        <span className="text-xs font-mono text-slate-500">
          Step {Math.min(3, currentStep)} of 3
        </span>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-2xl mx-auto my-8 space-y-8">
        {/* Step Progress Tracker */}
        <div className="grid grid-cols-3 gap-3">
          <div
            className={`p-3 rounded-xl border transition-all ${
              currentStep >= 1
                ? 'border-blue-600/40 bg-blue-50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200'
                : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep > 1
                    ? 'bg-blue-600 text-white'
                    : currentStep === 1
                    ? 'border-2 border-blue-600 text-blue-600'
                    : 'border border-slate-300 text-slate-400'
                }`}
              >
                {currentStep > 1 ? '✓' : '1'}
              </span>
              <span className="text-xs font-semibold truncate">Workspace</span>
            </div>
          </div>

          <div
            className={`p-3 rounded-xl border transition-all ${
              currentStep >= 2
                ? 'border-blue-600/40 bg-blue-50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200'
                : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep > 2
                    ? 'bg-blue-600 text-white'
                    : currentStep === 2
                    ? 'border-2 border-blue-600 text-blue-600'
                    : 'border border-slate-300 text-slate-400'
                }`}
              >
                {currentStep > 2 ? '✓' : '2'}
              </span>
              <span className="text-xs font-semibold truncate">First Link</span>
            </div>
          </div>

          <div
            className={`p-3 rounded-xl border transition-all ${
              currentStep >= 3
                ? 'border-blue-600/40 bg-blue-50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200'
                : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep > 3
                    ? 'bg-blue-600 text-white'
                    : currentStep === 3
                    ? 'border-2 border-blue-600 text-blue-600'
                    : 'border border-slate-300 text-slate-400'
                }`}
              >
                {currentStep > 3 ? '✓' : '3'}
              </span>
              <span className="text-xs font-semibold truncate">API Key</span>
            </div>
          </div>
        </div>

        {/* STEP 1: CREATE WORKSPACE */}
        {currentStep === 1 && (
          <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] shadow-xl space-y-6 animate-in fade-in">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Step 1: Create your team workspace</span>
              </h2>
              <p className="text-xs text-slate-500">
                Workspaces isolate API keys, custom domains, and analytics per project or client.
              </p>
            </div>

            <form onSubmit={handleStep1Submit} className="space-y-5">
              <Input
                label="Workspace Organization Name"
                placeholder="e.g. Stripe Engineering, Acme Labs"
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                required
                autoFocus
              />

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-2">
                  Initial Plan Tier
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setWsPlan('team')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      wsPlan === 'team'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
                        : 'border-slate-200 dark:border-white/10 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        Pro Tier
                      </span>
                      <Badge variant="primary" size="sm">
                        Recommended
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      1,000 links/mo, webhooks, 5 members, custom slugs
                    </p>
                  </div>

                  <div
                    onClick={() => setWsPlan('developer')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      wsPlan === 'developer'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
                        : 'border-slate-200 dark:border-white/10 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        Free Sandbox
                      </span>
                      <span className="text-xs font-mono text-slate-400">$0/mo</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      50 links/mo, 1 member, standard rate limit
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Continue to Link Setup
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: CREATE FIRST LINK */}
        {currentStep === 2 && (
          <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] shadow-xl space-y-6 animate-in fade-in">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Step 2: Shorten your first target link</span>
              </h2>
              <p className="text-xs text-slate-500">
                Deploy an immediate redirect route across 320 Anycast edge nodes.
              </p>
            </div>

            <form onSubmit={handleStep2Submit} className="space-y-4">
              <Input
                label="Destination Target URL"
                type="url"
                placeholder="https://example.com/deep/resource"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                required
                autoFocus
              />

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Custom Slug / Alias
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-slate-100 dark:bg-white/5 border border-r-0 border-slate-300 dark:border-white/10 rounded-l-lg text-xs font-mono text-slate-500 select-none">
                    https://relay.mk/
                  </span>
                  <input
                    type="text"
                    value={shortCode}
                    onChange={(e) => setShortCode(e.target.value)}
                    placeholder="my-link"
                    className="flex-1 h-9 px-3 text-xs rounded-r-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0f111a] text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep(1)}
                  leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                >
                  Back
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Shorten & Continue
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: CREATE FIRST API KEY */}
        {currentStep === 3 && (
          <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] shadow-xl space-y-6 animate-in fade-in">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Step 3: Generate your programmatic API key</span>
              </h2>
              <p className="text-xs text-slate-500">
                Authenticate CLI scripts, CI/CD runners, and autonomous AI agents (MCP).
              </p>
            </div>

            <form onSubmit={handleStep3Submit} className="space-y-4">
              <Input
                label="API Key Description"
                placeholder="e.g. Cursor IDE Assistant, Production Webhook Worker"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                required
                autoFocus
              />

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                  Environment Tier
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setKeyEnvironment('production')}
                    className={`p-3 rounded-lg border cursor-pointer text-xs ${
                      keyEnvironment === 'production'
                        ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 font-semibold'
                        : 'border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <p className="text-slate-900 dark:text-slate-100">Production</p>
                    <p className="text-[11px] text-slate-500 font-mono">rl_live_...</p>
                  </div>

                  <div
                    onClick={() => setKeyEnvironment('staging')}
                    className={`p-3 rounded-lg border cursor-pointer text-xs ${
                      keyEnvironment === 'staging'
                        ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 font-semibold'
                        : 'border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <p className="text-slate-900 dark:text-slate-100">Staging Sandbox</p>
                    <p className="text-[11px] text-slate-500 font-mono">rl_test_...</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep(2)}
                  leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                >
                  Back
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Generate Secret Key
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 4: ONBOARDING COMPLETION */}
        {currentStep === 4 && (
          <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] shadow-xl space-y-6 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
              <Rocket className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                You&rsquo;re all set!
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your workspace is live. Store your secret key now—you will not be able to view it again.
              </p>
            </div>

            {/* Secret Key Display */}
            <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-950 dark:text-amber-200 uppercase tracking-wider">
                  Secret API Key (Copy Now)
                </span>
                <span className="text-[11px] font-mono text-amber-800 dark:text-amber-400">
                  {keyEnvironment}
                </span>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10">
                <code className="flex-1 font-mono text-xs text-slate-900 dark:text-slate-100 truncate select-all">
                  {revealedSecret}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyKey}
                  leftIcon={copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {copiedKey ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            {/* Created Short Link Reminder */}
            {createdShortUrl && (
              <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs text-left flex items-center justify-between">
                <div>
                  <span className="text-slate-500">Your First Short Link: </span>
                  <a
                    href={createdShortUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-blue-600 dark:text-blue-400 font-semibold underline"
                  >
                    {createdShortUrl}
                  </a>
                </div>
                <Badge variant="success" size="sm">
                  Active
                </Badge>
              </div>
            )}

            <div className="pt-2">
              <Button
                variant="primary"
                size="lg"
                onClick={handleFinishOnboarding}
                className="w-full justify-center"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Go to Workspace Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="w-full max-w-4xl mx-auto py-4 border-t border-slate-200 dark:border-white/5 text-center text-xs text-slate-500">
        Relaymark Infrastructure Onboarding Wizard · Need assistance? support@relaymark.dev
      </div>
    </div>
  );
};
