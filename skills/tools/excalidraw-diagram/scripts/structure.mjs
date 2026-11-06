// Validate the supplied scene before Excalidraw can restore or repair it.
export function inspectStructure(scene) {
  const issues = [];
  const issue = (id, message) => issues.push({ id, message });
  if (scene?.type !== 'excalidraw' || scene.version !== 2 || !Array.isArray(scene.elements)) {
    return [{ id: null, message: 'Expected an Excalidraw version 2 scene with an elements array' }];
  }
  const elements = scene.elements.filter(e => e && !e.isDeleted);
  const byId = new Map();
  for (const e of elements) {
    if (typeof e.id !== 'string' || !e.id) issue(null, 'Element has no string ID');
    if (byId.has(e.id)) issue(e.id, 'Duplicate live ID');
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
  }
  if (!elements.length) issue(null, 'Scene has no live elements');
  const reciprocal = (e, targetId, type) => {
    const target = byId.get(targetId);
    if (!target) issue(e.id, `Missing live target: ${targetId}`);
    else if (!target.boundElements?.some(b => b.id === e.id && b.type === type)) {
      issue(e.id, `Missing reciprocal ${type} binding on ${targetId}`);
    }
  };
  for (const e of elements) {
    if (e.containerId) reciprocal(e, e.containerId, 'text');
    for (const end of ['startBinding', 'endBinding']) {
      if (e[end]) reciprocal(e, e[end].elementId, 'arrow');
    }
    for (const binding of e.boundElements || []) {
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
  return issues;
}
