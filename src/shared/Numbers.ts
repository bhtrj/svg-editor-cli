import { EditorError } from "./EditorError.js";

/** Largest number of decimals kept when a number is printed back to the user. */
const DISPLAY_PRECISION = 1000;

/**
 * Number formatting and parsing.
 *
 * A stateless utility class (rather than free functions): every helper that the
 * paradigm rules would otherwise see as a procedural free function lives on a
 * class named after its file.
 */
export class Numbers {
  /**
   * Formats a number for both the CLI (`tree` / success messages) and the SVG
   * writer, so that `130` never comes out as `130.0` and `1/3` stays readable.
   */
  static format(value: number): string {
    if (!Number.isFinite(value)) {
      throw new EditorError(`invalid number: ${value}`);
    }
    const rounded = Math.round(value * DISPLAY_PRECISION) / DISPLAY_PRECISION;
    return Object.is(rounded, -0) ? "0" : String(rounded);
  }

  /** Parses a CLI token into a finite number, or throws `error: invalid number: <token>`. */
  static parse(token: string): number {
    const trimmed = token.trim();
    if (trimmed === "") {
      throw new EditorError(`invalid number: ${token}`);
    }
    const value = Number(trimmed);
    if (!Number.isFinite(value)) {
      throw new EditorError(`invalid number: ${token}`);
    }
    return value;
  }

  /**
   * Parses a token that must be strictly greater than zero.
   *
   * `label` supplies the message prefix, so `scale` reads
   * `error: scale factor must be positive` (§4.2) without the command
   * hand-rolling the check.
   */
  static parsePositive(token: string, label: string): number {
    const value = Numbers.parse(token);
    if (value <= 0) {
      throw new EditorError(`${label} must be positive`);
    }
    return value;
  }
}
