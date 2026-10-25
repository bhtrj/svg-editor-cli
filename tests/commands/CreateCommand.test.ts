import { describe, expect, it } from "vitest";
import { editorWithCanvas } from "../support/TestEditor.js";

describe("create", () => {
  it("creates every built-in type", () => {
    const editor = editorWithCanvas();
    expect(editor.run("create rect r1 10 20 100 50 #eee")).toEqual(["rect#r1 created"]);
    expect(editor.run("create circle c1 100 100 20 red")).toEqual(["circle#c1 created"]);
    expect(editor.run("create ellipse e1 50 60 10 20")).toEqual(["ellipse#e1 created"]);
    expect(editor.run("create line l1 0 0 100 100 black")).toEqual(["line#l1 created"]);
    expect(editor.run('create text t1 20 40 "My Diagram"')).toEqual(["text#t1 created"]);
    expect(editor.run("create g g1")).toEqual(["g#g1 created"]);
  });

  it("omits paint attributes when they are not given", () => {
    const editor = editorWithCanvas();
    editor.run("create rect r1 10 20 30 40");
    expect(editor.run("tree")).toEqual(["svg (800x600)", "└── rect#r1  x=10 y=20 w=30 h=40"]);
  });

  it("honours the `in` clause and reports the parent", () => {
    const editor = editorWithCanvas();
    editor.run("create g node1");
    expect(editor.run("create rect start 120 100 160 60 #4a90d9 in node1")).toEqual([
      "rect#start created in g#node1",
    ]);
  });

  it("treats a quoted \"in\" as text content, not as the clause", () => {
    const editor = editorWithCanvas();
    expect(editor.run('create text t1 0 0 "in"')).toEqual(["text#t1 created"]);
    expect(editor.run("tree")).toEqual(["svg (800x600)", '└── text#t1  (0,0) "in"']);
  });

  it("rejects duplicate ids", () => {
    const editor = editorWithCanvas();
    editor.run("create rect r1 0 0 10 10");
    expect(editor.run("create circle r1 0 0 5")).toEqual(["error: id already exists: r1"]);
  });

  it("rejects unknown types with the plugin hint", () => {
    const editor = editorWithCanvas();
    expect(editor.run('create box n1 0 0 10 10 "start"')).toEqual([
      "error: unknown shape type: box (is the plugin loaded?)",
    ]);
  });

  it("rejects a missing or non-container `in` target", () => {
    const editor = editorWithCanvas();
    editor.run("create rect r1 0 0 10 10");
    expect(editor.run("create circle c1 0 0 5 in node9")).toEqual([
      "error: no such container: node9",
    ]);
    expect(editor.run("create circle c1 0 0 5 in r1")).toEqual(["error: not a container: r1"]);
  });

  it("changes nothing when creation fails", () => {
    const editor = editorWithCanvas();
    editor.run("create rect r1 0 0 10 10");
    const before = editor.tree();
    editor.run("create circle c1 0 0 5 in nope");
    expect(editor.tree()).toEqual(before);
  });
});
