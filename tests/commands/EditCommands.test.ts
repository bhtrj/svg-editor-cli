import { describe, expect, it } from "vitest";
import { editorWithCanvas } from "../support/TestEditor.js";

describe("move", () => {
  it("moves a leaf and reports its new anchor", () => {
    const editor = editorWithCanvas();
    editor.run("create circle c1 100 100 20 red");
    expect(editor.run("move c1 30 0")).toEqual(["circle#c1 moved to (130,100)"]);
  });

  it("moves a container and reports the delta", () => {
    const editor = editorWithCanvas();
    editor.runScript(`
      create g node2
      create rect process 520 100 160 60 in node2
      create text label 545 135 "x" in node2
    `);
    expect(editor.run("move node2 0 100")).toEqual(["g#node2 moved by (0,100)"]);
    expect(editor.tree()).toContain("    ├── rect#process  x=520 y=200 w=160 h=60");
  });

  it("translates both endpoints of a line", () => {
    const editor = editorWithCanvas();
    editor.run("create line l1 280 130 520 130 black");
    editor.run("move l1 10 5");
    expect(editor.run("show l1")).toEqual([
      "line#l1  parent=svg",
      "  x1=290 y1=135 x2=530 y2=135",
      "  stroke=black",
    ]);
  });

  it("rejects unknown shapes", () => {
    const editor = editorWithCanvas();
    expect(editor.run("move r9 10 10")).toEqual(["error: no such shape: r9"]);
  });
});

describe("scale", () => {
  it("multiplies position and size", () => {
    const editor = editorWithCanvas();
    editor.run("create rect r1 10 20 100 50");
    editor.run("scale r1 2");
    expect(editor.run("show r1")).toEqual([
      "rect#r1  parent=svg",
      "  x=20 y=40 width=200 height=100",
    ]);
  });

  it("recurses into containers", () => {
    const editor = editorWithCanvas();
    editor.runScript(`
      create g g1
      create rect r1 10 10 10 10 in g1
      create circle c1 20 20 5 in g1
    `);
    editor.run("scale g1 3");
    expect(editor.run("show r1")).toContain("  x=30 y=30 width=30 height=30");
    expect(editor.run("show c1")).toContain("  cx=60 cy=60 r=15");
  });

  it("rejects a non-positive factor", () => {
    const editor = editorWithCanvas();
    editor.run("create rect r1 0 0 10 10");
    expect(editor.run("scale r1 0")).toEqual(["error: scale factor must be positive"]);
    expect(editor.run("scale r1 -2")).toEqual(["error: scale factor must be positive"]);
  });
});

describe("set", () => {
  it("updates paint and geometry", () => {
    const editor = editorWithCanvas();
    editor.run("create rect r1 0 0 10 10");
    expect(editor.run("set r1 fill red")).toEqual(["rect#r1 updated: fill=red"]);
    expect(editor.run("set r1 width 40")).toEqual(["rect#r1 updated: width=40"]);
  });

  it("updates text content", () => {
    const editor = editorWithCanvas();
    editor.run('create text t1 20 40 "My Diagram"');
    expect(editor.run('set t1 text "My Diagram v2"')).toEqual([
      'text#t1 updated: text="My Diagram v2"',
    ]);
  });

  it("rejects attributes outside the whitelist", () => {
    const editor = editorWithCanvas();
    editor.run("create rect r1 0 0 10 10");
    expect(editor.run("set r1 opacity 0.5")).toEqual(["error: unknown attribute: opacity"]);
    expect(editor.run("set r1 cx 5")).toEqual(["error: unknown attribute: cx"]);
  });

  it("rejects non-positive sizes and non-numeric values", () => {
    const editor = editorWithCanvas();
    editor.run("create rect r1 0 0 10 10");
    expect(editor.run("set r1 width 0")).toEqual(["error: value must be positive: 0"]);
    expect(editor.run("set r1 x abc")).toEqual(["error: invalid number: abc"]);
  });

  it("leaves the document untouched on failure", () => {
    const editor = editorWithCanvas();
    editor.run("create rect r1 0 0 10 10");
    const before = editor.tree();
    editor.run("set r1 fill");
    expect(editor.tree()).toEqual(before);
  });
});

describe("delete", () => {
  it("removes a leaf", () => {
    const editor = editorWithCanvas();
    editor.run("create rect r1 0 0 10 10");
    expect(editor.run("delete r1")).toEqual(["rect#r1 deleted"]);
    expect(editor.tree()).toEqual(["svg (800x600)"]);
  });

  it("removes a container with its descendants", () => {
    const editor = editorWithCanvas();
    editor.runScript(`
      create g g1
      create rect r1 0 0 10 10 in g1
      create circle c1 5 5 2 in g1
    `);
    expect(editor.run("delete g1")).toEqual(["g#g1 deleted (with 2 descendants)"]);
  });

  it("rejects an unknown id", () => {
    const editor = editorWithCanvas();
    expect(editor.run("delete r9")).toEqual(["error: no such shape: r9"]);
  });
});
