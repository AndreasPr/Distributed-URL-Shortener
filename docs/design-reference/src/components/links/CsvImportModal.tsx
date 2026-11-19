import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../design-system/Dialog';
import { Button } from '../../design-system/Button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../design-system/Table';
import { useAppData } from '../../context/AppDataContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { UploadCloud, FileSpreadsheet, Download, CheckCircle2, AlertCircle } from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedRow {
  targetUrl: string;
  shortCode: string;
  title: string;
  tags: string[];
  isValid: boolean;
  error?: string;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose }) => {
  const { bulkAddLinks } = useAppData();
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();

  const defaultCsvSample = `target_url,custom_slug,title,tags
https://acme.com/fall-promo,fall-promo,Fall 2026 Promo,marketing;fall
https://acme.com/newsletter/issue-42,news-42,Newsletter #42,newsletter;digest
https://github.com/acme/relay,github-repo,Open Source Repo,code;oss
https://acme.com/pricing?ref=banner,promo-pricing,Pricing Banner,ads;pricing`;

  const [rawText, setRawText] = useState(defaultCsvSample);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [hasParsed, setHasParsed] = useState(false);

  const handleParse = () => {
    const lines = rawText.trim().split('\n');
    if (lines.length < 2) {
      toast({
        title: 'Invalid CSV',
        description: 'Please provide at least a header row and one valid link data row.',
        variant: 'destructive',
      });
      return;
    }

    const rows: ParsedRow[] = [];

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const targetUrl = cols[0] || '';
      const shortCode = cols[1] || '';
      const title = cols[2] || shortCode || 'Imported Link';
      const tags = cols[3] ? cols[3].split(';').map((t) => t.trim()) : ['csv-import'];

      const isValidUrl = /^https?:\/\//i.test(targetUrl);
      const isValidSlug = !shortCode || /^[a-zA-Z0-9-_]+$/.test(shortCode);

      rows.push({
        targetUrl,
        shortCode,
        title,
        tags,
        isValid: isValidUrl && isValidSlug,
        error: !isValidUrl
          ? 'Invalid destination URL (must start with https://)'
          : !isValidSlug
          ? 'Invalid slug characters'
          : undefined,
      });
    }

    setParsedRows(rows);
    setHasParsed(true);
  };

  const handleExecuteImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid);

    if (validRows.length === 0) {
      toast({
        title: 'No Valid Rows',
        description: 'There are no valid link entries ready for import.',
        variant: 'destructive',
      });
      return;
    }

    bulkAddLinks(
      validRows.map((r) => ({
        targetUrl: r.targetUrl,
        shortCode: r.shortCode || undefined,
        domain: activeWorkspace.customDomains[0] || 'relay.mk',
        title: r.title,
        tags: r.tags,
      }))
    );

    toast({
      title: 'Batch Import Succeeded',
      description: `Successfully provisioned ${validRows.length} short links in ${activeWorkspace.name}.`,
      variant: 'success',
    });

    onClose();
  };

  const downloadTemplate = () => {
    const blob = new Blob([defaultCsvSample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'relaymark_links_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle>Bulk CSV Link Importer</DialogTitle>
              <DialogDescription>
                Provision hundreds of branded short URLs simultaneously using comma-separated values
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Helper banner */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs">
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                Required CSV Schema:
              </span>
              <span className="font-mono text-slate-500 text-[11px]">
                target_url, custom_slug, title, tags (separated by ;)
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Template
            </Button>
          </div>

          {/* Raw Text Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <label>Paste CSV Data or Edit Sample Rows</label>
              <button
                type="button"
                onClick={handleParse}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
              >
                Validate & Parse Rows
              </button>
            </div>
            <textarea
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setHasParsed(false);
              }}
              rows={5}
              className="w-full font-mono text-xs p-3 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0f111a] text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              placeholder="target_url,custom_slug,title,tags..."
            />
          </div>

          {/* Parsed Rows Preview */}
          {hasParsed && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  Preview ({parsedRows.length} rows parsed)
                </span>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                  {parsedRows.filter((r) => r.isValid).length} ready to import
                </span>
              </div>

              <div className="border border-slate-200 dark:border-white/10 rounded-lg overflow-x-auto max-h-56">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Slug</TableHead>
                      <TableHead>Target Destination</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs font-semibold">
                          {row.shortCode || '(auto-generated)'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-xs truncate font-mono">
                          {row.targetUrl}
                        </TableCell>
                        <TableCell className="text-xs">{row.title}</TableCell>
                        <TableCell>
                          {row.isValid ? (
                            <div className="flex items-center gap-1 text-emerald-600 text-[11px] font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Valid</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-rose-600 text-[11px] font-semibold">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{row.error}</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          {!hasParsed ? (
            <Button variant="primary" size="sm" onClick={handleParse}>
              Parse & Validate
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleExecuteImport}
              leftIcon={<UploadCloud className="w-4 h-4" />}
            >
              Import {parsedRows.filter((r) => r.isValid).length} Links
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
