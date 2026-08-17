# UI Consistency Changelog

## 2026-07-16 — Align all surfaces to the Shaft Design Calculator design language

Resolves DES-UI-01, DES-UI-02, and the accent-as-text portion of DES-A11Y-01.
CSS-only changes; no HTML structure, JavaScript, tokens' *names*, or architecture were
modified. Storage format and behaviour are unchanged.

### `css/theme.css`
- Light `:root` palette remapped to the calculator language:
  - `--meilp-primary` `#1A365D` → `#0B2E59`
  - `--meilp-accent` `#F4B400` (yellow) → `#F28C28` (orange)
  - `--meilp-primary-soft` `#E8EEF6` → `#EAF3FF`
  - `--meilp-surface` `#F6F8FB` → `#F5F7FA`
  - `--meilp-text` `#182231` → `#17212F`
  - `--meilp-muted` `#5C6878` → `#667386`
  - `--meilp-border` `#DCE3EC` → `#D9E1EA`
  - shadow tint updated to the new primary
- Added `--meilp-secondary: #6C3FC5` (light) / `#B79CE8` (dark).
- Added `--meilp-accent-text: #A85A18` (light, 5.07:1 on white) / `#F28C28` (dark).
- Dark `:root` accent `#F4B400` → `#F28C28` to match.
- Accent-as-text (foundation-list icon) now uses `--meilp-accent-text`; accent remains
  the orange **fill** for backgrounds, top-borders, and markers.

### `css/analytics-dashboard.css`
- Added `--analytics-accent-text: #A85A18` (light) / `#F28C28` (dark).
- The four accent-coloured **text** rules now use `--analytics-accent-text`; the accent
  gradient and border-left accents are unchanged.

### Effect
- The landing page and shared components (`components.css`, which reads `--meilp-*`) now
  render the same navy `#0B2E59` and orange `#F28C28` as the workbench and analytics
  dashboard — in **both** light and dark mode.
- No accent colour is used as body text or as a meaning-bearing icon below 4.5:1.
- Radius (8px), typography (Poppins), and framework versions were already consistent and
  are untouched.

### Not included (tracked separately in ISSUES-REGISTER)
Branding rename (DES-BR-01), skip-links on app pages (DES-A11Y-02), reduced-motion
(DES-A11Y-03), focus-visible (DES-A11Y-04), and the EC-01 task-count data fix
(DES-DATA-01) are outside the UI-consistency scope and were intentionally left unchanged.
