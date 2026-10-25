import { describe, expect, it } from "vitest";
import { editorWithCanvas, TestEditor } from "../support/TestEditor.js";

const OTHER_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect x="0" y="0" width="400" height="300" fill="#ffffff"/>
  <text id="t1" x="10" y="290">imported</text>
  <circle id="c1" cx="50" cy="50" r="10"/>
  <g id="g1">
    <rect id="r2" x="0" y="0" width="10" height="10"/>
    <circle id="c2" cx="5" cy="5" r="2"/>
  </g>
  <ellipse id="e1" cx="1" cy="2" rx="3" ry="4"/>
</svg>
`;

describe("save", () => {
  it("writes valid SVG for the current document", () => {
    const editor = editorWithCanvas(400, 200);
    editor.run("create g flow");
    editor.run("create rect start 30 70 120 60 #4a90d9 in flow");
    editor.run("create line edge 150 100 250 100 black in flow");
    expect(editor.run("save demo.svg")).toEqual(["saved to demo.svg (3 elements)"]);

    const written = editor.files.files.get("demo.svg") ?? "";
    expect(written).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(written).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"');
    expect(written).toContain('<rect id="start" x="30" y="70" width="120" height="60" fill="#4a90d9"/>');
    expect(written).toContain('<line id="edge" x1="150" y1="100" x2="250" y2="100" stroke="black"/>');
  });

  it("escapes text content and attribute values", () => {
    const editor = editorWithCanvas();
    editor.run('create text t1 0 0 "a & b < c"');
    editor.run("save escaped.svg");
    expect(editor.files.files.get("escaped.svg")).toContain(">a &amp; b &lt; c</text>");
  });

  it("reuses the path from read when no argument is given", () => {
    const editor = new TestEditor();
    editor.files.files.set("in.svg", OTHER_SVG);
    editor.run("read in.svg");
    expect(editor.run("save")).toEqual(["saved to in.svg (7 elements)"]);
  });

  it("fails without a path", () => {
    const editor = new TestEditor();
    editor.run("init");
    expect(editor.run("save")).toEqual(["error: no file path to save to"]);
  });

  it("reports an unwritable path", () => {
    const editor = new TestEditor();
    editor.run("init");
    editor.files.writeText = () => {
      throw new Error("EACCES");
    };
    expect(editor.run("save nope.svg")).toEqual(["error: cannot write file: nope.svg"]);
  });
});

describe("read", () => {
  it("imports a file, warns about missing ids and reports the count", () => {
    const editor = new TestEditor();
    editor.files.files.set("other.svg", OTHER_SVG);
    expect(editor.run("read other.svg")).toEqual([
      "warning: assigned id rect1 to unnamed <rect>",
      "read other.svg (7 elements)",
    ]);
  });

  it("reproduces the tree of the reference transcript", () => {
    const editor = new TestEditor();
    editor.files.files.set("other.svg", OTHER_SVG);
    editor.run("read other.svg");
    expect(editor.tree()).toEqual([
      "svg (400x300)",
      "├── rect#rect1  x=0 y=0 w=400 h=300 fill=#ffffff",
      "├── text#t1     (10,290) \"imported\"",
      "├── circle#c1   cx=50 cy=50 r=10",
      "├── g#g1",
      "│   ├── rect#r2    x=0 y=0 w=10 h=10",
      "│   └── circle#c2  cx=5 cy=5 r=2",
      "└── ellipse#e1  cx=1 cy=2 rx=3 ry=4",
    ]);
  });

  it("does not reuse an id that already exists", () => {
    const editor = new TestEditor();
    editor.files.files.set(
      "ids.svg",
      '<svg width="10" height="10"><rect id="rect1" x="0" y="0" width="1" height="1"/><rect x="0" y="0" width="1" height="1"/></svg>',
    );
    expect(editor.run("read ids.svg")).toEqual([
      "warning: assigned id rect2 to unnamed <rect>",
      "read ids.svg (2 elements)",
    ]);
  });

  it("round-trips a document through save and read", () => {
    const first = editorWithCanvas(300, 200);
    first.run("create g g1");
    first.run("create rect r1 10 20 30 40 red in g1");
    first.run("create text t1 5 6 \"hello world\"");
    first.run("save round.svg");

    const second = new TestEditor();
    second.files.files.set("round.svg", first.files.files.get("round.svg") ?? "");
    expect(second.run("read round.svg")).toEqual(["read round.svg (3 elements)"]);
    expect(second.tree()).toEqual([
      "svg (300x200)",
      "├── g#g1",
      "│   └── rect#r1  x=10 y=20 w=30 h=40 fill=red",
      '└── text#t1  (5,6) "hello world"',
    ]);
  });

  it("locks undo after reading", () => {
    const editor = editorWithCanvas();
    editor.run("create rect r1 0 0 10 10");
    editor.files.files.set("x.svg", '<svg width="10" height="10"><rect id="a" x="0" y="0" width="1" height="1"/></svg>');
    editor.run("read x.svg");
    expect(editor.run("undo")).toEqual(["error: undo not allowed after io command"]);
  });

  it("reports a missing file", () => {
    const editor = new TestEditor();
    expect(editor.run("read nope.svg")).toEqual(["error: cannot read file: nope.svg"]);
  });

  it("rejects an unsupported element", () => {
    const editor = new TestEditor();
    editor.files.files.set(
      "poly.svg",
      '<svg width="10" height="10"><polygon id="p1" points="0,0 1,1 2,0"/></svg>',
    );
    expect(editor.run("read poly.svg")).toEqual([
      "error: unknown shape type: polygon (is the plugin loaded?)",
    ]);
  });

  it("derives the canvas size from viewBox when width/height are absent", () => {
    const editor = new TestEditor();
    editor.files.files.set(
      "vb.svg",
      '<svg viewBox="0 0 640 480"><rect id="r" x="0" y="0" width="1" height="1"/></svg>',
    );
    expect(editor.run("read vb.svg")).toEqual(["read vb.svg (1 elements)"]);
    expect(editor.run("canvas")).toEqual(["canvas 640x480"]);
  });
});
