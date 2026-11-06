# Native scene authoring

Use a scene envelope with `type: "excalidraw"`, `version: 2`, `source`,
`elements`, `appState`, and `files`. Each live element needs a unique stable ID.
The installed `@excalidraw/excalidraw` package provides
`convertToExcalidrawElements` for turning element skeletons into full native
elements. Use it when practical instead of recreating schema defaults. Its
types are the schema reference for the pinned version.

Preserve IDs during edits. Preserve the scene's embedded `files` entries and
image `fileId` references; each file entry carries `id`, `mimeType`, a `data:`
URL and a `created` timestamp, as Excalidraw writes them. Keep the source artifact separate from previews and
validation output. Do not flatten existing editable content into an image.

## Text geometry

- `text` is the displayed string; `originalText` is the unwrapped source.
- `fontFamily` is Excalidraw's numeric font ID, not a CSS font string.
- `width` must cover the widest rendered line, and `height` must cover all lines
  at `fontSize * lineHeight`. Include sensible extra space in containers.
- Intentional line breaks help control layout. Changing font size, font family,
  or wrapping invalidates previous measurements.
- Text inside a shape uses `containerId`; the shape lists that text's ID in
  `boundElements` with `type: "text"`. Moving or resizing the shape should keep
  its label attached. Free labels do not need a container.
- Rotated text, curved containers, and complex scripts need visual inspection
  beyond the basic width/height check.

## Connectors

An arrow's `startBinding` and `endBinding` identify attached elements through
`elementId`. Each target lists the arrow in its `boundElements` with
`type: "arrow"`. Keep both sides consistent, including when deleting elements.
An intentionally free arrow endpoint may have a null binding.

Arrow `points` are relative to the arrow's `x` and `y`, not absolute canvas
coordinates. Route around labels and shapes. Label a branch close to its origin
so the condition cannot be mistaken for the next step. A line used as a divider
or timeline does not need an arrowhead.

For complex existing scenes, preserve fields that the skill does not understand.
Let the editor load the file and compare the live element IDs and text with the
source. Do not treat the editor's automatic repairs as proof the source was valid.
