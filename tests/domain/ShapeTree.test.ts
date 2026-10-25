import { describe, expect, it } from "vitest";
import { Circle } from "../../src/domain/Circle.js";
import { Group } from "../../src/domain/Group.js";
import { Line } from "../../src/domain/Line.js";
import { Rect } from "../../src/domain/Rect.js";
import { Text } from "../../src/domain/Text.js";
import { EditorError } from "../../src/shared/EditorError.js";

describe("Shape geometry", () => {
  it("exposes a rect's fields by SVG attribute name", () => {
    const rect = new Rect("r1", 10, 20, 100, 50);
    expect(rect.geometry().map((cell) => [cell.name, cell.get()])).toEqual([
      ["x", 10],
      ["y", 20],
      ["width", 100],
      ["height", 50],
    ]);
  });

  it("translates only coordinate cells", () => {
    const rect = new Rect("r1", 10, 20, 100, 50);
    rect.moveBy(5, -5);
    expect(rect.valueOf("x")).toBe(15);
    expect(rect.valueOf("y")).toBe(15);
    expect(rect.valueOf("width")).toBe(100);
    expect(rect.valueOf("height")).toBe(50);
  });

  it("scales coordinates and sizes alike", () => {
    const rect = new Rect("r1", 10, 20, 100, 50);
    rect.scaleBy(2);
    expect(rect.geometry().map((cell) => cell.get())).toEqual([20, 40, 200, 100]);
  });

  it("reports the centre for a circle and the start point for a line", () => {
    expect(new Circle("c1", 100, 50, 20).anchor().label).toBe("(100,50)");
    expect(new Line("l1", 280, 130, 520, 130).anchor().label).toBe("(280,130)");
  });

  it("rejects an unknown attribute", () => {
    const rect = new Rect("r1", 0, 0, 10, 10);
    expect(() => rect.setAttribute("opacity", "0.5")).toThrow(EditorError);
    expect(() => rect.setAttribute("opacity", "0.5")).toThrow("unknown attribute: opacity");
  });

  it("rejects a non-positive size", () => {
    const rect = new Rect("r1", 0, 0, 10, 10);
    expect(() => rect.setAttribute("width", "0")).toThrow("value must be positive: 0");
  });

  it("keeps text content as a settable attribute", () => {
    const text = new Text("t1", 0, 0, "hello");
    text.setAttribute("text", "bye");
    expect(text.content).toBe("bye");
    expect(text.readAttribute("text")).toBe("bye");
  });
});

describe("Group as composite", () => {
  it("propagates move to descendants", () => {
    const group = new Group("g1");
    const rect = new Rect("r1", 0, 0, 10, 10);
    const circle = new Circle("c1", 5, 5, 2);
    group.insertChildAt(0, rect);
    group.insertChildAt(1, circle);

    group.moveBy(100, 50);

    expect(rect.valueOf("x")).toBe(100);
    expect(circle.valueOf("cx")).toBe(105);
    expect(circle.valueOf("cy")).toBe(55);
  });

  it("propagates scale recursively", () => {
    const outer = new Group("outer");
    const inner = new Group("inner");
    const rect = new Rect("r1", 10, 10, 10, 10);
    outer.insertChildAt(0, inner);
    inner.insertChildAt(0, rect);

    outer.scaleBy(3);

    expect(rect.valueOf("width")).toBe(30);
    expect(rect.valueOf("x")).toBe(30);
  });

  it("refuses to contain itself or an ancestor", () => {
    const outer = new Group("outer");
    const inner = new Group("inner");
    outer.insertChildAt(0, inner);
    expect(() => inner.insertChildAt(0, outer)).toThrow(EditorError);
  });

  it("clones the whole subtree", () => {
    const group = new Group("g1");
    const rect = new Rect("r1", 1, 2, 3, 4);
    rect.attributes.set("fill", "red");
    group.insertChildAt(0, rect);

    const copy = group.clone();
    const copiedRect = copy.children[0] as Rect;

    expect(copiedRect).not.toBe(rect);
    expect(copiedRect.valueOf("x")).toBe(1);
    expect(copiedRect.attributes.get("fill")).toBe("red");
    expect(copiedRect.parent).toBe(copy);
  });

  it("has no geometry of its own", () => {
    expect(new Group("g1").geometry()).toEqual([]);
    expect(new Group("g1").isContainer).toBe(true);
    expect(new Rect("r1", 0, 0, 1, 1).isContainer).toBe(false);
  });
});
