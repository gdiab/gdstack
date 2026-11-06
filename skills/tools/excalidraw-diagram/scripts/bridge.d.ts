// Contract between validate.mjs (Node) and editor.jsx (browser). Both sides
// are type-checked against it with `npm run check`.
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import type { ScenePayload } from './scene.mjs';

export interface TextMetric {
  id: string;
  fontFamily: string;
  width: number;
  height: number;
  measuredWidth: number;
  measuredHeight: number;
  overflow: boolean;
}

export interface RenderResult {
  svg: string;
  png: string;
  metrics: TextMetric[];
}

export interface LiveElementSummary {
  id: string;
  type: string;
  text: string | undefined;
}

declare global {
  interface Window {
    ready: boolean;
    editor: ExcalidrawImperativeAPI;
    checkScene(scene: ScenePayload): Promise<RenderResult>;
    mountScene(scene: ScenePayload): Promise<void>;
    setTheme(theme: 'light' | 'dark'): Promise<void>;
    summarizeScene(): LiveElementSummary[];
  }
}
