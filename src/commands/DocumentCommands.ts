import { EditorError } from "../shared/EditorError.js";
import type { Arguments } from "../shared/Arguments.js";
import { SvgDocument } from "../domain/SvgDocument.js";
import type { CliCommand } from "./Command.js";
import type { CommandContext } from "./CommandContext.js";

/**
 * `init [w] [h]` — start a new empty document (§3, document commands).
 *
 * Document commands are *not* undoable: after one runs, the history is locked
 * until the next edit command (§4.3).
 */
export class InitCommand implements CliCommand {
  static readonly usage = "init [w] [h]";

  private constructor(
    private readonly context: CommandContext,
    private readonly width: number | null,
    private readonly height: number | null,
  ) {}

  static fromArguments(args: Arguments, context: CommandContext): InitCommand {
    const width = args.isEmpty ? null : args.number();
    const height = args.isEmpty ? null : args.number();
    args.expectEnd();
    return new InitCommand(context, width, height);
  }

  execute(): readonly string[] {
    const document = new SvgDocument(this.width ?? 800, this.height ?? 600);
    this.context.installDocument(document);
    this.context.setSourcePath(null);
    this.context.history.lockAfterIo(true);
    return [`canvas ${document.width}x${document.height} created`];
  }
}

/**
 * `canvas [w] [h]` — report or change the canvas size.
 *
 * Resizing is a document command (it locks undo); reporting is a display command
 * and must not lock anything.
 */
export class CanvasCommand implements CliCommand {
  static readonly usage = "canvas [w] [h]";

  private constructor(
    private readonly context: CommandContext,
    private readonly width: number | null,
    private readonly height: number | null,
  ) {}

  static fromArguments(args: Arguments, context: CommandContext): CanvasCommand {
    const width = args.isEmpty ? null : args.number();
    const height = args.isEmpty ? null : args.number();
    args.expectEnd();
    if ((width === null) !== (height === null)) {
      throw new EditorError(`usage: ${CanvasCommand.usage}`);
    }
    return new CanvasCommand(context, width, height);
  }

  execute(): readonly string[] {
    const document = this.context.requireDocument();
    if (this.width !== null && this.height !== null) {
      document.resize(this.width, this.height);
      this.context.history.lockAfterIo(false);
      return [`canvas ${document.width}x${document.height} resized`];
    }
    return [`canvas ${document.width}x${document.height}`];
  }
}
