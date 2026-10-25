import { EditorError } from "./EditorError.js";
import { Numbers } from "./Numbers.js";
import type { Token } from "./Token.js";

/**
 * Cursor over the tokens that follow a command name.
 *
 * Every accessor knows the owning command's `usage` string, so a truncated
 * command fails with a self-describing message instead of a generic one.
 */
export class Arguments {
  readonly #tokens: readonly Token[];
  readonly #usage: string;
  #cursor = 0;

  constructor(tokens: readonly Token[], usage: string) {
    this.#tokens = tokens;
    this.#usage = usage;
  }

  static forCommand(tokens: readonly Token[], usage: string): Arguments {
    return new Arguments(tokens, usage);
  }

  get usage(): string {
    return this.#usage;
  }

  get remainingCount(): number {
    return this.#tokens.length - this.#cursor;
  }

  get isEmpty(): boolean {
    return this.remainingCount === 0;
  }

  peek(offset = 0): Token | null {
    return this.#tokens[this.#cursor + offset] ?? null;
  }

  /** The not-yet-consumed tokens, without consuming them. */
  rest(): readonly Token[] {
    return this.#tokens.slice(this.#cursor);
  }

  take(): Token {
    const token = this.peek();
    if (token === null) {
      throw new EditorError(`usage: ${this.#usage}`);
    }
    this.#cursor += 1;
    return token;
  }

  /** An id or a type name. */
  identifier(): string {
    const value = this.take().text;
    if (value === "") {
      throw new EditorError(`usage: ${this.#usage}`);
    }
    return value;
  }

  number(): number {
    return Numbers.parse(this.take().text);
  }

  /** A size or radius, which the model also requires to be > 0. */
  positiveNumber(): number {
    const token = this.take().text;
    const value = Numbers.parse(token);
    if (value <= 0) {
      throw new EditorError(`value must be positive: ${token.trim()}`);
    }
    return value;
  }

  /** Free-form text (a quoted token keeps its spaces). */
  text(): string {
    return this.take().text;
  }

  expectEnd(): void {
    const extra = this.peek();
    if (extra !== null) {
      throw new EditorError(`unexpected argument: ${extra.text}`);
    }
  }
}
