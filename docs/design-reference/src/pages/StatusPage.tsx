import React from 'react';
import { CheckCircle2, AlertTriangle, Clock, Activity, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../design-system/Card';
import { Badge } from '../design-system/Badge';
import { mockStatusComponents, mockStatusIncidents } from '../mock';

export const StatusPage: React.FC = () => {
  // Generate 90 simulated daily uptime bars
  const days = Array.from({ length: 90 }, (_, i) => {
    // day 18 had a minor latency issue as described in mockStatusIncidents
    const isIncidentDay = i === 18;
    return {
      day: 90 - i,
      status: isIncidentDay ? 'minor' : 'operational',
      uptime: isIncidentDay ? '99.82%' : '100%',
    };
  });

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-4 sm:px-6 space-y-10">
      {/* 1. Header & Overall Operational Banner */}
      <div className="space-y-4">
        <div className="text-center max-w-lg mx-auto space-y-2">
          <Badge variant="success" size="sm">
            SYSTEM RELIABILITY
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Relaymark System Status
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Continuous real-time status of our edge Anycast routing nodes, API ingress, and Redis replication.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">All Systems Fully Operational</span>
          </div>
          <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400">
            P95 Anycast: 12.4ms
          </span>
        </div>
      </div>

      {/* 2. System Status Component Cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
          Infrastructure Services
        </h2>

        <div className="space-y-2">
          {mockStatusComponents.map((comp) => (
            <div
              key={comp.id}
              className="p-4 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f111a] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{comp.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{comp.description}</p>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400 text-xs">
                  {comp.uptime90d}% 90d
                </span>
                <Badge variant={comp.status === 'operational' ? 'success' : 'warning'} size="sm">
                  {comp.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. 90-Day Uptime Visualization */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            90-Day Uptime History
          </span>
          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
            99.995% aggregate uptime
          </span>
        </div>

        {/* Bar chart strip */}
        <div className="flex items-center gap-0.5 h-8 w-full pt-1">
          {days.map((d, i) => (
            <div
              key={i}
              title={`Day ${d.day} ago: ${d.uptime} uptime`}
              className={`flex-1 h-full rounded-xs transition-opacity hover:opacity-75 ${
                d.status === 'operational'
                  ? 'bg-emerald-500 dark:bg-emerald-400'
                  : 'bg-amber-500 dark:bg-amber-400'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>90 days ago</span>
          <span>Today (100% operational)</span>
        </div>
      </Card>

      {/* 4. Incident History List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
          Incident History & Postmortems
        </h2>

        <div className="space-y-4">
          {mockStatusIncidents.map((inc) => (
            <Card key={inc.id} className="p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {inc.title}
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">{inc.date}</span>
                </div>

                <Badge variant={inc.status === 'resolved' ? 'success' : 'warning'} size="sm">
                  {inc.status}
                </Badge>
              </div>

              {/* Timeline messages */}
              <div className="space-y-2 pt-1">
                {inc.timeline.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-mono text-[10px] text-slate-500 font-semibold shrink-0 mt-0.5">
                      {item.timestamp}
                    </span>
                    <span className="leading-relaxed">{item.message}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
