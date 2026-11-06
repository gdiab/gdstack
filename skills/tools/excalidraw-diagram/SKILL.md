---
name: excalidraw-diagram
description: "Create or edit native .excalidraw diagrams with readable labels, attached connectors, and checks in the actual editor. Use when explicitly asked for Excalidraw or its editable file format."
disable-model-invocation: true
---

# Excalidraw diagrams

Deliver a native, editable `.excalidraw` file and a PNG preview. This skill owns
the diagram artifact. A review-page skill can present it, but does not replace
the native file or the checks below. Do not convert a generic request for a
chart, presentation, or interactive explanation into Excalidraw unless asked.

## Design from the content

Establish the intended reader, the question the diagram answers, and the useful
level of detail from the request. For an existing workflow, inspect its records
before drawing. Distinguish observed operation, historical experiments, proposed
changes, and uncertain facts. Include a source date when the state can change.

Choose structure to explain relationships: branches for alternatives, converging
paths for combined inputs, a timeline for history, and a return arrow for a
feedback loop. Use consistent shapes for equivalent things. Do not add different
shapes merely for variety. Separate a summary from detail only when both help.

Make the main path easy to follow at normal zoom. Put conditions on decision
branches. Keep labels short and place supporting explanations beside the flow.
Use containers for meaningful groups, actions, and connector targets, without
imposing a numerical limit on boxes. Use the user's or project's palette when
available; otherwise use a small, legible palette whose meaning stays consistent.
Do not rely on color alone. Preserve a requested hand-drawn style.

## Author the editable scene

Read [scene-authoring.md](references/scene-authoring.md) when creating elements
or changing geometry. Use stable IDs and native text, shapes, and arrows. A
single image of a flowchart inside Excalidraw is not an editable diagram.

Plan large diagrams in coherent sections, then review their connections as a
whole. Hand-authored JSON and small deterministic generators are both valid.
Keep decisions about content and layout explicit; use helpers for repetitive
schema fields and bindings. Preserve existing IDs and user edits when revising.

Text has its own width and height. Widening the surrounding box alone will not
fix an undersized text element. Measure the actual font after it loads; never
estimate width solely from character count. Wrap or resize the text and its
container together, then check surrounding spacing and connectors again.

## Verify both the file and the editor

Use the pinned local renderer described in [validation.md](references/validation.md).
It exports PNG/SVG, loads the scene in Excalidraw, measures text, checks bindings,
and captures light and dark editor screenshots. It writes evidence separately
and never repairs the source file silently.

1. Run the validator against the exact file to deliver.
2. Inspect the PNG and both editor screenshots with an image-viewing tool.
   Check clipped text, ambiguous labels, intersecting arrows, contrast, crowded
   sections, and readability at the intended viewing size. If the fit-to-scene
   view makes text too small, inspect a larger screenshot or a detail crop too.
3. Fix defects, then rerun the validator and inspect the affected views.
4. Stop when the evidence passes and the diagram communicates the requested
   content. Do not keep iterating merely to reach a fixed number of passes.

Exports alone are insufficient: an export can show complete text while the
editor clips that same label. Automated checks are necessary evidence, not a
substitute for inspecting the editor. The pinned editor is reproducible, but a
user's different editor version may still behave differently.

If dependencies, fonts, or browser execution are unavailable, report the exact
unverified part. Use an available actual editor as a fallback; do not claim that
JSON parsing or a preview screenshot proves editor compatibility.

## Deliver

Use the user's requested folder and provide links to the editable file and
preview. If no destination is specified, use the current artifact directory.
Explain that the file opens by importing or dragging it into Excalidraw. State
which checks passed and any remaining limitation. Do not upload or publish the
diagram as a side effect of local creation.

## Provenance

The design approach was informed by `coleam00/excalidraw-diagram-skill`.
[UPSTREAM.md](UPSTREAM.md) records the source pin and the distinction between
those ideas and gdstack's original instructions and validation code.
