// Browser side of the bridge declared in bridge.d.ts. Every entry point
// receives a SourceScene from scene.mjs and converts it once, in toExcalidraw.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Excalidraw, exportToSvg, exportToCanvas, restoreElements, restoreAppState, FONT_FAMILY, MIME_TYPES } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';

const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
/** @type {Record<number, string>} */
const families = Object.fromEntries(Object.entries(FONT_FAMILY).map(([name, id]) => [id, name]));
/** @type {string[]} */
const fileMimeTypes = Object.values(MIME_TYPES).filter(mime => mime.startsWith('image/') || mime === MIME_TYPES.binary);
/** @param {string} mime @returns {mime is import('@excalidraw/excalidraw/types').BinaryFileData['mimeType']} */
const isFileMimeType = mime => fileMimeTypes.includes(mime);

/** @param {string} id @returns {HTMLElement} */
const element = id => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element: ${id}`);
  return found;
};

/**
 * The one place source records become Excalidraw objects, through the same
 * restore functions the editor runs on load. They fill defaults for fields
 * the file omits and keep text width and height as written. The parser checks
 * the fields this validator reads; the rest of the schema is Excalidraw's,
 * and the editor preservation check and page errors report what it rejects.
 * restoreElements and restoreAppState are typed for complete data although
 * they accept the file's records, so this is where the source model meets
 * the vendor types. File strings are checked, then branded.
 * @param {import('./scene.mjs').SourceScene} scene
 * @returns {import('./bridge.d.ts').EditorScene}
 */
const toExcalidraw = scene => {
  const records = /** @type {import('@excalidraw/excalidraw/element/types').ExcalidrawElement[]} */ (scene.elements.map(e => e.source));
  const saved = /** @type {import('@excalidraw/excalidraw/data/types').ImportedDataState['appState']} */ (scene.appState);
  /** @type {import('@excalidraw/excalidraw/types').BinaryFiles} */
  const files = {};
  for (const [key, file] of Object.entries(scene.files)) {
    if (!isFileMimeType(file.mimeType)) throw new Error(`Unsupported file MIME type on ${key}: ${file.mimeType}`);
    files[key] = { id: /** @type {import('@excalidraw/excalidraw/element/types').FileId} */ (file.id), mimeType: file.mimeType,
      dataURL: /** @type {import('@excalidraw/excalidraw/types').DataURL} */ (file.dataURL),
      created: file.created, lastRetrieved: file.lastRetrieved, version: file.version };
  }
  return { elements: restoreElements(records, null), files, appState: restoreAppState(saved, null) };
};

window.checkScene = async scene => {
  const { elements, files, appState } = toExcalidraw(scene);
  const args = { elements, files, appState: { ...appState, exportBackground: true, exportWithDarkMode: false, exportEmbedScene: false } };
  // The exported SVG contains embedded font-face rules. Attach it so the
  // document registers those faces before measuring or drawing on canvas.
  const svg = await exportToSvg(args);
  const staging = document.createElement('div');
  staging.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none';
  staging.append(svg);
  document.body.append(staging);
  /** @type {import('./bridge.d.ts').TextMetric[]} */
  const metrics = [];
  const context = document.createElement('canvas').getContext('2d');
  if (!context) throw new Error('Canvas 2D context is unavailable');
  // Measure the source text against the source box, not the restored element.
  for (const e of scene.elements) {
    if (e.kind !== 'text') continue;
    const family = families[e.fontFamily];
    if (!family) throw new Error(`Unknown font family on ${e.id}: ${e.fontFamily}`);
    const font = `${e.fontSize}px "${family}"`;
    const faces = await document.fonts.load(font, e.text || 'M');
    if (!faces.length && family !== 'Helvetica') throw new Error(`Font did not load: ${family}`);
    await document.fonts.ready;
    context.font = `${font}, ${family === 'Cascadia' ? 'monospace' : 'sans-serif'}`;
    const lines = e.text.split('\n');
    const measuredWidth = Math.max(...lines.map(line => context.measureText(line).width));
    const measuredHeight = lines.length * e.fontSize * e.lineHeight;
    metrics.push({ id: e.id, fontFamily: family, width: e.width, height: e.height,
      measuredWidth, measuredHeight, overflow: measuredWidth > e.width + 1 || measuredHeight > e.height + 1 });
  }
  const canvas = await exportToCanvas({ ...args, getDimensions: (width, height) => ({ width, height, scale: 1 }) });
  staging.remove();
  return { svg: svg.outerHTML, png: canvas.toDataURL('image/png'), metrics };
};

window.mountScene = async scene => {
  const { elements, files, appState } = toExcalidraw(scene);
  const root = createRoot(element('root'));
  await new Promise(resolve => root.render(
    <Excalidraw
      initialData={{ elements, files, appState: { ...appState, theme: 'light' } }}
      excalidrawAPI={api => { window.editor = api; resolve(undefined); }}
      UIOptions={{ canvasActions: { loadScene: false, export: false, saveAsImage: false } }}
    />,
  ));
};

window.setTheme = async theme => {
  window.editor.updateScene({ appState: { theme } });
  window.editor.scrollToContent(undefined, { fitToContent: true, viewportZoomFactor: 0.9 });
  await document.fonts.ready;
  await frame();
};

window.summarizeScene = () => window.editor.getSceneElements()
  .map(e => ({ id: e.id, type: e.type, text: e.type === 'text' ? e.text : undefined }));

window.editorSettings = () => {
  const { viewBackgroundColor, gridModeEnabled, gridSize, gridStep, theme } = window.editor.getAppState();
  return { viewBackgroundColor, gridModeEnabled, gridSize, gridStep, theme };
};

window.ready = true;
