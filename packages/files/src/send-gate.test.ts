import { describe, expect, it } from "vitest";
import { assertFileAttachmentAccess } from "./send-gate";

describe("assertFileAttachmentAccess", () => {
  it("rejects a missing file", () => {
    expect(() =>
      assertFileAttachmentAccess({
        exists: false,
        rowProjectId: null,
        conversationProjectId: null,
        kind: "text",
        vision: false,
        mode: "send",
      }),
    ).toThrow("files:unsupported");
  });

  it("rejects a file from another project", () => {
    expect(() =>
      assertFileAttachmentAccess({
        exists: true,
        rowProjectId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        conversationProjectId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        kind: "text",
        vision: false,
        mode: "send",
      }),
    ).toThrow("files:project_mismatch");
  });

  it("rejects an image send when the catalog has no vision", () => {
    expect(() =>
      assertFileAttachmentAccess({
        exists: true,
        rowProjectId: null,
        conversationProjectId: null,
        kind: "image",
        vision: false,
        mode: "send",
      }),
    ).toThrow("files:vision_required");
  });

  it("allows image preview without vision and send with vision", () => {
    expect(() =>
      assertFileAttachmentAccess({
        exists: true,
        rowProjectId: null,
        conversationProjectId: null,
        kind: "image",
        vision: false,
        mode: "preview",
      }),
    ).not.toThrow();
    expect(() =>
      assertFileAttachmentAccess({
        exists: true,
        rowProjectId: null,
        conversationProjectId: null,
        kind: "image",
        vision: true,
        mode: "send",
      }),
    ).not.toThrow();
  });
});
