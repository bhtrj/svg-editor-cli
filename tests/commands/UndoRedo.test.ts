import { describe, expect, it } from "vitest";
import { editorWithCanvas } from "../support/TestEditor.js";

describe("undo / redo", () => {
  it("undoes and redoes a move", () => {
    const editor = editorWithCanvas();
    editor.run("create circle c1 100 100 20");
    editor.run("move c1 30 0");
    expect(editor.run("undo")).toEqual(["circle#c1 moved back to (100,100)"]);
    expect(editor.run("redo")).toEqual(["circle#c1 moved to (130,100)"]);
  });

  it("undoes a set with the previous value", () => {
    const editor = editorWithCanvas();
    editor.run('create text t1 20 40 "My Diagram"');
    editor.run('set t1 text "My Diagram v2"');
    expect(editor.run("undo")).toEqual(['text#t1 updated: text="My Diagram"']);
  });

  it("restores a deleted shape into its original parent", () => {
    const editor = editorWithCanvas();
    editor.runScript(`
      create g markers
      create circle c1 100 100 20 in markers
      create rect box 200 80 60 60 in markers
    `);
    editor.run("delete box");
    expect(editor.run("undo")).toEqual(["rect#box restored into g#markers"]);
    expect(editor.run("show box")).toContain("rect#box  parent=g#markers");
  });

  it("restores z-order after delete + undo", () => {
    const editor = editorWithCanvas();
    editor.runScript(`
      create rect a 0 0 1 1
      create rect b 0 0 2 2
      create rect c 0 0 3 3
    `);
    editor.run("delete b");
    editor.run("undo");
    expect(editor.tree().map((line) => line.replace(/\s+/g, " "))).toEqual([
      "svg (800x600)",
      "├── rect#a x=0 y=0 w=1 h=1",
      "├── rect#b x=0 y=0 w=2 h=2",
      "└── rect#c x=0 y=0 w=3 h=3",
    ]);
  });

  it("treats a whole group as one undo unit", () => {
    const editor = editorWithCanvas();
    editor.runScript(`
      create circle c1 100 100 20 red
      create rect box 200 80 60 60 #3366ff
    `);
    editor.run("group markers c1 box");
    editor.run("undo");
    expect(editor.tree()).toEqual([
      "svg (800x600)",
      "├── circle#c1  cx=100 cy=100 r=20 fill=red",
      "└── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff",
    ]);
    expect(editor.run("redo")).toEqual(["g#markers created with 2 children"]);
  });

  it("undoes a nested container move as one step", () => {
    const editor = editorWithCanvas();
    editor.runScript(`
      create g g1
      create rect r1 0 0 10 10 in g1
      create circle c1 5 5 2 in g1
    `);
    editor.run("move g1 100 50");
    editor.run("undo");
    expect(editor.run("show r1")).toContain("  x=0 y=0 width=10 height=10");
    expect(editor.run("show c1")).toContain("  cx=5 cy=5 r=2");
  });

  it("clears the redo stack after a new edit", () => {
    const editor = editorWithCanvas();
    editor.run("create rect r1 0 0 10 10");
    editor.run("move r1 5 0");
    editor.run("undo");
    editor.run("create circle c2 0 0 3");
    expect(editor.run("redo")).toEqual(["error: nothing to redo"]);
  });

  it("does not record display commands", () => {
    const editor = editorWithCanvas();
    editor.run("create rect r1 0 0 10 10");
    editor.run("tree");
    editor.run("show r1");
    editor.run("undo");
    expect(editor.tree()).toEqual(["svg (800x600)"]);
  });

  it("refuses undo after an io command until the next edit", () => {
    const editor = editorWithCanvas();
    editor.run("create rect r1 0 0 10 10");
    editor.run("save a.svg");
    expect(editor.run("undo")).toEqual(["error: undo not allowed after io command"]);
    editor.run("create circle c2 0 0 3");
    expect(editor.run("undo")).toEqual(["circle#c2 creation undone"]);
  });

  it("reports nothing to undo once the history is exhausted", () => {
    const editor = editorWithCanvas();
    editor.run("create rect r1 0 0 10 10");
    editor.run("undo");
    expect(editor.run("undo")).toEqual(["error: nothing to undo"]);
  });

  it("does not make a failed command undoable", () => {
    const editor = editorWithCanvas();
    editor.run("create rect r1 0 0 10 10");
    editor.run("scale r1 0");
    expect(editor.run("undo")).toEqual(["rect#r1 creation undone"]);
  });
});
