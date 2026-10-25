/** One element of a parsed SVG file, in document order. */
export interface RawSvgElement {
  readonly tag: string;
  readonly attributes: ReadonlyMap<string, string>;
  readonly text: string;
  readonly children: readonly RawSvgElement[];
}
