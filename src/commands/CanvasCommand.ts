import { EditorError } from "../shared/EditorError.js";
import type { Arguments } from "../shared/Arguments.js";
import type { CliCommand } from "./Command.js";
import type { CommandContext } from "./CommandContext.js";

/**
 * `canvas [w] [h]` — report or change the canvas size.
 *
 * Resizing is a document command (it locks undo); reporting is a display command
 * and must not lock anything. The canvas size is deliberately outside the undo
 * memento: undo must never shrink the canvas back (see DocumentMemento).
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
