import { EditorError } from "../shared/EditorError.js";
import type { CommandRunner } from "../app/CommandRunner.js";
import type { LineSource } from "./LineSource.js";

/**
 * The REPL: reads one line, prints what the command produced, repeats.
 *
 * It owns exactly three things — the prompt, the banner, and the translation of
 * `EditorError` into `error: …` lines. Every other decision (parsing, dispatch,
 * undo bookkeeping) belongs to the layers underneath.
 */
export class Repl {
  /** Written once at start-up, before the first prompt (§6). */
  static readonly BANNER = "svg-editor 0.1 — type 'help' for commands";

  constructor(
    private readonly runner: CommandRunner,
    private readonly write: (line: string) => void,
  ) {}

  runLine(line: string): readonly string[] {
    try {
      return this.runner.run(line);
    } catch (error) {
      if (error instanceof EditorError) {
        return [error.outputLine];
      }
      throw error;
    }
  }

  /** Interactive mode; resolves when the line source ends (Ctrl+D / Ctrl+Z). */
  async start(source: LineSource): Promise<void> {
    this.write(Repl.BANNER);
    this.write("");

    source.prompt();
    for await (const line of source.lines()) {
      for (const outputLine of this.runLine(line)) {
        this.write(outputLine);
      }
      source.prompt();
    }
  }

  /** Non-interactive replay of a script, used by tests and by `--script`. */
  replay(script: string): readonly string[] {
    const lines: string[] = [];
    for (const line of script.split(/\r?\n/)) {
      lines.push(...this.runLine(line));
    }
    return lines;
  }
}
