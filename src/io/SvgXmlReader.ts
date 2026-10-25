import { XMLParser } from "fast-xml-parser";
import { EditorError } from "../shared/EditorError.js";

/** One element of a parsed SVG file, in document order. */
export interface RawSvgElement {
  readonly tag: string;
  readonly attributes: ReadonlyMap<string, string>;
  readonly text: string;
  readonly children: readonly RawSvgElement[];
}

/** The parsed file: canvas size (from `width`/`height`, falling back to `viewBox`). */
export interface RawSvgDocument {
  readonly width: number | null;
  readonly height: number | null;
  readonly root: readonly RawSvgElement[];
}

type Node = Record<string, unknown>;

/**
 * Parses an SVG file into a neutral, order-preserving tree — the only place in
 * the project that knows about an XML library.
 *
 * `preserveOrder` is mandatory: an object-shaped parse loses sibling order,
 * which would silently rewrite the z-order of every file we read and save.
 */
export class SvgXmlReader {
  readonly #parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    parseAttributeValue: false,
    parseTagValue: false,
    trimValues: true,
    ignoreDeclaration: true,
    ignorePiTags: true,
    preserveOrder: true,
    commentPropName: "#comment",
    allowBooleanAttributes: true,
  });

  /** @throws EditorError when the text is not well-formed or not an `<svg>`. */
  parse(text: string): RawSvgDocument {
    let parsed: unknown;
    try {
      parsed = this.#parser.parse(text);
    } catch (error) {
      throw new EditorError(`invalid svg: ${(error as Error).message}`);
    }
    if (!Array.isArray(parsed)) {
      throw new EditorError("invalid svg: no root element");
    }

    const root = (parsed as Node[]).find((node) => elementTag(node) === "svg");
    if (root === undefined) {
      throw new EditorError("invalid svg: missing <svg> root element");
    }

    const attributes = readAttributes(root);
    const width = numericOrNull(attributes.get("width")) ?? viewBoxPart(attributes.get("viewBox"), 2);
    const height = numericOrNull(attributes.get("height")) ?? viewBoxPart(attributes.get("viewBox"), 3);

    return {
      width,
      height,
      root: childrenOf(root)
        .filter((child) => elementTag(child) !== "")
        .map((child) => toElement(child)),
    };
  }
}

function toElement(node: Node): RawSvgElement {
  return {
    tag: elementTag(node),
    attributes: readAttributes(node),
    text: textOf(node),
    children: childrenOf(node)
      .filter((child) => elementTag(child) !== "")
      .map((child) => toElement(child)),
  };
}

/** `""` for text/comment nodes, otherwise the single element key. */
function elementTag(node: Node): string {
  for (const key of Object.keys(node)) {
    if (key !== ":@" && key !== "#text") {
      return key;
    }
  }
  return "";
}

function childrenOf(node: Node): Node[] {
  const value = node[elementTag(node)];
  return Array.isArray(value) ? (value as Node[]) : [];
}

function readAttributes(node: Node): Map<string, string> {
  const attributes = new Map<string, string>();
  const raw = node[":@"];
  if (typeof raw !== "object" || raw === null) {
    return attributes;
  }
  for (const [name, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" || typeof value === "number") {
      attributes.set(name, String(value));
    }
  }
  return attributes;
}

function textOf(node: Node): string {
  const chunks: string[] = [];
  for (const child of childrenOf(node)) {
    const text = child["#text"];
    if (typeof text === "string") {
      chunks.push(text);
    }
  }
  return chunks.join("");
}

function numericOrNull(value: string | undefined): number | null {
  if (value === undefined) {
    return null;
  }
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function viewBoxPart(value: string | undefined, index: number): number | null {
  if (value === undefined) {
    return null;
  }
  const parts = value.trim().split(/[\s,]+/);
  return numericOrNull(parts[index]);
}
