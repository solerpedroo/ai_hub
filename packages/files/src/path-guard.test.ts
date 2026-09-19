import { describe, expect, it } from "vitest";
import { isPathInsideRoot } from "./path-guard";

describe("isPathInsideRoot", () => {
  it("accepts the root and children", () => {
    expect(isPathInsideRoot("C:\\proj", "C:\\proj", "\\")).toBe(true);
    expect(isPathInsideRoot("C:\\proj", "C:\\proj\\src\\index.ts", "\\")).toBe(true);
  });

  it("rejects a sibling or parent escape", () => {
    expect(isPathInsideRoot("C:\\proj", "C:\\other\\secret.md", "\\")).toBe(false);
    expect(isPathInsideRoot("C:\\proj", "C:\\proj-evil\\x", "\\")).toBe(false);
    expect(isPathInsideRoot("/tmp/proj", "/etc/passwd", "/")).toBe(false);
  });
});
