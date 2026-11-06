// Browser side of the bridge declared in bridge.d.ts. Every entry point
// receives a ScenePayload from scene.mjs: live elements only.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Excalidraw, exportToSvg, exportToCanvas, FONT_FAMILY } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';

const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
/** @type {Record<number, string>} */
const families = Object.fromEntries(Object.entries(FONT_FAMILY).map(([name, id]) => [id, name]));

/** @param {string} id @returns {HTMLElement} */
const element = id => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element: ${id}`);
  return found;
};

window.checkScene = async scene => {
  const args = { elements: scene.elements, files: scene.files, appState: {
    ...scene.appState, exportBackground: true, exportWithDarkMode: false, exportEmbedScene: false,
  } };
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
  for (const e of scene.elements) {
    if (e.type !== 'text') continue;
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
  const root = createRoot(element('root'));
  await new Promise(resolve => root.render(
    <Excalidraw
      initialData={{ ...scene, appState: { ...scene.appState, theme: 'light' } }}
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

window.ready = true;
