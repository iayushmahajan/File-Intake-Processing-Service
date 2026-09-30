import { describe, expect, it } from "vitest";
import { parseCsvPreview } from "./csv";
describe("CSV preview", () => {
  it("preserves quoted commas, newlines and escaped quotes", () => {
    expect(parseCsvPreview('id,note\r\n1,"hello,\n""world"""\r\n')).toEqual([
      ["id", "note"],
      ["1", 'hello,\n"world"'],
    ]);
  });
  it("limits records rather than physical lines", () => {
    expect(parseCsvPreview('id,note\n1,"a\nb"\n2,c', 1)).toHaveLength(2);
  });
  it("rejects unclosed quotes", () => {
    expect(() => parseCsvPreview('id,note\n1,"oops')).toThrow(/malformed/);
  });
});
