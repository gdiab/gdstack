import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { inspectStructure } from '../scripts/structure.mjs';
import { validate } from '../scripts/validate.mjs';
import { sceneFixture } from './fixture.mjs';

test('a native scene has reciprocal text and arrow bindings', () => {
  assert.deepEqual(inspectStructure(sceneFixture()), []);
});
test('broken or deleted connector targets cannot pass', () => {
  const scene = sceneFixture();
  scene.elements[0].boundElements = scene.elements[0].boundElements.filter(b => b.type !== 'arrow');
  assert.ok(inspectStructure(scene).some(e => e.id === 'flow' && e.message.includes('reciprocal')));
  scene.elements[2].isDeleted = true;
  assert.ok(inspectStructure(scene).some(e => e.id === 'flow' && e.message.includes('Missing live target')));
});
test('duplicate IDs and detached container labels cannot pass', () => {
  const scene = sceneFixture();
  scene.elements[1].containerId = 'train';
  scene.elements.push({ ...scene.elements[0] });
  const findings = inspectStructure(scene);
  assert.ok(findings.some(e => e.message.includes('Duplicate')));
  assert.ok(findings.some(e => e.message.includes('does not point back')));
});
test('missing embedded image data cannot pass', () => {
  const scene = sceneFixture();
  scene.elements.push({ ...scene.elements[0], id: 'image', type: 'image', fileId: 'missing', boundElements: null });
  assert.ok(inspectStructure(scene).some(e => e.id === 'image' && e.message.includes('embedded')));
});
test('local exports and both editor themes pass, but undersized source text fails', { timeout: 120000 }, async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'gdstack-diagram-test-'));
  try {
    const file = path.join(dir, 'fixture.excalidraw');
    const scene = sceneFixture();
    const original = JSON.stringify(scene);
    await writeFile(file, original);
    const passed = await validate(file, path.join(dir, 'valid'));
    assert.equal(passed.status, 'passed', JSON.stringify(passed));
    assert.equal(passed.loadedElements, scene.elements.length);
    assert.deepEqual(passed.screenshots, ['editor-light.png', 'editor-dark.png']);
    assert.equal(await readFile(file, 'utf8'), original);
    for (const name of ['preview.svg', 'preview.png', 'editor-light.png', 'editor-dark.png']) {
      assert.ok((await stat(path.join(dir, 'valid', name))).size > 100);
    }
    // Leave the surrounding box wide: the defect is the text element itself.
    scene.elements[1].width = 10;
    scene.elements[1].height = 10;
    await writeFile(file, JSON.stringify(scene));
    const failed = await validate(file, path.join(dir, 'clipped'));
    assert.equal(failed.status, 'failed', JSON.stringify(failed));
    assert.deepEqual(failed.textMetrics.filter(m => m.overflow).map(m => m.id), ['prepare-label']);
    assert.equal(failed.runtimeErrors.length, 0);
    assert.ok((await stat(path.join(dir, 'clipped', 'preview.png'))).size > 100);
    await assert.rejects(validate(file, path.join(dir, 'valid')), /must be empty/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
