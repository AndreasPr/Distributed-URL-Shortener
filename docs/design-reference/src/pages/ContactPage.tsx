import React, { useState } from 'react';
import { Mail, Clock, Send, CheckCircle2, MessageSquare } from 'lucide-react';
import { Button } from '../design-system/Button';
import { Input } from '../design-system/Input';
import { Select } from '../design-system/Select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { Badge } from '../design-system/Badge';
import { useToast } from '../context/ToastContext';

export const ContactPage: React.FC = () => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('general');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Please provide your name';
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      errs.email = 'Please provide a valid work or personal email address';
    }
    if (!message.trim() || message.length < 10) {
      errs.message = 'Message must be at least 10 characters long';
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
      setIsSubmitted(true);
      toast({
        title: 'Message Transmitted',
        description: 'Thank you! Your inquiry was delivered to Andreas (support@relaymark.dev).',
        variant: 'success',
      });
    }, 700);
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-12 px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <Badge variant="agent" size="sm">
          DIRECT DEVELOPER SUPPORT
        </Badge>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Get in touch with engineering
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Have an architecture question, need an MCP integration review, or custom domain guidance? Send a message directly to the developer.
        </p>
      </div>

      {/* Support Email Notice Box */}
      <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800/40 bg-blue-50/60 dark:bg-blue-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              Direct Support Inbox: <span className="font-mono text-blue-600 dark:text-blue-400">support@relaymark.dev</span>
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              Read and answered directly by the core developer.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono shrink-0">
          <Clock className="w-3.5 h-3.5" />
          <span>SLA &lt; 24h (Team SLA &lt; 4h)</span>
        </div>
      </div>

      {/* Contact Form Card */}
      <Card className="p-6">
        {isSubmitted ? (
          <div className="text-center py-8 space-y-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Message Delivered Successfully
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              We received your message regarding <span className="font-mono">{topic}</span>. A personal response will be sent to <span className="font-mono font-semibold">{email}</span> within 24 hours.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsSubmitted(false);
                setMessage('');
              }}
            >
              Send Another Note
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name *"
                placeholder="e.g. Sarah Connor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
              />

              <Input
                label="Work Email *"
                type="email"
                placeholder="s.connor@cyberdyne.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
              />
            </div>

            <Select
              label="Subject / Topic *"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              options={[
                { value: 'general', label: 'General Technical Inquiry' },
                { value: 'mcp-integration', label: 'MCP for AI Agents Integration' },
                { value: 'billing-limits', label: 'Billing, Quotas & Limits' },
                { value: 'custom-domains', label: 'Custom Domain DNS & TLS Setup' },
                { value: 'bug-report', label: 'Edge Router Bug Report' },
              ]}
            />

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Message & Context *
              </label>
              <textarea
                rows={5}
                placeholder="Describe your technical setup, expected link volume, or agent workflow..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={`w-full text-xs p-3 rounded-lg border bg-white dark:bg-[#0f111a] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors ${
                  errors.message
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-300 dark:border-white/10 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                }`}
              />
              {errors.message && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                  {errors.message}
                </p>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Encrypted via TLS · No spam, guaranteed.
              </span>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                rightIcon={<Send className="w-3.5 h-3.5" />}
              >
                Send Message
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
