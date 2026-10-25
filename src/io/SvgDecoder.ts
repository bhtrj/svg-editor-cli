import { EditorError } from "../shared/EditorError.js";
import type { Shape } from "../domain/Shape.js";
import type { ShapeFactoryPort } from "../domain/ShapeFactoryPort.js";
import { SvgDocument } from "../domain/SvgDocument.js";
import type { DecodedDocument } from "../domain/DocumentCodec.js";
import type { RawSvgElement } from "./SvgXmlReader.js";
import { SvgXmlReader } from "./SvgXmlReader.js";

/** Attributes the kernel models through geometry cells — never kept as extras. */
const MODELLED_ATTRIBUTES = new Set([
  "id",
  "x",
  "y",
  "width",
  "height",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x1",
  "y1",
  "x2",
  "y2",
]);

/** Elements that carry metadata rather than drawing content. */
const SKIPPED_ELEMENTS = new Set(["title", "desc", "defs", "metadata"]);

/**
 * Turns an SVG file into the domain model (`read`).
 *
 * Three responsibilities beyond parsing:
 *  - **id completion** (§2): an element without `id` gets `<tag><n>` and produces
 *    a warning, so an imported drawing stays addressable from the CLI;
 *  - **attribute preservation**: attributes the kernel does not model
 *    (`opacity`, `transform`, `data-*`) ride along on the shape's `AttributeBag`,
 *    so `read` → `save` does not quietly drop them;
 *  - **text content**: the child text node of `<text>` becomes the shape's
 *    `text` attribute, the same one `set` writes.
 */
export class SvgDecoder {
  readonly #reader = new SvgXmlReader();

  decode(text: string, factory: ShapeFactoryPort): DecodedDocument {
    const raw = this.#reader.parse(text);
    const warnings: string[] = [];
    const takenIds = new Set<string>();
    const counters = new Map<string, number>();

    collectIds(raw.root, takenIds);

    const shapes = raw.root.map((element) =>
      this.#toShape(element, factory, warnings, takenIds, counters),
    );

    const document = new SvgDocument(raw.width ?? 800, raw.height ?? 600);
    document.replaceChildren(shapes);
    return { document, warnings };
  }

  #toShape(
    element: RawSvgElement,
    factory: ShapeFactoryPort,
    warnings: string[],
    takenIds: Set<string>,
    counters: Map<string, number>,
  ): Shape {
    if (!factory.supports(element.tag)) {
      throw new EditorError(`unknown shape type: ${element.tag} (is the plugin loaded?)`);
    }

    const id = resolveId(element, warnings, takenIds, counters);
    const values = new Map<string, string>([["id", id]]);
    for (const [name, value] of element.attributes) {
      if (name !== "id" && MODELLED_ATTRIBUTES.has(name)) {
        values.set(name, value);
      }
    }
    if (element.tag === "text") {
      values.set("content", textContentOf(element));
    }

    const shape = factory.createFromAttributes(element.tag, values);

    for (const [name, value] of element.attributes) {
      if (!MODELLED_ATTRIBUTES.has(name)) {
        shape.attributes.set(name, value);
      }
    }

    const container = shape.asContainer();
    if (container !== null) {
      for (const child of element.children) {
        if (SKIPPED_ELEMENTS.has(child.tag)) {
          continue;
        }
        container.insertChildAt(
          container.children.length,
          this.#toShape(child, factory, warnings, takenIds, counters),
        );
      }
    }

    return shape;
  }
}

function collectIds(elements: readonly RawSvgElement[], into: Set<string>): void {
  for (const element of elements) {
    const id = element.attributes.get("id");
    if (id !== undefined && id !== "") {
      into.add(id);
    }
    collectIds(element.children, into);
  }
}

/** `rect` → `rect1`, skipping every id that already exists in the file. */
function resolveId(
  element: RawSvgElement,
  warnings: string[],
  takenIds: Set<string>,
  counters: Map<string, number>,
): string {
  const existing = element.attributes.get("id");
  if (existing !== undefined && existing !== "") {
    return existing;
  }

  let counter = counters.get(element.tag) ?? 0;
  let candidate = "";
  do {
    counter += 1;
    candidate = `${element.tag}${counter}`;
  } while (takenIds.has(candidate));
  counters.set(element.tag, counter);
  takenIds.add(candidate);
  warnings.push(`warning: assigned id ${candidate} to unnamed <${element.tag}>`);
  return candidate;
}

/**
 * A `<text>` element's content is its child node; pretty-printed files indent it,
 * so a single leading/trailing newline-plus-indent block is trimmed while inner
 * whitespace is preserved.
 */
function textContentOf(element: RawSvgElement): string {
  return element.text.replace(/^\s*\n\s*/, "").replace(/\s*\n\s*$/, "");
}
