# Local rendering and editor checks

Requires Node 22 or newer, npm, and a Chromium runtime supplied by Playwright.
Run commands from this skill's `scripts` directory; resolve it from the skill's
location, not a hard-coded agent installation path.

First-time setup downloads pinned packages and the matching browser:

```bash
npm ci --ignore-scripts
npx playwright install chromium
```

On Linux, missing browser system libraries may require
`npx playwright install --with-deps chromium`. Use the environment's normal
permission mechanism when installing system packages. Do not change global
sandbox settings or switch to an unpinned CDN renderer on failure.

```bash
node validate.mjs /absolute/path/workflow.excalidraw --out /absolute/path/workflow-check
```

The output directory must be new or empty. The tool creates:

- `preview.svg` and `preview.png`: official Excalidraw exports.
- `editor-light.png` and `editor-dark.png`: actual editor screenshots.
- `report.json`: source hash, dependency versions, structural findings, source
  text measurements, editor element preservation results, and the settings the
  editor loaded (background, grid, theme).

Exit 0 means the automatic checks passed. Exit 1 means the scene failed checks;
inspect `report.json` and available images. Exit 2 means the check could not
complete. All outcomes still require honest reporting; a partial screenshot is
not a passing validation.

The renderer launches its own headless browser and temporary loopback server.
It serves bundled code and fonts locally, blocks external browser requests,
and closes the browser/server when done. Source files are read, never rewritten.
After setup, rendering does not require a CDN. Temporary bundles are deleted.

Font families come from the pinned Excalidraw package. Helvetica uses the system
sans-serif fallback, so its exact metrics may vary between machines. Missing
bundled fonts fail validation. The width tolerance is one canvas unit to allow
rounding; line-height checks use the source's actual line breaks.

Screenshots fit the scene into a 1600 by 1200 viewport by default. For large
diagrams, use `--width 2400 --height 1800` or inspect detail crops. A complete
scene at a tiny zoom is not evidence that its labels are readable.

Automatic checks cover IDs, element types, finite geometry, reciprocal
text/arrow bindings, embedded files (`id`, `mimeType`, a `data:` URL and
`created`), text dimensions, and editor preservation of IDs and displayed text.
The tool reads only those fields; the editor receives each element exactly as
written in the file and restores the rest itself, as it would on load. The
checks do not establish semantic accuracy, optimal layout, absence of every
overlap, glyph coverage in every language, or compatibility with every editor
version.

## Regression checks

From `scripts`:

```bash
npm run check
npm test
```

`npm run check` type-checks the scripts against the contracts in `scene.mjs`
(the source model the parser establishes) and `bridge.d.ts` (what the Node side
and the browser side exchange), using the pinned Excalidraw types. Tests include a neutral editable
scene, malformed elements that must become findings rather than crashes, an
undersized label that must fail even when its export succeeds, broken bindings,
and both editor themes. No personal workflow records are included in the test
fixtures.
