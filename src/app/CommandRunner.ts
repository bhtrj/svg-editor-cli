import { Tokenizer } from "../shared/Tokenizer.js";
import type { CliCommand, UndoableCommand } from "../commands/Command.js";
import type { CommandContext } from "../commands/CommandContext.js";

/**
 * The use-case layer for "one line of input".
 *
 * It is the only place that knows the cross-cutting rules of §4.3:
 *  - blank lines and `#` comments produce no output;
 *  - an edit command is recorded in the history exactly once, *after* it
 *    succeeded — a failed command must never become undoable;
 *  - document commands lock the history, which those commands declare
 *    themselves (`history.lockAfterIo`) rather than being guessed from names.
 *
 * Errors propagate as `EditorError`; turning them into `error: …` lines is the
 * CLI's job, which keeps this layer free of presentation concerns.
 */
export class CommandRunner {
  constructor(private readonly context: CommandContext) {}

  /** @returns the lines the command wants printed (never `error:` lines). */
  run(line: string): readonly string[] {
    if (Tokenizer.isIgnorableLine(line)) {
      return [];
    }

    const tokens = Tokenizer.tokenize(line);
    const name = tokens[0]?.text ?? "";
    const command = this.context.registry.build(name, tokens.slice(1), this.context);
    const lines = command.execute();

    if (CommandRunner.isUndoable(command)) {
      this.context.history.record(command);
    }
    return lines;
  }

  /** True when the command is undoable (structural test, not a name check). */
  private static isUndoable(command: CliCommand): command is UndoableCommand {
    const candidate = command as Partial<UndoableCommand>;
    return typeof candidate.undo === "function" && typeof candidate.redo === "function";
  }
}
