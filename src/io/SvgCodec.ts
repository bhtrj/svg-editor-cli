import type { DecodedDocument, DocumentCodec } from "../domain/DocumentCodec.js";
import type { ShapeFactoryPort } from "../domain/ShapeFactoryPort.js";
import type { SvgDocument } from "../domain/SvgDocument.js";
import { SvgDecoder } from "./SvgDecoder.js";
import { SvgEncoder } from "./SvgEncoder.js";

/**
 * Adapter that presents the reader/writer pair as the domain's `DocumentCodec`
 * port. Composing them behind one object keeps the command layer's dependency to
 * a single interface, and lets a future JSON (or another) format be swapped in
 * without touching `read` / `save`.
 */
export class SvgCodec implements DocumentCodec {
  readonly #decoder = new SvgDecoder();
  readonly #encoder = new SvgEncoder();

  decode(text: string, factory: ShapeFactoryPort): DecodedDocument {
    return this.#decoder.decode(text, factory);
  }

  encode(document: SvgDocument): string {
    return this.#encoder.encode(document);
  }
}
