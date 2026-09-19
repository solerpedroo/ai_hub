import { describe, expect, it } from "vitest";
import { stripAttachedFileBodiesForRenderer } from "./packet-ui";

describe("stripAttachedFileBodiesForRenderer", () => {
  it("keeps the filename and drops the extract", () => {
    const system = "Be brief.\n\nAttached file: spec.pdf\nSection 3 secret-doc\nmore";
    const stripped = stripAttachedFileBodiesForRenderer(system);
    expect(stripped).toContain("Attached file: spec.pdf");
    expect(stripped).toContain("[file extract omitted from renderer]");
    expect(stripped).not.toContain("secret-doc");
  });
});
