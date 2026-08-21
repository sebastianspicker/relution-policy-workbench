# Frontend conventions

The browser editor is served by the local Node.js process. Static Vite preview
does not provide the `/api/*` backend and is not a supported editor runtime.

## Routes

The application uses local hash routes:

- `#/policies`
- `#/baselines/builder`
- `#/baselines/recommendations`
- `#/baselines/compliance`
- `#/device-audit`
- `#/settings`

Routes do not contain tenant, policy, configuration, token, or workspace
identifiers. Unknown routes return to Policies. Browser Back and Forward move
between sections without replacing the loaded workspace.

## Layout

Policies uses the navigator, editor, and optional assurance inspector.
Baselines, Device audit, and Settings use dedicated full-width workspaces.

Desktop panes scroll independently. At and below the compact breakpoint, the
Policies section displays one named pane at a time. Tables can use labelled
horizontal scroll regions, but the document must not scroll horizontally.

The current tokens and visual conventions are documented in
[`DESIGN.md`](../DESIGN.md).

## Component contracts

- Use `FieldFrame` for visible labels, technical paths, descriptions, required
  state, and associated errors.
- Use `InlineStatus` for local loading, success, warning, and recoverable error
  feedback.
- Keep Save, Build, Download, and connection status persistent when the related
  state remains relevant.
- Implement composite tabs and radio groups with arrow keys and Home/End.
- Do not override native undo and redo inside editable controls.
- Provide loading, empty, error, disabled, and success states for asynchronous
  operations.
- Confirm destructive local actions and make external writes explicit.

## Accessibility

The target is WCAG 2.2 AA at 320 CSS pixels and browser zoom equivalents.
Preserve:

- semantic landmarks and form labels
- keyboard access and logical focus order
- visible focus indicators
- sufficient contrast
- reduced-motion behavior
- 44 CSS pixel targets for coarse pointers
- status text that does not rely on color alone

Automated checks do not replace manual keyboard and assistive-technology
review.

## Browser review

Run the bundle budget after a browser build:

```sh
pnpm build:web
pnpm check:bundle:web
```

For visible changes, review desktop, compact, and narrow layouts manually.
Record unavailable browsers or assistive technologies as untested.
