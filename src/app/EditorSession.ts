import { EditorError } from "../shared/EditorError.js";
import type { Shape } from "../domain/Shape.js";
import type { ShapeContainer } from "../domain/ShapeContainer.js";
import type { ShapeFactory } from "../domain/ShapeFactory.js";
import type { SvgDocument } from "../domain/SvgDocument.js";
import type { DocumentCodec } from "../domain/DocumentCodec.js";
import type { FileGateway } from "../shared/FileGateway.js";
import type { CommandContext } from "../commands/CommandContext.js";
import { CommandHistory } from "../commands/CommandHistory.js";
import type { CommandRegistry } from "../commands/CommandRegistry.js";

/** Everything the session needs, injected — no module reaches for globals. */
export interface EditorSessionOptions {
  readonly factory: ShapeFactory;
  readonly codec: DocumentCodec;
  readonly files: FileGateway;
  readonly registry: CommandRegistry;
}

/**
 * The application service: owns the current document and implements the
 * `CommandContext` the command layer depends on.
 *
 * It is the only object that knows both "which document is open" and "how ids
 * are resolved", so every command can stay a pure state transition.
 */
export class EditorSession implements CommandContext {
  readonly factory: ShapeFactory;
  readonly codec: DocumentCodec;
  readonly files: FileGateway;
  readonly history = new CommandHistory();
  readonly registry: CommandRegistry;

  #document: SvgDocument | null = null;
  #sourcePath: string | null = null;

  constructor(options: EditorSessionOptions) {
    this.factory = options.factory;
    this.codec = options.codec;
    this.files = options.files;
    this.registry = options.registry;
  }

  document(): SvgDocument | null {
    return this.#document;
  }

  requireDocument(): SvgDocument {
    if (this.#document === null) {
      throw new EditorError("no document. use 'init' or 'read' first");
    }
    return this.#document;
  }

  /** Looks a shape up by id across the whole tree. */
  shape(id: string): Shape {
    const shape = this.requireDocument().find(id);
    if (shape === null) {
      throw new EditorError(`no such shape: ${id}`);
    }
    return shape;
  }

  /**
   * Resolves the target of `in <containerId>` / `addto`.
   * Distinguishes "missing" from "exists but is a leaf", per §4.2.
   */
  container(id: string): ShapeContainer {
    const shape = this.requireDocument().find(id);
    if (shape === null) {
      throw new EditorError(`no such container: ${id}`);
    }
    const container = shape.asContainer();
    if (container === null) {
      throw new EditorError(`not a container: ${id}`);
    }
    return container;
  }

  assertIdAvailable(id: string): void {
    const document = this.requireDocument();
    if (document.find(id) !== null) {
      throw new EditorError(`id already exists: ${id}`);
    }
  }

  installDocument(document: SvgDocument): void {
    this.#document = document;
  }

  sourcePath(): string | null {
    return this.#sourcePath;
  }

  setSourcePath(path: string | null): void {
    this.#sourcePath = path;
  }
}
