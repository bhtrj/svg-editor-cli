import type { RawSvgElement } from "./RawSvgElement.js";

/** The parsed file: canvas size (from `width`/`height`, falling back to `viewBox`). */
export interface RawSvgDocument {
  readonly width: number | null;
  readonly height: number | null;
  readonly root: readonly RawSvgElement[];
}
