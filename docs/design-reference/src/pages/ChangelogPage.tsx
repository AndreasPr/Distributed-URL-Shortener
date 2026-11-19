import React from 'react';
import { GitCommit, Sparkles, Wrench, Shield, CheckCircle } from 'lucide-react';
import { Badge } from '../design-system/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { mockChangelog } from '../mock';

export const ChangelogPage: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-4 sm:px-6 space-y-12">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-3">
        <Badge variant="agent" size="sm">
          PRODUCT EVOLUTION
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Changelog & Release Notes
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Regular updates, performance improvements, and new capabilities deployed across our Anycast edge infrastructure.
        </p>
      </div>

      {/* Timeline Items */}
      <div className="relative border-l border-slate-200 dark:border-white/10 ml-4 sm:ml-8 pl-6 sm:pl-8 space-y-10">
        {mockChangelog.map((entry) => (
          <div key={entry.version} className="relative space-y-3">
            {/* Timeline Marker Dot */}
            <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#07080c] bg-blue-600" />

            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                {entry.version}
              </span>
              <span className="text-xs text-slate-500 font-medium">·</span>
              <span className="text-xs text-slate-500 font-medium">{entry.date}</span>
            </div>

            <Card className="p-5 space-y-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {entry.title}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {entry.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Detailed Modifications:
                </span>
                <ul className="space-y-1.5">
                  {entry.changes.map((change, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <span className="shrink-0 mt-0.5">
                        {change.type === 'feature' && <Badge variant="default" size="sm">FEATURE</Badge>}
                        {change.type === 'improvement' && <Badge variant="neutral" size="sm">PERF</Badge>}
                        {change.type === 'fix' && <Badge variant="warning" size="sm">FIX</Badge>}
                        {change.type === 'security' && <Badge variant="agent" size="sm">SECURITY</Badge>}
                      </span>
                      <span className="leading-relaxed">{change.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};
