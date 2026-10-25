import { XMLParser } from "fast-xml-parser";
import { EditorError } from "../shared/EditorError.js";
import type { RawSvgDocument } from "./RawSvgDocument.js";
import type { RawSvgElement } from "./RawSvgElement.js";

/** A node of the `preserveOrder` parse tree. */
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

    const root = (parsed as Node[]).find((node) => SvgXmlReader.#elementTag(node) === "svg");
    if (root === undefined) {
      throw new EditorError("invalid svg: missing <svg> root element");
    }

    const attributes = SvgXmlReader.#readAttributes(root);
    return {
      width: SvgXmlReader.#fromWidthOrViewBox(attributes.get("width"), attributes.get("viewBox"), 2),
      height: SvgXmlReader.#fromWidthOrViewBox(attributes.get("height"), attributes.get("viewBox"), 3),
      root: SvgXmlReader.#elementChildren(root),
    };
  }

  static #elementChildren(node: Node): RawSvgElement[] {
    return SvgXmlReader.#childrenOf(node)
      .filter((child) => SvgXmlReader.#elementTag(child) !== "")
      .map((child) => SvgXmlReader.#toElement(child));
  }

  static #toElement(node: Node): RawSvgElement {
    return {
      tag: SvgXmlReader.#elementTag(node),
      attributes: SvgXmlReader.#readAttributes(node),
      text: SvgXmlReader.#textOf(node),
      children: SvgXmlReader.#elementChildren(node),
    };
  }

  /** `""` for text/comment nodes, otherwise the single element key. */
  static #elementTag(node: Node): string {
    for (const key of Object.keys(node)) {
      if (key !== ":@" && key !== "#text") {
        return key;
      }
    }
    return "";
  }

  static #childrenOf(node: Node): Node[] {
    const value = node[SvgXmlReader.#elementTag(node)];
    return Array.isArray(value) ? (value as Node[]) : [];
  }

  static #readAttributes(node: Node): Map<string, string> {
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

  static #textOf(node: Node): string {
    const chunks: string[] = [];
    for (const child of SvgXmlReader.#childrenOf(node)) {
      const text = child["#text"];
      if (typeof text === "string") {
        chunks.push(text);
      }
    }
    return chunks.join("");
  }

  /** `width` when present, otherwise the `index`-th component of `viewBox`. */
  static #fromWidthOrViewBox(
    size: string | undefined,
    viewBox: string | undefined,
    index: number,
  ): number | null {
    return SvgXmlReader.#numericOrNull(size) ?? SvgXmlReader.#viewBoxPart(viewBox, index);
  }

  static #numericOrNull(value: string | undefined): number | null {
    if (value === undefined) {
      return null;
    }
    const numeric = Number.parseFloat(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  static #viewBoxPart(value: string | undefined, index: number): number | null {
    if (value === undefined) {
      return null;
    }
    const parts = value.trim().split(/[\s,]+/);
    return SvgXmlReader.#numericOrNull(parts[index]);
  }
}
