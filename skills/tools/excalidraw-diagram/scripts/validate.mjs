#!/usr/bin/env node
import { readFile, writeFile, mkdir, mkdtemp, readdir, rm, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { parseArgs } from 'node:util';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { parseScene } from './scene.mjs';

/**
 * @typedef {object} Report
 * @property {string} sourceSha256
 * @property {Record<string, string>} dependencies
 * @property {import('./scene.mjs').SceneIssue[]} structuralIssues
 * @property {import('./bridge.d.ts').TextMetric[]} textMetrics
 * @property {import('./scene.mjs').SceneIssue[]} editorIssues
 * @property {string[]} runtimeErrors
 * @property {string[]} screenshots
 * @property {number} [loadedElements]
 * @property {import('./bridge.d.ts').EditorSettings} [editorSettings]
 * @property {'passed' | 'failed' | 'incomplete'} status
 * @property {string} visualInspection
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="icon" href="data:,"><link rel="stylesheet" href="/bundle.css">
<style>html,body,#root{width:100%;height:100%;margin:0;overflow:hidden}</style>
<script>window.EXCALIDRAW_ASSET_PATH='/';</script></head>
<body><div id="root"></div><script src="/bundle.js"></script></body></html>`;
/** @type {Record<string, string>} */
const contentTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };

/**
 * @param {string} source
 * @param {string} out
 * @param {{ width?: number, height?: number }} [viewport]
 * @returns {Promise<Report>}
 */
export async function validate(source, out, { width = 1600, height = 1200 } = {}) {
  const bytes = await readFile(source);
  const parsed = parseScene(JSON.parse(bytes.toString('utf8')));
  await mkdir(out, { recursive: true });
  if ((await readdir(out)).length) throw new Error('Output directory must be empty');
  /** @type {{ dependencies: Record<string, string> }} */
  const pkg = JSON.parse(await readFile(path.join(here, 'package.json'), 'utf8'));
  /** @type {Report} */
  const report = { sourceSha256: createHash('sha256').update(bytes).digest('hex'),
    dependencies: pkg.dependencies, structuralIssues: parsed.ok ? [] : parsed.issues, textMetrics: [],
    editorIssues: [], runtimeErrors: [], screenshots: [], status: 'incomplete',
    visualInspection: 'Required: inspect preview and both editor screenshots' };
  /** @type {string | undefined} */
  let temp;
  /** @type {import('node:http').Server | undefined} */
  let server;
  /** @type {import('playwright').Browser | undefined} */
  let browser;
  try {
    // Malformed scenes must not be silently repaired by editor restoration.
    if (!parsed.ok) {
      report.status = 'failed';
      return report;
    }
    const { scene } = parsed;
    temp = await mkdtemp(path.join(tmpdir(), 'gdstack-excalidraw-'));
    const root = temp;
    await build({ entryPoints: [path.join(here, 'editor.jsx')], outfile: path.join(root, 'bundle.js'),
      bundle: true, minify: true, conditions: ['production'], define: { 'process.env.NODE_ENV': '"production"' },
      loader: { '.woff2': 'file', '.woff': 'file', '.ttf': 'file' }, logLevel: 'silent' });
    await cp(path.join(here, 'node_modules/@excalidraw/excalidraw/dist/prod/fonts'), path.join(root, 'fonts'), { recursive: true });
    await writeFile(path.join(root, 'index.html'), html);
    server = createServer(async (req, res) => {
      try {
        const pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
        const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
        if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
        res.setHeader('Content-Type', contentTypes[path.extname(file)] || 'application/octet-stream');
        res.end(await readFile(file));
      } catch { res.writeHead(404).end(); }
    });
    const listening = server;
    await new Promise((resolve, reject) => { listening.once('error', reject); listening.listen(0, '127.0.0.1', () => resolve(undefined)); });
    const address = listening.address();
    if (!address || typeof address === 'string') throw new Error('Server did not report a port');
    const origin = `http://127.0.0.1:${address.port}`;
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    page.on('pageerror', e => report.runtimeErrors.push(e.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === origin || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
      report.runtimeErrors.push(`Blocked external request: ${url.origin}`);
      return route.abort();
    });
    await page.goto(origin);
    await page.waitForFunction(() => window.ready === true);
    const rendered = await page.evaluate(data => window.checkScene(data), scene);
    report.textMetrics = rendered.metrics;
    await writeFile(path.join(out, 'preview.svg'), rendered.svg);
    await writeFile(path.join(out, 'preview.png'), Buffer.from(rendered.png.split(',')[1], 'base64'));
    await page.evaluate(data => window.mountScene(data), scene);
    await page.waitForFunction(count => window.editor.getSceneElements().length === count, scene.elements.length);
    for (const theme of /** @type {const} */ (['light', 'dark'])) {
      await page.evaluate(value => window.setTheme(value), theme);
      const name = `editor-${theme}.png`;
      await page.screenshot({ path: path.join(out, name) });
      report.screenshots.push(name);
    }
    const live = await page.evaluate(() => window.summarizeScene());
    report.loadedElements = live.length;
    report.editorSettings = await page.evaluate(() => window.editorSettings());
    for (const e of scene.elements) {
      const actual = live.find(item => item.id === e.id);
      if (!actual || actual.type !== e.type || (e.kind === 'text' && actual.text !== e.text)) {
        report.editorIssues.push({ id: e.id, message: 'Editor did not preserve element ID, type, or displayed text' });
      }
    }
    report.status = report.textMetrics.some(m => m.overflow) || report.editorIssues.length || report.runtimeErrors.length ? 'failed' : 'passed';
    return report;
  } catch (error) {
    report.runtimeErrors.push(error instanceof Error ? error.message : String(error));
    report.status = 'incomplete';
    return report;
  } finally {
    try { await browser?.close(); } finally {
      const closing = server;
      if (closing) await new Promise(resolve => closing.close(resolve));
      if (temp) await rm(temp, { recursive: true, force: true });
      await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values, positionals } = parseArgs({ allowPositionals: true, options: {
      out: { type: 'string' }, width: { type: 'string', default: '1600' }, height: { type: 'string', default: '1200' },
    } });
    const width = Number(values.width), height = Number(values.height);
    if (positionals.length !== 1 || !values.out || ![width, height].every(n => Number.isInteger(n) && n >= 320 && n <= 8000)) {
      throw new Error('Usage: node validate.mjs scene.excalidraw --out NEW_DIRECTORY [--width 1600 --height 1200]');
    }
    const report = await validate(path.resolve(positionals[0]), path.resolve(values.out), { width, height });
    console.log(JSON.stringify({ status: report.status, structuralIssues: report.structuralIssues.length,
      textOverflows: report.textMetrics.filter(m => m.overflow).map(m => m.id),
      editorIssues: report.editorIssues, runtimeErrors: report.runtimeErrors, report: path.resolve(values.out, 'report.json') }, null, 2));
    process.exitCode = report.status === 'passed' ? 0 : report.status === 'failed' ? 1 : 2;
  } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 2; }
}
