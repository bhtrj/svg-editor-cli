import { escapeXmlAttribute, escapeXmlText } from "../shared/Xml.js";
import type { SvgElementNode } from "../domain/SvgElementNode.js";
import type { SvgDocument } from "../domain/SvgDocument.js";

/**
 * Serialises the model back to SVG text (`save`).
 *
 * The output is deliberately stable and diff-friendly (2-space indent, attribute
 * order `id` → geometry → paint): reading a file and saving it produces a
 * predictable baseline, which makes the committed example files reviewable and
 * keeps round-trip tests meaningful.
 */
export class SvgEncoder {
  encode(document: SvgDocument): string {
    const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>'];
    this.#writeElement(document.toSvgElement(), 0, lines);
    return `${lines.join("\n")}\n`;
  }

  #writeElement(element: SvgElementNode, depth: number, lines: string[]): void {
    const indent = "  ".repeat(depth);
    const attributes = Object.entries(element.attributes)
      .map(([name, value]) => ` ${name}="${escapeXmlAttribute(value)}"`)
      .join("");

    if (element.text !== undefined) {
      lines.push(`${indent}<${element.tag}${attributes}>${escapeXmlText(element.text)}</${element.tag}>`);
      return;
    }

    const children = element.children ?? [];
    if (children.length === 0) {
      lines.push(`${indent}<${element.tag}${attributes}/>`);
      return;
    }

    lines.push(`${indent}<${element.tag}${attributes}>`);
    for (const child of children) {
      this.#writeElement(child, depth + 1, lines);
    }
    lines.push(`${indent}</${element.tag}>`);
  }
}
