/**
 * Plain-text file access, as needed by `read` / `save`.
 *
 * Declared next to the other ports so the command layer depends on an
 * interface rather than on `node:fs`; the `io` module supplies the adapter.
 */
export interface FileGateway {
  readText(path: string, encoding: "utf8"): string;
  writeText(path: string, text: string, encoding: "utf8"): void;
  /** Directory that a relative path should be resolved against. */
  resolve(path: string): string;
}
