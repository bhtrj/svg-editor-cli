import { describe, expect, it } from "vitest";
import { TestEditor } from "./support/TestEditor.js";

/**
 * Golden replays of the two transcripts in the assignment (§6 and §6.1).
 *
 * These are the acceptance criterion with the least interpretation: if the
 * literal session from the brief produces the literal output, the CLI behaves as
 * specified. Comments (`#`) and blank lines are part of the scripts on purpose —
 * the brief promises they can be stored and replayed.
 */

const SECTION_6 = `
init 800 600
create rect bg 0 0 800 600 #ffffff
create text title 20 40 "My Diagram"
create circle c1 100 100 20 red
create rect box 200 80 60 60 #3366ff

group markers c1 box
tree
move c1 30 0
undo
redo
set title text "My Diagram v2"
undo
group bad c1 markers
delete box
undo
save demo.svg
undo
`;

const SECTION_6_1 = `
init 800 600

# 先建容器骨架，再往里放图形：每一步都显式表达归属
create g flowchart
create g node1 in flowchart
create rect start 120 100 160 60 #4a90d9 in node1
create text start-label 155 135 "开始" in node1

create g node2 in flowchart
create rect process 520 100 160 60 #f5a623 in node2
create text process-label 545 135 "处理数据" in node2

# 连接线挂在流程图容器下
create line arrow1 280 130 520 130 black in flowchart

tree

# 容器移动：整个节点 2 下移 100，文字随行（容器的价值所在）
move node2 0 100
undo

# 改节点内容：只动组内 text
set process-label text "处理数据 v2"

save flowchart.svg
`;

describe("§6 transcript", () => {
  it("matches the documented session line for line", () => {
    const editor = new TestEditor();
    const output = editor.runScript(SECTION_6);

    expect(output).toEqual([
      "canvas 800x600 created",
      "rect#bg created",
      "text#title created",
      "circle#c1 created",
      "rect#box created",
      "g#markers created with 2 children",
      "svg (800x600)",
      "├── rect#bg     x=0 y=0 w=800 h=600 fill=#ffffff",
      "├── text#title  (20,40) \"My Diagram\"",
      "└── g#markers",
      "    ├── circle#c1  cx=100 cy=100 r=20 fill=red",
      "    └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff",
      "circle#c1 moved to (130,100)",
      "circle#c1 moved back to (100,100)",
      "circle#c1 moved to (130,100)",
      'text#title updated: text="My Diagram v2"',
      'text#title updated: text="My Diagram"',
      "error: cannot group a container into its own descendant: markers",
      "rect#box deleted",
      "rect#box restored into g#markers",
      "saved to demo.svg (5 elements)",
      "error: undo not allowed after io command",
    ]);
  });

  it("writes the documented SVG skeleton", () => {
    const editor = new TestEditor();
    editor.runScript(SECTION_6);
    const svg = editor.files.files.get("demo.svg") ?? "";
    expect(svg).toContain('<g id="markers">');
    expect(svg).toContain('<rect id="bg" x="0" y="0" width="800" height="600" fill="#ffffff"/>');
    expect(svg).toContain('<text id="title" x="20" y="40">My Diagram</text>');
  });
});

describe("§6.1 two-node flowchart", () => {
  it("produces the documented tree", () => {
    const editor = new TestEditor();
    const output = editor.runScript(SECTION_6_1);

    expect(output).toContain("g#node1 created in g#flowchart");
    expect(output).toContain("line#arrow1 created in g#flowchart");
    expect(output).toContain("g#node2 moved by (0,100)");
    expect(output).toContain("g#node2 moved back by (0,-100)");
    expect(output).toContain('text#process-label updated: text="处理数据 v2"');
    expect(output).toContain("saved to flowchart.svg (8 elements)");

    expect(editor.tree()).toEqual([
      "svg (800x600)",
      "└── g#flowchart",
      "    ├── g#node1",
      "    │   ├── rect#start        x=120 y=100 w=160 h=60 fill=#4a90d9",
      "    │   └── text#start-label  (155,135) \"开始\"",
      "    ├── g#node2",
      "    │   ├── rect#process        x=520 y=100 w=160 h=60 fill=#f5a623",
      "    │   └── text#process-label  (545,135) \"处理数据 v2\"",
      "    └── line#arrow1  (280,130) -> (520,130)",
    ]);
  });

  it("saves eight payload elements plus the svg root", () => {
    const editor = new TestEditor();
    editor.runScript(SECTION_6_1);
    const svg = editor.files.files.get("flowchart.svg") ?? "";
    const elements = svg.match(/<(rect|circle|ellipse|line|text|g) /g) ?? [];
    expect(elements).toHaveLength(8);
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
