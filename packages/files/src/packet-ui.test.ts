import { describe, expect, it } from "vitest";
import { stripAttachedFileBodiesForRenderer } from "./packet-ui";

describe("stripAttachedFileBodiesForRenderer", () => {
  it("keeps the filename and drops the extract", () => {
    const system = "Be brief.\n\nAttached file: spec.pdf\nSection 3 secret-doc\nmore";
    const stripped = stripAttachedFileBodiesForRenderer(system);
    expect(stripped).toContain("Attached file: spec.pdf");
    expect(stripped).toContain("[extract omitted from renderer]");
    expect(stripped).not.toContain("secret-doc");
  });

  it("omits mentioned conversation and packet bodies", () => {
    const system =
      "Be brief.\n\nMentioned conversation: Old thread\nuser: we use PostgreSQL\n\nMentioned packet: Alpha / Kickoff\npacket-secret-body";
    const stripped = stripAttachedFileBodiesForRenderer(system);
    expect(stripped).toContain("Mentioned conversation: Old thread");
    expect(stripped).toContain("Mentioned packet: Alpha / Kickoff");
    expect(stripped).not.toContain("PostgreSQL");
    expect(stripped).not.toContain("packet-secret-body");
  });
});
