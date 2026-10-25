import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BoxProvider } from "../src/domain/BoxProvider.js";
import { TestEditor } from "./support/TestEditor.js";

/**
 * Golden replays of the sessions in the assignment (`phase_cli_1.md`).
 *
 * The expected output is **extracted from the brief itself** rather than copied
 * by hand, so this file cannot drift from the acceptance criterion it claims to
 * check: if the brief's transcript changes, these tests change with it.
 *
 * Two documented exceptions:
 *  - §6.1's tree is hand-aligned and internally inconsistent (two rows of the
 *    same sibling group start their summary at columns 29 and 31), so its tree is
 *    compared modulo whitespace — and that inconsistency is asserted below so the
 *    reason is recorded rather than assumed;
 *  - §6.1 version B uses `box`, which §4.4 places in the plugin phase, so it is
 *    asserted to be rejected by this phase's kernel.
 */

const SPEC = resolve(dirname(fileURLToPath(import.meta.url)), "../phase_cli_1.md");

/** One fenced block of the brief, as raw lines. */
function specBlocks(): readonly (readonly string[])[] {
  const lines = readFileSync(SPEC, "utf8").split(/\r?\n/);
  const blocks: string[][] = [];
  let current: string[] | null = null;
  for (const line of lines) {
    if (line.startsWith("```")) {
      if (current !== null) {
        blocks.push(current);
        current = null;
      } else {
        current = [];
      }
      continue;
    }
    current?.push(line);
  }
  return blocks;
}

/** The first block containing every marker, or a failure that names the markers. */
function blockWith(...markers: readonly string[]): readonly string[] {
  const block = specBlocks().find((candidate) =>
    markers.every((marker) => candidate.some((line) => line.includes(marker))),
  );
  if (block === undefined) {
    throw new Error(`phase_cli_1.md no longer contains a block with: ${markers.join(", ")}`);
  }
  return block;
}

/** The commands of a session block, in order, without the `svg> ` prompt. */
function commandsOf(block: readonly string[]): string[] {
  return block.filter((line) => line.startsWith("svg> ")).map((line) => line.slice(5));
}

/** The output lines the brief shows for those commands. */
function expectedOutput(block: readonly string[]): string[] {
  const output: string[] = [];
  let sawCommand = false;
  for (const line of block) {
    if (
      line.trim() === "" ||
      line.startsWith("$ ") ||
      line === "svg-editor 0.1 — type 'help' for commands"
    ) {
      continue;
    }
    if (line.startsWith("svg> ")) {
      sawCommand = true;
      continue;
    }
    if (line.startsWith("#") || !sawCommand) {
      continue;
    }
    output.push(line);
  }
  return output;
}

const OTHER_SVG = readFileSync(resolve(dirname(SPEC), "examples/other.svg"), "utf8");

/** A harness whose in-memory file system already holds the brief's `other.svg`. */
function editorWithOtherSvg(): TestEditor {
  const editor = new TestEditor();
  editor.files.files.set("other.svg", OTHER_SVG);
  return editor;
}

/** Collapses runs of spaces, so two hand-aligned trees compare by content. */
function withoutPadding(lines: readonly string[]): string[] {
  return lines.map((line) => line.replace(/ {2,}/g, " "));
}

/** Where each summarised row starts its summary; container rows are skipped. */
const ROW_WITH_SUMMARY = /^(?<prefix>[│ ]*(?:├── |└── ))(?<label>\S+)(?<pad> +)(?<rest>\S)/;

function summaryColumns(lines: readonly string[]): number[] {
  const columns: number[] = [];
  for (const line of lines) {
    const match = ROW_WITH_SUMMARY.exec(line);
    if (match?.groups === undefined) {
      continue;
    }
    columns.push(
      match.groups["prefix"]!.length + match.groups["label"]!.length + match.groups["pad"]!.length,
    );
  }
  return columns;
}

/** The tree lines of a session's output, starting at the root row. */
function treeLines(lines: readonly string[]): string[] {
  const start = lines.indexOf("svg (800x600)");
  return start < 0 ? [] : lines.slice(start);
}

describe("§6 session — byte-for-byte against the brief", () => {
  const block = blockWith("$ npm run cli", "svg> group markers c1 box", "svg> save demo.svg");

  it("replays every command with the documented output", () => {
    const editor = editorWithOtherSvg();
    const output = editor.runScript(commandsOf(block).join("\n"));
    expect(output).toEqual(expectedOutput(block));
  });

  it("writes the documented shape count and keeps the tree in the file", () => {
    const editor = editorWithOtherSvg();
    editor.runScript(commandsOf(block).join("\n"));
    const svg = editor.files.files.get("demo.svg") ?? "";
    expect(svg).toContain('<g id="markers">');
    expect(svg).toContain('<rect id="bg" x="0" y="0" width="800" height="600" fill="#ffffff"/>');
    expect(svg).toContain('<text id="title" x="20" y="40">My Diagram</text>');
  });
});

describe("§6 read example — covered inside the §6 session, asserted explicitly here", () => {
  const block = blockWith("svg> read other.svg", "warning: assigned id rect1 to unnamed <rect>");

  it("prints the auto-assigned id immediately before the summary line", () => {
    const editor = editorWithOtherSvg();
    const output = editor.runScript(commandsOf(block).join("\n"));
    const summary = output.indexOf("read other.svg (7 elements)");
    expect(summary).toBeGreaterThan(0);
    expect(output[summary - 1]).toBe("warning: assigned id rect1 to unnamed <rect>");
  });

  it("shows the auto-assigned id in the tree it prints", () => {
    const editor = editorWithOtherSvg();
    const output = editor.runScript(commandsOf(block).join("\n"));
    expect(output).toContain("├── rect#rect1     x=0 y=0 w=400 h=300 fill=#ffffff");
  });
});

describe("§6.1 two-node flowchart", () => {
  const block = blockWith("svg> create g flowchart", "svg> save flowchart.svg");

  it("replays every command with the documented output (tree compared modulo padding)", () => {
    const editor = new TestEditor();
    const output = editor.runScript(commandsOf(block).join("\n"));
    const expected = expectedOutput(block);

    // Everything except the tree is byte-for-byte; the tree's own block in the
    // brief mixes two columns inside one sibling group, so it is compared by
    // content and a separate test asserts our single column.
    expect(withoutPadding(treeLines(output))).toEqual(withoutPadding(treeLines(expected)));
    expect(output.slice(0, output.indexOf("svg (800x600)"))).toEqual(
      expected.slice(0, expected.indexOf("svg (800x600)")),
    );
  });

  it("builds the documented structure, modulo the brief's hand-aligned padding", () => {
    const editor = new TestEditor();
    const output = editor.runScript(commandsOf(block).join("\n"));
    expect(withoutPadding(treeLines(output))).toEqual(
      withoutPadding(treeLines(expectedOutput(block))),
    );
  });

  it("uses one summary column for the whole tree", () => {
    const editor = new TestEditor();
    const output = editor.runScript(commandsOf(block).join("\n"));
    expect(new Set(summaryColumns(treeLines(output))).size).toBe(1);
  });

  it("records that the brief's own §6.1 tree is not self-consistent", () => {
    // Two rows of one sibling group start at different columns in the brief
    // (rect#process at 29, text#process-label at 31), which is why this one tree
    // is compared modulo whitespace instead of byte-for-byte.
    expect(new Set(summaryColumns(treeLines(expectedOutput(block)))).size).toBeGreaterThan(1);
  });
});

describe("§6.1 version B (box) — out of scope for this phase by default", () => {
  const block = blockWith("svg> create box n1", "svg> save flowchart-box.svg");

  it("rejects the plugin type with the documented message", () => {
    const editor = new TestEditor();
    const output = editor.runScript(commandsOf(block).join("\n"));
    const rejections = output.filter((line) => line.startsWith("error:"));
    // The two `create box` calls open the session; every later command that
    // references n1/n2 then fails, because nothing was created.
    expect(rejections.slice(0, 2)).toEqual([
      "error: unknown shape type: box (is the plugin loaded?)",
      "error: unknown shape type: box (is the plugin loaded?)",
    ]);
    // `create line` still works (it is a kernel type); no box is ever created.
    expect(output.some((line) => line.startsWith("box#"))).toBe(false);
  });

  it("replays the whole session once `--plugin box` is loaded", () => {
    const editor = new TestEditor([new BoxProvider()]);
    editor.run("init 800 600");
    const output = editor.runScript(commandsOf(block).join("\n"));
    const expected = expectedOutput(block);

    // The commands *and* every non-tree line are byte-for-byte; the tree is
    // compared by content (the brief's own tree blocks mix several padding
    // widths, see §2.12 of doc/README.md).
    expect(output.slice(0, output.indexOf("svg (800x600)"))).toEqual(
      expected.slice(0, expected.indexOf("svg (800x600)")),
    );
    expect(withoutPadding(treeLines(output))).toEqual(withoutPadding(treeLines(expected)));
  });

  it("is rejected by default even for the box-only commands of the session", () => {
    const editor = new TestEditor();
    editor.run("init 800 600");
    expect(editor.run('create box n1 120 100 160 60 "开始"')).toEqual([
      "error: unknown shape type: box (is the plugin loaded?)",
    ]);
  });
});

describe("§4.4 composite type — the brief's own snippet, with the plugin", () => {
  const block = blockWith("svg> create box n1", "svg> tree n1");

  it("creates, prints the documented subtree and refuses ungroup", () => {
    const editor = new TestEditor([new BoxProvider()]);
    editor.run("init 800 600");
    const output = editor.runScript(commandsOf(block).join("\n"));
    const expected = expectedOutput(block);

    const treeStart = expected.indexOf("g#n1 (box)");
    expect(output.slice(0, treeStart)).toEqual(expected.slice(0, treeStart));
    expect(withoutPadding(output.slice(treeStart))).toEqual(
      withoutPadding(expected.slice(treeStart)),
    );
    expect(editor.run("ungroup n1")).toEqual(["error: cannot ungroup composite shape: n1"]);
  });
});

describe("help", () => {
  it("lists every command with its syntax", () => {
    const editor = new TestEditor();
    const output = editor.run("help").join("\n");
    for (const command of [
      "init",
      "read",
      "save",
      "canvas",
      "create",
      "delete",
      "move",
      "scale",
      "set",
      "group",
      "ungroup",
      "addto",
      "front",
      "back",
      "tree",
      "show",
      "undo",
      "redo",
    ]) {
      expect(output).toContain(command);
    }
  });
});
