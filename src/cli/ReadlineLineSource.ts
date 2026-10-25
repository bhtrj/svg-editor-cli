import { createInterface } from "node:readline";
import type { LineSource } from "./LineSource.js";

/**
 * `readline` over a real terminal (or a pipe) — the CLI's `LineSource`.
 *
 * `node:readline` appears in exactly this file, so the domain and the command
 * layer stay free of the terminal.
 */
export class ReadlineLineSource implements LineSource {
  readonly #terminal: ReturnType<typeof createInterface>;

  constructor(input: NodeJS.ReadableStream, output: NodeJS.WritableStream, prompt: string) {
    this.#terminal = createInterface({
      input,
      output,
      terminal: process.stdin.isTTY === true,
    });
    this.#terminal.setPrompt(prompt);
  }

  prompt(): void {
    this.#terminal.prompt();
  }

  lines(): AsyncIterable<string> {
    return this.#terminal;
  }
}
