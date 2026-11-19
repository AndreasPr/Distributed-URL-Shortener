import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  QrCode,
  Download,
  Copy,
  Check,
  Palette,
  Image,
  Share2,
  Sparkles,
  Layers,
  Printer,
  Smartphone,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { Input } from '../design-system/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { useToast } from '../context/ToastContext';

export const QrCodesPage: React.FC = () => {
  const { toast } = useToast();

  // Customizer state
  const [url, setUrl] = useState('https://relay.mk/summer-sale');
  const [fgColor, setFgColor] = useState('#2563eb');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [cornerStyle, setCornerStyle] = useState<'square' | 'rounded' | 'dots'>('rounded');
  const [includeLogo, setIncludeLogo] = useState(true);
  const [frameText, setFrameText] = useState('SCAN ME');
  const [includeFrame, setIncludeFrame] = useState(true);
  const [copied, setCopied] = useState(false);

  // Preset color palettes
  const colorPresets = [
    { label: 'Relay Blue', fg: '#2563eb', bg: '#ffffff' },
    { label: 'Midnight Slate', fg: '#0f172a', bg: '#ffffff' },
    { label: 'Emerald Forest', fg: '#059669', bg: '#ffffff' },
    { label: 'Violet Indigo', fg: '#4f46e5', bg: '#ffffff' },
    { label: 'Sunset Amber', fg: '#d97706', bg: '#ffffff' },
    { label: 'Dark Mode Invert', fg: '#ffffff', bg: '#0b0f19' },
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({
      title: 'Short Link Copied',
      description: url,
      variant: 'success',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPng = () => {
    // Generate simple SVG data URL to trigger a real download
    const svgContent = generateSvgString();
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `relaymark-qr-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(blobUrl);

    toast({
      title: 'QR Code Downloaded',
      description: 'Saved vector QR code asset (SVG). For PNG rasterization, use the download menu.',
      variant: 'success',
    });
  };

  const generateSvgString = () => {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 320" width="280" height="320">
      <rect width="280" height="320" fill="${bgColor}" rx="16"/>
      <g transform="translate(20, 20)">
        <!-- Outer Finder Pattern Top-Left -->
        <rect x="10" y="10" width="50" height="50" fill="none" stroke="${fgColor}" stroke-width="8" rx="${cornerStyle === 'rounded' ? 8 : 2}"/>
        <rect x="22" y="22" width="26" height="26" fill="${fgColor}" rx="${cornerStyle === 'rounded' ? 4 : 0}"/>
        <!-- Outer Finder Pattern Top-Right -->
        <rect x="180" y="10" width="50" height="50" fill="none" stroke="${fgColor}" stroke-width="8" rx="${cornerStyle === 'rounded' ? 8 : 2}"/>
        <rect x="192" y="22" width="26" height="26" fill="${fgColor}" rx="${cornerStyle === 'rounded' ? 4 : 0}"/>
        <!-- Outer Finder Pattern Bottom-Left -->
        <rect x="10" y="180" width="50" height="50" fill="none" stroke="${fgColor}" stroke-width="8" rx="${cornerStyle === 'rounded' ? 8 : 2}"/>
        <rect x="22" y="192" width="26" height="26" fill="${fgColor}" rx="${cornerStyle === 'rounded' ? 4 : 0}"/>
        <!-- Data Grid Simulation -->
        <rect x="80" y="15" width="20" height="20" fill="${fgColor}" rx="3"/>
        <rect x="110" y="15" width="20" height="35" fill="${fgColor}" rx="3"/>
        <rect x="140" y="25" width="25" height="15" fill="${fgColor}" rx="3"/>
        <rect x="15" y="80" width="35" height="20" fill="${fgColor}" rx="3"/>
        <rect x="15" y="120" width="20" height="35" fill="${fgColor}" rx="3"/>
        <rect x="80" y="70" width="80" height="80" fill="none" stroke="${fgColor}" stroke-width="6" rx="8"/>
        <text x="120" y="115" font-family="system-ui" font-size="12" font-weight="bold" fill="${fgColor}" text-anchor="middle">RELAY</text>
        <rect x="180" y="80" width="40" height="18" fill="${fgColor}" rx="3"/>
        <rect x="195" y="110" width="30" height="40" fill="${fgColor}" rx="3"/>
        <rect x="75" y="180" width="35" height="20" fill="${fgColor}" rx="3"/>
        <rect x="125" y="180" width="20" height="40" fill="${fgColor}" rx="3"/>
        <rect x="160" y="195" width="45" height="35" fill="${fgColor}" rx="3"/>
      </g>
      <text x="140" y="295" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="${fgColor}" text-anchor="middle" letter-spacing="2">${includeFrame ? frameText : ''}</text>
    </svg>`;
  };

  return (
    <div className="w-full space-y-16 py-12 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* 1. Header Section */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="agent" size="sm">
          DYNAMIC QR CODE STUDIO
        </Badge>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Custom QR codes designed to get scanned.
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          Create high-resolution, print-ready dynamic QR codes in seconds. Change where the code points anytime without reprinting your flyers, packaging, or business cards.
        </p>
      </div>

      {/* 2. Interactive Customizer Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Controls Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>QR Code Appearance & Routing</span>
              </CardTitle>
              <CardDescription>
                Customize colors, frames, and destination for your target campaign
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Destination URL */}
              <Input
                label="Destination Target or Short URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourbrand.com/special-offer"
                helperText="Dynamic links allow you to update the destination URL after printing."
              />

              {/* Color Presets */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Brand Color Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {colorPresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setFgColor(preset.fg);
                        setBgColor(preset.bg);
                      }}
                      className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:border-blue-500 bg-white dark:bg-[#0f111a] text-xs text-left cursor-pointer transition-colors"
                    >
                      <div className="w-5 h-5 rounded border border-slate-300 dark:border-white/20 shrink-0 flex items-center justify-center overflow-hidden">
                        <div className="w-full h-full" style={{ backgroundColor: preset.fg }} />
                      </div>
                      <span className="truncate text-slate-800 dark:text-slate-200">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Color Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                    Foreground Pattern Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="w-9 h-9 p-0.5 rounded border border-slate-300 dark:border-white/10 cursor-pointer bg-transparent"
                    />
                    <Input
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      placeholder="#2563eb"
                      className="font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                    Background Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-9 h-9 p-0.5 rounded border border-slate-300 dark:border-white/10 cursor-pointer bg-transparent"
                    />
                    <Input
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      placeholder="#ffffff"
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Corner Pattern Style */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Corner Eye Shape
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['square', 'rounded', 'dots'] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setCornerStyle(style)}
                      className={`p-2.5 rounded-lg border text-xs font-medium capitalize text-center transition-all cursor-pointer ${
                        cornerStyle === style
                          ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-semibold'
                          : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frame & Call-To-Action */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Include Call-To-Action Frame
                  </label>
                  <input
                    type="checkbox"
                    id="toggle-frame"
                    checked={includeFrame}
                    onChange={(e) => setIncludeFrame(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>

                {includeFrame && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Frame Caption"
                      value={frameText}
                      onChange={(e) => setFrameText(e.target.value.toUpperCase())}
                      placeholder="SCAN ME"
                    />
                    <div className="flex items-center pt-6 gap-2">
                      <input
                        type="checkbox"
                        id="toggle-logo"
                        checked={includeLogo}
                        onChange={(e) => setIncludeLogo(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="toggle-logo" className="text-xs text-slate-700 dark:text-slate-300">
                        Center Relaymark logo mark
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview & Download Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-base">Real-Time High-Res Preview</CardTitle>
              <CardDescription>
                Optimized for maximum camera contrast and scanner reliability
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col items-center justify-center space-y-6 pb-6">
              {/* QR Code Container */}
              <div
                className="p-6 rounded-2xl shadow-md border border-slate-200 dark:border-white/10 transition-all duration-200 max-w-[280px] w-full"
                style={{ backgroundColor: bgColor }}
              >
                <div className="relative aspect-square w-full flex flex-col items-center justify-center">
                  <svg
                    viewBox="0 0 240 240"
                    className="w-full h-full select-none"
                  >
                    {/* Corner 1: Top-Left */}
                    <rect
                      x="10"
                      y="10"
                      width="60"
                      height="60"
                      fill="none"
                      stroke={fgColor}
                      strokeWidth="10"
                      rx={cornerStyle === 'rounded' ? 12 : cornerStyle === 'dots' ? 24 : 0}
                    />
                    <rect
                      x="26"
                      y="26"
                      width="28"
                      height="28"
                      fill={fgColor}
                      rx={cornerStyle === 'rounded' ? 6 : cornerStyle === 'dots' ? 14 : 0}
                    />

                    {/* Corner 2: Top-Right */}
                    <rect
                      x="170"
                      y="10"
                      width="60"
                      height="60"
                      fill="none"
                      stroke={fgColor}
                      strokeWidth="10"
                      rx={cornerStyle === 'rounded' ? 12 : cornerStyle === 'dots' ? 24 : 0}
                    />
                    <rect
                      x="186"
                      y="26"
                      width="28"
                      height="28"
                      fill={fgColor}
                      rx={cornerStyle === 'rounded' ? 6 : cornerStyle === 'dots' ? 14 : 0}
                    />

                    {/* Corner 3: Bottom-Left */}
                    <rect
                      x="10"
                      y="170"
                      width="60"
                      height="60"
                      fill="none"
                      stroke={fgColor}
                      strokeWidth="10"
                      rx={cornerStyle === 'rounded' ? 12 : cornerStyle === 'dots' ? 24 : 0}
                    />
                    <rect
                      x="26"
                      y="186"
                      width="28"
                      height="28"
                      fill={fgColor}
                      rx={cornerStyle === 'rounded' ? 6 : cornerStyle === 'dots' ? 14 : 0}
                    />

                    {/* Simulated Data Matrix Bits */}
                    <rect x="85" y="15" width="22" height="22" fill={fgColor} rx={cornerStyle === 'dots' ? 11 : 4} />
                    <rect x="115" y="15" width="22" height="38" fill={fgColor} rx={cornerStyle === 'dots' ? 11 : 4} />
                    <rect x="145" y="30" width="20" height="20" fill={fgColor} rx={cornerStyle === 'dots' ? 10 : 4} />
                    <rect x="15" y="85" width="38" height="22" fill={fgColor} rx={cornerStyle === 'dots' ? 11 : 4} />
                    <rect x="15" y="125" width="22" height="38" fill={fgColor} rx={cornerStyle === 'dots' ? 11 : 4} />

                    <rect x="85" y="180" width="35" height="22" fill={fgColor} rx={cornerStyle === 'dots' ? 11 : 4} />
                    <rect x="130" y="180" width="22" height="45" fill={fgColor} rx={cornerStyle === 'dots' ? 11 : 4} />
                    <rect x="165" y="195" width="45" height="35" fill={fgColor} rx={cornerStyle === 'dots' ? 11 : 4} />

                    {/* Logo in center */}
                    {includeLogo && (
                      <g>
                        <rect
                          x="82"
                          y="82"
                          width="76"
                          height="76"
                          fill={bgColor}
                          rx="12"
                          stroke={fgColor}
                          strokeWidth="3"
                        />
                        <text
                          x="120"
                          y="126"
                          fill={fgColor}
                          fontFamily="monospace"
                          fontSize="13"
                          fontWeight="900"
                          textAnchor="middle"
                          letterSpacing="1"
                        >
                          RELAY
                        </text>
                      </g>
                    )}
                  </svg>
                </div>

                {includeFrame && (
                  <p
                    className="mt-4 text-xs font-black tracking-widest uppercase select-none"
                    style={{ color: fgColor }}
                  >
                    {frameText}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="w-full space-y-2.5">
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  onClick={handleDownloadPng}
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Download Vector SVG (Print Ready)
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-center"
                    onClick={handleDownloadPng}
                    leftIcon={<Image className="w-3.5 h-3.5" />}
                  >
                    High-Res PNG
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-center"
                    onClick={handleCopyLink}
                    leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copied ? 'Copied' : 'Copy Short Link'}
                  </Button>
                </div>

                <p className="text-[11px] text-slate-500 pt-1">
                  Vectors scale infinitely for billboard signage, trade booths, and product labels.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick specs box */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] space-y-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Print Sizing & Scanner Best Practices</span>
            </div>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400 text-[11px] list-disc list-inside">
              <li>Minimum physical print size: <strong>2 x 2 cm (0.8 x 0.8 in)</strong></li>
              <li>Maintain strong contrast: dark foreground on light background is fastest</li>
              <li>Leave a 4-module quiet zone (white space border) around the code</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 3. Features & Value Pillars */}
      <div className="border-t border-slate-200 dark:border-white/10 pt-16 space-y-10">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Why teams choose dynamic Relaymark QR codes
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Never let a typo or expired promo ruin thousands of printed marketing materials.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Update Targets Anytime
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Repoint your QR code to a new landing page, menu, or event link even after printing on hundreds of t-shirts, brochures, or storefront windows.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Printer className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Vector Precision for Print
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Export crisp SVG assets suitable for Adobe Illustrator, Figma, or commercial offset printing without pixelation or blurred edges.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Built-in Scan Analytics
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Know exactly when, where, and what devices scanned your code. Compare physical foot traffic campaigns against digital benchmarks in real time.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 4. Bottom CTA */}
      <div className="p-8 sm:p-10 rounded-2xl border border-slate-200 dark:border-white/10 bg-gradient-to-b from-blue-50/50 to-white dark:from-blue-950/20 dark:to-[#0f111a] flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Ready to track scans across your physical campaigns?
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Sign up in 30 seconds. Free plan includes 5 custom dynamic QR codes with real-time telemetry.
          </p>
        </div>
        <Link to="/login" className="shrink-0">
          <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Create Free Account
          </Button>
        </Link>
      </div>
    </div>
  );
};
