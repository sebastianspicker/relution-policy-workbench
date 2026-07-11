# Frontend conventions and support

The browser UI is a release-quality alpha for local policy authoring and
read-only device audit work. It is a dense expert tool, not a phone-first
editor. The same information and actions remain available when the interface
reflows to one pane at narrow widths.

## Navigation and layout

Top-level sections use local hash routes: `#/policies`, the three
`#/baselines/*` routes, `#/device-audit`, and `#/settings`. Routes never contain
tenant, policy, configuration, token, or workspace identifiers. Unknown routes
return to Policies. Browser Back and Forward change sections without replacing
the loaded workspace.

Above 1180 CSS pixels the policy navigation, editor, and optional inspector use
independently scrolling panes. At and below 1180 pixels, the Policies section
shows one named pane at a time. Two-dimensional data may scroll in a labelled
table region; the document itself must not scroll horizontally.

## Components and accessibility

- Use `FieldFrame` for visible labels, technical paths, descriptions, required
  state, and associated errors. Do not use a visual `span` as the only label.
- Use `InlineStatus` for local loading, success, warning, and recoverable error
  feedback. Workspace Save, Build, and Download status remains persistent.
- Composite tabs and radios follow the WAI-ARIA keyboard patterns, including
  arrow keys and Home/End. Application undo and redo never replace native
  editing history inside an input, textarea, select, or editable region.
- Keep focus indicators at least 2 CSS pixels and 3:1 against adjacent colors.
  Built-in and persisted custom theme action/text pairs are contrast checked.
- Respect reduced motion and use 44 CSS pixel targets when a coarse pointer is
  detected.

The target is WCAG 2.2 AA at 320 CSS pixels and at browser zoom equivalents.
Automated checks support review but do not replace keyboard and assistive
technology checks.

## Browser and verification policy

Playwright projects cover the current Chromium, Firefox, and WebKit versions
installed by the repository's Playwright release. Run `pnpm test:e2e:web` from
the package script so both Node and web builds are current. Run `pnpm
check:bundle:web` after `pnpm build:web`; JS and CSS gzip totals may not exceed
the recorded pre-overhaul baseline by more than five percent.

VoiceOver with Safari and NVDA with Firefox or Edge remain manual release
checks. If those environments are unavailable, record them as unavailable; do
not infer assistive-technology support from unit tests.

Known alpha limit: complex policy authoring is optimized for desktop and tablet
work. Narrow layouts are supported for complete access and recovery, but are
not presented as an efficient phone authoring workflow.

## Current local evidence

Measured on 2026-07-11:

- 145 Vitest component/controller tests pass.
- Three Chromium Playwright workflows pass: primary edit/build/import,
  addressable responsive panes at 320–1440 CSS pixels, and deterministic
  accessibility-tree/visual checks.
- Eight platform-neutral Chromium baselines cover Policies, Baseline builder,
  Settings, and Device audit at 1440×900 and 390×844.
- Production assets are 116.48 KB JavaScript gzip and 9.33 KB CSS gzip, within
  the five-percent budget.
- The local frontend pattern detector reports no findings.

Current Firefox and WebKit binaries, `@axe-core/playwright`, VoiceOver, and NVDA
were unavailable in this environment. Their checks remain explicitly
unverified; Chromium and semantic component evidence must not be generalized
to those environments.
