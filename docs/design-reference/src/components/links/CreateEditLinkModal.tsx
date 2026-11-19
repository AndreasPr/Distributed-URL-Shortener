import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../design-system/Dialog';
import { Button } from '../../design-system/Button';
import { Input } from '../../design-system/Input';
import { Select } from '../../design-system/Select';
import { ShortLink } from '../../mock/types';
import { useAppData } from '../../context/AppDataContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { Link2, Sparkles, Lock, Calendar, Tag, SlidersHorizontal } from 'lucide-react';

interface CreateEditLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  linkToEdit?: ShortLink | null;
}

export const CreateEditLinkModal: React.FC<CreateEditLinkModalProps> = ({
  isOpen,
  onClose,
  linkToEdit,
}) => {
  const { addLink, updateLink } = useAppData();
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [targetUrl, setTargetUrl] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [domain, setDomain] = useState('relay.mk');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState<{ targetUrl?: string; shortCode?: string }>({});

  useEffect(() => {
    if (linkToEdit) {
      setTargetUrl(linkToEdit.targetUrl);
      setShortCode(linkToEdit.shortCode);
      setDomain(linkToEdit.domain);
      setTitle(linkToEdit.title);
      setDescription(linkToEdit.description || '');
      setTagsInput(linkToEdit.tags.join(', '));
      setHasPassword(Boolean(linkToEdit.hasPassword));
      setExpiresAt(linkToEdit.expiresAt ? linkToEdit.expiresAt.substring(0, 10) : '');
      setUtmSource(linkToEdit.utmParams?.source || '');
      setUtmMedium(linkToEdit.utmParams?.medium || '');
      setUtmCampaign(linkToEdit.utmParams?.campaign || '');
      setShowAdvanced(Boolean(linkToEdit.hasPassword || linkToEdit.expiresAt || linkToEdit.utmParams));
    } else {
      setTargetUrl('');
      setShortCode('');
      setDomain(activeWorkspace.customDomains[0] || 'relay.mk');
      setTitle('');
      setDescription('');
      setTagsInput('');
      setHasPassword(false);
      setPassword('');
      setExpiresAt('');
      setUtmSource('');
      setUtmMedium('');
      setUtmCampaign('');
      setShowAdvanced(false);
    }
    setErrors({});
  }, [linkToEdit, isOpen, activeWorkspace]);

  const domainOptions = [
    { value: 'relay.mk', label: 'relay.mk (Shared Anycast)' },
    ...activeWorkspace.customDomains.map((d) => ({
      value: d,
      label: `${d} (Custom Verified)`,
    })),
  ];

  const handleGenerateSlug = () => {
    const randomSlug = Math.random().toString(36).substring(2, 8);
    setShortCode(randomSlug);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { targetUrl?: string; shortCode?: string } = {};

    if (!targetUrl.trim()) {
      newErrors.targetUrl = 'Destination URL is required.';
    } else if (!/^https?:\/\//i.test(targetUrl.trim())) {
      newErrors.targetUrl = 'Must start with http:// or https://';
    }

    if (shortCode && !/^[a-zA-Z0-9-_]+$/.test(shortCode.trim())) {
      newErrors.shortCode = 'Only letters, numbers, dashes, and underscores allowed.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const utmParams =
      utmSource || utmMedium || utmCampaign
        ? {
            source: utmSource || undefined,
            medium: utmMedium || undefined,
            campaign: utmCampaign || undefined,
          }
        : undefined;

    if (linkToEdit) {
      updateLink(linkToEdit.id, {
        targetUrl: targetUrl.trim(),
        shortCode: shortCode.trim() || linkToEdit.shortCode,
        domain,
        title: title.trim() || shortCode.trim() || 'Updated Link',
        description: description.trim(),
        tags: tags.length > 0 ? tags : linkToEdit.tags,
        hasPassword,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        utmParams,
      });

      toast({
        title: 'Link Updated',
        description: `Successfully saved changes to ${domain}/${shortCode || linkToEdit.shortCode}`,
        variant: 'success',
      });
    } else {
      const created = addLink({
        targetUrl: targetUrl.trim(),
        shortCode: shortCode.trim(),
        domain,
        title: title.trim(),
        description: description.trim(),
        tags: tags.length > 0 ? tags : ['general'],
        hasPassword,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        utmParams,
      });

      toast({
        title: 'Short Link Created',
        description: `Live at https://${created.domain}/${created.shortCode}`,
        variant: 'success',
      });
    }

    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle>
                {linkToEdit ? 'Edit Short Link' : 'Create New Short Link'}
              </DialogTitle>
              <DialogDescription>
                Configure edge destination routing, custom alias, and analytics tags
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Target URL */}
          <Input
            label="Destination Target URL"
            type="url"
            placeholder="https://example.com/very/long/deep-link"
            value={targetUrl}
            onChange={(e) => {
              setTargetUrl(e.target.value);
              if (errors.targetUrl) setErrors((prev) => ({ ...prev, targetUrl: undefined }));
            }}
            error={errors.targetUrl}
            helperText="Where visitors and autonomous agents will be redirected"
            required
            autoFocus
          />

          {/* Domain & Custom Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Routing Domain"
              options={domainOptions}
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Custom Slug (Optional)
                </label>
                <button
                  type="button"
                  onClick={handleGenerateSlug}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Random</span>
                </button>
              </div>
              <Input
                placeholder="my-custom-slug"
                value={shortCode}
                onChange={(e) => {
                  setShortCode(e.target.value);
                  if (errors.shortCode) setErrors((prev) => ({ ...prev, shortCode: undefined }));
                }}
                error={errors.shortCode}
              />
            </div>
          </div>

          {/* Title & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Internal Title (Optional)"
              placeholder="e.g. Q4 Launch Benchmarks"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <Input
              label="Tags (Comma separated)"
              placeholder="api, docs, launch"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>

          {/* Advanced Accordion Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options (UTM, Expiration, Password)'}</span>
            </button>
          </div>

          {showAdvanced && (
            <div className="p-4 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] space-y-3 animate-in fade-in">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Attribution & Security Rules
              </div>

              {/* UTM Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  size="sm"
                  label="UTM Source"
                  placeholder="twitter"
                  value={utmSource}
                  onChange={(e) => setUtmSource(e.target.value)}
                />
                <Input
                  size="sm"
                  label="UTM Medium"
                  placeholder="social"
                  value={utmMedium}
                  onChange={(e) => setUtmMedium(e.target.value)}
                />
                <Input
                  size="sm"
                  label="UTM Campaign"
                  placeholder="q4-launch"
                  value={utmCampaign}
                  onChange={(e) => setUtmCampaign(e.target.value)}
                />
              </div>

              {/* Expiration & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Auto-Expiration Date</span>
                  </label>
                  <Input
                    size="sm"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Password Gating</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enable-password-gate"
                      checked={hasPassword}
                      onChange={(e) => setHasPassword(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="enable-password-gate" className="text-xs text-slate-600 dark:text-slate-400">
                      Require passkey on redirect
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {linkToEdit ? 'Save Changes' : 'Create Short Link'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
