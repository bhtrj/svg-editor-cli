/** One rendered tree row: the prefix, the label and the inline summary. */
export class TreeRow {
  constructor(
    readonly prefix: string,
    readonly label: string,
    readonly summary: string,
  ) {}

  /**
   * Pads the label so the summary starts at `column`.
   *
   * At least one space is always used: a label long enough to reach past the
   * column gets a single separator rather than colliding with its summary.
   */
  format(column: number): string {
    if (this.summary === "") {
      return `${this.prefix}${this.label}`;
    }
    const padding = Math.max(1, column - this.prefix.length - this.label.length);
    return `${this.prefix}${this.label}${" ".repeat(padding)}${this.summary}`;
  }
}
