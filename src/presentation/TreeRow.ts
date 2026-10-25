/** One rendered tree row: the prefix, the label and the inline summary. */
export class TreeRow {
  constructor(
    readonly prefix: string,
    readonly label: string,
    readonly summary: string,
  ) {}

  format(labelWidth: number): string {
    if (this.summary === "") {
      return `${this.prefix}${this.label}`;
    }
    return `${this.prefix}${this.label.padEnd(labelWidth)}  ${this.summary}`;
  }
}
