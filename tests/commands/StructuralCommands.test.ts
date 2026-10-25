import { describe, expect, it } from "vitest";
import { editorWithCanvas } from "../support/TestEditor.js";

describe("group", () => {
  it("collects shapes and keeps their relative order", () => {
    const editor = editorWithCanvas();
    editor.runScript(`
      create circle c1 100 100 20 red
      create rect box 200 80 60 60 #3366ff
    `);
    expect(editor.run("group markers c1 box")).toEqual(["g#markers created with 2 children"]);
    expect(editor.tree()).toEqual([
      "svg (800x600)",
      "└── g#markers",
      "    ├── circle#c1  cx=100 cy=100 r=20 fill=red",
      "    └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff",
    ]);
  });

  it("rejects grouping a container into its own descendant", () => {
    const editor = editorWithCanvas();
    editor.runScript(`
      create g markers
      create circle c1 100 100 20 in markers
    `);
    expect(editor.run("group bad c1 markers")).toEqual([
      "error: cannot group a container into its own descendant: markers",
    ]);
  });

  it("changes nothing when the group is rejected", () => {
    const editor = editorWithCanvas();
    editor.runScript(`
      create g markers
      create circle c1 100 100 20 in markers
    `);
    const before = editor.tree();
    editor.run("group bad c1 markers");
    expect(editor.tree()).toEqual(before);
  });

  it("rejects duplicate ids and unknown members", () => {
    const editor = editorWithCanvas();
    editor.run("create circle c1 0 0 5");
    editor.run("create g g1");
    expect(editor.run("group g1 c1")).toEqual(["error: id already exists: g1"]);
    expect(editor.run("group g2 c1 nope")).toEqual(["error: no such shape: nope"]);
  });

  it("uses the singular for a one-member group", () => {
    const editor = editorWithCanvas();
    editor.run("create circle c1 0 0 5");
    expect(editor.run("group solo c1")).toEqual(["g#solo created with 1 child"]);
    expect(editor.run("undo")).toEqual(["g#solo ungrouped (1 child restored)"]);
    expect(editor.run("redo")).toEqual(["g#solo created with 1 child"]);
  });
});

describe("ungroup", () => {
  it("promotes children in place", () => {
    const editor = editorWithCanvas();
    editor.runScript(`
      create g outer
      create g inner in outer
      create circle c1 0 0 5 in inner
      create rect r1 10 10 20 20 in inner
    `);
    expect(editor.run("ungroup inner")).toEqual(["g#inner ungrouped (2 children)"]);
    expect(editor.tree()).toEqual([
      "svg (800x600)",
      "└── g#outer",
      "    ├── circle#c1  cx=0 cy=0 r=5",
      "    └── rect#r1    x=10 y=10 w=20 h=20",
    ]);
  });

  it("uses the singular when a one-child container is dissolved", () => {
    const editor = editorWithCanvas();
    editor.runScript(`
      create g outer
      create g inner in outer
      create circle c1 0 0 5 in inner
    `);
    expect(editor.run("ungroup inner")).toEqual(["g#inner ungrouped (1 child)"]);
    expect(editor.run("undo")).toEqual(["g#inner regrouped (1 child)"]);
  });

  it("rejects a top-level container", () => {
    const editor = editorWithCanvas();
    editor.run("create g scene");
    expect(editor.run("ungroup scene")).toEqual([
      "error: cannot ungroup top-level container: scene",
    ]);
  });

  it("rejects a leaf", () => {
    const editor = editorWithCanvas();
    editor.run("create rect r1 0 0 10 10");
    expect(editor.run("ungroup r1")).toEqual(["error: not a container: r1"]);
  });
});

describe("addto", () => {
  it("moves an existing shape into a container", () => {
    const editor = editorWithCanvas();
    editor.runScript(`
      create g g1
      create rect r1 0 0 10 10
    `);
    expect(editor.run("addto g1 r1")).toEqual(["rect#r1 added to g#g1"]);
    expect(editor.tree()).toEqual([
      "svg (800x600)",
      "└── g#g1",
      "    └── rect#r1  x=0 y=0 w=10 h=10",
    ]);
  });

  it("refuses to move a container into its own descendant", () => {
    const editor = editorWithCanvas();
    editor.runScript(`
      create g outer
      create g inner in outer
    `);
    expect(editor.run("addto inner outer")).toEqual([
      "error: cannot add a container into its own descendant: outer",
    ]);
  });
});

describe("front / back", () => {
  it("reorders siblings", () => {
    const editor = editorWithCanvas();
    editor.runScript(`
      create rect a 0 0 1 1
      create rect b 0 0 2 2
      create rect c 0 0 3 3
    `);
    expect(editor.run("front a")).toEqual(["rect#a brought to front"]);
    expect(editor.tree()).toEqual([
      "svg (800x600)",
      "├── rect#b  x=0 y=0 w=2 h=2",
      "├── rect#c  x=0 y=0 w=3 h=3",
      "└── rect#a  x=0 y=0 w=1 h=1",
    ]);
    expect(editor.run("back a")).toEqual(["rect#a sent to back"]);
    expect(editor.tree()[1]).toBe("├── rect#a  x=0 y=0 w=1 h=1");
  });
});
