import React, { useState } from 'react';
import { AlertOctagon, ShieldAlert, CheckCircle2, Send, HelpCircle } from 'lucide-react';
import { Button } from '../design-system/Button';
import { Input } from '../design-system/Input';
import { Select } from '../design-system/Select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { Badge } from '../design-system/Badge';
import { useToast } from '../context/ToastContext';

export const ReportPage: React.FC = () => {
  const { toast } = useToast();
  const [shortLink, setShortLink] = useState('');
  const [reason, setReason] = useState('phishing');
  const [reporterEmail, setReporterEmail] = useState('');
  const [evidence, setEvidence] = useState('');
  const [isCaptchaChecked, setIsCaptchaChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!shortLink.trim()) {
      errs.shortLink = 'Please provide the suspicious short link URL or slug';
    }
    if (!isCaptchaChecked) {
      errs.captcha = 'Please complete the verification check';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const generatedId = `ABU-${Math.floor(1000 + Math.random() * 9000)}`;
      setSubmittedReportId(generatedId);
      toast({
        title: 'Abuse Report Lodged',
        description: `Incident ticket #${generatedId} queued for immediate triage.`,
        variant: 'success',
      });
    }, 600);
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-12 px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <Badge variant="destructive" size="sm">
          TRUST & SAFETY
        </Badge>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Report Link Abuse or Phishing
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Help us keep the web safe. Flagged shortlinks are immediately quarantined from our global Anycast routing mesh.
        </p>
      </div>

      {/* Emergency SLA Notice */}
      <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/20 flex items-start gap-3 text-xs text-rose-950 dark:text-rose-200">
        <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-xs text-rose-900 dark:text-rose-100">
            Emergency Triage Protocol
          </p>
          <p className="text-[11px] leading-relaxed text-rose-800 dark:text-rose-300">
            Reports with evidence of active credential harvesting or ransomware distribution trigger automated DNS suspension across all 320 Anycast PoPs in under 15 minutes.
          </p>
        </div>
      </div>

      {/* Report Form Card */}
      <Card className="p-6">
        {submittedReportId ? (
          <div className="text-center py-8 space-y-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Report Filed Successfully
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Report ticket <strong className="font-mono text-slate-900 dark:text-slate-100">{submittedReportId}</strong> has been logged. Automated crawlers are verifying the destination payload now.
            </p>
            {reporterEmail && (
              <p className="text-[11px] text-slate-500">
                A confirmation receipt was sent to <span className="font-mono">{reporterEmail}</span>.
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSubmittedReportId(null);
                setShortLink('');
                setEvidence('');
                setIsCaptchaChecked(false);
              }}
            >
              Submit Another Report
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Suspicious Short Link *"
              placeholder="e.g. relay.mk/suspicious-code or https://..."
              value={shortLink}
              onChange={(e) => setShortLink(e.target.value)}
              error={errors.shortLink}
              helperText="Paste the exact short URL or the custom slug that redirected you."
            />

            <Select
              label="Primary Reason for Report *"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              options={[
                { value: 'phishing', label: 'Phishing / Fake Login / Credential Theft' },
                { value: 'malware', label: 'Malware / Ransomware / Exploit Kit Host' },
                { value: 'spam', label: 'Spam / Deceptive & Unsolicited Ads' },
                { value: 'dmca', label: 'Copyright Infringement / DMCA' },
                { value: 'illegal', label: 'Other Harmful or Illegal Content' },
              ]}
            />

            <Input
              label="Your Email (Optional)"
              type="email"
              placeholder="researcher@security-team.org"
              value={reporterEmail}
              onChange={(e) => setReporterEmail(e.target.value)}
              helperText="Optional. Leave this if you wish to receive investigation status updates."
            />

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Additional Evidence / Destination Preview (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Include destination URL, observed redirect chain, or targeted brand..."
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                className="w-full text-xs p-3 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0f111a] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-rose-500 focus:ring-1 focus:rose-500 transition-colors"
              />
            </div>

            {/* Captcha Placeholder */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 flex items-center justify-between">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isCaptchaChecked}
                  onChange={(e) => setIsCaptchaChecked(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 dark:border-white/20 focus:ring-blue-500 cursor-pointer"
                />
                <span>I confirm this report is submitted in good faith [Captcha Verification Placeholder]</span>
              </label>
              <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
            {errors.captcha && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                {errors.captcha}
              </p>
            )}

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Privacy protected · Logs retained for law enforcement requests.
              </span>
              <Button
                type="submit"
                variant="destructive"
                size="md"
                isLoading={isSubmitting}
                rightIcon={<Send className="w-3.5 h-3.5" />}
              >
                Submit Abuse Report
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
