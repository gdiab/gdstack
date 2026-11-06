// Neutral native scene. No private workflow data is part of the regression suite.
export function sceneFixture() {
  const base = { angle: 0, strokeColor: '#1e1e1e', backgroundColor: 'transparent', fillStyle: 'solid',
    strokeWidth: 2, strokeStyle: 'solid', roughness: 0, opacity: 100, groupIds: [], frameId: null,
    roundness: null, seed: 1, version: 1, versionNonce: 1, isDeleted: false, boundElements: null,
    updated: 1, link: null, locked: false };
  const box = (id, x, label) => ({ ...base, id, type: 'rectangle', x, y: 100, width: 220, height: 90,
    backgroundColor: '#dbeafe', boundElements: [{ id: label, type: 'text' }, { id: 'flow', type: 'arrow' }] });
  const text = (id, x, containerId, content) => ({ ...base, id, type: 'text', x, y: 132.5, width: 180,
    height: 25, text: content, originalText: content, fontSize: 20, fontFamily: 3,
    textAlign: 'center', verticalAlign: 'middle', containerId, autoResize: true, lineHeight: 1.25 });
  return { type: 'excalidraw', version: 2, source: 'gdstack', appState: { viewBackgroundColor: '#ffffff' }, files: {}, elements: [
    box('prepare', 100, 'prepare-label'), text('prepare-label', 120, 'prepare', 'Prepare clips'),
    box('train', 500, 'train-label'), text('train-label', 520, 'train', 'Train adapter'),
    { ...base, id: 'flow', type: 'arrow', x: 325, y: 145, width: 170, height: 0,
      points: [[0, 0], [170, 0]], startBinding: { elementId: 'prepare', focus: 0, gap: 5 },
      endBinding: { elementId: 'train', focus: 0, gap: 5 }, startArrowhead: null, endArrowhead: 'arrow',
      elbowed: false, lastCommittedPoint: null },
  ] };
}
