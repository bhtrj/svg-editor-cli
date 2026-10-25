import { EditorError } from "../shared/EditorError.js";
import { Group } from "./Group.js";
import { Rect } from "./Rect.js";
import { Text } from "./Text.js";
import type { SvgElementNode } from "./SvgElementNode.js";

/** The parts a provider template needs. */
export interface BoxFrame {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly title: string;
  readonly fill: string | undefined;
}

/** The plugin's default plate colour, as in §4.4's example. */
const DEFAULT_FILL = "#4a90d9";

/** Left inset and half-line offset of the caption; there are no font metrics. */
const CAPTION_INSET_X = 20;
const CAPTION_INSET_Y = 5;

/**
 * `box` — the composite shape of §4.4: a titled rectangle that is *one* shape and
 * a container at the same time.
 *
 * Composite semantics come from being a `Group` subclass: `move`, `scale` and
 * `delete` already push into children, so a box needs no special handling there.
 * What it adds is the part of the contract a *plugin* owns:
 *  - its two parts (`<id>-rect`, `<id>-label`) are created by the provider
 *    template, so the caption is placed by the plugin rather than by hand;
 *  - `set` has domain meaning: `fill` propagates to the plate, `label` rewrites
 *    the caption;
 *  - the structure belongs to the provider, so `ungroup` is refused (§4.2);
 *  - it serialises as `<g data-kind="box">`, so an editor without the plugin
 *    reads the very same file as a plain container (§4.4).
 *
 * The element is still a `<g>`; the CLI reports it as `box#n1` while `tree`
 * prints `g#n1 (box)` — exactly the two notations §4.4 uses.
 */
export class Box extends Group {
  static readonly KIND = "box";

  /** The plugin's own notation for feedback lines: `box#n1`. */
  override get commandLabel(): string {
    return `box#${this.id}`;
  }

  /** The provider owns this container's structure: `ungroup` must refuse it. */
  override get isComposite(): boolean {
    return true;
  }

  override get treeLabel(): string {
    return `${this.label} (${Box.KIND})`;
  }

  static rectId(id: string): string {
    return `${id}-rect`;
  }

  static labelId(id: string): string {
    return `${id}-label`;
  }

  /** Creates the composite with its template parts (CLI `create box`). */
  static create(id: string, frame: BoxFrame): Box {
    const box = new Box(id);
    const plate = new Rect(
      Box.rectId(id),
      frame.x,
      frame.y,
      frame.width,
      frame.height,
    );
    plate.setAttribute("fill", frame.fill ?? DEFAULT_FILL);
    box.insertChildAt(0, plate);

    const caption = new Text(
      Box.labelId(id),
      frame.x + CAPTION_INSET_X,
      frame.y + frame.height / 2 + CAPTION_INSET_Y,
      frame.title,
    );
    box.insertChildAt(1, caption);
    return box;
  }

  /** Creates an empty composite for a `data-kind`-marked element (`read`). */
  static restore(id: string): Box {
    return new Box(id);
  }

  /** `box#n1 created (g#n1 + rect#n1-rect + text#n1-label)` (§4.4). */
  override creationFeedback(): string {
    return `${this.commandLabel} created (g#${this.id} + rect#${Box.rectId(this.id)} + text#${Box.labelId(this.id)})`;
  }

  override canSet(name: string): boolean {
    return name === "label" || (this.#plate()?.canSet(name) ?? false);
  }

  override setAttribute(name: string, value: string): void {
    if (name === "label") {
      this.#requireCaption().setAttribute("text", value);
      return;
    }
    const plate = this.#plate();
    if (plate !== null && plate.canSet(name)) {
      plate.setAttribute(name, value);
      return;
    }
    throw new EditorError(`unknown attribute: ${name}`);
  }

  override readAttribute(name: string): string | undefined {
    if (name === "label") {
      return this.#caption()?.readAttribute("text");
    }
    return this.#plate()?.readAttribute(name);
  }

  override setFeedback(name: string, value: string): string {
    if (name === "label") {
      return `${this.commandLabel} label updated: "${value}"`;
    }
    return `${this.commandLabel} ${name} propagated to ${Box.rectId(this.id)}`;
  }

  override setUndoFeedback(name: string, value: string): string {
    if (name === "label") {
      return `${this.commandLabel} label restored: "${value}"`;
    }
    return `${this.commandLabel} ${name} propagated to ${Box.rectId(this.id)}`;
  }

  /** The provider's marker rides on the element, so `read` can restore the type. */
  override toSvgElement(): SvgElementNode {
    const element = super.toSvgElement();
    return {
      ...element,
      attributes: { ...element.attributes, "data-kind": Box.KIND },
    };
  }

  override clone(): Box {
    const copy = new Box(this.id);
    copy.attributes.copyFrom(this.attributes);
    for (const child of this.children) {
      copy.insertChildAt(copy.children.length, child.clone());
    }
    return copy;
  }

  /** The plate part, or `null` for a composite restored without one. */
  #plate(): Rect | null {
    return (this.children.find((child) => child.typeName === "rect") as Rect | undefined) ?? null;
  }

  #caption(): Text | null {
    return (this.children.find((child) => child.typeName === "text") as Text | undefined) ?? null;
  }

  #requireCaption(): Text {
    const caption = this.#caption();
    if (caption === null) {
      throw new EditorError(`unknown attribute: label`);
    }
    return caption;
  }
}
