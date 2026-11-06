// Contract between validate.mjs (Node) and editor.jsx (browser). Both sides
// are type-checked against it with `npm run check`. The browser receives the
// SourceScene from scene.mjs and converts it to EditorScene itself.
import type { ExcalidrawImperativeAPI, BinaryFiles, AppState } from '@excalidraw/excalidraw/types';
import type { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { RestoredDataState } from '@excalidraw/excalidraw/data/restore';
import type { SourceScene } from './scene.mjs';

export interface EditorScene {
  elements: OrderedExcalidrawElement[];
  files: BinaryFiles;
  appState: RestoredDataState["appState"];
}

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

/** Saved settings the editor reports after loading, as evidence for the report. */
export type EditorSettings = Pick<AppState, 'viewBackgroundColor' | 'gridModeEnabled' | 'gridSize' | 'gridStep' | 'theme'>;

export interface LiveElementSummary {
  id: string;
  type: string;
  text: string | undefined;
}

declare global {
  interface Window {
    ready: boolean;
    editor: ExcalidrawImperativeAPI;
    checkScene(scene: SourceScene): Promise<RenderResult>;
    mountScene(scene: SourceScene): Promise<void>;
    setTheme(theme: 'light' | 'dark'): Promise<void>;
    summarizeScene(): LiveElementSummary[];
    editorSettings(): EditorSettings;
  }
}
