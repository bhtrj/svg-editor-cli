import { formatNumber } from "../shared/Numbers.js";

/** A 2D point in SVG user units (origin top-left, y down). */
export class Point {
  constructor(
    readonly x: number,
    readonly y: number,
  ) {}

  /** `(130,100)` — the notation `move` feedback uses. */
  get label(): string {
    return `(${formatNumber(this.x)},${formatNumber(this.y)})`;
  }

  /** `(130,100) -> (250,100)` for a line, where both endpoints matter. */
  static span(from: Point, to: Point): string {
    return `${from.label} -> ${to.label}`;
  }
}
