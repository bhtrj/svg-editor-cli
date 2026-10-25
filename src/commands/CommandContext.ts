import type { DocumentCodec } from "../domain/DocumentCodec.js";
import type { Shape } from "../domain/Shape.js";
import type { ShapeContainer } from "../domain/ShapeContainer.js";
import type { ShapeFactory } from "../domain/ShapeFactory.js";
import type { SvgDocument } from "../domain/SvgDocument.js";
import type { FileGateway } from "../shared/FileGateway.js";
import type { CommandHistory } from "./CommandHistory.js";
import type { CommandRegistry } from "./CommandRegistry.js";

/**
 * Everything a command may touch, as an interface owned by the command layer.
 *
 * The session (`app`) implements it; commands therefore never see `fs`, the
 * REPL, or the session class itself — only document access, the file port, the
 * codec port, the factory, the registry and the history.
 */
export interface CommandContext {
  readonly factory: ShapeFactory;
  readonly codec: DocumentCodec;
  readonly files: FileGateway;
  readonly history: CommandHistory;
  readonly registry: CommandRegistry;

  /** `null` before the first `init` / `read`. */
  document(): SvgDocument | null;

  /** @throws EditorError `no document. use 'init' or 'read' first` */
  requireDocument(): SvgDocument;

  /** @throws EditorError `no such shape: <id>` */
  shape(id: string): Shape;

  /** @throws EditorError `no such container: <id>` / `not a container: <id>` */
  container(id: string): ShapeContainer;

  /** @throws EditorError `id already exists: <id>` */
  assertIdAvailable(id: string): void;

  /** Makes `document` current (`init`, `read`). */
  installDocument(document: SvgDocument): void;

  sourcePath(): string | null;
  setSourcePath(path: string | null): void;
}
