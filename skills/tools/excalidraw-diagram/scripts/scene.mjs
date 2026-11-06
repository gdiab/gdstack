// Parse a raw scene once, before Excalidraw can restore or repair it. The
// result is either a list of issues or the payload the browser bridge
// receives; no later step reads the raw JSON again.

/** @typedef {import('@excalidraw/excalidraw/element/types').NonDeletedExcalidrawElement} LiveElement */
/** @typedef {import('@excalidraw/excalidraw/types').BinaryFiles} BinaryFiles */
/** @typedef {import('@excalidraw/excalidraw/types').AppState} AppState */
/** @typedef {{ id: string | null, message: string }} SceneIssue */
/**
 * The live elements plus the envelope fields Excalidraw needs to export and
 * load them. This is the only scene shape that crosses into the browser.
 * @typedef {{ elements: LiveElement[], files: BinaryFiles, appState: Partial<AppState> }} ScenePayload
 */
/** @typedef {{ ok: true, scene: ScenePayload } | { ok: false, issues: SceneIssue[] }} ParsedScene */
/** @typedef {Record<string, unknown>} RawElement */

/** @param {unknown} value @returns {value is Record<string, unknown>} */
const isObject = value => typeof value === 'object' && value !== null && !Array.isArray(value);
/** @param {unknown} value @returns {value is { id: string, type: string }} */
const isBinding = value => isObject(value) && typeof value.id === 'string' && typeof value.type === 'string';
/** @param {RawElement} e */
const bindings = e => Array.isArray(e.boundElements) ? e.boundElements.filter(isBinding) : [];
/** @param {unknown} binding @returns {string | null} */
const targetOf = binding => isObject(binding) && typeof binding.elementId === 'string' ? binding.elementId : null;
/** @param {unknown} value */
const isPositive = value => typeof value === 'number' && value > 0;
/** @param {unknown} value */
const isNegative = value => typeof value === 'number' && value < 0;

/** @param {unknown} scene @returns {ParsedScene} */
export function parseScene(scene) {
  if (!isObject(scene) || scene.type !== 'excalidraw' || scene.version !== 2 || !Array.isArray(scene.elements)) {
    return { ok: false, issues: [{ id: null, message: 'Expected an Excalidraw version 2 scene with an elements array' }] };
  }
  const files = isObject(scene.files) ? scene.files : {};
  const appState = isObject(scene.appState) ? scene.appState : {};
  /** @type {SceneIssue[]} */
  const issues = [];
  /** @param {string | null} id @param {string} message */
  const issue = (id, message) => issues.push({ id, message });
  /** @type {Map<string, RawElement>} */
  const byId = new Map();
  for (const e of scene.elements) {
    if (!isObject(e)) { issue(null, 'Element is not an object'); continue; }
    if (e.isDeleted) continue;
    if (typeof e.id !== 'string' || !e.id) { issue(null, 'Element has no string ID'); continue; }
    if (byId.has(e.id)) { issue(e.id, 'Duplicate live ID'); continue; }
    byId.set(e.id, e);
    for (const field of ['x', 'y', 'width', 'height', 'angle']) {
      if (!Number.isFinite(e[field])) issue(e.id, `Invalid ${field}`);
    }
    if (isNegative(e.width) || isNegative(e.height)) issue(e.id, 'Negative dimensions');
    if (e.type === 'text') {
      if (typeof e.text !== 'string') issue(e.id, 'Text must be a string');
      if (!isPositive(e.fontSize) || !isPositive(e.lineHeight)) issue(e.id, 'Invalid text size or line height');
    }
    if (e.type === 'image') {
      const file = typeof e.fileId === 'string' ? files[e.fileId] : undefined;
      if (!isObject(file) || typeof file.dataURL !== 'string' || !file.dataURL.startsWith('data:')) {
        issue(e.id, 'Image must reference an embedded file');
      }
    }
    if (e.boundElements != null && !(Array.isArray(e.boundElements) && e.boundElements.every(isBinding))) {
      issue(e.id, 'boundElements must be null or a list of {id, type}');
    }
    if (e.containerId != null && typeof e.containerId !== 'string') issue(e.id, 'containerId must be a string');
    for (const end of ['startBinding', 'endBinding']) {
      if (e[end] != null && targetOf(e[end]) === null) issue(e.id, `${end} must be null or name an elementId`);
    }
  }
  if (!byId.size) issue(null, 'Scene has no live elements');

  // Malformed shapes were reported above; the helpers skip them here.
  /** @param {RawElement} e @param {string} targetId @param {string} type */
  const reciprocal = (e, targetId, type) => {
    const target = byId.get(targetId);
    if (!target) issue(String(e.id), `Missing live target: ${targetId}`);
    else if (!bindings(target).some(b => b.id === e.id && b.type === type)) {
      issue(String(e.id), `Missing reciprocal ${type} binding on ${targetId}`);
    }
  };
  for (const [id, e] of byId) {
    if (typeof e.containerId === 'string') reciprocal(e, e.containerId, 'text');
    for (const end of ['startBinding', 'endBinding']) {
      const target = targetOf(e[end]);
      if (target !== null) reciprocal(e, target, 'arrow');
    }
    for (const binding of bindings(e)) {
      const other = byId.get(binding.id);
      if (!other) issue(id, `Missing bound element: ${binding.id}`);
      else if (binding.type === 'text' && (other.type !== 'text' || other.containerId !== id)) {
        issue(id, `Text binding does not point back: ${binding.id}`);
      } else if (binding.type === 'arrow' && (other.type !== 'arrow' ||
        ![targetOf(other.startBinding), targetOf(other.endBinding)].includes(id))) {
        issue(id, `Arrow binding does not point back: ${binding.id}`);
      }
    }
  }
  if (issues.length) return { ok: false, issues };
  // The checks above cover every field this validator reads. Excalidraw
  // restores remaining defaults when it loads the scene, and the editor
  // preservation check reports anything it changed.
  const elements = /** @type {LiveElement[]} */ (/** @type {unknown} */ ([...byId.values()]));
  return { ok: true, scene: { elements, files: /** @type {BinaryFiles} */ (files), appState } };
}
