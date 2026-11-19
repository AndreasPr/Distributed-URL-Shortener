import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Smartphone,
  Plus,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Palette,
  Eye,
  Settings,
  Sparkles,
  Share2,
  Globe,
  Twitter,
  Github,
  Youtube,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../../design-system/Button';
import { Badge } from '../../design-system/Badge';
import { Input } from '../../design-system/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../design-system/Card';
import { useAppData } from '../../context/AppDataContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { mockBioThemes } from '../../mock';
import { BioLink } from '../../mock/types';

export const BioPage: React.FC = () => {
  const { bioProfile, updateBioProfile, addBioLink, updateBioLink, deleteBioLink } = useAppData();
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [copied, setCopied] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const currentTheme =
    mockBioThemes.find((t) => t.id === bioProfile.themeId) || mockBioThemes[0];
  const fullBioUrl = `https://relay.mk/bio/${bioProfile.handle}`;

  const handleCopyBioUrl = () => {
    navigator.clipboard.writeText(fullBioUrl);
    setCopied(true);
    toast({
      title: 'Bio Link Copied',
      description: fullBioUrl,
      variant: 'success',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    addBioLink({
      title: newTitle.trim(),
      url: newUrl.trim().startsWith('http') ? newUrl.trim() : `https://${newUrl.trim()}`,
      isActive: true,
    });

    setNewTitle('');
    setNewUrl('');
    toast({
      title: 'Link Added to Bio',
      description: `Added "${newTitle.trim()}" to profile buttons`,
      variant: 'success',
    });
  };

  const handleDeleteLink = (id: string, title: string) => {
    deleteBioLink(id);
    toast({
      title: 'Link Removed',
      description: `Removed "${title}" from bio`,
      variant: 'info',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Link-in-Bio Profile Studio</span>
            <Badge variant="agent" size="sm">
              Live Edge Profile
            </Badge>
          </h1>
          <p className="text-xs text-slate-500">
            Configure your mobile landing page, social icons, custom themes, and curated buttons
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyBioUrl}
            leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copied ? 'Copied Bio URL' : 'Copy Bio URL'}
          </Button>

          <Link to={`/bio/${bioProfile.handle}`} target="_blank" rel="noreferrer">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
            >
              View Public Page
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Editor Controls Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Identity & Bio */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Profile Identity & Copy</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Unique Bio Handle"
                  value={bioProfile.handle}
                  onChange={(e) =>
                    updateBioProfile({
                      handle: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''),
                    })
                  }
                  helperText="Live at relay.mk/bio/..."
                  required
                />

                <Input
                  label="Display Name"
                  value={bioProfile.displayName}
                  onChange={(e) => updateBioProfile({ displayName: e.target.value })}
                  placeholder="Your Full Name or Brand"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Bio Summary
                </label>
                <textarea
                  value={bioProfile.bio}
                  onChange={(e) => updateBioProfile({ bio: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0f111a] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  placeholder="Tell visitors who you are and what you do..."
                />
              </div>

              {/* Theme Picker */}
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-white/5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-blue-500" />
                  <span>Color Theme & Palette</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {mockBioThemes.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => updateBioProfile({ themeId: theme.id })}
                      className={`p-2.5 rounded-lg border text-xs text-left transition-all cursor-pointer flex items-center justify-between ${
                        bioProfile.themeId === theme.id
                          ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20'
                          : 'border-slate-200 dark:border-white/10 hover:border-slate-300 bg-white dark:bg-[#0f111a]'
                      }`}
                    >
                      <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {theme.name}
                      </span>
                      <div
                        className="w-4 h-4 rounded-full border border-slate-300 shrink-0"
                        style={{ backgroundColor: theme.cardBg }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Links Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  Profile Buttons ({bioProfile.links.length})
                </CardTitle>
                <span className="text-[11px] text-slate-400">Real-time click telemetry</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add form */}
              <form onSubmit={handleAddLink} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    placeholder="Button Title (e.g. Latest Video)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0f111a] text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none"
                  />
                </div>
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    placeholder="Target URL (https://...)"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0f111a] text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="w-full h-9 justify-center"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add
                  </Button>
                </div>
              </form>

              {/* Existing links */}
              <div className="space-y-2 pt-1">
                {bioProfile.links.map((linkItem) => (
                  <div
                    key={linkItem.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] text-xs gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {linkItem.title}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate font-mono">
                        {linkItem.url}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                        {linkItem.clickCount?.toLocaleString()} clicks
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteLink(linkItem.id, linkItem.title)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete link"
                        aria-label={`Delete link ${linkItem.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Phone Preview Column (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center space-y-4">
          <div className="flex items-center justify-between w-full max-w-[320px]">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Live Mobile Mockup</span>
            </span>
            <span className="text-xs font-mono text-slate-400 truncate max-w-[140px]">
              /{bioProfile.handle}
            </span>
          </div>

          {/* Smartphone Frame Container */}
          <div
            className="w-full max-w-[320px] rounded-[36px] p-4 shadow-2xl border-4 border-slate-900 dark:border-slate-800 transition-colors duration-300"
            style={{ backgroundColor: currentTheme.bgColor, color: currentTheme.textColor }}
          >
            {/* Phone Speaker Notch */}
            <div className="w-24 h-4 bg-slate-900 dark:bg-black rounded-full mx-auto mb-6" />

            {/* Profile Avatar & Info */}
            <div className="flex flex-col items-center text-center space-y-2 mb-6">
              <div className="w-18 h-18 rounded-full border-2 border-white/20 overflow-hidden shadow-md">
                <img
                  src={bioProfile.avatarUrl}
                  alt={bioProfile.displayName}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <h3 className="font-bold text-sm tracking-tight" style={{ color: currentTheme.textColor }}>
                  {bioProfile.displayName}
                </h3>
                <p className="text-[11px] font-mono opacity-80" style={{ color: currentTheme.textColor }}>
                  @{bioProfile.handle}
                </p>
              </div>

              <p className="text-xs leading-relaxed max-w-[240px] opacity-90 line-clamp-3" style={{ color: currentTheme.textColor }}>
                {bioProfile.bio}
              </p>

              {/* Social Icon Pills */}
              <div className="flex items-center gap-3 pt-1">
                {bioProfile.socials?.twitter && (
                  <span className="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer">
                    <Twitter className="w-3.5 h-3.5" />
                  </span>
                )}
                {bioProfile.socials?.github && (
                  <span className="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer">
                    <Github className="w-3.5 h-3.5" />
                  </span>
                )}
                {bioProfile.socials?.youtube && (
                  <span className="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer">
                    <Youtube className="w-3.5 h-3.5" />
                  </span>
                )}
                {bioProfile.socials?.website && (
                  <span className="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer">
                    <Globe className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </div>

            {/* Links Stack */}
            <div className="space-y-2.5 mb-6">
              {bioProfile.links.map((linkItem) => (
                <a
                  key={linkItem.id}
                  href={linkItem.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full py-3 px-4 rounded-xl text-center text-xs font-semibold shadow-xs transition-all hover:scale-[1.02] border"
                  style={{
                    backgroundColor: currentTheme.cardBg,
                    color: currentTheme.textColor,
                    borderColor: currentTheme.cardBorder,
                  }}
                >
                  <span className="truncate block">{linkItem.title}</span>
                </a>
              ))}
            </div>

            {/* Bottom Footer Attribution */}
            <div className="text-center pt-2 pb-1">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-mono opacity-70"
                style={{ color: currentTheme.textColor }}
              >
                <span>Powered by Relaymark</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
