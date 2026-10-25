import { EditorError } from "../shared/EditorError.js";
import type { Shape } from "../domain/Shape.js";
import type { ShapeFactoryPort } from "../domain/ShapeFactoryPort.js";
import { SvgDocument } from "../domain/SvgDocument.js";
import type { DecodedDocument } from "../domain/DocumentCodec.js";
import type { RawSvgElement } from "./RawSvgElement.js";
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

/** The state one `decode` call threads through the tree walk. */
interface DecodeState {
  readonly factory: ShapeFactoryPort;
  readonly warnings: string[];
  readonly takenIds: Set<string>;
  readonly counters: Map<string, number>;
}

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
    const state: DecodeState = {
      factory,
      warnings: [],
      takenIds: new Set<string>(),
      counters: new Map<string, number>(),
    };

    SvgDecoder.#collectIds(raw.root, state.takenIds);

    const shapes = raw.root.map((element) => this.#toShape(element, state));

    const document = new SvgDocument(raw.width ?? 800, raw.height ?? 600);
    document.replaceChildren(shapes);
    return { document, warnings: state.warnings };
  }

  #toShape(element: RawSvgElement, state: DecodeState): Shape {
    if (!state.factory.supports(element.tag)) {
      throw new EditorError(`unknown shape type: ${element.tag} (is the plugin loaded?)`);
    }

    const id = SvgDecoder.#resolveId(element, state);
    const values = new Map<string, string>([["id", id]]);
    for (const [name, value] of element.attributes) {
      if (name !== "id" && MODELLED_ATTRIBUTES.has(name)) {
        values.set(name, value);
      }
    }
    if (element.tag === "text") {
      values.set("content", SvgDecoder.#textContentOf(element));
    }

    const shape = SvgDecoder.#build(element, values, id, state);

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
        container.insertChildAt(container.children.length, this.#toShape(child, state));
      }
    }

    return shape;
  }

  /**
   * A plugin composite is rebuilt from its `data-kind` marker (§4.4); every other
   * element is built from its tag. When no loaded plugin claims the kind the
   * marked `<g>` degrades to a plain container, structure intact.
   */
  static #build(
    element: RawSvgElement,
    values: ReadonlyMap<string, string>,
    id: string,
    state: DecodeState,
  ): Shape {
    const kind = element.attributes.get("data-kind");
    if (kind !== undefined) {
      const composite = state.factory.restoreComposite(kind, id);
      if (composite !== null) {
        return composite;
      }
    }
    return state.factory.createFromAttributes(element.tag, values);
  }

  static #collectIds(elements: readonly RawSvgElement[], into: Set<string>): void {    for (const element of elements) {
      const id = element.attributes.get("id");
      if (id !== undefined && id !== "") {
        into.add(id);
      }
      SvgDecoder.#collectIds(element.children, into);
    }
  }

  /** `rect` → `rect1`, skipping every id that already exists in the file. */
  static #resolveId(element: RawSvgElement, state: DecodeState): string {
    const existing = element.attributes.get("id");
    if (existing !== undefined && existing !== "") {
      return existing;
    }

    let counter = state.counters.get(element.tag) ?? 0;
    let candidate = "";
    do {
      counter += 1;
      candidate = `${element.tag}${counter}`;
    } while (state.takenIds.has(candidate));
    state.counters.set(element.tag, counter);
    state.takenIds.add(candidate);
    state.warnings.push(`warning: assigned id ${candidate} to unnamed <${element.tag}>`);
    return candidate;
  }

  /**
   * A `<text>` element's content is its child node; pretty-printed files indent
   * it, so a single leading/trailing newline-plus-indent block is trimmed while
   * inner whitespace is preserved.
   */
  static #textContentOf(element: RawSvgElement): string {
    return element.text.replace(/^\s*\n\s*/, "").replace(/\s*\n\s*$/, "");
  }
}
