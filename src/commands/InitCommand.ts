import type { Arguments } from "../shared/Arguments.js";
import { SvgDocument } from "../domain/SvgDocument.js";
import type { CliCommand } from "./Command.js";
import type { CommandContext } from "./CommandContext.js";

/**
 * `init [w] [h]` — start a new empty document (§3, document commands).
 *
 * Document commands are *not* undoable: after one runs, the history is locked
 * until the next edit command (§4.3). `init` also discards the stacks, since the
 * old history describes a document that no longer exists.
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
