import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../design-system/Dialog';
import { Button } from '../../design-system/Button';
import { Input } from '../../design-system/Input';
import { useAppData } from '../../context/AppDataContext';
import { useToast } from '../../context/ToastContext';
import { SlidersHorizontal, Copy, Check, Link2, Sparkles } from 'lucide-react';

interface UtmBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UtmBuilderModal: React.FC<UtmBuilderModalProps> = ({ isOpen, onClose }) => {
  const { openCreateLinkModal } = useAppData();
  const { toast } = useToast();

  const [baseUrl, setBaseUrl] = useState('https://example.com/pricing');
  const [utmSource, setUtmSource] = useState('newsletter');
  const [utmMedium, setUtmMedium] = useState('email');
  const [utmCampaign, setUtmCampaign] = useState('spring-sale');
  const [utmTerm, setUtmTerm] = useState('');
  const [utmContent, setUtmContent] = useState('header-cta');
  const [copied, setCopied] = useState(false);

  // Presets for quick click
  const presets = [
    { label: 'Google Search Ads', source: 'google', medium: 'cpc', campaign: 'brand-search' },
    { label: 'Instagram Bio', source: 'instagram', medium: 'social', campaign: 'bio-link' },
    { label: 'Weekly Newsletter', source: 'newsletter', medium: 'email', campaign: 'weekly-digest' },
    { label: 'Twitter / X Post', source: 'twitter', medium: 'social', campaign: 'product-update' },
  ];

  // Build the complete tagged URL
  const taggedUrl = useMemo(() => {
    if (!baseUrl.trim()) return '';

    try {
      const urlObj = new URL(baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`);
      if (utmSource.trim()) urlObj.searchParams.set('utm_source', utmSource.trim());
      if (utmMedium.trim()) urlObj.searchParams.set('utm_medium', utmMedium.trim());
      if (utmCampaign.trim()) urlObj.searchParams.set('utm_campaign', utmCampaign.trim());
      if (utmTerm.trim()) urlObj.searchParams.set('utm_term', utmTerm.trim());
      if (utmContent.trim()) urlObj.searchParams.set('utm_content', utmContent.trim());
      return urlObj.toString();
    } catch {
      return baseUrl;
    }
  }, [baseUrl, utmSource, utmMedium, utmCampaign, utmTerm, utmContent]);

  const handleCopyTaggedUrl = () => {
    navigator.clipboard.writeText(taggedUrl);
    setCopied(true);
    toast({
      title: 'Tagged URL Copied',
      description: 'Copied full UTM parameterized URL to clipboard.',
      variant: 'success',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateShortlink = () => {
    onClose();
    // Open create link modal with tagged URL prefilled
    openCreateLinkModal();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle>Campaign UTM Parameter Builder</DialogTitle>
              <DialogDescription>
                Tag your marketing URLs to accurately track clicks and revenue in Google Analytics & Mixpanel
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Quick presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Quick Channel Presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setUtmSource(preset.source);
                    setUtmMedium(preset.medium);
                    setUtmCampaign(preset.campaign);
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-white/10 hover:border-blue-500 bg-white dark:bg-[#0f111a] text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Base URL */}
          <Input
            label="Destination Base URL"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://mycompany.com/landing"
            required
          />

          {/* Core UTM Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="UTM Source (utm_source)"
              value={utmSource}
              onChange={(e) => setUtmSource(e.target.value)}
              placeholder="e.g. google, newsletter, linkedin"
              helperText="The referrer / platform identity"
              required
            />
            <Input
              label="UTM Medium (utm_medium)"
              value={utmMedium}
              onChange={(e) => setUtmMedium(e.target.value)}
              placeholder="e.g. cpc, email, social, referral"
              helperText="Marketing medium type"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Campaign Name"
              value={utmCampaign}
              onChange={(e) => setUtmCampaign(e.target.value)}
              placeholder="e.g. black-friday"
              helperText="utm_campaign"
            />
            <Input
              label="Campaign Term"
              value={utmTerm}
              onChange={(e) => setUtmTerm(e.target.value)}
              placeholder="e.g. running+shoes"
              helperText="utm_term (keywords)"
            />
            <Input
              label="Campaign Content"
              value={utmContent}
              onChange={(e) => setUtmContent(e.target.value)}
              placeholder="e.g. sidebar-banner"
              helperText="utm_content (A/B testing)"
            />
          </div>

          {/* Dynamic Generated Output Box */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Generated Tagged URL:</span>
              <button
                type="button"
                onClick={handleCopyTaggedUrl}
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
            <p className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all select-all bg-white dark:bg-[#0f111a] p-2.5 rounded-lg border border-slate-200 dark:border-white/5">
              {taggedUrl}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreateShortlink}
            leftIcon={<Link2 className="w-3.5 h-3.5" />}
          >
            Create Short Link From Tagged URL
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
