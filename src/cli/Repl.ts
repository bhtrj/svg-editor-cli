import { createInterface } from "node:readline";
import { EditorError } from "../shared/EditorError.js";
import type { CommandRunner } from "../app/CommandRunner.js";

/** Written once at start-up, before the first prompt (§6). */
export const BANNER = "svg-editor 0.1 — type 'help' for commands";

/**
 * The REPL: reads one line, prints what the command produced, repeats.
 *
 * It owns exactly three things — the prompt, the banner, and the translation of
 * `EditorError` into `error: …` lines. Every other decision (parsing, dispatch,
 * undo bookkeeping) belongs to the layers underneath.
 */
export class Repl {
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

  /** Interactive mode; resolves when stdin closes (Ctrl+D / Ctrl+Z). */
  async start(input: NodeJS.ReadableStream, output: NodeJS.WritableStream, prompt = "svg> "): Promise<void> {
    const rl = createInterface({ input, output, terminal: process.stdin.isTTY === true });
    this.write(BANNER);
    this.write("");

    rl.setPrompt(prompt);
    rl.prompt();
    for await (const line of rl) {
      for (const outputLine of this.runLine(line)) {
        this.write(outputLine);
      }
      rl.prompt();
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
