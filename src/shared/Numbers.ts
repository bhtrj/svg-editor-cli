import { EditorError } from "./EditorError.js";

/** Largest number of decimals kept when a number is printed back to the user. */
const DISPLAY_PRECISION = 1000;

/**
 * Formats a number for both the CLI (`tree` / success messages) and the SVG
 * writer, so that `130` never comes out as `130.0` and `1/3` stays readable.
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new EditorError(`invalid number: ${value}`);
  }
  const rounded = Math.round(value * DISPLAY_PRECISION) / DISPLAY_PRECISION;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

/** Parses a CLI token into a finite number, or throws `error: invalid number: <token>`. */
export function parseNumber(token: string): number {
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

/** Parses a token that must be strictly greater than zero (sizes, radii, scale factor). */
export function parsePositiveNumber(token: string, label: string): number {
  const value = parseNumber(token);
  if (value <= 0) {
    throw new EditorError(`${label} must be positive`);
  }
  return value;
}
