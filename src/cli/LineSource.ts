/**
 * The line-oriented terminal the REPL drives.
 *
 * An interface rather than a direct `readline` dependency, for one concrete
 * reason: it makes the *interactive* loop testable. `ReadlineLineSource` is the
 * real terminal; a stub drives the same loop in tests, with no pseudo-terminal.
 */
export interface LineSource {
  /** Shows the prompt for the next line. */
  prompt(): void;
  /** The entered lines; the sequence ends when the terminal closes. */
  lines(): AsyncIterable<string>;
}
