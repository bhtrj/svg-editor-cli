import { EditorError } from "./EditorError.js";
import { formatNumber } from "./Numbers.js";

/**
 * Splits one REPL line into tokens.
 *
 * Two rules matter for the command grammars:
 *  - a line whose first non-space character is `#` is a comment (§2 of the
 *    assignment), while a `#` inside a line is data — `create rect r 0 0 9 9
 *    #4a90d9` must keep the colour;
 *  - double quotes group a token that contains spaces (`set t text "My v2"`)
 *    and mark it `quoted`, which is how `create ... in <container>` knows an
 *    unquoted `in` from a text argument that happens to read `"in"`.
 */
export interface Token {
  readonly text: string;
  readonly quoted: boolean;
}

const QUOTE = '"';
const ESCAPE = "\\";

export function tokenize(line: string): Token[] {
  const tokens: Token[] = [];
  let current = "";
  let currentStarted = false;
  let quoted = false;
  let inQuotes = false;

  const flush = (): void => {
    if (currentStarted) {
      tokens.push({ text: current, quoted });
    }
    current = "";
    currentStarted = false;
    quoted = false;
  };

  // A script saved by a Windows editor usually starts with a UTF-8 BOM; it is
  // not part of the first command name.
  const source = line.charCodeAt(0) === 0xfeff ? line.slice(1) : line;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index] as string;

    if (inQuotes) {
      if (char === ESCAPE && index + 1 < source.length) {
        index += 1;
        current += source[index] as string;
        continue;
      }
      if (char === QUOTE) {
        inQuotes = false;
        // A quoted section closes the token; a following space separates it.
        flush();
        continue;
      }
      current += char;
      continue;
    }

    if (char === QUOTE) {
      inQuotes = true;
      quoted = true;
      currentStarted = true;
      continue;
    }

    if (char === " " || char === "\t" || char === "\r") {
      flush();
      continue;
    }

    current += char;
    currentStarted = true;
  }

  if (inQuotes) {
    throw new EditorError("unterminated string literal");
  }

  flush();
  return tokens;
}

/** True when the line carries no command (blank line or `#` comment). */
export function isIgnorableLine(line: string): boolean {
  const trimmed = line.replace(/^\uFEFF/, "").trim();
  return trimmed === "" || trimmed.startsWith("#");
}

/** Re-joins tokens for error messages, quoting tokens that need it. */
export function describeTokens(tokens: readonly Token[]): string {
  return tokens
    .map((token) => (token.quoted || token.text.includes(" ") ? `${QUOTE}${token.text}${QUOTE}` : token.text))
    .join(" ");
}

/** Renders a number the way the CLI prints it (`130`, not `130.0`). */
export { formatNumber };
