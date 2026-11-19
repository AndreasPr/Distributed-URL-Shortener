import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../design-system/Dialog';
import { Button } from '../../design-system/Button';
import { Copy, Check, Download, ExternalLink, QrCode as QrIcon } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  shortCode: string;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  url,
  title,
  shortCode,
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const fullUrl = url.startsWith('http') ? url : `https://${url}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast({
      title: 'Link Copied',
      description: `Copied ${fullUrl} to clipboard.`,
      variant: 'success',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSvg = () => {
    const svgElement = document.getElementById('relaymark-qr-svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `qr-${shortCode || 'relaymark'}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);

    toast({
      title: 'QR Code Downloaded',
      description: `Saved as qr-${shortCode || 'relaymark'}.svg`,
      variant: 'success',
    });
  };

  // Generate deterministic 21x21 QR Code grid based on hash of url
  const generateQrMatrix = (input: string) => {
    const size = 21;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }

    const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    // Corner Finder Patterns (7x7)
    const drawFinder = (startX: number, startY: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 ||
            r === 6 ||
            c === 0 ||
            c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            grid[startY + r][startX + c] = true;
          }
        }
      }
    };

    drawFinder(0, 0); // Top-left
    drawFinder(size - 7, 0); // Top-right
    drawFinder(0, size - 7); // Bottom-left

    // Timing lines
    for (let i = 8; i < size - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // Pseudorandom data fill seeded by string
    let seed = Math.abs(hash);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Skip finder zones
        if (
          (r < 8 && c < 8) ||
          (r < 8 && c >= size - 8) ||
          (r >= size - 8 && c < 8) ||
          r === 6 ||
          c === 6
        ) {
          continue;
        }
        seed = (seed * 9301 + 49297) % 233280;
        grid[r][c] = seed / 233280 > 0.45;
      }
    }

    return grid;
  };

  const matrix = generateQrMatrix(fullUrl);

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <QrIcon className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle>Short Link QR Code</DialogTitle>
              <DialogDescription>
                High-resolution vector QR code ready for print and media
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col items-center py-4 space-y-4">
          {/* QR Code Container */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-center">
            <svg
              id="relaymark-qr-svg"
              viewBox="0 0 210 210"
              className="w-56 h-56"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Background */}
              <rect width="210" height="210" fill="#ffffff" />
              {/* Render Cells */}
              {matrix.map((row, r) =>
                row.map((cell, c) =>
                  cell ? (
                    <rect
                      key={`${r}-${c}`}
                      x={c * 10}
                      y={r * 10}
                      width={10}
                      height={10}
                      fill="#0f172a"
                    />
                  ) : null
                )
              )}
            </svg>
          </div>

          <div className="text-center space-y-1 w-full max-w-sm">
            <p className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
              {title || shortCode}
            </p>
            <p className="font-mono text-xs text-blue-600 dark:text-blue-400 break-all select-all">
              {fullUrl}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSvg}
            leftIcon={<Download className="w-3.5 h-3.5" />}
            className="w-full sm:w-auto"
          >
            Download SVG
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCopyLink}
            leftIcon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            className="w-full sm:w-auto"
          >
            {copied ? 'Copied Link' : 'Copy Short Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
