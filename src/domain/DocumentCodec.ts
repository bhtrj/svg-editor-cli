import type { ShapeFactoryPort } from "./ShapeFactoryPort.js";
import type { SvgDocument } from "./SvgDocument.js";

/**
 * Parsed result of decoding an SVG document: the model plus the human-readable
 * warnings the decoder produced (e.g. auto-assigned ids, see §2 and §6).
 */
export interface DecodedDocument {
  readonly document: SvgDocument;
  readonly warnings: readonly string[];
}

/**
 * The port through which the `read` / `save` commands reach a file format.
 *
 * Declared in the domain layer — and injected from `app` — so that the command
 * layer never imports the `io` module: the dependency arrow points `io → domain`,
 * never `commands → io`.
 */
export interface DocumentCodec {
  decode(text: string, factory: ShapeFactoryPort): DecodedDocument;
  encode(document: SvgDocument): string;
}
