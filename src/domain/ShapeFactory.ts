import { EditorError } from "../shared/EditorError.js";
import { Circle } from "./Circle.js";
import { Ellipse } from "./Ellipse.js";
import { Group } from "./Group.js";
import { Line } from "./Line.js";
import { Rect } from "./Rect.js";
import type { Shape } from "./Shape.js";
import type { ShapeFactoryPort } from "./ShapeFactoryPort.js";
import type { ShapeTypeSpec } from "./ShapeTypeSpec.js";
import { Text } from "./Text.js";

/**
 * The single place where an SVG tag / CLI type name is turned into a class —
 * one of the two name-based dispatches the assignment explicitly allows, and
 * therefore flagged for refactoring into a plugin registry (see doc/README.md,
 * "设计模式" and "变化点假设").
 *
 * Everything else (commands, reader, renderer) talks to shapes through `Shape`.
 */
export class ShapeFactory implements ShapeFactoryPort {
  static readonly SPECS: readonly ShapeTypeSpec[] = [
    {
      type: "rect",
      params: [
        { name: "x", kind: "number" },
        { name: "y", kind: "number" },
        { name: "width", kind: "positive" },
        { name: "height", kind: "positive" },
        { name: "fill", kind: "paint", optional: true },
      ],
    },
    {
      type: "circle",
      params: [
        { name: "cx", kind: "number" },
        { name: "cy", kind: "number" },
        { name: "r", kind: "positive" },
        { name: "fill", kind: "paint", optional: true },
      ],
    },
    {
      type: "ellipse",
      params: [
        { name: "cx", kind: "number" },
        { name: "cy", kind: "number" },
        { name: "rx", kind: "positive" },
        { name: "ry", kind: "positive" },
        { name: "fill", kind: "paint", optional: true },
      ],
    },
    {
      type: "line",
      params: [
        { name: "x1", kind: "number" },
        { name: "y1", kind: "number" },
        { name: "x2", kind: "number" },
        { name: "y2", kind: "number" },
        { name: "stroke", kind: "paint", optional: true },
      ],
    },
    {
      type: "text",
      params: [
        { name: "x", kind: "number" },
        { name: "y", kind: "number" },
        { name: "content", kind: "text" },
      ],
    },
    { type: "g", params: [] },
  ];

  readonly #specs = new Map<string, ShapeTypeSpec>(
    ShapeFactory.SPECS.map((spec) => [spec.type, spec]),
  );

  /** The spec for a CLI type name, or `null` when the type is not registered. */
  spec(type: string): ShapeTypeSpec | null {
    return this.#specs.get(type) ?? null;
  }

  /** All registered specs, for `help`. */
  get specs(): readonly ShapeTypeSpec[] {
    return ShapeFactory.SPECS;
  }

  /** Lua-style type name validation, shared by `create` and the reader. */
  supports(tag: string): boolean {
    return this.#specs.has(tag);
  }

  /**
   * Builds a shape from already-validated CLI values.
   * @throws EditorError for an unregistered type.
   */
  create(type: string, values: ReadonlyMap<string, string>): Shape {
    const id = values.get("id") ?? "";
    switch (type) {
      case "rect": {
        const shape = new Rect(
          id,
          this.num(type, values, "x"),
          this.num(type, values, "y"),
          this.num(type, values, "width"),
          this.num(type, values, "height"),
        );
        this.applyPaint(shape, values, "fill");
        return shape;
      }
      case "circle": {
        const shape = new Circle(
          id,
          this.num(type, values, "cx"),
          this.num(type, values, "cy"),
          this.num(type, values, "r"),
        );
        this.applyPaint(shape, values, "fill");
        return shape;
      }
      case "ellipse": {
        const shape = new Ellipse(
          id,
          this.num(type, values, "cx"),
          this.num(type, values, "cy"),
          this.num(type, values, "rx"),
          this.num(type, values, "ry"),
        );
        this.applyPaint(shape, values, "fill");
        return shape;
      }
      case "line": {
        const shape = new Line(
          id,
          this.num(type, values, "x1"),
          this.num(type, values, "y1"),
          this.num(type, values, "x2"),
          this.num(type, values, "y2"),
        );
        this.applyPaint(shape, values, "stroke");
        return shape;
      }
      case "text":
        return new Text(
          id,
          this.num(type, values, "x"),
          this.num(type, values, "y"),
          values.get("content") ?? "",
        );
      case "g":
        return new Group(id);
      default:
        throw new EditorError(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
  }

  /**
   * Builds a shape from the attributes of an SVG element (`read`).
   * Unknown attributes are kept as-is by the reader, not swallowed here.
   */
  createFromAttributes(tag: string, attributes: ReadonlyMap<string, string>): Shape {
    return this.create(tag, attributes);
  }

  private num(
    type: string,
    values: ReadonlyMap<string, string>,
    name: string,
  ): number {
    const raw = values.get(name);
    if (raw === undefined) {
      throw new EditorError(`missing attribute: ${name} (in <${type}>)`);
    }
    const value = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(value)) {
      throw new EditorError(`invalid number: ${raw}`);
    }
    return value;
  }

  private applyPaint(shape: Shape, values: ReadonlyMap<string, string>, name: string): void {
    const value = values.get(name);
    if (value !== undefined) {
      shape.attributes.set(name, value);
    }
  }
}
