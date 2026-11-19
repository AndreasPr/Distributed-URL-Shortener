import React, { useState } from 'react';
import {
  Bot,
  Terminal,
  Copy,
  Check,
  Zap,
  Play,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../design-system/Card';
import { Button } from '../../design-system/Button';
import { Badge } from '../../design-system/Badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../design-system/Table';
import { CodeBlock } from '../../design-system/CodeBlock';
import { Skeleton } from '../../design-system/Skeleton';
import { EmptyState } from '../../design-system/EmptyState';
import { PageStateSimulator, PageErrorAlert, PageDisplayState } from '../../components/common/PageStateSimulator';
import { useAppData } from '../../context/AppDataContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { mockMcpServerConfig } from '../../mock';

export const McpPage: React.FC = () => {
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [pageState, setPageState] = useState<PageDisplayState>('normal');
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [testingTool, setTestingTool] = useState<string | null>(null);

  const mcpConfig = mockMcpServerConfig;

  const claudeDesktopJson = `{
  "mcpServers": {
    "relaymark": {
      "command": "npx",
      "args": ["-y", "@relaymark/mcp-server"],
      "env": {
        "RELAYMARK_API_KEY": "EXAMPLE_PLACEHOLDER",
        "RELAYMARK_WORKSPACE": "${activeWorkspace.id}"
      }
    }
  }
}`;

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(claudeDesktopJson);
    setCopiedConfig(true);
    toast({
      title: 'MCP Configuration Copied',
      description: 'Ready to paste into claude_desktop_config.json',
      variant: 'success',
    });
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  const handleTestTool = (toolName: string) => {
    setTestingTool(toolName);
    setTimeout(() => {
      setTestingTool(null);
      toast({
        title: `Tool Executed: ${toolName}`,
        description: 'Returned 200 OK with verified synthetic payload.',
        variant: 'success',
      });
    }, 600);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Page State Simulator Control */}
      <PageStateSimulator
        currentState={pageState}
        onStateChange={setPageState}
        pageLabel="AI Agent MCP Server"
      />

      {/* ERROR STATE */}
      {pageState === 'error' && (
        <PageErrorAlert
          title="MCP Gateway Transport Ingress Offline"
          message="Could not bind SSE (Server-Sent Events) listener on port 8089. Model Context Protocol handshakes are failing."
          onRetry={() => {
            setPageState('loading');
            setTimeout(() => setPageState('normal'), 600);
          }}
        />
      )}

      {/* 2. Top Header & Gateway Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-500" />
            <span>Model Context Protocol (MCP) Server</span>
            <Badge variant="agent" size="sm">
              v{mcpConfig.version} · Spec {mcpConfig.protocolVersion}
            </Badge>
          </h1>
          <p className="text-xs text-slate-500">
            Allow Claude Desktop, Cursor AI, and LangChain agents to programmatically shorten URLs and query analytics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyConfig}
            leftIcon={copiedConfig ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copiedConfig ? 'Copied Config' : 'Copy Claude Config'}
          </Button>
          <a
            href="https://github.com/relaymark/mcp-server-relay"
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="primary" size="sm" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
              GitHub Repo
            </Button>
          </a>
        </div>
      </div>

      {/* 3. Server Configuration & Setup Code */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status & Active Agents */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">MCP Gateway Health</CardTitle>
            <CardDescription>Live transport status across connected agent runtimes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Transport:</span>
                <Badge variant="agent" size="sm">stdio & SSE</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Active Agent Sessions:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {pageState === 'empty' ? '0' : mcpConfig.activeAgentsCount} agents
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Registered Tools:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {mcpConfig.tools.length} tools
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-slate-600 dark:text-slate-400">
              <p className="font-semibold text-slate-900 dark:text-slate-100">Zero-Hallucination Execution</p>
              <p className="text-[11px] leading-relaxed">
                Relaymark exposes validated JSON schemas directly into LLM context windows, eliminating URL generation guesswork.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quickstart JSON */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Claude Desktop / Cursor Config</CardTitle>
              <CardDescription>Add this stanza to your agent’s JSON configuration file</CardDescription>
            </div>
            <span className="text-[10px] font-mono text-slate-400">claude_desktop_config.json</span>
          </CardHeader>
          <CardContent>
            <CodeBlock code={claudeDesktopJson} language="json" />
          </CardContent>
        </Card>
      </div>

      {/* 4. Active Tools Registry Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Exposed MCP Tool Manifest</span>
          </CardTitle>
          <CardDescription>
            Callable tool interfaces currently advertised to connected autonomous agents
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {pageState === 'loading' ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
                  <Skeleton variant="text" width="30%" height={16} />
                  <Skeleton variant="text" width="40%" height={16} />
                  <Skeleton variant="text" width="15%" height={16} />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool Name</TableHead>
                  <TableHead>Schema Description</TableHead>
                  <TableHead>Parameters</TableHead>
                  <TableHead isNumeric>Agent Invocations</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mcpConfig.tools.map((tool) => (
                  <TableRow key={tool.name}>
                    <TableCell className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 align-top">
                      {tool.name}
                    </TableCell>

                    <TableCell className="text-xs text-slate-600 dark:text-slate-400 align-top max-w-sm">
                      {tool.description}
                    </TableCell>

                    <TableCell className="align-top">
                      <div className="flex items-center gap-1 flex-wrap">
                        {Object.keys(tool.parameters).map((p) => (
                          <span
                            key={p}
                            className="font-mono text-[10px] bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 px-1.5 py-0.2 rounded"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </TableCell>

                    <TableCell isNumeric className="font-mono font-semibold align-top">
                      {tool.totalAgentCalls.toLocaleString()}
                    </TableCell>

                    <TableCell className="align-top text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestTool(tool.name)}
                        isLoading={testingTool === tool.name}
                        leftIcon={<Play className="w-3 h-3 text-emerald-500" />}
                        className="text-xs"
                      >
                        Test Tool
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
