import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Activity, Terminal, ArrowLeft, LayoutGrid } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../design-system/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../design-system/Table';
import { Badge } from '../../design-system/Badge';
import { Button } from '../../design-system/Button';
import { StatCard } from '../../design-system/StatCard';
import { mockAdminClusterNodes, mockAuditLogs } from '../../mock';

export const AdminPreview: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Layout Switch Banner for Reviewer */}
      <div className="p-3.5 rounded-lg border border-indigo-500/30 bg-indigo-950/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Badge variant="agent" size="sm">
            LAYOUT SHELL DEMO
          </Badge>
          <span className="text-slate-300">
            Currently previewing: <strong>AdminLayout</strong> (Cluster Telemetry & Audit Logs)
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/">
            <Button size="sm" variant="outline" className="text-white border-slate-700 hover:bg-slate-800">
              Switch to MarketingLayout
            </Button>
          </Link>
          <Link to="/app/links">
            <Button size="sm" variant="primary" leftIcon={<LayoutGrid className="w-3.5 h-3.5" />}>
              Switch to AppLayout
            </Button>
          </Link>
        </div>
      </div>

      {/* Cluster Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Edge Relay Nodes"
          value="6 / 6"
          subtitle="All PoP gateways online"
          icon={<Activity className="w-4 h-4 text-emerald-400" />}
          className="bg-slate-950 border-slate-800 text-white"
        />
        <StatCard
          title="Current Anycast Throughput"
          value="5,760 rps"
          change={{ value: '+8.4%', trend: 'up', label: 'vs last hour' }}
          icon={<Activity className="w-4 h-4 text-blue-400" />}
          className="bg-slate-950 border-slate-800 text-white"
        />
        <StatCard
          title="Cluster Mean Latency"
          value="6.65 ms"
          change={{ value: 'P99: 18.2ms', trend: 'neutral' }}
          icon={<Terminal className="w-4 h-4 text-indigo-400" />}
          className="bg-slate-950 border-slate-800 text-white"
        />
        <StatCard
          title="Security Incidents (24h)"
          value="0"
          subtitle="All IP rate rules nominal"
          icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
          className="bg-slate-950 border-slate-800 text-white"
        />
      </div>

      {/* Global Edge Node Cluster Table */}
      <Card className="bg-slate-950 border-slate-800 text-slate-100">
        <CardHeader>
          <CardTitle className="text-white">Global Edge Node Cluster</CardTitle>
          <CardDescription className="text-slate-400">
            Real-time status of distributed Anycast forwarder nodes across edge provider tiers.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="bg-slate-950 border-slate-800">
            <TableHeader className="bg-slate-900 border-slate-800 text-slate-400">
              <TableRow>
                <TableHead>Node Identifier</TableHead>
                <TableHead>Region & Location</TableHead>
                <TableHead>Edge Tier</TableHead>
                <TableHead>Health Status</TableHead>
                <TableHead isNumeric>Latency (ms)</TableHead>
                <TableHead isNumeric>Traffic (rps)</TableHead>
                <TableHead isNumeric>Uptime SLA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-slate-800/60 text-slate-200">
              {mockAdminClusterNodes.map((node) => (
                <TableRow key={node.id} className="hover:bg-slate-900/50">
                  <TableCell className="font-mono text-xs font-semibold text-white">
                    {node.id}
                  </TableCell>
                  <TableCell>{node.region}</TableCell>
                  <TableCell>
                    <span className="text-[11px] font-mono text-slate-400">{node.provider}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={node.status === 'healthy' ? 'success' : 'warning'} size="sm">
                      {node.status}
                    </Badge>
                  </TableCell>
                  <TableCell isNumeric>{node.latencyMs} ms</TableCell>
                  <TableCell isNumeric>{node.activeReroutesPerSec}</TableCell>
                  <TableCell isNumeric>{node.uptime}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Global Security Audit Log */}
      <Card className="bg-slate-950 border-slate-800 text-slate-100">
        <CardHeader>
          <CardTitle className="text-white">Security & Audit Event Stream</CardTitle>
          <CardDescription className="text-slate-400">
            Immutable log trail of administrative actions, API key issuances, and MCP agent tool executions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="bg-slate-950 border-slate-800">
            <TableHeader className="bg-slate-900 border-slate-800 text-slate-400">
              <TableRow>
                <TableHead>Event ID</TableHead>
                <TableHead>Actor & Provenance</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource Target</TableHead>
                <TableHead>Origin IP</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-slate-800/60 text-slate-200">
              {mockAuditLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-slate-900/50">
                  <TableCell className="font-mono text-[11px] text-slate-400">{log.id}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-white">{log.actor}</span>
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-blue-400">{log.action}</TableCell>
                  <TableCell className="text-xs">{log.target}</TableCell>
                  <TableCell className="font-mono text-[11px] text-slate-400">{log.ipAddress}</TableCell>
                  <TableCell>
                    <Badge variant={log.status === 'success' ? 'success' : 'destructive'} size="sm">
                      {log.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
