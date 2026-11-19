import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  Sparkles,
  Share2,
  Eye,
  Settings,
  ArrowRight,
  Globe,
  Instagram,
  Twitter,
  Github,
  Youtube,
  Linkedin,
} from 'lucide-react';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { Input } from '../design-system/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { mockBioThemes } from '../mock';
import { BioLink } from '../mock/types';
import { useToast } from '../context/ToastContext';

export const LinkInBioPublicPage: React.FC = () => {
  const { toast } = useToast();

  // Profile configuration state for live demonstration
  const [handle, setHandle] = useState('sarahdev');
  const [displayName, setDisplayName] = useState('Sarah Chen');
  const [bio, setBio] = useState('Software Engineer & Technical Writer. Building AI developer tooling & sharing weekly systems design breakdowns.');
  const [selectedThemeId, setSelectedThemeId] = useState('theme_midnight');
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [copied, setCopied] = useState(false);

  // Editable links list
  const [links, setLinks] = useState<BioLink[]>([
    {
      id: 'bl_1',
      title: 'Latest Post: High-Throughput Anycast Routing',
      url: 'https://sarahchen.dev/blog/anycast',
      isActive: true,
      clickCount: 1420,
    },
    {
      id: 'bl_2',
      title: 'GitHub: Open Source MCP Agent Server',
      url: 'https://github.com/sarahchen/mcp-agent-starter',
      isActive: true,
      clickCount: 890,
    },
    {
      id: 'bl_3',
      title: 'Subscribe to Weekly Engineering Newsletter',
      url: 'https://newsletter.sarahchen.dev',
      isActive: true,
      clickCount: 654,
    },
    {
      id: 'bl_4',
      title: 'Book a 1:1 Architecture Mentorship Call',
      url: 'https://cal.com/sarahchen',
      isActive: true,
      clickCount: 312,
    },
  ]);

  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const currentTheme = mockBioThemes.find((t) => t.id === selectedThemeId) || mockBioThemes[0];
  const publicBioUrl = `https://relay.mk/bio/${handle}`;

  const handleCopyPublicUrl = () => {
    navigator.clipboard.writeText(publicBioUrl);
    setCopied(true);
    toast({
      title: 'Bio Link Copied',
      description: publicBioUrl,
      variant: 'success',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    const newLinkItem: BioLink = {
      id: `bl_${Date.now()}`,
      title: newTitle.trim(),
      url: newUrl.trim().startsWith('http') ? newUrl.trim() : `https://${newUrl.trim()}`,
      isActive: true,
      clicks: 0,
      clickCount: 0,
    };

    setLinks([...links, newLinkItem]);
    setNewTitle('');
    setNewUrl('');
    toast({
      title: 'Link Added to Bio',
      description: `Added "${newLinkItem.title}"`,
      variant: 'success',
    });
  };

  const handleDeleteLink = (id: string) => {
    setLinks(links.filter((l) => l.id !== id));
    toast({
      title: 'Link Removed',
      description: 'Removed item from your bio list.',
      variant: 'info',
    });
  };

  return (
    <div className="w-full space-y-16 py-12 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* 1. Header Pitch */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="agent" size="sm">
          ONE LINK FOR EVERYTHING
        </Badge>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Your single link in bio. Fast, elegant, and ad-free.
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          Share your portfolio, latest video, newsletter, and projects from Instagram, TikTok, Twitter, and YouTube with a single branded profile page.
        </p>
      </div>

      {/* 2. Live Interactive Bio Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Editor Configuration Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Bio Profile Customizer</span>
                </CardTitle>
                <div className="flex items-center gap-1.5 font-mono text-xs text-blue-600 dark:text-blue-400 font-medium">
                  <span>relay.mk/bio/{handle}</span>
                </div>
              </div>
              <CardDescription>
                Customize your bio handle, avatar identity, themes, and curated destination buttons
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Profile Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Claim Your Custom Handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="yourname"
                  helperText="Unique URL: relay.mk/bio/..."
                />
                <Input
                  label="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Full Name or Brand"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Bio Description
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0f111a] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  placeholder="Short 1-2 sentence pitch about who you are..."
                />
              </div>

              {/* Theme Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Visual Theme
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {mockBioThemes.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setSelectedThemeId(theme.id)}
                      className={`p-2.5 rounded-lg border text-xs text-left transition-all cursor-pointer flex items-center justify-between ${
                        selectedThemeId === theme.id
                          ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/40 dark:bg-blue-950/20'
                          : 'border-slate-200 dark:border-white/10 hover:border-slate-300 bg-white dark:bg-[#0f111a]'
                      }`}
                    >
                      <span className="font-medium text-slate-900 dark:text-slate-100">{theme.name}</span>
                      <div
                        className="w-4 h-4 rounded-full border border-slate-300 shrink-0"
                        style={{ backgroundColor: theme.cardBg }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Add New Link Section */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Profile Links ({links.length})
                  </label>
                  <span className="text-[11px] text-slate-400">Drag & reorder supported in console</span>
                </div>

                <form onSubmit={handleAddLink} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      placeholder="Button title (e.g. My Podcast)"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0f111a] text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      placeholder="Destination URL (https://...)"
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

                {/* Link Items List */}
                <div className="space-y-2 pt-1">
                  {links.map((linkItem) => (
                    <div
                      key={linkItem.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] text-xs gap-3"
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
                          onClick={() => handleDeleteLink(linkItem.id)}
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
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Phone Mockup Preview Column (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center space-y-4">
          <div className="flex items-center justify-between w-full max-w-[320px]">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile Live Preview</span>
            </span>
            <button
              onClick={handleCopyPublicUrl}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Bio URL'}</span>
            </button>
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
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80"
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <h3 className="font-bold text-sm tracking-tight" style={{ color: currentTheme.textColor }}>
                  {displayName}
                </h3>
                <p className="text-[11px] font-mono opacity-80" style={{ color: currentTheme.textColor }}>
                  @{handle}
                </p>
              </div>

              <p className="text-xs leading-relaxed max-w-[240px] opacity-90 line-clamp-3" style={{ color: currentTheme.textColor }}>
                {bio}
              </p>

              {/* Social Icon Pills */}
              <div className="flex items-center gap-3 pt-1">
                <a href="#twitter" aria-label="Twitter Profile" className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
                  <Twitter className="w-3.5 h-3.5" />
                </a>
                <a href="#github" aria-label="GitHub Profile" className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
                  <Github className="w-3.5 h-3.5" />
                </a>
                <a href="#youtube" aria-label="YouTube Channel" className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
                  <Youtube className="w-3.5 h-3.5" />
                </a>
                <a href="#website" aria-label="Personal Website" className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
                  <Globe className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Links Stack */}
            <div className="space-y-2.5 mb-6">
              {links.map((linkItem) => (
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
              <Link
                to="/"
                className="inline-flex items-center gap-1 text-[10px] font-mono opacity-70 hover:opacity-100 transition-opacity"
                style={{ color: currentTheme.textColor }}
              >
                <span>Powered by Relaymark</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Feature Callouts */}
      <div className="border-t border-slate-200 dark:border-white/10 pt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 space-y-2">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              No Slow Ad Banners or Popups
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Standard link-in-bio services clutter your landing page with cookies and cross-promotions. Relaymark profiles load in sub-200ms with zero advertisements.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-2">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Custom Domain Support
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              On Pro plans, point your own domain like <strong>links.sarahchen.dev</strong> to your profile with automated SSL encryption and Anycast caching.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-2">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Granular Click Analytics
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              See which links drive real conversions. Compare audience interest across TikTok, newsletter drops, and Instagram stories.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
