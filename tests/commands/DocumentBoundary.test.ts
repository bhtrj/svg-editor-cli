import { describe, expect, it } from "vitest";
import { editorWithCanvas, TestEditor } from "../support/TestEditor.js";

/**
 * Behaviour at the seams between commands: document-level properties must not be
 * dragged around by edit-level undo, and vice versa.
 */
describe("canvas vs undo", () => {
  it("keeps a resized canvas when an earlier edit is undone", () => {
    const editor = editorWithCanvas(800, 600);
    editor.run("create rect r1 0 0 10 10");
    editor.run("canvas 400 300");

    // Resizing locks undo (§4.3); the next edit unlocks it.
    editor.run("create circle c1 0 0 5");
    editor.run("undo");

    expect(editor.run("canvas")).toEqual(["canvas 400x300"]);
    expect(editor.tree()[0]).toBe("svg (400x300)");
  });

  it("keeps the canvas when a shape edit is undone repeatedly", () => {
    const editor = editorWithCanvas(800, 600);
    editor.run("canvas 1000 500");
    editor.run("create rect r1 0 0 10 10");
    editor.run("move r1 5 5");
    editor.run("undo");
    editor.run("undo");

    expect(editor.run("canvas")).toEqual(["canvas 1000x500"]);
  });

  it("does not resurrect a deleted shape across a resize", () => {
    const editor = editorWithCanvas();
    editor.run("create rect r1 0 0 10 10");
    editor.run("delete r1");
    editor.run("canvas 200 200");
    editor.run("create circle c1 0 0 5");
    editor.run("undo");

    expect(editor.tree()).toEqual(["svg (200x200)"]);
  });
});

describe("init discards history", () => {
  it("starts from an empty history after a second init", () => {
    const editor = editorWithCanvas();
    editor.run("create rect r1 0 0 10 10");
    editor.run("init 100 100");
    expect(editor.run("undo")).toEqual(["error: undo not allowed after io command"]);
    expect(editor.tree()).toEqual(["svg (100x100)"]);

    // After the next edit the history works again, from the new document.
    editor.run("create circle c1 0 0 5");
    expect(editor.run("undo")).toEqual(["circle#c1 creation undone"]);
    expect(editor.run("redo")).toEqual(["circle#c1 created"]);
    expect(editor.tree()).toEqual(["svg (100x100)", "└── circle#c1  cx=0 cy=0 r=5"]);
  });
});

describe("read replaces the document", () => {
  it("does not carry shapes over from the previous document", () => {
    const editor = new TestEditor();
    editor.run("init");
    editor.run("create rect r1 0 0 10 10");
    editor.files.files.set(
      "only.svg",
      '<svg width="50" height="50"><circle id="c9" cx="1" cy="1" r="1"/></svg>',
    );
    editor.run("read only.svg");
    expect(editor.tree()).toEqual(["svg (50x50)", "└── circle#c9  cx=1 cy=1 r=1"]);
  });

  it("forgets the old source path so save does not overwrite it", () => {
    const editor = new TestEditor();
    editor.files.files.set(
      "a.svg",
      '<svg width="10" height="10"><rect id="a" x="0" y="0" width="1" height="1"/></svg>',
    );
    editor.run("read a.svg");
    editor.run("init");
    expect(editor.run("save")).toEqual(["error: no file path to save to"]);
  });
});
