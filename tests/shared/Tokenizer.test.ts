import { describe, expect, it } from "vitest";
import { isIgnorableLine, tokenize } from "../../src/shared/Tokenizer.js";

describe("tokenize", () => {
  it("splits on whitespace", () => {
    expect(tokenize("create rect r1 0 0 10 10").map((token) => token.text)).toEqual([
      "create",
      "rect",
      "r1",
      "0",
      "0",
      "10",
      "10",
    ]);
  });

  it("keeps quoted content together and marks it", () => {
    const tokens = tokenize('set t1 text "My Diagram"');
    expect(tokens.at(-1)).toEqual({ text: "My Diagram", quoted: true });
  });

  it("treats an inline # as data, not as a comment", () => {
    const tokens = tokenize("create rect r1 0 0 10 10 #4a90d9");
    expect(tokens.at(-1)?.text).toBe("#4a90d9");
  });

  it("keeps quotes that appear inside an unquoted token", () => {
    expect(tokenize('create text t1 0 0 "a""b"').map((token) => token.text)).toEqual([
      "create",
      "text",
      "t1",
      "0",
      "0",
      "a",
      "b",
    ]);
  });

  it("supports escaped quotes inside a quoted token", () => {
    expect(tokenize('set t text "say \\"hi\\""').at(-1)?.text).toBe('say "hi"');
  });

  it("rejects an unterminated quote", () => {
    expect(() => tokenize('create text t1 0 0 "oops')).toThrow("unterminated string literal");
  });

  it("ignores a UTF-8 BOM at the start of a script line", () => {
    expect(tokenize("\uFEFFinit 800 600")[0]?.text).toBe("init");
  });

  it("tolerates runs of spaces and tabs", () => {
    expect(tokenize("  move   r1\t5   5  ").map((token) => token.text)).toEqual([
      "move",
      "r1",
      "5",
      "5",
    ]);
  });
});

describe("isIgnorableLine", () => {
  it("treats blank lines and comments as ignorable", () => {
    expect(isIgnorableLine("")).toBe(true);
    expect(isIgnorableLine("   ")).toBe(true);
    expect(isIgnorableLine("# a comment")).toBe(true);
    expect(isIgnorableLine("  # indented comment")).toBe(true);
    expect(isIgnorableLine("\uFEFF# bom comment")).toBe(true);
  });

  it("keeps real commands", () => {
    expect(isIgnorableLine("tree")).toBe(false);
    expect(isIgnorableLine("create rect r1 0 0 1 1 #red")).toBe(false);
  });
});
