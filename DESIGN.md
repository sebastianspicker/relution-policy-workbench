# Frontend design reference

This document records the current editor tokens and layout conventions. Runtime
behavior and accessibility requirements are documented in
[`docs/frontend.md`](docs/frontend.md).

## Tokens

The default light theme is defined in `web/src/styles/tokens.css`.

| Role | Value |
| --- | --- |
| Page | `#e8edf2` |
| Work surface | `#f7f9fb` |
| Raised surface | `#ffffff` |
| Navigation | `#0c1219` |
| Heading text | `#0b1420` |
| Body text | `#1a2533` |
| Muted text | `#5a6a7c` |
| Border | `#d2dae3` |
| Strong border | `#b5c0cd` |
| Primary action | `#0d6e66` |
| Success | `#0a6b48` |
| Warning | `#8f5608` |
| Danger | `#a8322d` |

Dark and custom themes change semantic tokens without changing component
geometry or interaction behavior.

## Typography

- UI text uses IBM Plex Sans, Segoe UI, and system UI fallbacks.
- Technical values use IBM Plex Mono and system monospace fallbacks.
- Labels and controls use compact sizes appropriate for dense configuration
  data.
- Paths, identifiers, and raw values remain distinguishable from prose.

## Layout

- The desktop shell uses an icon navigation rail, command bar, provenance
  strip, content area, and local status footer.
- The Policies section can show a policy navigator, editor, and assurance
  inspector.
- Baselines, Device audit, and Settings use section-specific workspaces.
- At narrower widths, the policy workspace changes to one named pane at a
  time.
- Tables may scroll inside labelled regions. The document must not require
  horizontal scrolling.

The active breakpoints and dimensions are implemented in `web/src/styles/`.
Tests under `tests/e2e/` cover desktop, compact, and narrow layouts.

## Components

- Use visible labels, descriptions, constraints, and adjacent error messages
  for form controls.
- Reserve the primary color for selection and primary actions.
- Communicate status with text or icons as well as color.
- Keep destructive actions explicit and confirmed.
- Keep loading, empty, error, disabled, and success states local to the
  affected operation.
- Preserve native text-editing undo and redo behavior.

## Motion

Motion is limited to short state and pane transitions. Reduced-motion
preferences disable nonessential transitions.

## Accessibility

The target is WCAG 2.2 AA, including:

- semantic landmarks and labels
- keyboard access and visible focus
- sufficient text and control contrast
- reduced-motion support
- coarse-pointer target sizing
- access at 320 CSS pixels and browser zoom equivalents

Automated tests support review but do not establish assistive-technology
conformance.
