# 0034: Relaymark frontend design system

## Context
The frontend had separate navigation and page styles, no theme switch, and no shared visual review surface. It must remain usable without a backend in demo mode and preserve the real API interface.

## Decision
Use Relaymark, a teal link-and-arrow SVG mark, and self-hosted Inter. Semantic CSS variables define both themes, spacing, radii, and typography. Keep owned shadcn/ui-style components on the existing Radix primitives rather than introducing a separate UI framework. Use next-themes for system/light/dark appearance, cmdk for keyboard navigation, and Sonner for accessible notifications. `/design` provides an interactive component gallery without Storybook.

The shell uses a desktop sidebar and a modal mobile drawer. API-key entry moves to `/api-keys`; a root context tracks whether the in-memory client has a key. Only the theme preference is persisted, under `relaymark-theme`.

## Consequences
Components remain editable and share tokens, but upgrades are our responsibility. Radix supplies focus management; Playwright covers navigation, overlays, keyboard shortcuts, and theme persistence. Axe scans the gallery in both themes; this is evidence, not a complete WCAG certification or a substitute for screen-reader review. No server endpoints or authentication scopes change.
