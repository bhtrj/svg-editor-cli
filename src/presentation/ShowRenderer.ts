import type { Shape } from "../domain/Shape.js";

/**
 * Renders `show <id>` (§5.2): a header with the parent, then one indented line
 * per attribute group (geometry, paint, type-specific extras).
 */
export class ShowRenderer {
  render(shape: Shape): readonly string[] {
    const parentLabel = shape.parent?.containerLabel ?? "svg";
    const lines: string[] = [`${shape.label}  parent=${parentLabel}`];
    for (const line of shape.details()) {
      lines.push(`  ${line}`);
    }
    if (shape.children.length > 0) {
      lines.push(`  children=${shape.children.length}`);
    }
    return lines;
  }
}
