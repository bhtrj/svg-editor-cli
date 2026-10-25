import { Numbers } from "../shared/Numbers.js";
import { Box } from "./Box.js";
import type { Shape } from "./Shape.js";
import type { ShapeProvider } from "./ShapeProvider.js";
import type { ShapeTypeSpec } from "./ShapeTypeSpec.js";

/**
 * The `box` plugin of §4.4 — the first (and, in this phase, only) `ShapeProvider`.
 *
 * It is built by the composition root **only when `--plugin box` is passed**, so
 * the default CLI stays exactly as §3/§4.4 require: `create box` reports
 * `unknown shape type` and the kernel ships six types. With the plugin loaded, the
 * whole §4.4 contract is live, including `ungroup n1` →
 * `error: cannot ungroup composite shape: n1`.
 */
export class BoxProvider implements ShapeProvider {
  readonly typeName = "box";
  readonly kind = Box.KIND;

  readonly spec: ShapeTypeSpec = {
    type: "box",
    params: [
      { name: "x", kind: "number" },
      { name: "y", kind: "number" },
      { name: "width", kind: "positive" },
      { name: "height", kind: "positive" },
      { name: "title", kind: "text" },
      { name: "fill", kind: "paint", optional: true },
    ],
  };

  create(id: string, values: ReadonlyMap<string, string>): Shape {
    return Box.create(id, {
      x: Numbers.require(values, "x", this.typeName),
      y: Numbers.require(values, "y", this.typeName),
      width: Numbers.require(values, "width", this.typeName),
      height: Numbers.require(values, "height", this.typeName),
      title: values.get("title") ?? "",
      fill: values.get("fill"),
    });
  }

  restore(id: string): Shape {
    return Box.restore(id);
  }
}
