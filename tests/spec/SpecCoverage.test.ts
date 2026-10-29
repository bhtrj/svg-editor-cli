import { readFileSync, readdirSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CommandRegistry } from "../../src/commands/CommandRegistry.js";
import { BoxProvider } from "../../src/domain/BoxProvider.js";
import { ShapeFactory } from "../../src/domain/ShapeFactory.js";

/**
 * The assignment's own tables, checked against the implementation.
 *
 * `transcripts.test.ts` proves the *sessions*; this file proves the *catalogue*:
 * §3's command list, §4.1's type parameters and §4.2's error strings are parsed
 * out of `phase_cli_1.md` and compared with what is actually registered/built.
 * Together they mean the brief cannot drift from the code without a red test —
 * and, just as importantly, that a command or error string cannot quietly go
 * missing from the implementation.
 *
 * §4.2's `error: ` prefix is added once by `EditorError.outputLine`, so the
 * source carries only the message body; the assertions below check the body
 * against `src/` and the whole line against the tests.
 */

const SPEC = readFileSync(new URL("../../phase_cli_1.md", import.meta.url), "utf8").split(/\r?\n/);
const SRC = new URL("../../src/", import.meta.url);
const TESTS = new URL("../", import.meta.url);

const strip = (text: string): string => text.replace(/`/g, "").trim();

/** Markdown table rows under the heading that contains `marker`. */
function tableRows(marker: string): string[][] {
  const start = SPEC.findIndex((line) => line.includes(marker));
  if (start < 0) {
    throw new Error(`phase_cli_1.md no longer contains a section: ${marker}`);
  }
  const rows: string[][] = [];
  for (let index = start + 1; index < SPEC.length; index += 1) {
    const line = SPEC[index] as string;
    if (line.startsWith("#") && !line.startsWith("###")) break;
    if (!line.startsWith("|")) {
      if (rows.length > 0 && line.trim() === "") break;
      continue;
    }
    if (/^\|\s*-+/.test(line)) continue;
    const cells = line
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());
    rows.push(cells);
  }
  return rows;
}

function filesUnder(directory: URL, suffix: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(directory)) {
    const path = new URL(name + (statSync(new URL(name, directory)).isDirectory() ? "/" : ""), directory);
    if (statSync(path).isDirectory()) {
      found.push(...filesUnder(path, suffix));
    } else if (name.endsWith(suffix)) {
      found.push(readFileSync(path, "utf8"));
    }
  }
  return found;
}

const SRC_TEXT = filesUnder(SRC, ".ts").join("\n");
const TEST_TEXT = filesUnder(TESTS, ".ts").join("\n");

/** §3's command rows: the cell may hold `front / back` or a single name. */
function documentedCommands(): Map<string, string> {
  const commands = new Map<string, string>();
  for (const heading of ["### 文档类", "### 图形编辑类", "### 显示类", "### 撤销重做"]) {
    for (const row of tableRows(heading)) {
      const cell = strip(row[0] ?? "");
      const syntax = strip(row[1] ?? "");
      if (cell === "命令" || cell === "") continue;
      // `front / back` documents two commands sharing one row: split the names
      // and the syntaxes the same way, so each name keeps its own grammar.
      const names = cell.split("/").map((part) => part.trim());
      const syntaxes = syntax.split("/").map((part) => part.trim());
      names.forEach((name, index) => {
        if (name === "") return;
        commands.set(name, syntaxes.length === names.length ? (syntaxes[index] as string) : syntax);
      });
    }
  }
  return commands;
}

/** Whitespace around an ellipsis is typography, not grammar. */
function normaliseGrammar(text: string): string {
  return text
    .replace(/…/g, "...")
    .replace(/\s*\.\.\.\s*/g, " ... ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("§3 command table", () => {
  it("registers every documented command", () => {
    const registered = new Map(new CommandRegistry().usages());
    const missing = [...documentedCommands().keys()].filter((name) => !registered.has(name));
    expect(missing).toEqual([]);
  });

  it("registers nothing the brief does not document", () => {
    const documented = documentedCommands();
    const extra = [...new Map(new CommandRegistry().usages()).keys()].filter(
      (name) => !documented.has(name),
    );
    expect(extra).toEqual([]);
  });

  it("documents the same number of commands as it registers", () => {
    expect(documentedCommands().size).toBe(new CommandRegistry().usages().length);
  });

  it("gives each command the syntax the brief prints", () => {
    const registered = new Map(new CommandRegistry().usages());
    const mismatched: string[] = [];
    for (const [name, syntax] of documentedCommands()) {
      const ours = registered.get(name);
      if (ours === undefined) continue;
      // Our usage string may append a parenthetical hint; compare the grammar.
      const grammar = normaliseGrammar(ours.split("  (")[0] ?? ours);
      const expected = normaliseGrammar(syntax);
      if (grammar !== expected) {
        mismatched.push(`${name}: brief "${expected}" vs ours "${grammar}"`);
      }
    }
    expect(mismatched).toEqual([]);
  });
});

describe("§4.1 create type table", () => {
  const factory = new ShapeFactory();

  it("ships exactly the six kernel types", () => {
    expect(factory.specs.map((spec) => spec.type)).toEqual([
      "rect",
      "circle",
      "ellipse",
      "line",
      "text",
      "g",
    ]);
  });

  it("takes the documented parameters, in order, with the documented optionals", () => {
    const documented = new Map<string, string>();
    for (const row of tableRows("### 4.1 create")) {
      const type = strip(row[0] ?? "");
      if (type !== "" && type !== "type") documented.set(type, strip(row[1] ?? ""));
    }
    expect([...documented.keys()]).toEqual(["rect", "circle", "ellipse", "line", "text", "g"]);

    for (const spec of factory.specs) {
      const syntax = documented.get(spec.type);
      expect(syntax, `§4.1 has no row for ${spec.type}`).toBeDefined();
      // `<x> <y> <w> <h> [fill]` -> names and which ones are bracketed.
      const tokens = (syntax as string).replace(/^create \w+ <id>\s*/u, "");
      const parts = tokens.match(/\[[^\]]+\]|<[^>]+>|"[^"]+"/gu) ?? [];
      const briefOptional = parts.filter((part) => part.startsWith("["));
      const briefRequired = parts.filter((part) => !part.startsWith("["));
      const oursRequired = spec.params.filter((param) => param.optional !== true);
      const oursOptional = spec.params.filter((param) => param.optional === true);
      expect(oursRequired.length, `${spec.type}: required count`).toBe(briefRequired.length);
      expect(oursOptional.length, `${spec.type}: optional count`).toBe(briefOptional.length);
    }
  });

  it("keeps `box` out of the default kernel (§4.4)", () => {
    expect(factory.supports("box")).toBe(false);
    expect(new ShapeFactory([new BoxProvider()]).supports("box")).toBe(true);
  });
});

describe("§4.2 error strings", () => {
  /** Every error string the brief prints, with the placeholder tail removed. */
  function documentedErrors(): string[] {
    const messages: string[] = [];
    for (const row of tableRows("### 4.2")) {
      const cell = strip(row[1] ?? "");
      for (const part of cell.split("/")) {
        const value = strip(part);
        if (value.startsWith("error:")) messages.push(value);
      }
    }
    return [...new Set(messages)];
  }

  it("finds all twelve of them", () => {
    expect(documentedErrors()).toHaveLength(12);
  });

  it("implements each one in src/ (messages are stored without the prefix)", () => {
    const missing = documentedErrors().filter((message) => {
      const body = message.replace(/^error:\s*/, "").replace(/:\s*[^:]+$/, "");
      return !SRC_TEXT.includes(body);
    });
    expect(missing).toEqual([]);
  });

  it("asserts each one in the test suite", () => {
    const missing = documentedErrors().filter((message) => {
      const line = message.replace(/:\s*[^:]+$/, ": ");
      return !TEST_TEXT.includes(line);
    });
    expect(missing).toEqual([]);
  });
});
