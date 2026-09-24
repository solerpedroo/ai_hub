import { describe, expect, it } from "vitest";
import { parseChecklistItems } from "./notes-tasks";

describe("parseChecklistItems", () => {
  it("extracts checkbox and bullet checklist lines", () => {
    const content = `TASK

Implement JWT

Checklist:
- [ ] Create User model
- [x] Create login endpoint
□ Generate token
* Middleware
- Documentação
`;
    expect(parseChecklistItems(content)).toEqual([
      "Create User model",
      "Create login endpoint",
      "Generate token",
      "Middleware",
      "Documentação",
    ]);
  });

  it("dedupes case-insensitively", () => {
    expect(parseChecklistItems("- [ ] Same\n- [ ] same\n- [ ] Another item")).toEqual(["Same", "Another item"]);
  });
});
