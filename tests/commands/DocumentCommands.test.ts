import { describe, expect, it } from "vitest";
import { editorWithCanvas, TestEditor } from "../support/TestEditor.js";

describe("document commands", () => {
  it("creates the default canvas with no arguments", () => {
    const editor = new TestEditor();
    expect(editor.run("init")).toEqual(["canvas 800x600 created"]);
  });

  it("creates a sized canvas", () => {
    const editor = new TestEditor();
    expect(editor.run("init 1024 768")).toEqual(["canvas 1024x768 created"]);
    expect(editor.run("canvas")).toEqual(["canvas 1024x768"]);
  });

  it("reports and changes the canvas size", () => {
    const editor = editorWithCanvas(800, 600);
    expect(editor.run("canvas 400 300")).toEqual(["canvas 400x300 resized"]);
    expect(editor.run("canvas")).toEqual(["canvas 400x300"]);
  });

  it("requires a document before any other command", () => {
    const editor = new TestEditor();
    expect(editor.run("tree")).toEqual(["error: no document. use 'init' or 'read' first"]);
    expect(editor.run("create rect r1 0 0 10 10")).toEqual([
      "error: no document. use 'init' or 'read' first",
    ]);
    expect(editor.run("canvas")).toEqual(["error: no document. use 'init' or 'read' first"]);
  });

  it("does not pass a same-named group into undo after init", () => {
    const editor = editorWithCanvas();
    expect(editor.run("undo")).toEqual(["error: undo not allowed after io command"]);
  });
});
