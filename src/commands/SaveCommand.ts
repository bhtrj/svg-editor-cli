import { EditorError } from "../shared/EditorError.js";
import type { Arguments } from "../shared/Arguments.js";
import type { CliCommand } from "./Command.js";
import type { CommandContext } from "./CommandContext.js";

/**
 * `save [file.svg]` — encode the current document.
 *
 * With no argument the path from the last `read` is reused; without one, the
 * command has nowhere to write and fails (§3 / §4.2).
 */
export class SaveCommand implements CliCommand {
  static readonly usage = "save [file.svg]";

  private constructor(
    private readonly context: CommandContext,
    private readonly path: string | null,
  ) {}

  static fromArguments(args: Arguments, context: CommandContext): SaveCommand {
    const path = args.isEmpty ? null : args.identifier();
    args.expectEnd();
    return new SaveCommand(context, path);
  }

  execute(): readonly string[] {
    const document = this.context.requireDocument();
    const target = this.path ?? this.context.sourcePath();
    if (target === null) {
      throw new EditorError("no file path to save to");
    }

    const text = this.context.codec.encode(document);
    try {
      this.context.files.writeText(target, text, "utf8");
    } catch {
      throw new EditorError(`cannot write file: ${target}`);
    }

    this.context.setSourcePath(target);
    this.context.history.lockAfterIo(false);
    return [`saved to ${target} (${document.elementCount} elements)`];
  }
}
