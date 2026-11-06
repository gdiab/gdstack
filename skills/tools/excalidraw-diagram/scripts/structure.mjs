// Parse a raw scene once, before Excalidraw can restore or repair it. Every
// later step works from the returned live elements, never from the raw JSON.

/** @typedef {{ id: string | null, message: string }} SceneIssue */
/** @typedef {{ issues: SceneIssue[], elements: Record<string, any>[] }} ParsedScene */

const isObject = value => typeof value === 'object' && value !== null && !Array.isArray(value);
const isBinding = value => isObject(value) && typeof value.id === 'string' && typeof value.type === 'string';
const bindings = e => Array.isArray(e.boundElements) ? e.boundElements.filter(isBinding) : [];
const targetOf = binding => isObject(binding) && typeof binding.elementId === 'string' ? binding.elementId : null;

/** @param {unknown} scene @returns {ParsedScene} */
export function parseScene(scene) {
  if (!isObject(scene) || scene.type !== 'excalidraw' || scene.version !== 2 || !Array.isArray(scene.elements)) {
    return { issues: [{ id: null, message: 'Expected an Excalidraw version 2 scene with an elements array' }], elements: [] };
  }
  /** @type {SceneIssue[]} */
  const issues = [];
  const issue = (id, message) => issues.push({ id, message });
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
    if (e.width < 0 || e.height < 0) issue(e.id, 'Negative dimensions');
    if (e.type === 'text') {
      if (typeof e.text !== 'string') issue(e.id, 'Text must be a string');
      if (!(e.fontSize > 0) || !(e.lineHeight > 0)) issue(e.id, 'Invalid text size or line height');
    }
    if (e.type === 'image' && !scene.files?.[e.fileId]?.dataURL?.startsWith('data:')) {
      issue(e.id, 'Image must reference an embedded file');
    }
    if (e.boundElements != null && !(Array.isArray(e.boundElements) && e.boundElements.every(isBinding))) {
      issue(e.id, 'boundElements must be null or a list of {id, type}');
    }
    if (e.containerId != null && typeof e.containerId !== 'string') issue(e.id, 'containerId must be a string');
    for (const end of ['startBinding', 'endBinding']) {
      if (e[end] != null && !(isObject(e[end]) && typeof e[end].elementId === 'string')) {
        issue(e.id, `${end} must be null or name an elementId`);
      }
    }
  }
  if (!byId.size) issue(null, 'Scene has no live elements');

  // Malformed shapes were reported above; the helpers skip them here.
  const reciprocal = (e, targetId, type) => {
    const target = byId.get(targetId);
    if (!target) issue(e.id, `Missing live target: ${targetId}`);
    else if (!bindings(target).some(b => b.id === e.id && b.type === type)) {
      issue(e.id, `Missing reciprocal ${type} binding on ${targetId}`);
    }
  };
  for (const e of byId.values()) {
    if (typeof e.containerId === 'string') reciprocal(e, e.containerId, 'text');
    for (const end of ['startBinding', 'endBinding']) {
      if (targetOf(e[end])) reciprocal(e, targetOf(e[end]), 'arrow');
    }
    for (const binding of bindings(e)) {
      const other = byId.get(binding.id);
      if (!other) issue(e.id, `Missing bound element: ${binding.id}`);
      else if (binding.type === 'text' && (other.type !== 'text' || other.containerId !== e.id)) {
        issue(e.id, `Text binding does not point back: ${binding.id}`);
      } else if (binding.type === 'arrow' && (other.type !== 'arrow' ||
        ![targetOf(other.startBinding), targetOf(other.endBinding)].includes(e.id))) {
        issue(e.id, `Arrow binding does not point back: ${binding.id}`);
      }
    }
  }
  return { issues, elements: [...byId.values()] };
}
