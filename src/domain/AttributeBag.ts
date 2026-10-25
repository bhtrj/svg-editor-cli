/**
 * Non-geometric attributes of a shape (`fill`, `stroke`, `stroke-width`, plus
 * anything read from a foreign file that the kernel does not model).
 *
 * Insertion order is preserved so a `read` → `save` round-trip keeps the
 * author's attribute order; the well-known paint attributes are always printed
 * first, in their canonical order.
 */
export class AttributeBag {
  static readonly PAINT_ORDER = ["fill", "stroke", "stroke-width"] as const;

  readonly #values = new Map<string, string>();

  has(name: string): boolean {
    return this.#values.has(name);
  }

  get(name: string): string | undefined {
    return this.#values.get(name);
  }

  set(name: string, value: string): void {
    this.#values.set(name, value);
  }

  remove(name: string): void {
    this.#values.delete(name);
  }

  copyFrom(other: AttributeBag): void {
    for (const [name, value] of other.entries()) {
      this.#values.set(name, value);
    }
  }

  /** Paint first (canonical order), then everything else in insertion order. */
  entries(): ReadonlyArray<readonly [string, string]> {
    const ordered: Array<readonly [string, string]> = [];
    for (const name of AttributeBag.PAINT_ORDER) {
      const value = this.#values.get(name);
      if (value !== undefined) {
        ordered.push([name, value]);
      }
    }
    for (const [name, value] of this.#values) {
      if (!(AttributeBag.PAINT_ORDER as readonly string[]).includes(name)) {
        ordered.push([name, value]);
      }
    }
    return ordered;
  }

  get size(): number {
    return this.#values.size;
  }
}
