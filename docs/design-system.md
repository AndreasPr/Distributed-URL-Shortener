# Relaymark design system

Relaymark uses a teal accent, an original link-and-arrow SVG mark, and self-hosted Inter. Tokens live in `frontend/app/globals.css`; owned shadcn/ui-style primitives live in `frontend/components/ui/`. Light and dark semantic pairs keep pages and overlays consistent. Spacing follows a 4px unit, type ranges from 12–36px, and the base radius is 12px.

Run `cd frontend && npm run dev`, then open `/design`. The gallery includes Button, Input, Card, Badge, Table, Dialog, DropdownMenu, Tabs, Tooltip, Skeleton and Sonner notifications. The shell demonstrates cmdk via Ctrl/Cmd+K. Open Settings or use the top-bar button to change themes. Narrow the window to inspect the navigation drawer.

All six workflow destinations are available. API keys is a key-entry page, not a key-issuance UI: use the existing server CLI to create/revoke keys. Credentials remain in memory across client navigation and clear on reload. Theme preference alone is saved in localStorage. Demo behavior still uses the same in-memory API adapter.

Keyboard review: Tab to the skip link, navigate the sidebar, open the command palette, use arrows/Enter, dismiss with Escape, and check focus returns. Repeat with the mobile drawer, dropdown, dialog, and tabs. Focus styling and reduced-motion preferences are supported. Playwright includes axe WCAG A/AA checks of the gallery in light/dark; manual screen-reader and all-page accessibility review remain useful and are not claimed as completed.

Validation: `make frontend-check`; `cd frontend && npm run build:demo && npm run test:e2e && npm run check:demo-build && npm run audit`. See [ADR 0034](adr/0034-frontend-design-system.md).
