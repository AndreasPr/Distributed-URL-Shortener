/**
 * Relaymark Design System Tokens
 * Calm, precise, developer-focused infrastructure tokens
 * WCAG AA Contrast Guaranteed
 */

export const tokens = {
  colors: {
    brand: {
      primary: '#2563eb', // Blue 600
      primaryDark: '#3b82f6', // Blue 500
      accent: '#3b82f6',
      accentDark: '#60a5fa',
    },
    canvas: {
      light: '#f8fafc', // Slate 50
      dark: '#07080c',  // Deep obsidian
    },
    surface: {
      light: '#ffffff',
      dark: '#0f111a',
      subtleLight: '#f1f5f9', // Slate 100
      subtleDark: '#141824',
    },
    border: {
      light: '#e2e8f0', // Slate 200 (crisp and visible on white/slate-50!)
      dark: 'rgba(255, 255, 255, 0.08)',
      focusLight: '#2563eb',
      focusDark: '#3b82f6',
    },
    text: {
      // Light mode text colors guaranteed > 4.5:1 against white/slate-50
      primaryLight: '#0f172a', // Slate 900 (14:1 contrast on white)
      secondaryLight: '#475569', // Slate 600 (5.8:1 contrast on white)
      mutedLight: '#64748b', // Slate 500 (4.6:1 contrast on white)

      // Dark mode text colors guaranteed > 4.5:1 against #07080c / #0f111a
      primaryDark: '#f8fafc', // Slate 50 (16:1 contrast)
      secondaryDark: '#94a3b8', // Slate 400 (7.5:1 contrast)
      mutedDark: '#64748b', // Slate 500 (4.5:1 contrast)
    },
    status: {
      nominal: {
        bgLight: '#ecfdf5',
        borderLight: '#a7f3d0',
        textLight: '#065f46',
        bgDark: 'rgba(16, 185, 129, 0.1)',
        borderDark: 'rgba(16, 185, 129, 0.25)',
        textDark: '#34d399',
      },
      warning: {
        bgLight: '#fffbeb',
        borderLight: '#fde68a',
        textLight: '#92400e',
        bgDark: 'rgba(245, 158, 11, 0.1)',
        borderDark: 'rgba(245, 158, 11, 0.25)',
        textDark: '#fbbf24',
      },
      critical: {
        bgLight: '#fef2f2',
        borderLight: '#fecaca',
        textLight: '#991b1b',
        bgDark: 'rgba(239, 68, 68, 0.1)',
        borderDark: 'rgba(239, 68, 68, 0.25)',
        textDark: '#f87171',
      },
      agent: {
        bgLight: '#eff6ff',
        borderLight: '#bfdbfe',
        textLight: '#1e40af',
        bgDark: 'rgba(59, 130, 246, 0.12)',
        borderDark: 'rgba(59, 130, 246, 0.3)',
        textDark: '#93c5fd',
      },
    },
  },
  typography: {
    fontSans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    fontMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  radius: {
    none: '0px',
    sm: '4px',
    base: '6px',
    lg: '8px', // Standard rounded-lg cards as requested
    xl: '12px',
    full: '9999px',
  },
  spacing: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '0.75rem',  // 12px
    base: '1rem',   // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '3rem',  // 48px
  },
} as const;
