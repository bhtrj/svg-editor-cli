import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BoxProvider } from "../../src/domain/BoxProvider.js";
import { TestEditor, editorWithCanvas } from "../support/TestEditor.js";

const SPEC = resolve(dirname(fileURLToPath(import.meta.url)), "../../phase_cli_1.md");

/** An editor with the plugin loaded and a canvas ready (§4.4 assumes one). */
function boxEditor(): TestEditor {
  return editorWithCanvas(800, 600, [new BoxProvider()]);
}

/**
 * Collapses padding, so a tree assertion is about *content* rather than about the
 * column width. The exact padding has its own guard in the transcript tests (§6
 * and the `read` example are matched byte-for-byte) and in the §4.4 `tree n1` case.
 */
function treeContent(lines: readonly string[]): string[] {
  return lines.map((line) => line.replace(/ {2,}/g, " "));
}

describe("without the plugin (§3 / §4.4 default)", () => {
  it("reports the type as unknown, so the default CLI is untouched", () => {
    const editor = editorWithCanvas();
    expect(editor.run('create box n1 120 100 160 60 "开始"')).toEqual([
      "error: unknown shape type: box (is the plugin loaded?)",
    ]);
  });

  it("does not list the plugin type in `help`", () => {
    const editor = editorWithCanvas();
    expect(editor.run("help").join("\n")).toContain(
      "create types: rect circle ellipse line text g",
    );
  });

  it("names the plugin type in `help` once it is loaded", () => {
    const editor = boxEditor();
    expect(editor.run("help").join("\n")).toContain(
      "create types: rect circle ellipse line text g box",
    );
  });
});

describe("creation", () => {
  it("builds the provider template and reports its parts (§4.4)", () => {
    const editor = boxEditor();
    expect(editor.run('create box n1 120 100 160 60 "开始"')).toEqual([
      "box#n1 created (g#n1 + rect#n1-rect + text#n1-label)",
    ]);
  });

  it("prints the documented subtree for `tree n1` (§4.4)", () => {
    const editor = boxEditor();
    editor.run('create box n1 120 100 160 60 "开始"');
    expect(editor.run("tree n1")).toEqual([
      "g#n1 (box)",
      "├── rect#n1-rect   x=120 y=100 w=160 h=60 fill=#4a90d9",
      '└── text#n1-label  (140,135) "开始"',
    ]);
  });

  it("uses the documented default plate colour and honours an explicit fill", () => {
    const editor = boxEditor();
    editor.run('create box n1 0 0 10 10 "t"');
    editor.run('create box n2 0 0 10 10 "t" #ff0000');
    expect(editor.run("show n1-rect").join("\n")).toContain("fill=#4a90d9");
    expect(editor.run("show n2-rect").join("\n")).toContain("fill=#ff0000");
  });

  it("accepts `in` and nests inside another box (§4.4)", () => {
    const editor = boxEditor();
    editor.run('create box n1 0 0 160 60 "外"');
    expect(editor.run('create box n3 5 5 80 40 "内" in n1')).toEqual([
      "box#n3 created (g#n3 + rect#n3-rect + text#n3-label) in g#n1",
    ]);
    expect(treeContent(editor.run("tree"))).toEqual(
      treeContent([
        "svg (800x600)",
        "└── g#n1 (box)",
        "    ├── rect#n1-rect x=0 y=0 w=160 h=60 fill=#4a90d9",
        '    ├── text#n1-label (20,35) "外"',
        "    └── g#n3 (box)",
        "        ├── rect#n3-rect x=5 y=5 w=80 h=40 fill=#4a90d9",
        '        └── text#n3-label (25,30) "内"',
      ]),
    );
  });

  it("refuses a derived part id that already exists (§2 uniqueness)", () => {
    const editor = boxEditor();
    editor.run("create rect n1-rect 0 0 1 1");
    expect(editor.run('create box n1 0 0 10 10 "t"')).toEqual([
      "error: id already exists: n1-rect",
    ]);
    expect(editor.run("tree")).toEqual([
      "svg (800x600)",
      "└── rect#n1-rect  x=0 y=0 w=1 h=1",
    ]);
  });
});

describe("composite semantics (§4.4)", () => {
  it("moves as a container, reporting the delta", () => {
    const editor = boxEditor();
    editor.run('create box n2 520 100 160 60 "处理数据"');
    expect(editor.run("move n2 0 100")).toEqual(["box#n2 moved by (0,100)"]);
    expect(editor.run("undo")).toEqual(["box#n2 moved back by (0,-100)"]);
    expect(editor.run("tree n2")).toEqual([
      "g#n2 (box)",
      "├── rect#n2-rect   x=520 y=100 w=160 h=60 fill=#4a90d9",
      '└── text#n2-label  (540,135) "处理数据"',
    ]);
  });

  it("propagates `fill` to the plate", () => {
    const editor = boxEditor();
    editor.run('create box n2 520 100 160 60 "处理数据"');
    expect(editor.run("set n2 fill #f5a623")).toEqual([
      "box#n2 fill propagated to n2-rect",
    ]);
    expect(editor.run("tree n2")).toEqual([
      "g#n2 (box)",
      "├── rect#n2-rect   x=520 y=100 w=160 h=60 fill=#f5a623",
      '└── text#n2-label  (540,135) "处理数据"',
    ]);
  });

  it("rewrites the caption through `label`, and restores it on undo", () => {
    const editor = boxEditor();
    editor.run('create box n2 520 100 160 60 "处理数据"');
    expect(editor.run('set n2 label "处理数据 v2"')).toEqual([
      'box#n2 label updated: "处理数据 v2"',
    ]);
    expect(editor.run("undo")).toEqual(['box#n2 label restored: "处理数据"']);
    expect(editor.run("redo")).toEqual(['box#n2 label updated: "处理数据 v2"']);
  });

  it("rejects an attribute neither the plugin nor the plate owns", () => {
    const editor = boxEditor();
    editor.run('create box n1 0 0 10 10 "t"');
    expect(editor.run("set n1 opacity 0.5")).toEqual(["error: unknown attribute: opacity"]);
    expect(editor.run("set n1 text x")).toEqual(["error: unknown attribute: text"]);
  });

  it("deletes the whole composite in one undo unit", () => {
    const editor = boxEditor();
    editor.run('create box n1 0 0 10 10 "t"');
    expect(editor.run("delete n1")).toEqual(["box#n1 deleted (with 2 descendants)"]);
    expect(editor.run("undo")).toEqual(["box#n1 restored into svg"]);
    expect(treeContent(editor.run("tree"))).toEqual(
      treeContent([
        "svg (800x600)",
        "└── g#n1 (box)",
        "    ├── rect#n1-rect x=0 y=0 w=10 h=10 fill=#4a90d9",
        '    └── text#n1-label (20,10) "t"',
      ]),
    );
  });

  it("can be collected by `group` — it is a subtree like any other", () => {
    const editor = boxEditor();
    editor.run('create box n1 120 100 160 60 "开始"');
    editor.run('create box n2 520 100 160 60 "处理数据"');
    expect(editor.run("group flowchart n1 n2")).toEqual(["g#flowchart created with 2 children"]);
    expect(editor.run("tree").slice(0, 2)).toEqual(["svg (800x600)", "└── g#flowchart"]);
  });

  it("refuses `ungroup` with the documented error (§4.2)", () => {
    const editor = boxEditor();
    editor.run('create box n1 120 100 160 60 "开始"');
    expect(editor.run("ungroup n1")).toEqual(["error: cannot ungroup composite shape: n1"]);
  });

  it("still refuses a root-level plain container, and a leaf", () => {
    const editor = boxEditor();
    editor.run("create g scene");
    editor.run("create rect r1 0 0 1 1");
    expect(editor.run("ungroup scene")).toEqual([
      "error: cannot ungroup top-level container: scene",
    ]);
    expect(editor.run("ungroup r1")).toEqual(["error: not a container: r1"]);
  });
});

describe("serialisation round-trip (§4.4)", () => {
  it("writes <g data-kind=\"box\"> with its parts", () => {
    const editor = boxEditor();
    editor.run('create box n1 120 100 160 60 "开始"');
    editor.run("save box.svg");
    expect(editor.files.files.get("box.svg")).toContain('<g id="n1" data-kind="box">');
    expect(editor.files.files.get("box.svg")).toContain(
      '<rect id="n1-rect" x="120" y="100" width="160" height="60" fill="#4a90d9"/>',
    );
    expect(editor.files.files.get("box.svg")).toContain(
      '<text id="n1-label" x="140" y="135">开始</text>',
    );
  });

  it("restores the composite when the plugin is loaded", () => {
    const writer = boxEditor();
    writer.run('create box n1 120 100 160 60 "开始"');
    writer.run("save box.svg");

    const reader = new TestEditor([new BoxProvider()]);
    reader.files.files.set("box.svg", writer.files.files.get("box.svg") ?? "");
    expect(reader.run("read box.svg")).toEqual(["read box.svg (3 elements)"]);
    expect(treeContent(reader.run("tree"))).toEqual(
      treeContent([
        "svg (800x600)",
        "└── g#n1 (box)",
        "    ├── rect#n1-rect x=120 y=100 w=160 h=60 fill=#4a90d9",
        '    └── text#n1-label (140,135) "开始"',
      ]),
    );
    expect(reader.run("ungroup n1")).toEqual(["error: cannot ungroup composite shape: n1"]);
  });

  it("degrades to a plain container when the plugin is not loaded", () => {
    const writer = boxEditor();
    writer.run('create box n1 120 100 160 60 "开始"');
    writer.run("save box.svg");

    const plain = new TestEditor();
    plain.files.files.set("box.svg", writer.files.files.get("box.svg") ?? "");
    expect(plain.run("read box.svg")).toEqual(["read box.svg (3 elements)"]);
    expect(treeContent(plain.run("tree"))).toEqual(
      treeContent([
        "svg (800x600)",
        "└── g#n1",
        "    ├── rect#n1-rect x=120 y=100 w=160 h=60 fill=#4a90d9",
        '    └── text#n1-label (140,135) "开始"',
      ]),
    );
    // Structure intact, plugin semantics gone: `label` is not settable, and the
    // container is dissolvable again (§4.4's "语义降级").
    expect(plain.run("set n1 label x")).toEqual(["error: unknown attribute: label"]);
    expect(plain.run("ungroup n1")).toEqual([
      "error: cannot ungroup top-level container: n1",
    ]);
  });

  it("keeps `data-kind` on the element when the plugin is absent (no silent loss)", () => {
    const writer = boxEditor();
    writer.run('create box n1 0 0 10 10 "t"');
    writer.run("save box.svg");

    const plain = new TestEditor();
    plain.files.files.set("box.svg", writer.files.files.get("box.svg") ?? "");
    plain.run("read box.svg");
    plain.run("save again.svg");
    expect(plain.files.files.get("again.svg")).toContain('data-kind="box"');
  });

  it("reports the plugin contract in the assignment's own words", () => {
    const spec = readFileSync(SPEC, "utf8");
    expect(spec).toContain("error: cannot ungroup composite shape: n1");
    expect(spec).toContain('box#n1 created (g#n1 + rect#n1-rect + text#n1-label)');
  });
});
