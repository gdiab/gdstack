// Parse a raw scene once, before Excalidraw can restore or repair it. The
// result is either a list of issues or a source model holding exactly the
// fields this validator established. Each record keeps its raw form in
// `source`, so the browser adapter can hand Excalidraw the file's own data.
// This module has no dependencies; it runs in Node and in the browser bundle.

/** @typedef {{ id: string | null, message: string }} SceneIssue */
/** @typedef {Record<string, unknown>} RawRecord */
/** @typedef {{ id: string, type: string }} Binding */
/** @typedef {{ elementId: string }} ArrowBinding */
/**
 * @typedef {object} SourceElementBase
 * @property {string} id
 * @property {string} type The Excalidraw element type as written in the file.
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {number} angle
 * @property {string | null} containerId
 * @property {Binding[] | null} boundElements
 * @property {ArrowBinding | null} startBinding
 * @property {ArrowBinding | null} endBinding
 * @property {RawRecord} source The whole record from the file, for the editor.
 */
/** @typedef {SourceElementBase & { kind: 'text', text: string, fontSize: number, fontFamily: number, lineHeight: number }} SourceText */
/** @typedef {SourceElementBase & { kind: 'image', fileId: string }} SourceImage */
/** @typedef {SourceElementBase & { kind: 'other' }} SourceOther */
/** @typedef {SourceText | SourceImage | SourceOther} SourceElement */
/** @typedef {{ id: string, mimeType: string, dataURL: string, created: number }} SourceFile */
/** @typedef {{ viewBackgroundColor: string | undefined }} SourceAppState */
/** @typedef {{ elements: SourceElement[], files: Record<string, SourceFile>, appState: SourceAppState }} SourceScene */
/** @typedef {{ ok: true, scene: SourceScene } | { ok: false, issues: SceneIssue[] }} ParsedScene */

/** @param {unknown} value @returns {value is RawRecord} */
const isObject = value => typeof value === 'object' && value !== null && !Array.isArray(value);
/** @param {unknown} value @returns {value is Binding} */
const isBinding = value => isObject(value) && typeof value.id === 'string' && typeof value.type === 'string';
/** @param {unknown} value @returns {value is ArrowBinding} */
const isArrowBinding = value => isObject(value) && typeof value.elementId === 'string';
/** @param {unknown} value @returns {value is number} */
const isFinite = value => typeof value === 'number' && Number.isFinite(value);
/** @param {unknown} value @returns {value is number} */
const isPositive = value => isFinite(value) && value > 0;
/** @param {unknown} value @returns {value is SourceFile} */
const isFile = value => isObject(value) && typeof value.id === 'string' && typeof value.mimeType === 'string' &&
  typeof value.dataURL === 'string' && value.dataURL.startsWith('data:') && isFinite(value.created);

/**
 * Narrow one live record into the source model, or name its first defect.
 * @param {string} id
 * @param {RawRecord} e
 * @param {Record<string, SourceFile>} files
 * @returns {{ element: SourceElement } | { problem: string }}
 */
function parseElement(id, e, files) {
  const { type, x, y, width, height, angle, containerId, boundElements, startBinding, endBinding } = e;
  if (typeof type !== 'string') return { problem: 'Element has no type' };
  if (!isFinite(x) || !isFinite(y) || !isFinite(width) || !isFinite(height) || !isFinite(angle)) {
    return { problem: 'x, y, width, height and angle must be finite numbers' };
  }
  if (width < 0 || height < 0) return { problem: 'Negative dimensions' };
  if (boundElements != null && !(Array.isArray(boundElements) && boundElements.every(isBinding))) {
    return { problem: 'boundElements must be null or a list of {id, type}' };
  }
  if (containerId != null && typeof containerId !== 'string') return { problem: 'containerId must be a string' };
  if (startBinding != null && !isArrowBinding(startBinding)) return { problem: 'startBinding must be null or name an elementId' };
  if (endBinding != null && !isArrowBinding(endBinding)) return { problem: 'endBinding must be null or name an elementId' };
  const base = { id, type, x, y, width, height, angle, containerId: containerId ?? null,
    boundElements: boundElements ?? null, startBinding: startBinding ?? null, endBinding: endBinding ?? null, source: e };
  if (type === 'text') {
    const { text, fontSize, fontFamily, lineHeight } = e;
    if (typeof text !== 'string') return { problem: 'Text must be a string' };
    if (!isPositive(fontSize) || !isPositive(lineHeight)) return { problem: 'Invalid text size or line height' };
    if (!isFinite(fontFamily)) return { problem: 'fontFamily must be an Excalidraw font ID' };
    return { element: { ...base, kind: 'text', text, fontSize, fontFamily, lineHeight } };
  }
  if (type === 'image') {
    const { fileId } = e;
    if (typeof fileId !== 'string' || !files[fileId]) return { problem: 'Image must reference an embedded file' };
    return { element: { ...base, kind: 'image', fileId } };
  }
  return { element: { ...base, kind: 'other' } };
}

/** @param {unknown} scene @returns {ParsedScene} */
export function parseScene(scene) {
  if (!isObject(scene) || scene.type !== 'excalidraw' || scene.version !== 2 || !Array.isArray(scene.elements)) {
    return { ok: false, issues: [{ id: null, message: 'Expected an Excalidraw version 2 scene with an elements array' }] };
  }
  /** @type {SceneIssue[]} */
  const issues = [];
  /** @param {string | null} id @param {string} message */
  const issue = (id, message) => issues.push({ id, message });

  /** @type {Record<string, SourceFile>} */
  const files = {};
  const rawFiles = scene.files ?? {};
  if (!isObject(rawFiles)) issue(null, 'files must be an object');
  else {
    for (const [key, file] of Object.entries(rawFiles)) {
      if (isFile(file)) files[key] = file;
      else issue(null, `File ${key} must have id, mimeType, a data: URL and created`);
    }
  }
  const rawAppState = scene.appState ?? {};
  /** @type {SourceAppState} */
  const appState = { viewBackgroundColor: undefined };
  if (!isObject(rawAppState)) issue(null, 'appState must be an object');
  else if (rawAppState.viewBackgroundColor !== undefined) {
    if (typeof rawAppState.viewBackgroundColor === 'string') appState.viewBackgroundColor = rawAppState.viewBackgroundColor;
    else issue(null, 'appState.viewBackgroundColor must be a string');
  }

  /** @type {Map<string, SourceElement>} */
  const byId = new Map();
  for (const e of scene.elements) {
    if (!isObject(e)) { issue(null, 'Element is not an object'); continue; }
    if (e.isDeleted) continue;
    if (typeof e.id !== 'string' || !e.id) { issue(null, 'Element has no string ID'); continue; }
    if (byId.has(e.id)) { issue(e.id, 'Duplicate live ID'); continue; }
    const parsed = parseElement(e.id, e, files);
    if ('problem' in parsed) issue(e.id, parsed.problem);
    else byId.set(e.id, parsed.element);
  }
  if (!byId.size) issue(null, 'Scene has no live elements');

  /** @param {SourceElement} e @param {string} targetId @param {string} type */
  const reciprocal = (e, targetId, type) => {
    const target = byId.get(targetId);
    if (!target) issue(e.id, `Missing live target: ${targetId}`);
    else if (!target.boundElements?.some(b => b.id === e.id && b.type === type)) {
      issue(e.id, `Missing reciprocal ${type} binding on ${targetId}`);
    }
  };
  for (const e of byId.values()) {
    if (e.containerId !== null) reciprocal(e, e.containerId, 'text');
    for (const binding of [e.startBinding, e.endBinding]) {
      if (binding !== null) reciprocal(e, binding.elementId, 'arrow');
    }
    for (const binding of e.boundElements ?? []) {
      const other = byId.get(binding.id);
      if (!other) issue(e.id, `Missing bound element: ${binding.id}`);
      else if (binding.type === 'text' && (other.type !== 'text' || other.containerId !== e.id)) {
        issue(e.id, `Text binding does not point back: ${binding.id}`);
      } else if (binding.type === 'arrow' && (other.type !== 'arrow' ||
        ![other.startBinding?.elementId, other.endBinding?.elementId].includes(e.id))) {
        issue(e.id, `Arrow binding does not point back: ${binding.id}`);
      }
    }
  }
  if (issues.length) return { ok: false, issues };
  return { ok: true, scene: { elements: [...byId.values()], files, appState } };
}
