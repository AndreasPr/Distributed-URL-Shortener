import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

/**
 * Primary Brand Wordmark Glyph for Relaymark
 * Two precise nodes connected by a directional relay conduit
 */
export const RelayLogo: React.FC<IconProps> = ({ className = 'w-5 h-5', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Node 1 */}
    <circle cx="6" cy="6" r="3" className="stroke-current" strokeWidth="2" />
    {/* Node 2 */}
    <circle cx="18" cy="18" r="3" className="stroke-current" strokeWidth="2" />
    {/* Relay conduit */}
    <path
      d="M8.5 7.5L15.5 14.5"
      className="stroke-current"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M14 6H18V10"
      className="stroke-current text-blue-600 dark:text-blue-400"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 18H6V14"
      className="stroke-current text-blue-600 dark:text-blue-400"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Abstract Relay Routing Motif
 * Demonstrating deterministic packet and short-code forwarding
 */
export const RelayMotif: React.FC<IconProps> = ({ className = 'w-12 h-12', ...props }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <rect x="4" y="4" width="40" height="40" rx="8" className="stroke-slate-200 dark:stroke-white/10" strokeWidth="1.5" strokeDasharray="3 3" />
    <circle cx="14" cy="14" r="4" className="stroke-blue-600 dark:stroke-blue-400 fill-blue-50 dark:fill-blue-950/40" strokeWidth="2" />
    <circle cx="34" cy="34" r="4" className="stroke-emerald-600 dark:stroke-emerald-400 fill-emerald-50 dark:fill-emerald-950/40" strokeWidth="2" />
    <circle cx="34" cy="14" r="3" className="stroke-slate-400 dark:stroke-slate-600" strokeWidth="1.5" />
    <circle cx="14" cy="34" r="3" className="stroke-slate-400 dark:stroke-slate-600" strokeWidth="1.5" />
    <path d="M17.5 16.5L30.5 29.5" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth="2" strokeLinecap="round" />
    <path d="M26 14H31V19" className="stroke-slate-400 dark:stroke-slate-600" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="24" cy="24" r="2" className="fill-blue-600 dark:fill-blue-400" />
  </svg>
);

/**
 * MCP Agent Gateway Motif
 * Autonomous agent routing tool connection
 */
export const AgentMcpMotif: React.FC<IconProps> = ({ className = 'w-8 h-8', ...props }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <rect x="3" y="7" width="26" height="18" rx="4" className="stroke-slate-300 dark:stroke-white/10" strokeWidth="1.5" />
    <circle cx="10" cy="16" r="2.5" className="fill-blue-600 dark:fill-blue-400" />
    <circle cx="22" cy="16" r="2.5" className="fill-blue-600 dark:fill-blue-400" />
    <path d="M14 16H18" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8 7V4M24 7V4" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/**
 * Empty State Clean Illustration Motif
 */
export const EmptyLinksIllustration: React.FC<IconProps> = ({ className = 'w-32 h-24', ...props }) => (
  <svg
    viewBox="0 0 160 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <rect x="20" y="24" width="120" height="72" rx="8" className="fill-slate-50 dark:fill-slate-900/40 stroke-slate-200 dark:stroke-white/10" strokeWidth="1.5" />
    <path d="M40 48H120" className="stroke-slate-200 dark:stroke-white/10" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M40 68H90" className="stroke-slate-200 dark:stroke-white/10" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="32" cy="48" r="3" className="fill-blue-500/60" />
    <circle cx="32" cy="68" r="3" className="fill-slate-300 dark:fill-slate-600" />
    <path d="M100 68L112 56M112 56H104M112 56V64" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
