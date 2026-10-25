/**
 * The single error type that crosses layer boundaries.
 *
 * Layer rule: domain / commands / io / app may only throw `EditorError`.
 * The CLI shell is the only place that knows how to prefix an error line
 * (`error: ...`, see §4.2 of the assignment).
 */
export class EditorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EditorError";
  }

  get outputLine(): string {
    return `error: ${this.message}`;
  }
}
